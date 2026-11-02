/**
 * PATCH-B — mechanismsView.ts
 * Renders every server-synced mechanism (doors, lights, CCTV, plates, noise, valve, fire,
 * traffic, crane) in 3D for BOTH players, plus the chaos-event banner and "did you know"
 * safety-lesson toasts. The server (server/mechanics.js) is authoritative; this file only
 * visualises `telemetry.mechanisms` and mirrors the server's motion + collision functions.
 */
import * as THREE from 'three'
import type { AABB } from './collisionSystem.ts'

// ─────────────────────────────────────────────────────────────
// TYPES (mirror server/mechanics.js snapshot)
// ─────────────────────────────────────────────────────────────
export type Motion =
  | { k: 'lin'; x0: number; v: number; t0: number }
  | { k: 'sin'; c: number; a: number; p0: number; w: number; t0: number }
  | { k: 'lerp'; from: number; to: number; t0: number; dur: number }
  | { k: 'fix'; x: number }

export interface MechItem {
  id: string
  type: 'door' | 'lights' | 'camera' | 'plate' | 'noise' | 'valve' | 'fire' | 'traffic' | 'crane'
  name: string
  icon: string
  x: number
  z: number
  radius: number
  state: string
  timer: number
  hardened: number
  prompt: string | null
  rect?: { minX: number; maxX: number; minZ: number; maxZ: number }
  zone?: { x: number; z: number; r: number }
  beacon?: { x: number; z: number; r: number }
  yaw?: number
  fov?: number
  range?: number
  intensity?: number
  crank?: number
  z0?: number
  cx?: number
  attractR?: number
  effect?: string
}

export interface MechHazard {
  id: string
  kind: 'car' | 'load'
  z: number
  len: number
  wid: number
  tint: number
  dir: number
  motion: Motion
}

export interface MechEvent {
  id: number
  kind: string
  text: string
  lesson?: string
  icon: string
  t: number
}

export interface MechSnapshot {
  v: number
  level: number
  epoch: number
  t: number
  running: boolean
  signature: { id: string; name: string; icon: string; tagline: string }
  items: MechItem[]
  hazards: MechHazard[]
  events: MechEvent[]
  chaos: {
    id: string
    name: string
    icon: string
    phase: 'idle' | 'warning' | 'shock' | 'response' | 'ended'
    inSec: number
    warnText: string
    shockText: string
    responseText: string
    lock: boolean
  }
}

export function motionPos(m: Motion, t: number): number {
  switch (m.k) {
    case 'lin':
      return m.x0 + m.v * (t - m.t0)
    case 'sin':
      return m.c + m.a * Math.sin(m.p0 + m.w * (t - m.t0))
    case 'lerp':
      return m.from + (m.to - m.from) * Math.min(1, Math.max(0, (t - m.t0) / m.dur))
    default:
      return m.x || 0
  }
}

const CAR_TINTS = [0xef4444, 0x3b82f6, 0xf59e0b, 0x22c55e, 0xe5e7eb, 0xa855f7]

interface Visual {
  group: THREE.Group
  update: (item: MechItem, now: number, dt: number) => void
  dispose?: () => void
}

function mat(color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...opts })
}

function basic(color: number, opacity = 1) {
  return new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, side: THREE.DoubleSide, depthWrite: opacity >= 1 })
}

function makeLabel() {
  const canvas = document.createElement('canvas')
  canvas.width = 320
  canvas.height = 72
  const texture = new THREE.CanvasTexture(canvas)
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true }))
  sprite.scale.set(3.4, 0.77, 1)
  sprite.renderOrder = 20
  let last = ''
  return {
    sprite,
    set(text: string, sub: string, color: string) {
      const key = text + '|' + sub + '|' + color
      if (key === last) return
      last = key
      const ctx = canvas.getContext('2d')!
      ctx.clearRect(0, 0, 320, 72)
      ctx.fillStyle = 'rgba(15,23,42,0.88)'
      ctx.beginPath()
      ctx.roundRect(6, 6, 308, 60, 12)
      ctx.fill()
      ctx.strokeStyle = color
      ctx.lineWidth = 3
      ctx.stroke()
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 20px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(text, 160, 32)
      ctx.fillStyle = color
      ctx.font = 'bold 15px sans-serif'
      ctx.fillText(sub, 160, 54)
      texture.needsUpdate = true
    }
  }
}

