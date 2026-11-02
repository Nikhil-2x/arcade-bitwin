// ─────────────────────────────────────────────────────────────────────────────
// Civic Clash — Game-feel director (PATCH-A)
//
// Self-contained "juice" layer. It owns:
//   • a pooled 2D particle canvas (sparks, confetti, rings, embers, smoke)
//   • screen shake / camera punch / flash / light-pulse / vignette
//   • animated HUD feedback (score pop-ups, combo, timer pulse, urgency)
//   • cinematic role reveal, role switch, sealed-verdict and final-verdict
//   • footsteps, tension-music intensity, sabotage alerts
//   • Low / High quality toggle (+ automatic FPS watchdog)
//
// It never touches gameplay state: it only *observes* what the game already
// exposes (match state, telemetry, movement flags) through `useJuice()`.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useLayoutEffect, useRef } from 'react'
import { sound } from './audio.ts'
import type { FootSurface } from './audio.ts'
import type { PlayerRole } from '../network/networkTypes.ts'
import type { GameTelemetryM2 } from '../network/milestone2Types.ts'
import type { MatchState } from '../network/milestone4Types.ts'
import type { VerdictRevealData } from '../network/milestone6Types.ts'
import '../../../styles/juice.css'

export type FxQuality = 'low' | 'high'

// ───────────────────────────── tiny helpers ─────────────────────────────
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const rand = (a: number, b: number) => a + Math.random() * (b - a)
const SETTINGS_KEY = 'cc.fx.v1'

const COLORS = {
  runner: '#22c55e',
  saboteur: '#ef4444',
  gold: '#fbbf24',
  amber: '#f59e0b',
  cyan: '#38bdf8',
  violet: '#a78bfa',
  white: '#ffffff'
}
const CONFETTI = ['#fbbf24', '#22c55e', '#38bdf8', '#f472b6', '#a78bfa', '#f97316', '#ffffff']

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)
}

function mk<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls: string,
  parent?: HTMLElement,
  text?: string
): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag)
  n.className = cls
  if (text !== undefined) n.textContent = text
  if (parent) parent.appendChild(n)
  return n
}

function reducedMotion(): boolean {
  try {
    return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

function defaultQuality(): FxQuality {
  try {
    const nav = navigator as Navigator & { deviceMemory?: number }
    if ((nav.hardwareConcurrency ?? 8) <= 4) return 'low'
    if ((nav.deviceMemory ?? 8) <= 4) return 'low'
  } catch {
    /* ignore */
  }
  return 'high'
}

// ───────────────────────────── particles ─────────────────────────────
type PKind = 'spark' | 'dot' | 'confetti' | 'ring' | 'smoke' | 'ember'

interface Particle {
  on: boolean
  kind: PKind
  x: number
  y: number
  vx: number
  vy: number
  age: number
  life: number
  size: number
  rot: number
  vr: number
  color: string
  g: number
  drag: number
  grow: number
}

class Particles {
  private cv: HTMLCanvasElement
  private cx: CanvasRenderingContext2D | null
  private pool: Particle[] = []
  private cap = 600
  private live = 0
  private raf = 0
  private last = 0
  private cursor = 0
  private w = 0
  private h = 0
  private dpr = 1
  private additive = true

  constructor(parent: HTMLElement) {
    this.cv = mk('canvas', 'cc-fx-canvas', parent)
    this.cx = this.cv.getContext('2d')
    this.resize()
    window.addEventListener('resize', () => this.resize())
  }

  configure(cap: number, dpr: number, additive: boolean) {
    this.cap = cap
    this.dpr = dpr
    this.additive = additive
    this.resize()
  }

  private resize() {
    this.w = window.innerWidth
    this.h = window.innerHeight
    this.cv.width = Math.floor(this.w * this.dpr)
    this.cv.height = Math.floor(this.h * this.dpr)
    this.cv.style.width = this.w + 'px'
    this.cv.style.height = this.h + 'px'
  }

  spawn(p: Partial<Particle> & { kind: PKind; x: number; y: number }) {
    let slot: Particle | null = null
    const n = this.pool.length
    for (let i = 0; i < n; i++) {
      const c = this.pool[(this.cursor + i) % n]
      if (!c.on) {
        slot = c
        this.cursor = (this.cursor + i + 1) % n
        break
      }
    }
    if (!slot) {
      if (n >= this.cap) return
      slot = {
        on: false, kind: 'dot', x: 0, y: 0, vx: 0, vy: 0, age: 0, life: 1, size: 3,
        rot: 0, vr: 0, color: '#fff', g: 0, drag: 1, grow: 0
      }
      this.pool.push(slot)
    }
    slot.on = true
    slot.kind = p.kind
    slot.x = p.x
    slot.y = p.y
    slot.vx = p.vx ?? 0
    slot.vy = p.vy ?? 0
    slot.age = 0
    slot.life = p.life ?? 0.8
    slot.size = p.size ?? 3
    slot.rot = p.rot ?? 0
    slot.vr = p.vr ?? 0
    slot.color = p.color ?? '#fff'
    slot.g = p.g ?? 0
    slot.drag = p.drag ?? 0.99
    slot.grow = p.grow ?? 0
    this.live++
    if (!this.raf) {
      this.last = performance.now()
      this.raf = requestAnimationFrame(this.step)
    }
  }

  clear() {
    for (const p of this.pool) p.on = false
    this.live = 0
    this.cx?.clearRect(0, 0, this.cv.width, this.cv.height)
  }

  private step = (now: number) => {
    const cx = this.cx
    if (!cx) {
      this.raf = 0
      return
    }
    const dt = Math.min(0.05, (now - this.last) / 1000)
    this.last = now
    cx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    cx.clearRect(0, 0, this.w, this.h)
    let comp: GlobalCompositeOperation = 'source-over'
    for (const p of this.pool) {
      if (!p.on) continue
      p.age += dt
      if (p.age >= p.life) {
        p.on = false
        this.live--
        continue
      }
      const k = p.age / p.life
      p.vy += p.g * dt
      const d = Math.pow(p.drag, dt * 60)
      p.vx *= d
      p.vy *= d
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.rot += p.vr * dt
      const want: GlobalCompositeOperation =
        this.additive && (p.kind === 'spark' || p.kind === 'ember') ? 'lighter' : 'source-over'
      if (want !== comp) {
        cx.globalCompositeOperation = want
        comp = want
      }
      switch (p.kind) {
        case 'spark': {
          cx.globalAlpha = 1 - k * k
          cx.strokeStyle = p.color
          cx.lineWidth = p.size * (1 - k * 0.6)
          cx.lineCap = 'round'
          cx.beginPath()
          cx.moveTo(p.x, p.y)
          cx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035)
          cx.stroke()
          break
        }
        case 'ember':
        case 'dot': {
          cx.globalAlpha = 1 - k
          cx.fillStyle = p.color
          cx.beginPath()
          cx.arc(p.x, p.y, Math.max(0.5, p.size * (1 - k * 0.5)), 0, 6.283)
          cx.fill()
          break
        }
        case 'confetti': {
          cx.globalAlpha = k < 0.75 ? 1 : (1 - k) / 0.25
          cx.save()
          cx.translate(p.x, p.y)
          cx.rotate(p.rot)
          cx.scale(1, Math.cos(p.age * 9 + p.rot))
          cx.fillStyle = p.color
          cx.fillRect(-p.size, -p.size * 0.5, p.size * 2, p.size)
          cx.restore()
          break
        }
        case 'ring': {
          const r = p.size + p.grow * p.age
          cx.globalAlpha = (1 - k) * 0.9
          cx.strokeStyle = p.color
          cx.lineWidth = Math.max(0.5, 4 * (1 - k))
          cx.beginPath()
          cx.arc(p.x, p.y, r, 0, 6.283)
          cx.stroke()
          break
        }
        case 'smoke': {
          cx.globalAlpha = (1 - k) * 0.35
          cx.fillStyle = p.color
          cx.beginPath()
          cx.arc(p.x, p.y, p.size + p.grow * p.age, 0, 6.283)
          cx.fill()
          break
        }
      }
    }
    cx.globalAlpha = 1
    cx.globalCompositeOperation = 'source-over'
    this.raf = this.live > 0 ? requestAnimationFrame(this.step) : 0
    if (!this.raf) cx.clearRect(0, 0, this.w, this.h)
  }
}

// ───────────────────────────── cinematic controller ─────────────────────────────
class Cinema {
  node: HTMLDivElement
  private timers: number[] = []
  closed = false
  private onKey: (e: KeyboardEvent) => void
  onClose?: () => void

  constructor(parent: HTMLElement, kind: string, html: string) {
    this.node = mk('div', `cc-fx-cinema cc-fx-cin-${kind}`, parent)
    this.node.innerHTML = html
    this.node.addEventListener('click', () => this.close(true))
    this.onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault()
        this.close(true)
      }
    }
    window.addEventListener('keydown', this.onKey, true)
  }

  at(ms: number, fn: () => void) {
    this.timers.push(
      window.setTimeout(() => {
        if (!this.closed) fn()
      }, ms)
    )
  }

  q<T extends HTMLElement = HTMLElement>(sel: string): T | null {
    return this.node.querySelector<T>(sel)
  }

  close(fast = false) {
    if (this.closed) return
    this.closed = true
    this.timers.forEach((t) => window.clearTimeout(t))
    window.removeEventListener('keydown', this.onKey, true)
    this.node.classList.add('leaving')
    window.setTimeout(() => this.node.remove(), fast ? 180 : 650)
    this.onClose?.()
  }
}

