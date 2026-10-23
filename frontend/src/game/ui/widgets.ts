import Phaser from 'phaser'
import { COLORS, DISPLAY, FONT, H, W } from '../config/constants.ts'
import { Sfx } from '../utils/sfx.ts'

export const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`

type Pt = Phaser.Types.Math.Vector2Like
type Style = Phaser.Types.GameObjects.Text.TextStyle

/** Body text. Large sizes get a thin outline, everything gets a crisp drop shadow for legibility over the map. */
export function text(scene: Phaser.Scene, x: number, y: number, str: string, size = 18, color = '#ffffff', extra: Style = {}) {
  return scene.add
    .text(x, y, str, {
      fontFamily: FONT,
      fontSize: `${size}px`,
      color,
      stroke: hex(COLORS.bg),
      strokeThickness: size >= 26 ? Math.round(size / 9) : 0,
      ...extra,
    })
    .setShadow(0, 2, 'rgba(0,0,0,0.65)', 0, true, true)
}

/** Signage face (Bungee) for titles, numbers and labels. */
export function display(scene: Phaser.Scene, x: number, y: number, str: string, size = 32, color = '#ffffff', extra: Style = {}) {
  return text(scene, x, y, str, size, color, { fontFamily: DISPLAY, strokeThickness: 0, letterSpacing: size <= 16 ? 2 : 1, ...extra })
}

/** Plate outline with the top-left and bottom-right corners cut, like a street sign. */
function chamfer(x: number, y: number, w: number, h: number, c: number): Pt[] {
  return [
    { x: x + c, y },
    { x: x + w, y },
    { x: x + w, y: y + h - c },
    { x: x + w - c, y: y + h },
    { x, y: y + h },
    { x, y: y + c },
  ]
}

/** Keep the part of a convex polygon left of X (used for the hover wipe). */
function clipLeft(pts: Pt[], X: number): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % pts.length]
    const aIn = a.x! <= X
    if (aIn) out.push(a)
    if (aIn !== b.x! <= X) out.push({ x: X, y: a.y! + ((b.y! - a.y!) * (X - a.x!)) / (b.x! - a.x!) })
  }
  return out
}

/** Viewfinder brackets on a rectangle's two square corners. */
function brackets(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, color: number, len = 14) {
  g.lineStyle(3, color, 1)
  g.lineBetween(x + w - len, y, x + w, y).lineBetween(x + w, y, x + w, y + len)
  g.lineBetween(x, y + h - len, x, y + h).lineBetween(x, y + h, x + len, y + h)
}

export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, fill: number = COLORS.panel, edge: number = COLORS.panelEdge, cut = 14) {
  const g = scene.add.graphics()
  const pts = chamfer(x, y, w, h, cut)
  g.fillStyle(fill, 0.94).fillPoints(pts, true)
  g.lineStyle(1.5, edge, 0.75).strokePoints(pts, true)
  brackets(g, x - 4, y - 4, w + 8, h + 8, edge)
  return g
}

export interface ButtonHandle {
  container: Phaser.GameObjects.Container
  setEnabled(v: boolean): void
  /** Keyboard highlight: shows the same accent wipe as hover. */
  setFocus(v: boolean): void
}

interface ButtonOpts {
  /** Keyboard shortcut shown as a keycap on the left. */
  key?: string
  /** Use the body face (for sentence-length labels). */
  body?: boolean
}

/**
 * Sign-plate button. Hover wipes the accent colour in from the left and the plate leans
 * slightly toward the pointer; press squashes it. Children: [graphics, label, keycap?].
 */
export function button(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  onClick: () => void,
  color: number = COLORS.amber,
  size = 22,
  opts: ButtonOpts = {},
): ButtonHandle {
  const c = scene.add.container(x, y)
  const g = scene.add.graphics()
  const cut = Math.min(14, h / 3)
  const plate = chamfer(-w / 2, -h / 2, w, h, cut)
  const pad = opts.key ? h * 0.5 + 18 : 0
  // sentence labels read left-aligned after the keycap; short CTAs sit centred
  const baseX = opts.body ? -w / 2 + (pad || 18) + 6 : pad / 2
  const t = opts.body
    ? text(scene, baseX, 0, label, size, hex(color), { wordWrap: { width: w - pad - 32 } }).setOrigin(0, 0.5)
    : display(scene, baseX, 0, label, size, hex(color)).setOrigin(0.5)
  const items: Phaser.GameObjects.GameObject[] = [g, t]
  let cap: Phaser.GameObjects.Text | undefined
  if (opts.key) {
    cap = display(scene, -w / 2 + h * 0.25 + 12, 0, opts.key, Math.min(18, size), hex(color)).setOrigin(0.5)
    items.push(cap)
  }
  c.add(items)
  c.setSize(w, h)

  const st = { p: 0 }
  const draw = () => {
    g.clear()
    g.fillStyle(0x000000, 0.4).fillPoints(plate.map((q) => ({ x: q.x!, y: q.y! + 5 })), true)
    g.fillStyle(COLORS.panel, 1).fillPoints(plate, true)
    if (st.p > 0.001) g.fillStyle(color, 1).fillPoints(clipLeft(plate, -w / 2 + w * st.p), true)
    g.lineStyle(2, color, 1).strokePoints(plate, true)
    if (opts.key) {
      const s = h * 0.5
      const kx = -w / 2 + 12
      g.lineStyle(1.5, st.p > 0.5 ? COLORS.bg : color, 0.9).strokeRect(kx, -s / 2, s, s)
    }
    const ink = st.p > 0.5 ? hex(COLORS.bg) : hex(color)
    t.setColor(ink)
    cap?.setColor(ink)
  }
  draw()

  let enabled = true
  let wipe: Phaser.Tweens.Tween | undefined
  const to = (p: number, ms: number) => {
    wipe?.stop()
    wipe = scene.tweens.add({ targets: st, p, duration: ms, ease: 'Cubic.easeOut', onUpdate: draw })
  }
  c.setInteractive({ useHandCursor: true })
  c.on('pointerover', () => {
    if (!enabled) return
    Sfx.hover()
    to(1, 220)
  })
  c.on('pointermove', (p: Phaser.Input.Pointer) => {
    if (!enabled) return
    // magnetic lean: content drifts a few px toward the pointer
    const dx = Phaser.Math.Clamp((p.x - c.x) * 0.06, -6, 6)
    const dy = Phaser.Math.Clamp((p.y - c.y) * 0.12, -3, 3)
    t.setPosition(baseX + dx, dy)
  })
  c.on('pointerout', () => {
    to(0, 160)
    scene.tweens.add({ targets: t, x: baseX, y: 0, duration: 160, ease: 'Cubic.easeOut' })
  })
  c.on('pointerdown', () => {
    if (!enabled) return
    Sfx.click()
    scene.tweens.add({ targets: c, scaleX: 0.95, scaleY: 0.92, duration: 60, yoyo: true, ease: 'Quad.easeOut' })
    onClick()
  })
  return {
    container: c,
    setEnabled(v: boolean) {
      enabled = v
      c.setAlpha(v ? 1 : 0.4)
      if (!v) to(0, 120)
    },
    setFocus(v: boolean) {
      if (enabled) to(v ? 1 : 0, v ? 160 : 120)
    },
  }
}

/** Full-width slab with hazard-tape edges; the word slams in from the right. */
export function banner(scene: Phaser.Scene, y: number, label: string, color: number) {
  const g = scene.add.graphics().setDepth(50)
  g.fillStyle(0x000000, 0.72).fillRect(0, y - 70, W, 140)
  for (const edge of [y - 70, y + 62]) {
    g.fillStyle(color, 1)
    for (let x = -20; x < W + 20; x += 28) g.fillPoints([{ x, y: edge }, { x: x + 14, y: edge }, { x: x + 6, y: edge + 8 }, { x: x - 8, y: edge + 8 }], true)
  }
  const t = display(scene, W + 400, y, label, 84, hex(color)).setOrigin(0.5).setDepth(51)
  const echo = display(scene, W + 400, y, label, 84, hex(color)).setOrigin(0.5).setDepth(50).setAlpha(0.35)
  scene.tweens.add({ targets: t, x: W / 2, duration: 520, ease: 'Expo.easeOut' })
  scene.tweens.add({ targets: echo, x: W / 2, duration: 700, ease: 'Expo.easeOut', onComplete: () => echo.destroy() })
  return [g, t]
}

/**
 * Night skyline used behind menu-like screens: two silhouette layers, windows that switch
 * on and off (somebody is home), and a light drizzle. One timer drives every window.
 */
export function backdrop(scene: Phaser.Scene) {
  scene.add.graphics().fillGradientStyle(0x0b1030, 0x0b1030, COLORS.bg, COLORS.bg, 1).fillRect(0, 0, W, H)
  const windows: Phaser.GameObjects.Rectangle[] = []
  const rng = new Phaser.Math.RandomDataGenerator(['circle'])
  // draw order is creation order: each layer's windows sit on that layer, under the next one
  const layer = (base: number, tint: number, minH: number, maxH: number, lit: number) => {
    const g = scene.add.graphics().fillStyle(tint, 1)
    for (let x = -10; x < W; ) {
      const bw = rng.between(48, 110)
      const bh = rng.between(minH, maxH)
      g.fillRect(x, base - bh, bw - 4, bh + H)
      for (let wy = base - bh + 14; wy < base - 12; wy += 22)
        for (let wx = x + 10; wx < x + bw - 16; wx += 18)
          if (rng.frac() < lit) windows.push(scene.add.rectangle(wx, wy, 7, 9, rng.frac() < 0.75 ? COLORS.amber : COLORS.cyan, rng.frac() < 0.6 ? 0.55 : 0))
      x += bw
    }
  }
  layer(H - 150, 0x0d1236, 120, 300, 0.18)
  layer(H - 40, 0x080b1e, 60, 200, 0.12)
  scene.time.addEvent({
    delay: 260,
    loop: true,
    callback: () => {
      const w = rng.pick(windows)
      w.setFillStyle(w.fillColor, w.fillAlpha > 0 ? 0 : 0.55)
    },
  })
  for (let i = 0; i < 36; i++) {
    const d = scene.add.rectangle(rng.between(0, W), rng.between(-H, H), 1.5, rng.between(10, 18), COLORS.cyan, 0.18)
    scene.tweens.add({ targets: d, y: H + 20, x: d.x - 30, duration: rng.between(700, 1100), repeat: -1, onRepeat: () => d.setPosition(rng.between(0, W + 40), -20) })
  }
}

/**
 * Darkness over the backdrop with a soft hole that follows the pointer, widening over
 * anything clickable. The menu's version of Priya's light radius.
 */
export function flashlight(scene: Phaser.Scene, depth = 1) {
  const rt = scene.add.renderTexture(0, 0, W, H).setOrigin(0).setDepth(depth)
  const brush = scene.make.image({ key: 'light', add: false })
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches
  const p = { x: W * 0.62, y: H * 0.45, s: 2.4 }
  const canvas = scene.game.canvas
  const tick = () => {
    if (!rt.active) return scene.events.off('update', tick)
    const ptr = scene.input.activePointer
    const moved = ptr.x !== 0 || ptr.y !== 0
    // touch / untouched: drift gently so the city still breathes
    const tx = moved ? ptr.x : W * 0.62 + Math.sin(scene.time.now / 1800) * 180
    const ty = moved ? ptr.y : H * 0.45 + Math.cos(scene.time.now / 2300) * 80
    const k = still ? 1 : 0.12
    p.x += (tx - p.x) * k
    p.y += (ty - p.y) * k
    p.s += ((canvas.style.cursor === 'pointer' ? 3.3 : 2.4) - p.s) * (still ? 1 : 0.1)
    rt.clear().fill(COLORS.bg, 0.93)
    rt.erase(brush.setScale(p.s).setPosition(p.x, p.y))
  }
  scene.events.on('update', tick)
  return rt
}

/**
 * Viewfinder chrome for non-gameplay screens: corner brackets, a REC light with the
 * screen name, a running timecode and a frame ruler with a sweeping playhead.
 */
export function frame(scene: Phaser.Scene, name: string, foot = '') {
  const d = 90
  const g = scene.add.graphics().setDepth(d)
  const m = 18
  const L = 34
  g.lineStyle(2, COLORS.amber, 0.85)
  g.lineBetween(m, m, m + L, m).lineBetween(m, m, m, m + L)
  g.lineBetween(W - m - L, m, W - m, m).lineBetween(W - m, m, W - m, m + L)
  g.lineBetween(m, H - m, m + L, H - m).lineBetween(m, H - m - L, m, H - m)
  g.lineBetween(W - m - L, H - m, W - m, H - m).lineBetween(W - m, H - m - L, W - m, H - m)

  // frame ruler along the bottom
  const rx0 = 120
  const rx1 = W - 120
  const ry = H - 26
  g.lineStyle(1, COLORS.muted, 0.5)
  for (let x = rx0, i = 0; x <= rx1; x += 13, i++) g.lineBetween(x, ry, x, ry - (i % 8 === 0 ? 9 : 4))
  const head = scene.add.rectangle(rx0, ry - 5, 2, 14, COLORS.amber).setDepth(d)
  scene.tweens.add({ targets: head, x: rx1, duration: 9000, repeat: -1 })

  const dot = scene.add.circle(m + 22, m + 24, 5, COLORS.red).setDepth(d)
  scene.tweens.add({ targets: dot, alpha: 0.15, duration: 600, yoyo: true, repeat: -1, ease: 'Stepped' })
  display(scene, m + 34, m + 17, `REC  ${name}`, 12, hex(COLORS.paper)).setDepth(d)
  if (foot) display(scene, m + 22, H - m - 34, foot, 11, hex(COLORS.muted)).setDepth(d)

  const tc = display(scene, W - m - 22, m + 17, '', 12, hex(COLORS.amber)).setOrigin(1, 0).setDepth(d)
  const born = scene.time.now
  const tick = () => {
    if (!tc.active) return scene.events.off('update', tick)
    const f = Math.floor(((scene.time.now - born) / 1000) * 24)
    const pad = (n: number) => n.toString().padStart(2, '0')
    tc.setText(`${pad(Math.floor(f / 86400))}:${pad(Math.floor(f / 1440) % 60)}:${pad(Math.floor(f / 24) % 60)}:${pad(f % 24)}`)
  }
  scene.events.on('update', tick)
}

/** "PERFECT" style timing stamp with an optional combo counter underneath. */
export function stamp(scene: Phaser.Scene, x: number, y: number, word: string, color: number, combo = 0) {
  const t = display(scene, x, y, word, 64, hex(color), { stroke: hex(COLORS.bg), strokeThickness: 8 })
    .setOrigin(0.5)
    .setAngle(-7)
    .setScale(2.4)
    .setAlpha(0)
    .setDepth(80)
  scene.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' })
  scene.tweens.add({ targets: t, alpha: 0, y: y - 30, delay: 1100, duration: 300, onComplete: () => t.destroy() })
  if (combo > 1) {
    const k = display(scene, x, y + 52, `COMBO x${combo}`, 18, hex(COLORS.amber)).setOrigin(0.5).setAngle(-7).setAlpha(0).setDepth(80)
    scene.tweens.add({ targets: k, alpha: 1, y: y + 46, delay: 160, duration: 200 })
    scene.tweens.add({ targets: k, alpha: 0, delay: 1150, duration: 300, onComplete: () => k.destroy() })
  }
  Sfx.stamp(combo)
}

/** ON / OFF sound toggle in the signage style. Bound to M as well. */
export function soundToggle(scene: Phaser.Scene, x: number, y: number, onChange?: (muted: boolean) => void) {
  const label = () => `SOUND  ${Sfx.muted ? 'OFF' : 'ON'}`
  const t = display(scene, x, y, label(), 12, hex(Sfx.muted ? COLORS.muted : COLORS.amber)).setOrigin(1, 0.5).setDepth(91)
  const flip = () => {
    const muted = Sfx.toggleMute()
    t.setText(label()).setColor(hex(muted ? COLORS.muted : COLORS.amber))
    onChange?.(muted)
  }
  t.setInteractive({ useHandCursor: true }).on('pointerdown', flip)
  scene.input.keyboard?.on('keydown-M', flip)
  return t
}