const STATE_COLOR: Record<string, string> = {
  open: '#4ade80', on: '#4ade80', online: '#4ade80', idle: '#94a3b8', flow: '#facc15', walk: '#4ade80',
  sweep: '#facc15', parked: '#4ade80', closing: '#fb923c', flicker: '#fb923c', warning: '#fb923c',
  locked: '#ef4444', dark: '#ef4444', jammed: '#ef4444', armed: '#ef4444', blaring: '#ef4444', seized: '#ef4444',
  rush: '#ef4444', overload: '#ef4444', INFERNO: '#ef4444', BLAZING: '#fb923c', SMOLDERING: '#facc15', OUT: '#4ade80'
}

// ─────────────────────────────────────────────────────────────
// VIEW
// ─────────────────────────────────────────────────────────────
export class MechanismsView {
  private scene: THREE.Scene
  private root = new THREE.Group()
  private overlay: HTMLDivElement
  private banner: HTMLDivElement
  private toasts: HTMLDivElement
  private intro: HTMLDivElement

  private snap: MechSnapshot | null = null
  private recvAt = 0
  private epoch = -1
  private visuals = new Map<string, Visual & { label: ReturnType<typeof makeLabel> }>()
  private carMeshes = new Map<string, { mesh: THREE.Group; x: number }>()
  private seenEvents = new Set<number>()
  private craneLoad: THREE.Group | null = null
  private craneCable: THREE.Line | null = null
  private craneX = 0
  private localPos = new THREE.Vector3()
  private clockT = 0

  constructor(scene: THREE.Scene, container: HTMLElement) {
    this.scene = scene
    this.scene.add(this.root)

    this.overlay = document.createElement('div')
    this.overlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:35;font-family:system-ui,sans-serif;'
    this.banner = document.createElement('div')
    this.banner.style.cssText =
      'position:absolute;top:84px;left:50%;transform:translateX(-50%);padding:8px 18px;border-radius:12px;font-weight:800;font-size:14px;letter-spacing:.04em;color:#fff;display:none;text-align:center;max-width:78vw;box-shadow:0 6px 24px rgba(0,0,0,.45);'
    this.toasts = document.createElement('div')
    this.toasts.style.cssText =
      'position:absolute;left:50%;bottom:132px;transform:translateX(-50%);display:flex;flex-direction:column;gap:8px;align-items:center;width:min(560px,92vw);'
    this.intro = document.createElement('div')
    this.intro.style.cssText =
      'position:absolute;top:128px;left:50%;transform:translateX(-50%);max-width:min(520px,90vw);padding:10px 16px;border-radius:12px;background:rgba(15,23,42,.88);border:2px solid #facc15;color:#fff;font-size:13px;display:none;text-align:center;'
    this.overlay.append(this.banner, this.intro, this.toasts)
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative'
    container.appendChild(this.overlay)
  }

  // ── public API ─────────────────────────────────────────────
  public setSnapshot(snap: MechSnapshot | null | undefined) {
    if (!snap) return
    if (snap.epoch !== this.epoch) this.rebuild(snap)
    this.snap = snap
    this.recvAt = performance.now()
    this.clockT = snap.t
    this.consumeEvents(snap)
    this.updateBanner(snap)
  }

  public getPrompt(id: string): string | null {
    const it = this.snap?.items.find((i) => i.id === id)
    return it ? it.prompt : null
  }

  /** Current time on the server's mechanism clock. */
  private now(): number {
    if (!this.snap) return 0
    return this.snap.t + (this.snap.running ? Math.min(1.2, (performance.now() - this.recvAt) / 1000) : 0)
  }