// ───────────────────────────── content ─────────────────────────────
const ROLE_META: Record<
  PlayerRole,
  { icon: string; l1: string; l2: string; color: string; tag: string; hint: string; goal: string }
> = {
  runner: {
    icon: '🏃',
    l1: 'OBJECTIVE',
    l2: 'RUNNER',
    color: COLORS.runner,
    tag: 'Save the victim. Secure the proof. Beat the clock.',
    hint: 'Everyone is counting on you.',
    goal: 'Complete the civic response before time runs out'
  },
  saboteur: {
    icon: '🕵️',
    l1: 'THE',
    l2: 'SABOTEUR',
    color: COLORS.saboteur,
    tag: 'Mislead. Disrupt. Slip away unseen.',
    hint: '🤫 Only you know this — keep suspicion low.',
    goal: 'Derail the response without being caught'
  }
}

// Short, accurate civic facts (match the level topics already in the game).
const LEVEL_TIPS: Record<number, string[]> = {
  1: [
    'Dial 112 — India’s single emergency number for police, ambulance and fire.',
    'Good Samaritan protection: Section 134A of the Motor Vehicles Act shields people who help road-accident victims.',
    'In the “Golden Hour” after an injury, fast first aid plus an ambulance saves the most lives.'
  ],
  2: [
    'Cyber-fraud? Call 1930 (National Cyber Crime Helpline) immediately — speed helps freeze the money trail.',
    'Section 66D of the IT Act 2000 covers cheating by impersonation using a computer or phone.',
    'Scanning a QR code only ever sends money out — never scan one to “receive” a payment.'
  ],
  3: [
    'The RTI Act 2005 lets any citizen request records from public authorities — replies are due within 30 days.',
    'Photograph and date-stamp hazards: documented evidence makes a civic complaint stick.',
    'Report public-safety hazards to your ward office or municipal helpline — a witness is enough, you don’t need to be an expert.'
  ]
}

function tipFor(level: number, round: number): string {
  const list = LEVEL_TIPS[level] || LEVEL_TIPS[1]
  return list[(level + round) % list.length]
}

// ───────────────────────────── the director ─────────────────────────────
interface Settings {
  quality: FxQuality
  shake: boolean
  manual: boolean // true once the player picked a quality themselves
}

type SceneAny = Record<string, unknown>

class Juice {
  settings: Settings = { quality: 'high', shake: true, manual: false }
  reduced = false

  private root: HTMLDivElement | null = null
  private particles: Particles | null = null
  private flashEl!: HTMLDivElement
  private vigEl!: HTMLDivElement
  private urgentEl!: HTMLDivElement
  private popEl!: HTMLDivElement
  private comboEl!: HTMLDivElement
  private bannerEl!: HTMLDivElement
  private countEl!: HTMLDivElement
  private wipeEl!: HTMLDivElement
  private toastEl!: HTMLDivElement
  private panelEl!: HTMLDivElement
  private gearEl!: HTMLButtonElement

  // camera juice
  private trauma = 0
  private punchAmt = 0
  private camRaf = 0
  private camLast = 0
  private camT = 0
  private vpEl: HTMLElement | null = null
  private baseFov = 0

  // scene (duck-typed; we never import the 3D engine)
  private sceneGetter: (() => unknown) | null = null

  // cinema
  private cinema: Cinema | null = null

  // combo
  private comboCount = 0
  private comboAt = 0

  // misc state
  private playing = false
  private mounted = false
  private urgent = false
  private lastAlertAt = 0
  private perfRaf = 0
  private perfFrames = 0
  private perfStart = 0
  private perfBad = 0
  private laterTimers: number[] = []

  // ───────── lifecycle ─────────
  mount() {
    if (this.mounted && this.root && document.body.contains(this.root)) return
    this.mounted = true
    this.reduced = reducedMotion()
    try {
      const raw = localStorage.getItem(SETTINGS_KEY)
      if (raw) {
        const s = JSON.parse(raw) as Partial<Settings>
        if (s.quality === 'low' || s.quality === 'high') this.settings.quality = s.quality
        if (typeof s.shake === 'boolean') this.settings.shake = s.shake
        this.settings.manual = !!s.manual
      } else {
        this.settings.quality = defaultQuality()
        if (this.reduced) this.settings.shake = false
      }
    } catch {
      this.settings.quality = defaultQuality()
    }
    sound.setQuality(this.settings.quality)
    this.buildRoot()
    this.applyQuality(false)
    this.installGlobalUi()
  }

  unmount() {
    this.reset()
    this.stopPerf()
    this.root?.remove()
    this.root = null
    this.particles = null
    this.mounted = false
    document.documentElement.removeAttribute('data-cc-quality')
  }