  /** Dynamic colliders — identical rules to server/mechanics.js getDynamicObstacles(). */
  public getObstacles(): AABB[] {
    const s = this.snap
    if (!s) return []
    const t = this.now()
    const out: AABB[] = []
    for (const it of s.items) {
      if (it.type === 'door' && it.state === 'locked' && it.rect) out.push(it.rect)
      if (it.type === 'fire' && (it.intensity ?? 0) >= 3 && it.rect) out.push(it.rect)
    }
    for (const h of s.hazards) {
      const x = motionPos(h.motion, t)
      out.push({ minX: x - h.len / 2, maxX: x + h.len / 2, minZ: h.z - h.wid / 2, maxZ: h.z + h.wid / 2 })
    }
    return out
  }

  public update(dt: number, localPos: THREE.Vector3) {
    if (!this.snap) return
    this.localPos.copy(localPos)
    const t = this.now()
    for (const it of this.snap.items) {
      const v = this.visuals.get(it.id)
      if (!v) continue
      v.update(it, t, dt)
      const near = localPos.distanceTo(new THREE.Vector3(it.x, 0, it.z)) < 11
      v.label.sprite.visible = near
      if (near) {
        const sub = `${it.state.toUpperCase()}${it.timer > 0 && it.state !== 'idle' ? ` ${it.timer}s` : ''}${it.hardened > 0 ? ' 🛡' : ''}`
        v.label.set(`${it.icon} ${it.name}`, sub, STATE_COLOR[it.state] || STATE_COLOR[it.state.toUpperCase()] || '#e2e8f0')
      }
    }
    this.updateHazards(t, dt)
    this.updateToastsFade()
  }

  public dispose() {
    this.clear()
    this.scene.remove(this.root)
    this.overlay.remove()
  }

  // ── build ──────────────────────────────────────────────────
  private clear() {
    for (const v of this.visuals.values()) v.dispose?.()
    this.root.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.geometry) m.geometry.dispose()
      const mm = m.material as THREE.Material | THREE.Material[] | undefined
      if (Array.isArray(mm)) mm.forEach((x) => x.dispose())
      else mm?.dispose()
    })
    this.root.clear()
    this.visuals.clear()
    this.carMeshes.clear()
    this.craneLoad = null
    this.craneCable = null
    this.seenEvents.clear()
    this.toasts.replaceChildren()
  }

  private rebuild(snap: MechSnapshot) {
    this.clear()
    this.epoch = snap.epoch
    for (const it of snap.items) {
      const vis = this.buildVisual(it)
      if (!vis) continue
      const label = makeLabel()
      label.sprite.position.set(0, 3.6, 0)
      vis.group.add(label.sprite)
      vis.group.position.set(it.x, 0, it.z)
      this.root.add(vis.group)
      this.visuals.set(it.id, { ...vis, label })
    }
    const crane = snap.items.find((i) => i.type === 'crane')
    if (crane) this.buildCrane(crane)
    // Signature intro card
    this.intro.innerHTML = `<b>${snap.signature.icon} SIGNATURE: ${snap.signature.name}</b><br/><span style="opacity:.85">${snap.signature.tagline}</span>`
    this.intro.style.display = 'block'
    window.setTimeout(() => (this.intro.style.display = 'none'), 9000)
  }

  private buildVisual(it: MechItem): Visual | null {
    switch (it.type) {
      case 'door':
        return this.buildDoor(it)
      case 'lights':
        return this.buildLights(it)
      case 'camera':
        return this.buildCamera(it)
      case 'plate':
        return this.buildPlate(it)
      case 'noise':
        return this.buildNoise(it)
      case 'valve':
        return this.buildValve(it)
      case 'fire':
        return this.buildFire(it)
      case 'traffic':
        return this.buildTraffic(it)
      case 'crane':
        return this.buildCranePost(it)
    }
    return null
  }

  // Door: a slab at the collider rect that drops when closing/locked, plus a beacon at the control post.
  private buildDoor(it: MechItem): Visual {
    const g = new THREE.Group()
    const r = it.rect!
    const w = r.maxX - r.minX
    const d = r.maxZ - r.minZ
    const slabWrap = new THREE.Group()
    slabWrap.position.set(r.minX + w / 2 - it.x, 0, r.minZ + d / 2 - it.z)
    const slab = new THREE.Mesh(new THREE.BoxGeometry(w, 3.2, Math.max(0.3, d)), mat(0x64748b, { metalness: 0.5 }))
    slab.castShadow = true
    slabWrap.add(slab)
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, 0.4, Math.max(0.32, d + 0.02)), mat(0xfacc15))
    stripe.position.y = -1.4
    slabWrap.add(stripe)
    g.add(slabWrap)
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 1.6, 8), mat(0x334155))
    post.position.y = 0.8
    g.add(post)
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12), basic(0x22c55e))
    bulb.position.y = 1.8
    g.add(bulb)
    let y = 4.0
    return {
      group: g,
      update: (item, now, dt) => {
        const closed = item.state === 'locked'
        const warn = item.state === 'closing'
        const target = closed ? 1.6 : warn ? 2.6 : 4.2
        y += (target - y) * Math.min(1, dt * 6)
        slabWrap.position.y = y
        const flash = warn && Math.floor(now * 6) % 2 === 0
        ;(bulb.material as THREE.MeshBasicMaterial).color.setHex(closed ? 0xef4444 : warn ? (flash ? 0xf97316 : 0x7c2d12) : item.hardened > 0 ? 0x38bdf8 : 0x22c55e)
      }
    }
  }

  // Lights: ground darkness disc with a lit hole at the emergency beacon, lamp posts, always-on green beacon.
  private buildLights(it: MechItem): Visual {
    const g = new THREE.Group()
    const zone = it.zone!
    const beacon = it.beacon!
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = 'rgba(2,6,23,0.72)'
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalCompositeOperation = 'destination-out'
    const bx = size / 2 + ((beacon.x - zone.x) / zone.r) * (size / 2)
    const by = size / 2 + ((beacon.z - zone.z) / zone.r) * (size / 2)
    const br = (beacon.r / zone.r) * (size / 2)
    const grad = ctx.createRadialGradient(bx, by, br * 0.3, bx, by, br)
    grad.addColorStop(0, 'rgba(0,0,0,1)')
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(bx, by, br, 0, Math.PI * 2)
    ctx.fill()
    const tex = new THREE.CanvasTexture(canvas)
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(zone.r, 48),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 })
    )
    disc.rotation.x = -Math.PI / 2
    disc.position.set(zone.x - it.x, 0.07, zone.z - it.z)
    disc.renderOrder = 5
    g.add(disc)
    // dome of gloom so objects inside also read as dark
    const dome = new THREE.Mesh(
      new THREE.CylinderGeometry(zone.r, zone.r, 3.6, 40, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x020617, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
    )
    dome.position.set(zone.x - it.x, 1.8, zone.z - it.z)
    g.add(dome)
    // breaker box
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.4, 0.4), mat(0x475569))
    box.position.y = 0.7
    g.add(box)
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), basic(0x22c55e))
    led.position.set(0, 1.2, 0.25)
    g.add(led)
    // emergency beacon (never switches off)
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.6, 8), mat(0x166534))
    pole.position.set(beacon.x - it.x, 1.3, beacon.z - it.z)
    g.add(pole)
    const bl = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 12), basic(0x4ade80))
    bl.position.set(beacon.x - it.x, 2.8, beacon.z - it.z)
    g.add(bl)
    const pl = new THREE.PointLight(0x4ade80, 1.6, beacon.r * 2)
    pl.position.copy(bl.position)
    g.add(pl)
    return {
      group: g,
      update: (item, now, dt) => {
        let dark = item.state === 'dark' ? 1 : item.state === 'flicker' ? (Math.sin(now * 40) > 0 ? 1 : 0.15) : item.state === 'restoring' ? (Math.sin(now * 30) > 0 ? 0.6 : 0) : 0
        const dm = disc.material as THREE.MeshBasicMaterial
        dm.opacity += (dark - dm.opacity) * Math.min(1, dt * 10)
        ;(dome.material as THREE.MeshBasicMaterial).opacity = dm.opacity * 0.22
        led.material = basic(item.state === 'on' ? 0x22c55e : 0xef4444)
        bl.scale.setScalar(1 + Math.sin(now * 4) * 0.12)
      },
      dispose: () => tex.dispose()
    }
  }

  // Camera: pole + head + ground cone showing what it can witness.
  private buildCamera(it: MechItem): Visual {
    const g = new THREE.Group()
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 3.6, 8), mat(0x334155))
    pole.position.y = 1.8
    g.add(pole)
    const head = new THREE.Group()
    head.position.y = 3.7
    head.rotation.y = it.yaw ?? 0
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.4, 0.9), mat(0x0f172a))
    head.add(body)
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), basic(0x22c55e))
    led.position.set(0, 0.28, 0.2)
    head.add(led)
    g.add(head)
    const half = ((it.fov ?? 90) * Math.PI) / 360
    const range = it.range ?? 18
    const shape = new THREE.Shape()
    shape.moveTo(0, 0)
    shape.absarc(0, 0, range, Math.PI / 2 - half, Math.PI / 2 + half, false)
    shape.lineTo(0, 0)
    const cone = new THREE.Mesh(new THREE.ShapeGeometry(shape, 18), basic(0x22c55e, 0.1))
    cone.rotation.x = -Math.PI / 2
    // ShapeGeometry lies in XY with +Y as "forward"; after -90° about X forward becomes -Z, so rotate to yaw
    cone.rotation.z = (it.yaw ?? 0) + Math.PI
    cone.position.y = 0.06
    g.add(cone)
    return {
      group: g,
      update: (item, now) => {
        const cm = cone.material as THREE.MeshBasicMaterial
        const color = item.state === 'online' ? 0x22c55e : item.state === 'rebooting' ? 0xf59e0b : 0xef4444
        cm.color.setHex(color)
        cm.opacity = item.state === 'online' ? 0.09 + Math.sin(now * 2) * 0.02 : item.state === 'jammed' ? (Math.sin(now * 25) > 0 ? 0.2 : 0.03) : 0.12
        ;(led.material as THREE.MeshBasicMaterial).color.setHex(color)
        head.rotation.y = (it.yaw ?? 0) + (item.state === 'online' ? Math.sin(now * 0.6) * 0.08 : 0)
      }
    }
  }

  // Plate: always visible (hazard-yellow border) so it can be spotted; pulses red when armed.
  private buildPlate(it: MechItem): Visual {
    const g = new THREE.Group()
    const r = it.rect!
    const w = r.maxX - r.minX
    const plate = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, w), mat(0x475569, { metalness: 0.4 }))
    plate.position.y = 0.06
    g.add(plate)
    const border = new THREE.Mesh(new THREE.RingGeometry(w * 0.62, w * 0.72, 4, 1, Math.PI / 4), basic(0xfacc15))
    border.rotation.x = -Math.PI / 2
    border.position.y = 0.14
    g.add(border)
    const glow = new THREE.PointLight(0xef4444, 0, 6)
    glow.position.y = 0.6
    g.add(glow)
    return {
      group: g,
      update: (item, now) => {
        const armed = item.state === 'armed'
        ;(plate.material as THREE.MeshStandardMaterial).color.setHex(armed ? 0xb91c1c : item.state === 'fired' ? 0xf59e0b : 0x475569)
        ;(plate.material as THREE.MeshStandardMaterial).emissive.setHex(armed ? 0xef4444 : 0x000000)
        ;(plate.material as THREE.MeshStandardMaterial).emissiveIntensity = armed ? 0.6 + Math.sin(now * 8) * 0.4 : 0
        glow.intensity = armed ? 1.2 + Math.sin(now * 8) : 0
        border.scale.setScalar(armed ? 1 + Math.sin(now * 8) * 0.06 : 1)
      }
    }
  }

  // Noise: speaker stack; blaring spawns expanding rings and shakes.
  private buildNoise(it: MechItem): Visual {
    const g = new THREE.Group()
    const stack = new THREE.Group()
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.6, 0.8), mat(0x1f2937))
    cab.position.y = 0.8
    stack.add(cab)
    for (const y of [0.5, 1.15]) {
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.12, 0.2, 14), mat(0x94a3b8))
      cone.rotation.x = Math.PI / 2
      cone.position.set(0, y, 0.45)
      stack.add(cone)
    }
    g.add(stack)
    const rings: THREE.Mesh[] = []
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 40), basic(0xf59e0b, 0.7))
      ring.rotation.x = -Math.PI / 2
      ring.position.y = 0.12
      ring.visible = false
      g.add(ring)
      rings.push(ring)
    }
    return {
      group: g,
      update: (item, now) => {
        const on = item.state === 'blaring'
        stack.position.x = on ? Math.sin(now * 60) * 0.03 : 0
        rings.forEach((ring, i) => {
          ring.visible = on
          if (!on) return
          const p = (now * 0.7 + i / 3) % 1
          ring.scale.setScalar(1 + p * 14)
          ;(ring.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - p)
        })
      }
    }
  }

  // Valve: pipe + wheel + water jet scaled by pressure.
  private buildValve(it: MechItem): Visual {
    const g = new THREE.Group()
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 2.2, 12), mat(0x1d4ed8, { metalness: 0.5 }))
    pipe.rotation.z = Math.PI / 2
    pipe.position.y = 0.6
    g.add(pipe)
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.07, 8, 20), mat(0xef4444))
    wheel.position.y = 1.4
    wheel.rotation.x = Math.PI / 2
    g.add(wheel)
    const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.3, 4, 10, 1, true), basic(0x38bdf8, 0.45))
    jet.position.set(0.9, 2.2, 0)
    jet.rotation.z = -0.7
    jet.visible = false
    g.add(jet)
    return {
      group: g,
      update: (item, now) => {
        jet.visible = item.state === 'open'
        jet.scale.y = 1 + Math.sin(now * 14) * 0.08
        wheel.rotation.z = item.state === 'open' ? now * 2 : item.state === 'seized' ? Math.sin(now * 30) * 0.05 : 0
        ;(wheel.material as THREE.MeshStandardMaterial).color.setHex(item.state === 'seized' ? 0x7f1d1d : item.state === 'open' ? 0x22c55e : 0xef4444)
      }
    }
  }

  // Fire: flame cones scaled by intensity, smoke puffs, inferno outline over the collider.
  private buildFire(it: MechItem): Visual {
    const g = new THREE.Group()
    const half = it.rect ? (it.rect.maxX - it.rect.minX) / 2 : 1.8
    const flames: THREE.Mesh[] = []
    for (let i = 0; i < 6; i++) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.6, 8), basic(i % 2 ? 0xf97316 : 0xfacc15, 0.9))
      const a = (i / 6) * Math.PI * 2
      f.position.set(Math.cos(a) * half * 0.55, 0.8, Math.sin(a) * half * 0.55)
      g.add(f)
      flames.push(f)
    }
    const light = new THREE.PointLight(0xf97316, 0, 14)
    light.position.y = 2
    g.add(light)
    const smoke: THREE.Mesh[] = []
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 8), basic(0x475569, 0.35))
      g.add(s)
      smoke.push(s)
    }
    const outline = new THREE.Mesh(new THREE.BoxGeometry(half * 2, 3.2, half * 2), new THREE.MeshBasicMaterial({ color: 0xef4444, wireframe: true }))
    outline.position.y = 1.6
    outline.visible = false
    g.add(outline)
    return {
      group: g,
      update: (item, now) => {
        const lvl = item.intensity ?? 0
        flames.forEach((f, i) => {
          f.visible = lvl > 0 && i < 2 + lvl * 2
          const s = (0.5 + lvl * 0.45) * (0.85 + Math.sin(now * 10 + i * 1.7) * 0.15)
          f.scale.set(s, s * (0.9 + Math.sin(now * 13 + i) * 0.2), s)
          f.position.y = 0.8 * s
        })
        light.intensity = lvl * 1.1 + Math.sin(now * 12) * 0.2 * lvl
        smoke.forEach((s, i) => {
          s.visible = lvl > 0
          const p = (now * 0.35 + i / 4) % 1
          s.position.set(Math.sin(i * 2) * 0.8, 1.5 + p * 4.5, Math.cos(i * 3) * 0.8)
          s.scale.setScalar(0.6 + p * 1.8 * (0.5 + lvl * 0.3))
          ;(s.material as THREE.MeshBasicMaterial).opacity = 0.35 * (1 - p)
        })
        outline.visible = lvl >= 3
      }
    }
  }

  // Traffic: signal head showing walk / flow / rush; vehicles are drawn in updateHazards().
  private buildTraffic(it: MechItem): Visual {
    const g = new THREE.Group()
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 3.2, 8), mat(0x334155))
    pole.position.y = 1.6
    g.add(pole)
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.0, 0.4), mat(0x0f172a))
    head.position.y = 3.2
    g.add(head)
    const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.2, 16), basic(0xef4444))
    lamp.position.set(0, 3.35, 0.21)
    g.add(lamp)
    const lamp2 = new THREE.Mesh(new THREE.CircleGeometry(0.2, 16), basic(0x166534))
    lamp2.position.set(0, 3.0, 0.21)
    g.add(lamp2)
    // stop lines on both sides of the junction
    for (const sx of [-13, 13]) {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 13), basic(0xffffff, 0.8))
      line.rotation.x = -Math.PI / 2
      line.position.set(sx - it.x, 0.05, 0 - it.z)
      g.add(line)
    }
    return {
      group: g,
      update: (item, now) => {
        const walk = item.state === 'walk'
        const rush = item.state === 'rush'
        ;(lamp.material as THREE.MeshBasicMaterial).color.setHex(walk ? 0x7f1d1d : rush ? (Math.sin(now * 14) > 0 ? 0xef4444 : 0x450a0a) : 0xef4444)
        ;(lamp2.material as THREE.MeshBasicMaterial).color.setHex(walk ? 0x22c55e : 0x14532d)
      }
    }
  }

  private buildCranePost(it: MechItem): Visual {
    const g = new THREE.Group()
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 0.9), mat(0xfacc15))
    box.position.y = 0.75
    g.add(box)
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.12, 14), basic(0xef4444))
    btn.position.set(0, 1.3, 0.48)
    btn.rotation.x = Math.PI / 2
    g.add(btn)
    return {
      group: g,
      update: (item, now) => {
        const warn = item.state === 'warning' || item.state === 'overload'
        ;(btn.material as THREE.MeshBasicMaterial).color.setHex(warn ? (Math.sin(now * 14) > 0 ? 0xef4444 : 0x450a0a) : 0x22c55e)
      }
    }
  }

  // Crane tower + jib (static) and the pendulum load (animated in updateHazards).
  private buildCrane(it: MechItem) {
    const z0 = it.z0 ?? -8.6
    const cx = it.cx ?? 0
    const mast = new THREE.Mesh(new THREE.BoxGeometry(1.4, 26, 1.4), mat(0xf59e0b))
    mast.position.set(cx, 13, -30)
    this.root.add(mast)
    const jibLen = Math.abs(-30 - z0)
    const jib = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, jibLen), mat(0xfbbf24))
    jib.position.set(cx, 14, (-30 + z0) / 2)
    this.root.add(jib)
    this.craneLoad = new THREE.Group()
    const load = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, 2.6), mat(0x78716c))
    load.position.y = 1.1
    load.castShadow = true
    this.craneLoad.add(load)
    const band = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.3, 2.7), mat(0xfacc15))
    band.position.y = 1.6
    this.craneLoad.add(band)
    this.root.add(this.craneLoad)
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()])
    this.craneCable = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x111827 }))
    this.root.add(this.craneCable)
    this.craneX = cx
  }

  // ── per-frame hazards ──────────────────────────────────────
  private updateHazards(t: number, dt: number) {
    const s = this.snap!
    const alive = new Set<string>()
    for (const h of s.hazards) {
      const x = motionPos(h.motion, t)
      if (h.kind === 'load') {
        if (this.craneLoad) {
          this.craneX += (x - this.craneX) * Math.min(1, dt * 12)
          this.craneLoad.position.set(this.craneX, 0.2, h.z)
          const crane = s.items.find((i) => i.type === 'crane')
          const cx = crane?.cx ?? 0
          const pivot = new THREE.Vector3(cx, 14, h.z)
          const top = new THREE.Vector3(this.craneX, 3.4, h.z)
          if (this.craneCable) this.craneCable.geometry.setFromPoints([pivot, top])
        }
        continue
      }
      alive.add(h.id)
      let c = this.carMeshes.get(h.id)
      if (!c) {
        c = { mesh: this.makeCar(h), x }
        this.carMeshes.set(h.id, c)
        this.root.add(c.mesh)
      }
      c.x += (x - c.x) * Math.min(1, dt * 10)
      c.mesh.position.set(c.x, 0, h.z)
    }
    for (const [id, c] of this.carMeshes) {
      if (!alive.has(id)) {
        this.root.remove(c.mesh)
        this.carMeshes.delete(id)
      }
    }
  }

  private makeCar(h: MechHazard): THREE.Group {
    const g = new THREE.Group()
    const body = new THREE.Mesh(new THREE.BoxGeometry(h.len, 0.8, h.wid), mat(CAR_TINTS[h.tint % CAR_TINTS.length], { metalness: 0.4 }))
    body.position.y = 0.6
    body.castShadow = true
    g.add(body)
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(h.len * 0.5, 0.6, h.wid * 0.85), mat(0x0f172a))
    cabin.position.set(-h.dir * 0.2, 1.3, 0)
    g.add(cabin)
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, h.wid * 0.7), basic(0xfef9c3))
    hl.position.set((h.dir * h.len) / 2, 0.7, 0)
    g.add(hl)
    return g
  }

  // ── overlay: chaos banner + lesson toasts ─────────────────
  private updateBanner(s: MechSnapshot) {
    const c = s.chaos
    const colors: Record<string, string> = { warning: '#b45309', shock: '#b91c1c', response: '#15803d' }
    if (c.phase === 'warning' || c.phase === 'shock' || c.phase === 'response') {
      const label =
        c.phase === 'warning'
          ? `${c.icon} ${c.name.toUpperCase()} IN ${c.inSec}s — ${c.warnText}`
          : c.phase === 'shock'
            ? `${c.icon} ${c.name.toUpperCase()}! ${c.inSec}s — ${c.shockText}`
            : `🚑 RESPONSE WINDOW ${c.inSec}s — ${c.responseText}`
      this.banner.textContent = label
      this.banner.style.background = colors[c.phase]
      this.banner.style.display = 'block'
    } else {
      this.banner.style.display = 'none'
    }
  }

  private consumeEvents(s: MechSnapshot) {
    for (const ev of s.events) {
      if (this.seenEvents.has(ev.id)) continue
      this.seenEvents.add(ev.id)
      if (ev.t < s.t - 6 && this.seenEvents.size > s.events.length) continue
      if (!ev.lesson && ev.kind !== 'chaos' && ev.kind !== 'evidence') continue
      const el = document.createElement('div')
      const accent = ev.kind === 'sabotage' ? '#ef4444' : ev.kind === 'repair' ? '#22c55e' : ev.kind === 'evidence' ? '#38bdf8' : '#facc15'
      el.style.cssText = `background:rgba(15,23,42,.92);border-left:5px solid ${accent};color:#fff;padding:8px 14px;border-radius:10px;font-size:13px;box-shadow:0 4px 18px rgba(0,0,0,.4);transition:opacity .6s;max-width:100%;`
      el.dataset.born = String(performance.now())
      el.innerHTML = `<div>${ev.icon} ${ev.text}</div>${ev.lesson ? `<div style="margin-top:4px;font-size:12px;color:#fde68a">💡 Did you know? ${ev.lesson}</div>` : ''}`
      this.toasts.appendChild(el)
      while (this.toasts.children.length > 3) this.toasts.firstElementChild?.remove()
    }
  }

  private updateToastsFade() {
    const now = performance.now()
    for (const el of Array.from(this.toasts.children) as HTMLElement[]) {
      const age = now - Number(el.dataset.born || now)
      if (age > 11000) el.remove()
      else if (age > 10000) el.style.opacity = '0'
    }
  }
}