  private persist() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings))
    } catch {
      /* ignore */
    }
  }

  private buildRoot() {
    document.getElementById('cc-juice')?.remove()
    const root = mk('div', 'cc-fx-root', document.body)
    root.id = 'cc-juice'
    this.root = root
    this.particles = new Particles(root)
    this.flashEl = mk('div', 'cc-fx-flash', root)
    this.vigEl = mk('div', 'cc-fx-vig', root)
    this.urgentEl = mk('div', 'cc-fx-urgent', root)
    mk('div', 'cc-fx-speed', root)
    this.popEl = mk('div', 'cc-fx-pops', root)
    this.comboEl = mk('div', 'cc-fx-combo', root)
    this.bannerEl = mk('div', 'cc-fx-banner', root)
    this.countEl = mk('div', 'cc-fx-count', root)
    this.wipeEl = mk('div', 'cc-fx-wipe', root)
    this.toastEl = mk('div', 'cc-fx-toasts', root)

    // settings gear + panel
    const wrap = mk('div', 'cc-fx-settings', root)
    this.gearEl = mk('button', 'cc-fx-gear', wrap, '⚙')
    this.gearEl.type = 'button'
    this.gearEl.title = 'Audio & visual settings'
    this.gearEl.setAttribute('aria-label', 'Audio and visual settings')
    this.gearEl.setAttribute('aria-expanded', 'false')
    this.panelEl = mk('div', 'cc-fx-panel', wrap)
    this.panelEl.hidden = true
    this.panelEl.setAttribute('role', 'dialog')
    this.panelEl.setAttribute('aria-label', 'Audio and visual settings')
    this.panelEl.innerHTML = `
      <div class="cc-fx-row"><span>Visual quality</span>
        <div class="cc-fx-seg" role="group" aria-label="Visual quality">
          <button type="button" data-q="low">Low</button><button type="button" data-q="high">High</button>
        </div></div>
      <div class="cc-fx-row"><span>Sound</span><button type="button" class="cc-fx-tgl" data-k="sound"></button></div>
      <div class="cc-fx-row"><span>Music</span><button type="button" class="cc-fx-tgl" data-k="music"></button></div>
      <div class="cc-fx-row"><span>Screen shake</span><button type="button" class="cc-fx-tgl" data-k="shake"></button></div>
      <p class="cc-fx-hint">Low turns off glow, blur and heavy particles and renders at 1× scale — pick it if the game stutters.</p>`
    this.gearEl.addEventListener('click', (e) => {
      e.stopPropagation()
      this.togglePanel()
      this.gearEl.blur()
    })
    this.panelEl.addEventListener('click', (e) => {
      e.stopPropagation()
      const t = (e.target as HTMLElement).closest('button') as HTMLButtonElement | null
      if (!t) return
      if (t.dataset.q) this.setQuality(t.dataset.q as FxQuality, true)
      else if (t.dataset.k === 'sound') {
        sound.setMuted(!sound.isMuted())
        sound.playToggle(!sound.isMuted())
      } else if (t.dataset.k === 'music') {
        sound.setMusicEnabled(!sound.isMusicEnabled())
        sound.playToggle(sound.isMusicEnabled())
      } else if (t.dataset.k === 'shake') {
        this.settings.shake = !this.settings.shake
        this.persist()
        sound.playToggle(this.settings.shake)
        if (this.settings.shake) this.addTrauma(0.3)
      }
      this.refreshPanel()
      t.blur()
    })
    document.addEventListener('pointerdown', (e) => {
      if (!this.panelEl.hidden && !(e.target as HTMLElement).closest('.cc-fx-settings')) this.togglePanel(false)
    })
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && !this.panelEl.hidden) this.togglePanel(false)
    })
    this.refreshPanel()
  }

  private togglePanel(force?: boolean) {
    const open = force ?? this.panelEl.hidden
    this.panelEl.hidden = !open
    this.gearEl.setAttribute('aria-expanded', String(open))
    if (open) this.refreshPanel()
  }

  private refreshPanel() {
    const q = this.settings.quality
    this.panelEl.querySelectorAll<HTMLButtonElement>('[data-q]').forEach((b) => {
      const on = b.dataset.q === q
      b.classList.toggle('on', on)
      b.setAttribute('aria-pressed', String(on))
    })
    const set = (k: string, on: boolean) => {
      const b = this.panelEl.querySelector<HTMLButtonElement>(`[data-k="${k}"]`)
      if (!b) return
      b.textContent = on ? 'ON' : 'OFF'
      b.classList.toggle('on', on)
      b.setAttribute('aria-pressed', String(on))
    }
    set('sound', !sound.isMuted())
    set('music', sound.isMusicEnabled())
    set('shake', this.settings.shake)
  }

  // ───────── quality ─────────
  setQuality(q: FxQuality, manual = false) {
    if (q === this.settings.quality && !manual) return
    this.settings.quality = q
    if (manual) this.settings.manual = true
    sound.setQuality(q)
    this.persist()
    this.applyQuality(true)
    this.refreshPanel()
    if (manual) {
      sound.playToggle(q === 'high')
      this.toast(q === 'low' ? 'Low quality — max performance' : 'High quality — full effects')
    }
  }

  private applyQuality(announce: boolean) {
    const low = this.settings.quality === 'low'
    document.documentElement.setAttribute('data-cc-quality', this.settings.quality)
    this.particles?.configure(low ? 140 : 700, low ? 1 : Math.min(window.devicePixelRatio || 1, 2), !low)
    this.applySceneQuality()
    void announce
  }

  /** Duck-typed so we never depend on the 3D engine's private API surface. */
  private applySceneQuality() {
    const scene = this.sceneGetter?.() as SceneAny | null | undefined
    if (!scene) return
    try {
      const low = this.settings.quality === 'low'
      const r = scene.renderer as
        | {
            setPixelRatio?: (n: number) => void
            setSize?: (w: number, h: number) => void
            shadowMap?: { type: number }
          }
        | undefined
      const container = scene.container as HTMLElement | undefined
      if (r?.setPixelRatio && r.setSize) {
        r.setPixelRatio(low ? 1 : Math.min(window.devicePixelRatio || 1, 2))
        r.setSize(container?.clientWidth || window.innerWidth, container?.clientHeight || window.innerHeight)
      }
      const three = scene.scene as
        | {
            traverse?: (fn: (o: Record<string, unknown>) => void) => void
          }
        | undefined
      three?.traverse?.((o) => {
        if (o.isDirectionalLight && o.castShadow) {
          const sh = o.shadow as {
            mapSize: { set: (w: number, h: number) => void }
            map: { dispose: () => void } | null
          }
          sh.mapSize.set(low ? 1024 : 2048, low ? 1024 : 2048)
          if (sh.map) {
            sh.map.dispose()
            sh.map = null
          }
        }
      })
    } catch {
      /* never let a cosmetic tweak break the game */
    }
  }

  attachScene(getter: () => unknown) {
    this.sceneGetter = getter
    window.setTimeout(() => this.applySceneQuality(), 60)
    window.setTimeout(() => this.applySceneQuality(), 800)
  }

  setPlaying(p: boolean) {
    this.playing = p
    if (p) this.startPerf()
    else this.stopPerf()
  }

  // ───────── FPS watchdog (auto-drop to Low on weak machines) ─────────
  private startPerf() {
    if (this.perfRaf) return
    this.perfFrames = 0
    this.perfStart = performance.now()
    this.perfBad = 0
    const tick = (now: number) => {
      this.perfFrames++
      const span = now - this.perfStart
      if (span >= 2500) {
        const fps = (this.perfFrames * 1000) / span
        if (!document.hidden && this.playing && this.settings.quality === 'high' && !this.settings.manual) {
          this.perfBad = fps < 38 ? this.perfBad + 1 : 0
          if (this.perfBad >= 2) {
            this.setQuality('low', false)
            this.toast('Performance mode enabled (Low quality). Change it with ⚙')
          }
        }
        this.perfFrames = 0
        this.perfStart = now
      }
      this.perfRaf = this.playing ? requestAnimationFrame(tick) : 0
    }
    this.perfRaf = requestAnimationFrame(tick)
  }

  private stopPerf() {
    if (this.perfRaf) cancelAnimationFrame(this.perfRaf)
    this.perfRaf = 0
  }

  // ───────── global UI feedback (clicks, hover) ─────────
  private installGlobalUi() {
    const isUi = (t: EventTarget | null): HTMLElement | null => {
      const el = (t as HTMLElement | null)?.closest?.('button, [role="button"], a, .cc-level-card, select') as HTMLElement | null
      if (!el || el.closest('.cc-fx-root')) return null
      if ((el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true') return null
      return el
    }
    document.addEventListener(
      'click',
      (e) => {
        const el = isUi(e.target)
        if (!el) return
        sound.playClick()
        if (this.settings.quality === 'high') this.ring(e.clientX, e.clientY, COLORS.cyan, 6, 90, 0.35)
      },
      true
    )
    document.addEventListener(
      'pointerover',
      (e) => {
        const el = isUi(e.target)
        if (!el) return
        const from = (e as PointerEvent).relatedTarget as Node | null
        if (from && el.contains(from)) return
        sound.playHover()
      },
      true
    )
    // phase-agnostic: unlock audio on the very first gesture
    window.addEventListener('pointerdown', () => sound.unlock(), { once: true, passive: true })
  }

  // ───────── timers that survive React re-renders ─────────
  later(ms: number, fn: () => void) {
    const id = window.setTimeout(() => {
      this.laterTimers = this.laterTimers.filter((t) => t !== id)
      fn()
    }, ms)
    this.laterTimers.push(id)
  }

  reset() {
    this.laterTimers.forEach((t) => window.clearTimeout(t))
    this.laterTimers = []
    this.cinema?.close(true)
    this.cinema = null
    this.setUrgent(false)
    this.setSprint(false)
    this.comboCount = 0
    this.particles?.clear()
    this.bannerEl?.getAnimations().forEach((a) => a.cancel())
    sound.stopMusic(0.4)
    document.documentElement.style.removeProperty('--cc-reveal-delay')
  }

  // ───────── anchors ─────────
  private anchor(target?: string | Element | null, fx = 0.5, fy = 0.35): { x: number; y: number } {
    const el = typeof target === 'string' ? document.querySelector(target) : target
    if (el) {
      const r = el.getBoundingClientRect()
      if (r.width > 0 || r.height > 0) return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    }
    return { x: window.innerWidth * fx, y: window.innerHeight * fy }
  }

  private qScale(): number {
    return (this.settings.quality === 'low' ? 0.35 : 1) * (this.reduced ? 0.5 : 1)
  }

  // ───────── particles API ─────────
  sparks(x: number, y: number, color: string = COLORS.gold, n = 26, speed = 480) {
    const p = this.particles
    if (!p) return
    const count = Math.max(3, Math.round(n * this.qScale()))
    for (let i = 0; i < count; i++) {
      const a = rand(0, 6.283)
      const s = rand(speed * 0.3, speed)
      p.spawn({
        kind: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: rand(0.35, 0.8), size: rand(1.5, 3.2), color, g: 600, drag: 0.94
      })
    }
  }

  ring(x: number, y: number, color: string = COLORS.white, size = 10, grow = 320, life = 0.6) {
    this.particles?.spawn({ kind: 'ring', x, y, size, grow, life, color })
  }

  confetti(x: number, y: number, n = 70, spread = 1.1) {
    const p = this.particles
    if (!p) return
    const count = Math.max(6, Math.round(n * this.qScale()))
    for (let i = 0; i < count; i++) {
      const a = -Math.PI / 2 + rand(-spread, spread)
      const s = rand(260, 820)
      p.spawn({
        kind: 'confetti', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: rand(1.6, 2.8), size: rand(3, 6), rot: rand(0, 6.283), vr: rand(-9, 9),
        color: CONFETTI[(Math.random() * CONFETTI.length) | 0], g: 900, drag: 0.975
      })
    }
  }

  embers(x: number, y: number, n = 30, color = '#fb923c') {
    const p = this.particles
    if (!p) return
    const count = Math.max(4, Math.round(n * this.qScale()))
    for (let i = 0; i < count; i++) {
      p.spawn({
        kind: 'ember', x: x + rand(-120, 120), y: y + rand(-20, 40),
        vx: rand(-30, 30), vy: rand(-220, -60), life: rand(0.9, 1.8), size: rand(1.5, 3.5),
        color, g: -30, drag: 0.985
      })
    }
  }

  smoke(x: number, y: number, n = 8, color = '#94a3b8') {
    const p = this.particles
    if (!p || this.settings.quality === 'low') return
    for (let i = 0; i < n; i++) {
      p.spawn({
        kind: 'smoke', x: x + rand(-30, 30), y: y + rand(-10, 20),
        vx: rand(-40, 40), vy: rand(-90, -20), life: rand(0.8, 1.4), size: rand(14, 26),
        grow: rand(30, 60), color, drag: 0.98
      })
    }
  }

  fireworks(x: number, y: number, color: string = COLORS.gold) {
    this.sparks(x, y, color, 46, 560)
    this.sparks(x, y, COLORS.white, 14, 360)
    this.ring(x, y, color, 8, 380, 0.7)
  }

  // ───────── camera juice (shake + punch) ─────────
  addTrauma(a: number) {
    if (!this.settings.shake || this.reduced) return
    this.trauma = clamp(this.trauma + a, 0, 1)
    this.camStart()
  }

  /** Quick zoom-in kick. Uses real camera FOV when the 3D scene exposes it, otherwise a CSS scale. */
  punch(a = 0.5) {
    if (this.reduced) a *= 0.4
    this.punchAmt = clamp(this.punchAmt + a, 0, 1.2)
    this.camStart()
  }

  private cameraObj(): { fov: number; updateProjectionMatrix: () => void } | null {
    const s = this.sceneGetter?.() as SceneAny | null | undefined
    const c = s?.camera as { fov?: number; updateProjectionMatrix?: () => void } | undefined
    if (c && typeof c.fov === 'number' && typeof c.updateProjectionMatrix === 'function') {
      return c as { fov: number; updateProjectionMatrix: () => void }
    }
    return null
  }

  private camStart() {
    if (this.camRaf) return
    this.camLast = performance.now()
    this.vpEl = document.querySelector<HTMLElement>('.cc-three-viewport')
    const cam = this.cameraObj()
    this.baseFov = cam ? cam.fov : 0
    this.camRaf = requestAnimationFrame(this.camStep)
  }

  private camStep = (now: number) => {
    const dt = Math.min(0.05, (now - this.camLast) / 1000)
    this.camLast = now
    this.camT += dt
    this.trauma = Math.max(0, this.trauma - dt * 1.7)
    this.punchAmt *= Math.exp(-dt * 7.5)
    if (!this.vpEl || !this.vpEl.isConnected) this.vpEl = document.querySelector<HTMLElement>('.cc-three-viewport')
    const cam = this.cameraObj()
    const amp = this.trauma * this.trauma
    const t = this.camT
    const x = (Math.sin(t * 47) + Math.sin(t * 31 + 1.3)) * 0.5 * amp * 16
    const y = (Math.sin(t * 53 + 2.1) + Math.sin(t * 29)) * 0.5 * amp * 12
    const r = Math.sin(t * 41) * amp * 0.9
    const useFov = !!cam && this.baseFov > 0
    const sc = 1 + this.trauma * 0.02 + (useFov ? 0 : this.punchAmt * 0.05)
    if (this.vpEl) {
      this.vpEl.style.transform =
        amp > 0.0004 || (!useFov && this.punchAmt > 0.002)
          ? `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) rotate(${r.toFixed(3)}deg) scale(${sc.toFixed(4)})`
          : ''
    }
    if (cam && useFov) {
      cam.fov = this.baseFov - this.punchAmt * 6
      cam.updateProjectionMatrix()
    }
    if (this.trauma > 0.002 || this.punchAmt > 0.002) {
      this.camRaf = requestAnimationFrame(this.camStep)
    } else {
      this.camRaf = 0
      if (this.vpEl) this.vpEl.style.transform = ''
      if (cam && this.baseFov > 0) {
        cam.fov = this.baseFov
        cam.updateProjectionMatrix()
      }
    }
  }

  // ───────── flash / light pulse / vignette / glitch ─────────
  flash(color: string = COLORS.white, alpha = 0.35, ms = 280) {
    if (!this.root) return
    const a = this.reduced ? alpha * 0.4 : alpha
    this.flashEl.style.background = color
    this.flashEl.animate([{ opacity: a }, { opacity: 0 }], { duration: ms, easing: 'ease-out' })
  }

  /** Radial light pulse centered on an anchor — reads as a lamp / energy burst. */
  pulse(color: string, x?: number, y?: number, radius = 520, ms = 650, alpha = 0.55) {
    if (!this.root) return
    const n = mk('div', 'cc-fx-pulse', this.root)
    const cx = x ?? window.innerWidth / 2
    const cy = y ?? window.innerHeight / 2
    n.style.left = cx + 'px'
    n.style.top = cy + 'px'
    n.style.width = n.style.height = radius * 2 + 'px'
    n.style.background = `radial-gradient(circle, ${color} 0%, transparent 65%)`
    const a = this.reduced ? alpha * 0.4 : alpha
    const an = n.animate(
      [
        { opacity: a, transform: 'translate(-50%,-50%) scale(0.3)' },
        { opacity: 0, transform: 'translate(-50%,-50%) scale(1.15)' }
      ],
      { duration: ms, easing: 'cubic-bezier(.16,1,.3,1)' }
    )
    an.onfinish = () => n.remove()
  }

  vignette(color: string, alpha = 0.7, ms = 700) {
    if (!this.root) return
    this.vigEl.style.setProperty('--vc', color)
    const a = this.reduced ? alpha * 0.4 : alpha
    this.vigEl.animate([{ opacity: a }, { opacity: 0 }], { duration: ms, easing: 'ease-out' })
  }

  glitch(ms = 420) {
    if (this.settings.quality === 'low' || this.reduced) return
    const vp = document.querySelector<HTMLElement>('.cc-three-viewport')
    if (!vp) return
    vp.classList.add('cc-fx-glitching')
    window.setTimeout(() => vp.classList.remove('cc-fx-glitching'), ms)
  }

  // ───────── HUD feedback ─────────
  popup(text: string, opts: { target?: string | Element | null; color?: string; size?: 'sm' | 'md' | 'lg'; dx?: number; dy?: number } = {}) {
    if (!this.root) return
    while (this.popEl.childElementCount > 14) this.popEl.firstElementChild?.remove()
    const pos = this.anchor(opts.target, 0.5, 0.22)
    const n = mk('div', `cc-fx-pop ${opts.size ?? 'md'}`, this.popEl, text)
    n.style.left = pos.x + (opts.dx ?? 0) + rand(-14, 14) + 'px'
    n.style.top = pos.y + (opts.dy ?? 0) + 'px'
    n.style.setProperty('--pc', opts.color ?? COLORS.gold)
    window.setTimeout(() => n.remove(), 1500)
  }

  private comboLabel(n: number): string {
    return n >= 6 ? 'UNSTOPPABLE' : n >= 4 ? 'ON FIRE' : n >= 3 ? 'HOT STREAK' : 'COMBO'
  }

  /** Called whenever a (local or remote) score increases. Purely cosmetic. */
  scored(delta: number, who: 'local' | 'remote', allowCombo: boolean) {
    if (delta <= 0) return
    if (who === 'remote') {
      this.popup(`+${delta}`, { target: '.cc-peer-card', color: '#93c5fd', size: 'sm', dy: 22 })
      return
    }
    const big = delta >= 25
    this.popup(`+${delta}`, { target: '.cc-hud-role-pill', color: big ? COLORS.gold : '#86efac', size: big ? 'lg' : 'md', dy: 34 })
    sound.playPoints(delta)
    const pill = document.querySelector('.cc-hud-role-pill')
    if (pill) {
      pill.classList.remove('cc-fx-bump')
      void (pill as HTMLElement).offsetWidth
      pill.classList.add('cc-fx-bump')
    }
    const a = this.anchor('.cc-hud-role-pill')
    this.sparks(a.x, a.y + 10, big ? COLORS.gold : '#86efac', big ? 28 : 12, 300)
    const now = performance.now()
    if (allowCombo) {
      this.comboCount = now - this.comboAt < 9000 ? this.comboCount + 1 : 1
      this.comboAt = now
      if (this.comboCount >= 2) this.showCombo(this.comboCount)
    }
  }

  private showCombo(n: number) {
    const c = this.comboEl
    c.className = 'cc-fx-combo'
    void c.offsetWidth
    c.style.setProperty('--cc', n >= 6 ? '#f472b6' : n >= 4 ? '#fb923c' : n >= 3 ? COLORS.gold : COLORS.cyan)
    c.innerHTML = `<span class="cc-fx-combo-n">×${n}</span><span class="cc-fx-combo-t">${this.comboLabel(n)}</span>`
    c.classList.add('show')
    sound.playCombo(n)
    this.punch(0.18 + Math.min(0.3, n * 0.04))
    const a = this.anchor(c, 0.5, 0.2)
    this.sparks(a.x, a.y, c.style.getPropertyValue('--cc') || COLORS.gold, 20, 360)
  }

  resetCombo() {
    this.comboCount = 0
    this.comboEl?.classList.remove('show')
  }

  pulseTimer(t: number) {
    const el = document.querySelector<HTMLElement>('.cc-objective-hud-capsule')
    if (!el) return
    el.dataset.ccUrgent = t <= 10 ? 'crit' : t <= 30 ? 'warn' : ''
    el.classList.remove('cc-fx-tick')
    void el.offsetWidth
    el.classList.add('cc-fx-tick')
  }

  setUrgent(on: boolean, t = 30) {
    const beat = clamp(0.4 + (t / 30) * 0.7, 0.4, 1.1)
    document.documentElement.style.setProperty('--cc-beat', beat.toFixed(2) + 's')
    if (this.urgent === on) return
    this.urgent = on
    document.documentElement.classList.toggle('cc-fx-is-urgent', on)
    if (!on) document.querySelector<HTMLElement>('.cc-objective-hud-capsule')?.removeAttribute('data-cc-urgent')
  }

  setSprint(on: boolean) {
    document.documentElement.classList.toggle('cc-fx-is-sprint', on && this.settings.quality === 'high')
  }

  bigCount(n: number) {
    if (!this.root) return
    const c = this.countEl
    c.textContent = String(n)
    c.getAnimations().forEach((a) => a.cancel())
    c.animate(
      [
        { opacity: 0, transform: 'translate(-50%,-50%) scale(2.2)' },
        { opacity: 0.95, transform: 'translate(-50%,-50%) scale(1)', offset: 0.18 },
        { opacity: 0, transform: 'translate(-50%,-50%) scale(0.85)' }
      ],
      { duration: 880, easing: 'cubic-bezier(.16,1,.3,1)' }
    )
  }

  toast(text: string, color: string = COLORS.cyan, ms = 2600) {
    if (!this.root) return
    while (this.toastEl.childElementCount > 3) this.toastEl.firstElementChild?.remove()
    const n = mk('div', 'cc-fx-toast', this.toastEl, text)
    n.style.setProperty('--tc', color)
    window.setTimeout(() => {
      n.classList.add('out')
      window.setTimeout(() => n.remove(), 360)
    }, ms)
  }

  banner(title: string, sub: string, opts: { color?: string; ms?: number; kicker?: string } = {}) {
    if (!this.root) return
    const b = this.bannerEl
    const ms = opts.ms ?? 1500
    b.style.setProperty('--bc', opts.color ?? COLORS.amber)
    b.innerHTML = `${opts.kicker ? `<div class="cc-fx-b-kick">${esc(opts.kicker)}</div>` : ''}<div class="cc-fx-b-title">${esc(title)}</div><div class="cc-fx-b-sub">${esc(sub)}</div>`
    b.getAnimations().forEach((a) => a.cancel())
    b.animate(
      [
        { opacity: 0, transform: 'translate(-50%,-50%) scale(1.5)' },
        { opacity: 1, transform: 'translate(-50%,-50%) scale(1)', offset: 0.14 },
        { opacity: 1, transform: 'translate(-50%,-50%) scale(1.03)', offset: 0.8 },
        { opacity: 0, transform: 'translate(-50%,-50%) scale(1.12)' }
      ],
      { duration: ms, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' }
    )
  }

  /** Diagonal colour sweep — makes phase changes feel stitched together. */
  wipe(color: string = COLORS.amber) {
    if (!this.root || this.reduced) return
    const w = this.wipeEl
    w.style.setProperty('--wc', color)
    w.getAnimations().forEach((a) => a.cancel())
    w.animate(
      [
        { clipPath: 'polygon(0 0,0 0,-18% 100%,-18% 100%)' },
        { clipPath: 'polygon(0 0,118% 0,100% 100%,0 100%)', offset: 0.45 },
        { clipPath: 'polygon(118% 0,118% 0,100% 100%,100% 100%)' }
      ],
      { duration: this.settings.quality === 'low' ? 380 : 620, easing: 'cubic-bezier(.65,0,.35,1)' }
    )
  }

  // ───────── semantic effects ─────────
  roundStart(role: PlayerRole, level: number, round: number, total: number) {
    const m = ROLE_META[role]
    this.banner(`ROUND ${round} — GO!`, m.tag, { color: m.color, ms: 1900, kicker: `LEVEL ${level} · ${role === 'runner' ? 'OBJECTIVE RUNNER' : 'SABOTEUR'}` })
    this.flash(m.color, 0.45, 520)
    this.pulse(m.color, undefined, undefined, 700, 800, 0.5)
    this.punch(0.9)
    this.addTrauma(0.35)
    const a = this.anchor(null, 0.5, 0.5)
    this.ring(a.x, a.y, m.color, 10, 700, 0.9)
    this.sparks(a.x, a.y, m.color, 40, 620)
    void total
  }

  timeUp() {
    this.banner("TIME'S UP!", 'The round is over', { color: COLORS.saboteur, ms: 1500 })
    sound.playTimeUp()
    this.flash('#ffffff', 0.55, 500)
    this.addTrauma(0.8)
    this.punch(0.6)
    this.vignette(COLORS.saboteur, 0.9, 900)
  }

  thirtySeconds() {
    this.banner('30 SECONDS!', 'Make every move count', { color: COLORS.saboteur, ms: 1400 })
    sound.playCountdown(3)
    this.flash(COLORS.saboteur, 0.25, 400)
    this.addTrauma(0.35)
    this.vignette(COLORS.saboteur, 0.8, 800)
  }

  finalCount(n: number) {
    this.bigCount(n)
    sound.playTick(1 - n / 10)
    this.punch(0.22 + (10 - n) * 0.02)
    this.addTrauma(0.1 + (10 - n) * 0.02)
    if (n <= 3) this.vignette(COLORS.saboteur, 0.6, 600)
    const a = this.anchor('.cc-objective-hud-capsule')
    this.sparks(a.x, a.y + 10, COLORS.saboteur, 10, 260)
  }

  taskComplete(items: { title: string; pts: number; big: boolean }[], role: PlayerRole) {
    const color = role === 'runner' ? COLORS.runner : COLORS.violet
    const big = items.some((i) => i.big)
    sound.playTaskComplete(big)
    this.flash(color, big ? 0.32 : 0.2, 380)
    this.punch(big ? 0.5 : 0.28)
    this.addTrauma(big ? 0.3 : 0.12)
    const a = this.anchor('.cc-hud-obj-list', 0.12, 0.55)
    this.pulse(color, a.x, a.y, 360, 700, 0.5)
    this.fireworks(a.x, a.y, color)
    if (big) this.confetti(a.x, a.y, 40, 1.4)
    items.slice(0, 2).forEach((it, i) => {
      this.later(i * 220, () =>
        this.popup(`✓ ${it.title}${it.pts ? `  +${it.pts}` : ''}`, {
          target: '.cc-hud-obj-list',
          color: COLORS.gold,
          size: 'md',
          dx: 150,
          dy: -40 + i * 26
        })
      )
    })
  }

  /** Runner-side alert: someone just interfered with the scene. */
  sabotaged(text: string) {
    sound.playSabotageAlert()
    this.lastAlertAt = performance.now()
    this.vignette(COLORS.saboteur, 0.95, 900)
    this.flash(COLORS.saboteur, 0.28, 360)
    this.addTrauma(0.55)
    this.glitch(520)
    this.banner('⚠ SABOTAGE!', text.replace(/^[^\w]+/, '').slice(0, 90), { color: COLORS.saboteur, ms: 1500 })
  }

  abilityUsed(id: string, name: string, index: number, cost: number) {
    sound.playAbility(id)
    const btn = document.querySelectorAll('.cc-ability-btn')[index] as Element | undefined
    const a = this.anchor(btn ?? '.cc-asymmetric-hud-panel')
    this.flash(COLORS.saboteur, 0.22, 320)
    this.pulse(COLORS.saboteur, a.x, a.y, 300, 600, 0.55)
    this.ring(a.x, a.y, COLORS.saboteur, 8, 260, 0.55)
    this.sparks(a.x, a.y, '#fca5a5', 28, 420)
    this.addTrauma(0.3)
    this.punch(0.35)
    this.glitch(300)
    this.popup(cost > 0 ? `${name}  −${cost}⚡` : name, { target: btn ?? '.cc-asymmetric-hud-panel', color: '#fca5a5', size: 'sm', dy: -26 })
    if (btn) {
      btn.classList.remove('cc-fx-used')
      void (btn as HTMLElement).offsetWidth
      btn.classList.add('cc-fx-used')
    }
  }

  abilityReady(index: number) {
    const btn = document.querySelectorAll('.cc-ability-btn')[index] as HTMLElement | undefined
    if (!btn) return
    sound.playPing()
    btn.classList.remove('cc-fx-ready')
    void btn.offsetWidth
    btn.classList.add('cc-fx-ready')
    const a = this.anchor(btn)
    this.ring(a.x, a.y, COLORS.amber, 6, 120, 0.45)
  }

  warn(text: string, color: string = COLORS.amber, target?: string) {
    sound.playDeny()
    this.popup(text, { target: target ?? '.cc-asymmetric-hud-panel', color, size: 'sm', dy: -20 })
    this.vignette(color, 0.45, 600)
  }

  trust(delta: number) {
    const up = delta > 0
    this.popup(`${up ? '+' : '−'}${Math.abs(Math.round(delta))}% trust`, {
      target: '.cc-hud-meter-fill.coop', color: up ? '#86efac' : '#fca5a5', size: 'sm', dy: -18
    })
    if (up) sound.playPing()
    else sound.playDeny()
    const a = this.anchor('.cc-hud-meter-fill.coop')
    this.sparks(a.x, a.y, up ? '#86efac' : '#fca5a5', 10, 220)
  }

  escapeTick(sec: number, max: number) {
    sound.playTick(sec / Math.max(1, max))
    this.addTrauma(0.12)
    this.punch(0.12)
  }

  escaped() {
    sound.playAbility('escape')
    this.flash('#ffffff', 0.5, 600)
    this.banner('ESCAPED!', 'Out of sight, out of reach', { color: COLORS.saboteur, ms: 1700 })
    this.punch(0.9)
    const a = this.anchor(null, 0.5, 0.5)
    this.smoke(a.x, a.y)
    this.sparks(a.x, a.y, '#fca5a5', 50, 560)
  }

  lightsOut() {
    if (performance.now() - this.lastAlertAt > 600) sound.playLightsOut()
    this.flash('#000000', 0.7, 900)
    this.vignette('#000', 1, 1200)
    this.glitch(360)
  }

  lightsOn() {
    this.flash('#fde68a', 0.4, 500)
    this.pulse('#fde68a', undefined, undefined, 800, 700, 0.45)
  }

  alarm() {
    sound.playSiren()
    this.vignette('#60a5fa', 0.7, 1200)
    this.vignette(COLORS.saboteur, 0.7, 1600)
    this.addTrauma(0.2)
  }

  interactBurst() {
    sound.playInteract()
    const a = this.anchor('.cc-interact-prompt-capsule', 0.5, 0.86)
    this.ring(a.x, a.y, COLORS.cyan, 8, 180, 0.4)
    this.sparks(a.x, a.y, COLORS.cyan, 10, 200)
    const cap = document.querySelector('.cc-interact-prompt-capsule')
    if (cap) {
      cap.classList.remove('cc-fx-pressed')
      void (cap as HTMLElement).offsetWidth
      cap.classList.add('cc-fx-pressed')
      window.setTimeout(() => cap.classList.remove('cc-fx-pressed'), 360)
    }
  }

  roundResult(result: 'win' | 'lose' | 'draw', mine: number, theirs: number) {
    sound.playRoundEnd(result)
    const a = this.anchor(null, 0.5, 0.18)
    if (result === 'win') {
      this.confetti(a.x, a.y, 80, 1.3)
      this.banner('ROUND WON!', `${mine} – ${theirs}`, { color: COLORS.runner, ms: 1700 })
      this.flash(COLORS.runner, 0.3, 500)
    } else if (result === 'lose') {
      this.embers(a.x, window.innerHeight * 0.9, 30)
      this.banner('ROUND LOST', `${mine} – ${theirs}`, { color: COLORS.saboteur, ms: 1700 })
      this.vignette(COLORS.saboteur, 0.7, 900)
    } else {
      this.banner('ROUND DRAWN', `${mine} – ${theirs}`, { color: COLORS.cyan, ms: 1700 })
      this.sparks(a.x, a.y + 80, COLORS.cyan, 30, 400)
    }
    this.punch(0.5)
  }

  levelComplete(won: boolean | null) {
    sound.playRoundEnd(won === null ? 'draw' : won ? 'win' : 'lose')
    const a = this.anchor(null, 0.5, 0.2)
    this.banner('LEVEL COMPLETE', won === null ? 'All square!' : won ? 'You took this level' : 'Your rival took this level', {
      color: COLORS.gold, ms: 1900
    })
    if (won) this.confetti(a.x, a.y, 90, 1.4)
    this.flash(COLORS.gold, 0.25, 500)
  }

  // ───────── cinematics ─────────
  private openCinema(kind: string, html: string): Cinema | null {
    if (!this.root) return null
    this.cinema?.close(true)
    const c = new Cinema(this.root, kind, html)
    this.cinema = c
    if (kind === 'verdict' || kind === 'final') document.documentElement.setAttribute('data-cc-cine', kind)
    c.onClose = () => {
      if (this.cinema === c) this.cinema = null
      document.documentElement.removeAttribute('data-cc-cine')
    }
    return c
  }

  roleReveal(role: PlayerRole, level: number, round: number) {
    const m = ROLE_META[role]
    const c = this.openCinema(
      'role',
      `<div class="cc-rv" data-role="${role}" style="--rc:${m.color}">
         <div class="cc-rv-rays"></div><div class="cc-rv-scan"></div>
         <div class="cc-rv-kick">LEVEL ${level} · ROUND ${round} — YOUR ROLE</div>
         <div class="cc-rv-icon">${m.icon}</div>
         <div class="cc-rv-title"><span>${esc(m.l1)}</span><b>${esc(m.l2)}</b></div>
         <div class="cc-rv-tag">${esc(m.tag)}</div>
         <div class="cc-rv-hint">${esc(m.hint)}</div>
         <div class="cc-rv-tip"><em>DID YOU KNOW?</em> ${esc(tipFor(level, round))}</div>
         <div class="cc-rv-skip">click or press Space to skip</div>
       </div>`
    )
    if (!c) return
    const mid = this.anchor(null, 0.5, 0.42)
    c.at(250, () => {
      sound.playRoleReveal(role)
      c.node.classList.add('slam')
      this.addTrauma(0.7)
      this.flash(m.color, 0.5, 600)
      this.ring(mid.x, mid.y, m.color, 10, 900, 1)
      if (role === 'runner') this.sparks(mid.x, mid.y, m.color, 54, 640)
      else {
        this.smoke(mid.x, mid.y + 40, 10, '#7f1d1d')
        this.glitch(500)
      }
    })
    c.at(1050, () => c.node.classList.add('tag'))
    c.at(1700, () => c.node.classList.add('tip'))
    c.at(3600, () => c.close())
  }

  roleSwitch(from: PlayerRole, to: PlayerRole, level: number) {
    const f = ROLE_META[from]
    const t = ROLE_META[to]
    const c = this.openCinema(
      'switch',
      `<div class="cc-sw" style="--fc:${f.color};--tc:${t.color}">
         <div class="cc-sw-title" data-text="ROLES SWAP!">ROLES SWAP!</div>
         <div class="cc-sw-stage">
           <div class="cc-sw-card">
             <div class="cc-sw-face front"><i>${f.icon}</i><small>WAS</small><b>${esc(f.l1)} ${esc(f.l2)}</b></div>
             <div class="cc-sw-face back"><i>${t.icon}</i><small>NOW</small><b>${esc(t.l1)} ${esc(t.l2)}</b></div>
           </div>
           <div class="cc-sw-arrows">⇄</div>
         </div>
         <div class="cc-sw-line">Same city. New mission. <strong>${esc(t.goal)}.</strong></div>
         <div class="cc-sw-tip"><em>WHY SWITCH?</em> Playing both sides shows how one person’s choice helps — or hurts — a whole community. ${esc(tipFor(level, 2))}</div>
         <div class="cc-rv-skip">click or press Space to skip</div>
       </div>`
    )
    if (!c) return
    const mid = this.anchor(null, 0.5, 0.45)
    sound.playRoleSwitch()
    c.at(120, () => c.node.classList.add('in'))
    c.at(650, () => {
      c.node.classList.add('flip')
      this.punch(0.5)
      this.ring(mid.x, mid.y, f.color, 10, 600, 0.6)
    })
    c.at(960, () => {
      c.node.classList.add('landed')
      this.addTrauma(0.65)
      this.flash(t.color, 0.5, 600)
      this.pulse(t.color, mid.x, mid.y, 600, 800, 0.6)
      this.sparks(mid.x, mid.y, t.color, 50, 600)
      this.ring(mid.x, mid.y, t.color, 10, 800, 0.9)
    })
    c.at(1700, () => c.node.classList.add('tip'))
    c.at(3600, () => c.close())
  }

  verdict(correct: boolean, summary: string) {
    const col = correct ? COLORS.gold : COLORS.saboteur
    const c = this.openCinema(
      'verdict',
      `<div class="cc-vd ${correct ? 'good' : 'bad'}" style="--vc:${col}">
         <div class="cc-vd-spot"></div>
         <div class="cc-vd-kick">SEALED VERDICT</div>
         <div class="cc-vd-line">The evidence has been weighed…</div>
         <div class="cc-vd-seal"><div class="cc-vd-ring"></div><div class="cc-vd-ring r2"></div><div class="cc-vd-icon">⚖️</div></div>
         <div class="cc-vd-result">
           <div class="cc-vd-stamp">${correct ? 'ACCUSATION UPHELD' : 'DEFENSE SUCCESSFUL'}</div>
           <div class="cc-vd-sub">${esc(summary.slice(0, 150))}</div>
         </div>
         <div class="cc-rv-skip">click or press Space to skip</div>
       </div>`
    )
    if (!c) return
    const mid = this.anchor(null, 0.5, 0.45)
    sound.playDrumroll(1.7)
    c.at(80, () => c.node.classList.add('in'))
    c.at(1850, () => {
      sound.playVerdictReveal(correct)
      c.node.classList.add('slam')
      this.flash('#ffffff', 0.85, 700)
      this.addTrauma(1)
      this.punch(1)
      this.ring(mid.x, mid.y, col, 10, 1100, 1)
      this.ring(mid.x, mid.y, '#ffffff', 10, 700, 0.6)
      if (correct) {
        this.fireworks(mid.x, mid.y, COLORS.gold)
        this.confetti(mid.x, mid.y - 60, 110, 1.5)
      } else {
        this.embers(mid.x, window.innerHeight * 0.85, 46)
        this.smoke(mid.x, mid.y + 60, 12, '#7f1d1d')
        this.glitch(600)
      }
    })
    c.at(2300, () => correct && this.fireworks(mid.x - 220, mid.y - 80, '#86efac'))
    c.at(2500, () => correct && this.fireworks(mid.x + 220, mid.y - 60, COLORS.cyan))
    c.at(4200, () => c.close())
  }

  finalVerdict(opts: {
    aName: string; bName: string; aScore: number; bScore: number
    winnerSide: 'a' | 'b' | null; localWon: boolean | null; winnerName: string
  }) {
    const { aName, bName, aScore, bScore, winnerSide, localWon, winnerName } = opts
    const draw = winnerSide === null
    const col = draw ? COLORS.cyan : localWon ? COLORS.gold : COLORS.saboteur
    const c = this.openCinema(
      'final',
      `<div class="cc-fn ${draw ? 'draw' : localWon ? 'won' : 'lost'}" style="--fc:${col}">
         <div class="cc-fn-kick">FINAL VERDICT</div>
         <div class="cc-fn-line">${draw ? 'Two evenly matched citizens…' : 'And the champion of Civic Clash is…'}</div>
         <div class="cc-fn-board">
           <div class="cc-fn-p a ${winnerSide === 'a' ? 'win' : ''}"><span>${esc(aName)}</span><b data-to="${aScore}">0</b></div>
           <div class="cc-fn-vs">VS</div>
           <div class="cc-fn-p b ${winnerSide === 'b' ? 'win' : ''}"><span>${esc(bName)}</span><b data-to="${bScore}">0</b></div>
         </div>
         <div class="cc-fn-result">
           <div class="cc-fn-crown">${draw ? '🤝' : '🏆'}</div>
           <div class="cc-fn-name">${draw ? 'HONORABLE CIVIC DRAW' : esc(winnerName.toUpperCase()) + ' WINS!'}</div>
           <div class="cc-fn-msg">${draw ? 'Equal skill, equal civic spirit.' : localWon ? 'Outstanding — you read the room and acted.' : 'Well fought — every round teaches something.'}</div>
         </div>
         <div class="cc-rv-skip">click or press Space to skip</div>
       </div>`
    )
    if (!c) return
    const mid = this.anchor(null, 0.5, 0.45)
    sound.playDrumroll(2.1)
    c.at(80, () => c.node.classList.add('in'))
    // score count-up
    const nums = Array.from(c.node.querySelectorAll<HTMLElement>('.cc-fn-p b'))
    const t0 = performance.now()
    const dur = 1900
    const tickCount = () => {
      if (c.closed) return
      const k = clamp((performance.now() - t0) / dur, 0, 1)
      const e = 1 - Math.pow(1 - k, 3)
      nums.forEach((n) => {
        n.textContent = String(Math.round(Number(n.dataset.to) * e))
      })
      if (k < 1) requestAnimationFrame(tickCount)
    }
    c.at(250, () => requestAnimationFrame(tickCount))
    c.at(2350, () => {
      nums.forEach((n) => (n.textContent = n.dataset.to ?? '0'))
      c.node.classList.add('reveal')
      sound.playFinal(draw ? 'draw' : localWon ? 'win' : 'lose')
      this.flash(col, 0.7, 800)
      this.addTrauma(0.9)
      this.punch(0.9)
      this.ring(mid.x, mid.y, col, 10, 1200, 1.1)
      if (localWon) {
        this.fireworks(mid.x, mid.y - 40, COLORS.gold)
        this.confetti(mid.x, mid.y - 80, 140, 1.6)
      } else if (draw) {
        this.sparks(mid.x, mid.y, COLORS.cyan, 50, 520)
        this.confetti(mid.x, mid.y - 80, 50, 1.3)
      } else {
        this.embers(mid.x, window.innerHeight * 0.9, 40, '#94a3b8')
      }
    })
    if (localWon) {
      c.at(2900, () => this.fireworks(mid.x - 260, mid.y - 120, '#86efac'))
      c.at(3200, () => this.fireworks(mid.x + 260, mid.y - 100, COLORS.cyan))
      c.at(3600, () => this.fireworks(mid.x, mid.y - 180, '#f472b6'))
    }
    c.at(6200, () => {
      c.close()
    })
  }
}

export const fx = new Juice()

// ───────────────────────────── React integration ─────────────────────────────
export interface JuiceInput {
  view: 'menu' | 'lobby' | 'playing'
  matchState: MatchState | null
  telemetry: GameTelemetryM2 | null
  localRole: PlayerRole
  localPlayerId: string
  isMoving: boolean
  isSprinting: boolean
  nearestPrompt?: string | null
  verdictReveal: VerdictRevealData | null
  hasDialogue: boolean
  getScene: () => unknown
}

interface JuiceState {
  phase: string | null
  lastRole: PlayerRole
  lastT: number | null
  scores: { l: number; r: number } | null
  telKey: string
  doneIds: Set<string> | null
  feedIds: Set<string> | null
  cd: Record<string, number>
  lowEnergy: boolean
  highSusp: boolean
  coop: number | null
  esc: number
  escDone: boolean
  env: { lights: boolean; cctv: boolean; alarm: boolean; noise: boolean } | null
  verdictKey: string
}

function makeState(): JuiceState {
  return {
    phase: null, lastRole: 'runner', lastT: null, scores: null, telKey: '', doneIds: null, feedIds: null,
    cd: {}, lowEnergy: false, highSusp: false, coop: null, esc: 0, escDone: false, env: null, verdictKey: ''
  }
}

function resetRoundState(S: JuiceState) {
  S.lastT = null
  S.telKey = ''
  S.doneIds = null
  S.feedIds = null
  S.cd = {}
  S.lowEnergy = false
  S.highSusp = false
  S.coop = null
  S.esc = 0
  S.escDone = false
  S.env = null
}

export function useJuice(input: JuiceInput): void {
  const inRef = useRef(input)
  inRef.current = input
  const stRef = useRef<JuiceState | null>(null)
  if (!stRef.current) stRef.current = makeState()
  const S = stRef.current

  const { view, matchState, telemetry, localPlayerId, nearestPrompt, verdictReveal, hasDialogue, isMoving, isSprinting } = input
  const phase = matchState?.phase ?? null
  const level = matchState?.currentLevel ?? 1
  const round = matchState?.currentRound ?? 1
  const paused = !!matchState?.isPaused
  const timeSec = matchState?.timeRemainingSec ?? null
  const myRole: PlayerRole = (matchState?.playerRoles && localPlayerId && matchState.playerRoles[localPlayerId]) || input.localRole

  let localScore = 0
  let remoteScore = 0
  if (matchState?.players) {
    for (const [pid, p] of Object.entries(matchState.players)) {
      if (pid === localPlayerId) localScore = p.totalScore
      else remoteScore = p.totalScore
    }
  }

  // mount / unmount the overlay root + E-key feedback
  useEffect(() => {
    fx.mount()
    const onKey = (e: KeyboardEvent) => {
      const cur = inRef.current
      if (e.code === 'KeyE' && !e.repeat && cur.view === 'playing' && cur.nearestPrompt) fx.interactBurst()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  // entering / leaving the 3D match
  useEffect(() => {
    fx.setPlaying(view === 'playing')
    if (view === 'playing') {
      sound.unlock()
      fx.attachScene(() => inRef.current.getScene())
    } else {
      fx.reset()
      Object.assign(S, makeState())
    }
  }, [view, S])

  // ───────── phase transitions ─────────
  useLayoutEffect(() => {
    const ms = inRef.current.matchState
    if (view !== 'playing' || !ms || !phase) return
    const prev = S.phase
    if (prev === phase) return
    S.phase = phase
    const me = myRole
    const fromPause = prev === 'PAUSED'
    const accent: Record<string, string> = {
      LEVEL_INTRO: COLORS.amber, ROUND_ACTIVE: me === 'runner' ? COLORS.runner : COLORS.saboteur,
      ROUND_ENDING: COLORS.saboteur, ACCUSATION_PHASE: COLORS.violet, VERDICT_REVEAL: COLORS.gold,
      ROUND_RESULTS: COLORS.cyan, ROLE_SWITCH: COLORS.violet, LEVEL_RESULTS: COLORS.gold, FINAL_RESULTS: COLORS.gold
    }
    if (prev !== null && !fromPause && phase !== 'PAUSED') fx.wipe(accent[phase] ?? COLORS.amber)

    switch (phase) {
      case 'LEVEL_INTRO':
        resetRoundState(S)
        fx.setUrgent(false)
        sound.stopMusic(0.6)
        sound.playLevelIntro()
        fx.later(prev === null ? 250 : 420, () => fx.roleReveal(me, ms.currentLevel, ms.currentRound))
        break
      case 'ROUND_ACTIVE':
        if (fromPause) {
          sound.startMusic('round')
          break
        }
        resetRoundState(S)
        fx.resetCombo()
        sound.playRoundStart()
        fx.roundStart(me, ms.currentLevel, ms.currentRound, ms.roundsPerLevel)
        sound.startMusic('round')
        sound.setMusicIntensity(0.1)
        break
      case 'ROUND_ENDING':
        fx.setUrgent(false)
        sound.stopMusic(1.2)
        fx.timeUp()
        break
      case 'ACCUSATION_PHASE':
        fx.setUrgent(false)
        sound.stopMusic(0.5)
        fx.later(500, () => sound.startMusic('accuse'))
        sound.playWhoosh()
        fx.banner('SEALED ACCUSATION', 'Weigh the evidence. Choose wisely.', { color: COLORS.violet, ms: 1800 })
        fx.vignette(COLORS.violet, 0.7, 900)
        break
      case 'VERDICT_REVEAL':
        sound.stopMusic(0.4)
        break
      case 'ROUND_RESULTS': {
        sound.stopMusic(0.5)
        const rr = ms.roundResults[ms.roundResults.length - 1]
        if (rr) {
          const mine = me === 'runner' ? rr.runnerScore : rr.saboteurScore
          const theirs = me === 'runner' ? rr.saboteurScore : rr.runnerScore
          fx.later(250, () => fx.roundResult(mine > theirs ? 'win' : mine < theirs ? 'lose' : 'draw', mine, theirs))
        }
        break
      }
      case 'ROLE_SWITCH':
        sound.stopMusic(0.4)
        fx.later(250, () => fx.roleSwitch(S.lastRole, me, ms.currentLevel))
        break
      case 'LEVEL_RESULTS': {
        sound.stopMusic(0.4)
        const ls = ms.levelSummaries[ms.levelSummaries.length - 1]
        const won = !ls ? null : ls.isDraw ? null : ls.winnerId ? ls.winnerId === localPlayerId : null
        fx.later(250, () => fx.levelComplete(won))
        break
      }
      case 'FINAL_RESULTS': {
        sound.stopMusic(0.4)
        const fr = ms.finalResult
        if (fr) {
          const winnerSide = fr.isDraw || !fr.winnerId ? null : fr.winnerId === fr.playerA.playerId ? 'a' : 'b'
          const localWon = fr.isDraw || !fr.winnerId ? null : fr.winnerId === localPlayerId
          fx.finalVerdict({
            aName: fr.playerA.playerName, bName: fr.playerB.playerName,
            aScore: fr.playerA.totalScore, bScore: fr.playerB.totalScore,
            winnerSide, localWon, winnerName: fr.winnerName || ''
          })
        }
        break
      }
      default:
        break
    }
    if (phase === 'LEVEL_INTRO' || phase === 'ROUND_ACTIVE' || phase === 'ROUND_RESULTS') S.lastRole = me
  }, [view, phase, level, round, myRole, localPlayerId, S])

  // ───────── sealed verdict cinematic ─────────
  useLayoutEffect(() => {
    if (view !== 'playing' || phase !== 'VERDICT_REVEAL' || !verdictReveal) return
    const key = `${level}-${round}`
    if (S.verdictKey === key) return
    S.verdictKey = key
    fx.verdict(!!verdictReveal.isAccusationCorrect, verdictReveal.outcomeSummary || '')
  }, [view, phase, verdictReveal, level, round, S])

  // ───────── timer: tension music, urgency, ticking ─────────
  useEffect(() => {
    const ms = inRef.current.matchState
    if (view !== 'playing' || !ms) return
    if (phase !== 'ROUND_ACTIVE') {
      return
    }
    sound.setMusicPaused(paused)
    if (paused || timeSec === null) return
    const total = ms.roundDuration || 240
    const prog = clamp(1 - timeSec / total, 0, 1)
    let inten = 0.1 + 0.55 * Math.pow(prog, 1.4)
    if (timeSec <= 30) inten = Math.max(inten, 0.65 + 0.35 * (1 - timeSec / 30))
    sound.setMusicIntensity(inten)
    fx.setUrgent(timeSec <= 30 && timeSec > 0, timeSec)
    if (S.lastT === timeSec) return
    const first = S.lastT === null
    S.lastT = timeSec
    if (first) return
    fx.pulseTimer(timeSec)
    if (timeSec <= 10 && timeSec > 0) fx.finalCount(timeSec)
    else if (timeSec === 30) fx.thirtySeconds()
    else if (timeSec === 60) fx.toast('⏱ ONE MINUTE LEFT', COLORS.amber)
    else if (timeSec < 30 && timeSec % 5 === 0) sound.playTick(0.5)
  }, [view, phase, paused, timeSec, S])

  // ───────── score pop-ups & combo ─────────
  useEffect(() => {
    if (view !== 'playing') return
    const prev = S.scores
    S.scores = { l: localScore, r: remoteScore }
    if (!prev) return
    const dl = localScore - prev.l
    const dr = remoteScore - prev.r
    const live = inRef.current.matchState?.phase === 'ROUND_ACTIVE'
    if (dl > 0) fx.scored(dl, 'local', live)
    if (dr > 0) fx.scored(dr, 'remote', false)
  }, [view, localScore, remoteScore, S])

  // ───────── telemetry: tasks, sabotage, abilities, environment ─────────
  useEffect(() => {
    const tel = inRef.current.telemetry
    const ms = inRef.current.matchState
    if (view !== 'playing' || !tel || !ms || ms.phase !== 'ROUND_ACTIVE') return
    const role = myRole
    const key = `${ms.currentLevel}-${ms.currentRound}`
    if (S.telKey !== key) {
      S.telKey = key
      S.doneIds = null
      S.feedIds = null
      S.cd = {}
      S.coop = null
      S.env = null
      S.esc = 0
      S.escDone = false
    }

    // 1) completed objectives / tasks (private to the local role)
    const done = new Map<string, { title: string; pts: number; big: boolean }>()
    const objs = role === 'runner' ? tel.runnerObjectives : tel.saboteurObjectives
    objs?.forEach((o) => {
      if (o.completed) done.set('o:' + o.id, { title: o.title, pts: 0, big: false })
    })
    ;(tel.tasks ?? []).forEach((t: { id: string; title: string; status: string; rewardPoints?: number; category?: string }) => {
      if (t.status === 'COMPLETED') {
        done.set('t:' + t.id, {
          title: t.title, pts: t.rewardPoints || 0, big: t.category === 'CIVIC_MAIN' || t.category === 'CIVIC_BONUS'
        })
      }
    })
    if (S.doneIds) {
      const fresh = [...done.keys()].filter((k) => !S.doneIds!.has(k)).map((k) => done.get(k)!)
      if (fresh.length) {
        fresh.sort((a, b) => b.pts - a.pts)
        fx.taskComplete(fresh, role)
      }
    }
    S.doneIds = new Set(done.keys())

    // 2) event feed → "something just got sabotaged"
    const feed = tel.eventFeed ?? []
    if (S.feedIds) {
      const seen = S.feedIds
      for (const it of [...feed].reverse()) {
        if (seen.has(it.id)) continue
        if (it.text.startsWith('🏆')) continue // score line, handled by score pop-ups
        if (it.type === 'sabotage' && role === 'runner') fx.sabotaged(it.text)
        else if (it.type === 'evidence') sound.playPing()
      }
    }
    S.feedIds = new Set(feed.map((i) => i.id))

    // 3) saboteur abilities
    if (role === 'saboteur') {
      const abs = tel.saboteurAbilities ?? []
      abs.forEach((ab, i) => {
        const prevCd = S.cd[ab.id + i]
        if (prevCd !== undefined) {
          if (prevCd <= 0 && ab.currentCooldownSec > 0) fx.abilityUsed(ab.id, ab.name, i, ab.energyCost)
          else if (prevCd > 0 && ab.currentCooldownSec <= 0) fx.abilityReady(i)
        }
        S.cd[ab.id + i] = ab.currentCooldownSec
      })
      const energy = tel.sabotageEnergy
      if (energy < 25 && !S.lowEnergy) {
        S.lowEnergy = true
        fx.warn('⚡ LOW ENERGY', COLORS.amber, '.cc-hud-meter-fill.energy')
      } else if (energy > 40) S.lowEnergy = false
      document.querySelector('.cc-hud-meter-fill.energy')?.classList.toggle('cc-fx-low', energy < 25)
      const susp = tel.suspicionLevel
      if (susp > 60 && !S.highSusp) {
        S.highSusp = true
        fx.warn('⚠ SUSPICION HIGH', COLORS.saboteur)
      } else if (susp < 45) S.highSusp = false
      document.documentElement.classList.toggle('cc-fx-suspicious', susp > 60)

      const es = tel.escapeProgress
      if (es?.isEscaping && es.progressSec > S.esc) fx.escapeTick(es.progressSec, es.maxSec || 5)
      S.esc = es?.isEscaping ? es.progressSec : 0
      if (es?.isCompleted && !S.escDone) {
        S.escDone = true
        fx.escaped()
      }
    } else {
      document.documentElement.classList.remove('cc-fx-suspicious')
      const coop = tel.communityCooperation
      if (S.coop !== null && Math.abs(coop - S.coop) >= 4) fx.trust(coop - S.coop)
      S.coop = coop
    }

    // 4) shared environment mechanisms
    const env = (tel.environmentalState ?? ms.environmentalState) as
      | { streetlights?: string; cctvOperational?: boolean; alarmActive?: boolean; noiseDistractionActive?: boolean }
      | undefined
    if (env) {
      const cur = {
        lights: env.streetlights !== 'OFF',
        cctv: env.cctvOperational !== false,
        alarm: !!env.alarmActive,
        noise: !!env.noiseDistractionActive
      }
      const p = S.env
      if (p) {
        if (p.lights && !cur.lights) fx.lightsOut()
        else if (!p.lights && cur.lights) fx.lightsOn()
        if (p.cctv && !cur.cctv) fx.glitch(520)
        if (!p.alarm && cur.alarm) fx.alarm()
        if (!p.noise && cur.noise) fx.addTrauma(0.35)
      }
      S.env = cur
    }
  }, [view, telemetry, myRole, S])

  // ───────── footsteps ─────────
  useEffect(() => {
    if (view !== 'playing' || phase !== 'ROUND_ACTIVE' || !isMoving || hasDialogue || paused) {
      fx.setSprint(false)
      return
    }
    const surface: FootSurface = level === 2 ? 'tile' : level === 3 ? 'gravel' : 'asphalt'
    const blocked = () => !!document.querySelector('.cc-modal-backdrop, .cc-menu-overlay, .cc-fx-cinema')
    const step = () => {
      if (!blocked()) sound.playFootstep(isSprinting, surface)
    }
    fx.setSprint(isSprinting)
    step()
    const id = window.setInterval(step, isSprinting ? 270 : 430)
    return () => {
      window.clearInterval(id)
      fx.setSprint(false)
    }
  }, [view, phase, isMoving, isSprinting, hasDialogue, paused, level])

  // ───────── interaction prompt appears ─────────
  const hadPrompt = useRef(false)
  useEffect(() => {
    const has = !!nearestPrompt
    if (has && !hadPrompt.current && view === 'playing') sound.playPing()
    hadPrompt.current = has
  }, [nearestPrompt, view])
}
