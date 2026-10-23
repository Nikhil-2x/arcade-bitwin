import Phaser from 'phaser'
import { BALANCE, BAR_Y, COLORS, H, HUD_H, W } from '../config/constants.ts'
import { ABILITIES } from '../data/abilities.ts'
import type { AbilityId } from '../types.ts'
import { display, hex, text } from './widgets.ts'

export interface HudView {
  timeLeft: number
  battery: number
  allies: number
  awareness: number
  flashlight: boolean
  shareUses: number
  progress: number
  energy: number
  isolation: number
  abilityState: (id: AbilityId) => { reason: string | null; cd: number; uses: number }
}

interface PlayerTag {
  text: string
  color: number
}

interface HudOptions {
  runnerLabel: string
  barrierLabel: string
  /** Who controls each side, drawn as a filled chip in that player's colour. */
  runnerTag: PlayerTag
  barrierTag: PlayerTag
  abilities: AbilityId[]
  aiBarrier: boolean
  onAbility: (id: AbilityId) => void
}

const DEPTH = 30
const BAT_CELLS = 10
const ROUTE = { x: 490, y: 60, w: 300 }

/** Top status console, Barrier ability keycaps, toasts and the Barrier's intel feed. */
export class Hud {
  private g: Phaser.GameObjects.Graphics
  private timer: Phaser.GameObjects.Text
  private batteryText: Phaser.GameObjects.Text
  private chips: Phaser.GameObjects.Text
  private abilityText = new Map<AbilityId, Phaser.GameObjects.Text>()
  private alert: Phaser.GameObjects.Graphics
  private feedLines: { t: Phaser.GameObjects.Text; born: number }[] = []
  private toastObj?: Phaser.GameObjects.Container
  private slot: { x: number; w: number }[] = []

  private scene: Phaser.Scene
  private opts: HudOptions

  constructor(scene: Phaser.Scene, opts: HudOptions) {
    this.scene = scene
    this.opts = opts
    this.g = scene.add.graphics().setDepth(DEPTH)
    const d = DEPTH + 1
    const tagW = this.tag(20, opts.runnerTag)
    display(scene, 20 + tagW + 8, 8, opts.runnerLabel, 12, hex(COLORS.cyan)).setDepth(d)
    const bTagW = this.tag(884, opts.barrierTag)
    display(scene, 884 + bTagW + 8, 8, opts.barrierLabel, 12, hex(COLORS.purple)).setDepth(d)
    this.timer = display(scene, W / 2, 6, '0:00', 32).setOrigin(0.5, 0).setDepth(d)
    this.batteryText = display(scene, 196, 31, '', 14).setDepth(d)
    this.chips = display(scene, 20, 58, '', 10, hex(COLORS.muted)).setDepth(d)
    display(scene, ROUTE.x + ROUTE.w + 8, ROUTE.y - 6, 'HOME', 9, hex(COLORS.amber)).setDepth(d)
    display(scene, 884, 28, 'ENERGY', 10, hex(COLORS.muted)).setDepth(d)
    display(scene, 1058, 28, 'ISOLATION', 10, '#ff9b9b').setDepth(d)

    this.alert = scene.add.graphics().setDepth(DEPTH - 1).setAlpha(0)
    this.alert.lineStyle(26, COLORS.red, 0.55).strokeRect(0, HUD_H, W, BAR_Y - HUD_H)

    const n = opts.abilities.length
    const bw = Math.min(190, (W - 24) / n - 6)
    const startX = (W - n * (bw + 6) + 6) / 2
    opts.abilities.forEach((id, i) => {
      const x = startX + i * (bw + 6)
      this.slot.push({ x, w: bw })
      display(scene, x + 17, BAR_Y + 20, `${i + 1}`, 13, hex(ABILITIES[id].color)).setOrigin(0.5).setDepth(DEPTH + 2)
      this.abilityText.set(id, text(scene, x + 34, BAR_Y + 20, '', 13, hex(COLORS.paper)).setOrigin(0, 0.5).setDepth(DEPTH + 2))
      scene.add
        .zone(x + bw / 2, BAR_Y + 20, bw, 36)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => opts.onAbility(id))
    })
  }

  /** Filled player chip ("P1", "P2", "AI") at the top console. Returns its width. */
  private tag(x: number, t: PlayerTag) {
    const label = display(this.scene, 0, 7, t.text, 12, hex(COLORS.bg)).setDepth(DEPTH + 2).setShadow(0, 0, 'transparent', 0)
    const w = label.width + 12
    label.setX(x + 6)
    this.scene.add.rectangle(x, 5, w, 19, t.color).setOrigin(0).setDepth(DEPTH + 1)
    return w
  }

  update(v: HudView, now: number) {
    const g = this.g
    g.clear()
    // console plates with a ruler tick along the inner edge
    g.fillStyle(COLORS.bg, 0.94).fillRect(0, 0, W, HUD_H).fillRect(0, BAR_Y, W, H - BAR_Y)
    g.lineStyle(1, COLORS.panelEdge, 1).lineBetween(0, HUD_H, W, HUD_H).lineBetween(0, BAR_Y, W, BAR_Y)
    g.lineStyle(1, COLORS.panelEdge, 0.8)
    for (let x = 0; x < W; x += 16) g.lineBetween(x, HUD_H, x, HUD_H + (x % 128 === 0 ? 6 : 3))

    // phone battery: segmented like a real status bar
    const bat = Math.max(0, v.battery)
    const batColor = bat > 50 ? COLORS.green : bat > 20 ? COLORS.yellow : COLORS.red
    const lit = Math.ceil((bat / 100) * BAT_CELLS)
    g.lineStyle(1.5, COLORS.paper, 0.8).strokeRect(20, 30, 162, 20)
    g.fillStyle(COLORS.paper, 0.8).fillRect(183, 36, 4, 8)
    for (let i = 0; i < BAT_CELLS; i++) g.fillStyle(i < lit ? batColor : COLORS.panelEdge, i < lit ? 1 : 0.5).fillRect(24 + i * 15.6, 33, 12.6, 14)
    this.batteryText.setText(`${bat.toFixed(0)}%${v.flashlight ? '  TORCH' : ''}`).setColor(hex(batColor))
    this.chips.setText(`ALLIES ${v.allies}    AWARE ${v.awareness}    SHARE ${v.shareUses}`)

    // timer + route as a frame ruler with Priya's marker
    const m = Math.floor(Math.max(0, v.timeLeft) / 60)
    const s = Math.floor(Math.max(0, v.timeLeft) % 60)
    this.timer.setText(`${m}:${s.toString().padStart(2, '0')}`).setColor(v.timeLeft < 15 ? hex(COLORS.red) : hex(COLORS.paper))
    const { x: rx, y: ry, w: rw } = ROUTE
    const px = rx + rw * Phaser.Math.Clamp(v.progress, 0, 1)
    g.lineStyle(1, COLORS.muted, 0.6)
    for (let x = rx, i = 0; x <= rx + rw; x += 10, i++) g.lineBetween(x, ry, x, ry - (i % 5 === 0 ? 7 : 3))
    g.lineStyle(3, COLORS.amber, 1).lineBetween(rx, ry + 2, px, ry + 2)
    g.fillStyle(0xff8fd0, 1).fillTriangle(px - 6, ry + 13, px + 6, ry + 13, px, ry + 4)

    // barrier meters: segmented energy, continuous isolation with quarter marks
    const eCells = 10
    const eLit = Math.floor((v.energy / BALANCE.barrierEnergyMax) * eCells)
    for (let i = 0; i < eCells; i++) g.fillStyle(i < eLit ? 0x4fc3ff : COLORS.panelEdge, i < eLit ? 1 : 0.5).fillRect(884 + i * 15, 42, 12, 14)
    const iso = Phaser.Math.Clamp(v.isolation / 100, 0, 1)
    const isoA = v.isolation > 75 ? 0.6 + 0.4 * Math.abs(Math.sin(now / 160)) : 1
    g.fillStyle(COLORS.panelEdge, 0.5).fillRect(1058, 42, 200, 14)
    g.fillStyle(COLORS.red, isoA).fillRect(1058, 42, 200 * iso, 14)
    g.lineStyle(1, COLORS.bg, 1)
    for (let k = 1; k < 4; k++) g.lineBetween(1058 + 50 * k, 42, 1058 + 50 * k, 56)

    // ability keycaps
    this.opts.abilities.forEach((id, i) => {
      const { x, w } = this.slot[i]
      const def = ABILITIES[id]
      const st = v.abilityState(id)
      const ready = st.reason === null
      g.fillStyle(COLORS.panel, 1).fillRect(x, BAR_Y + 4, w, 32)
      g.lineStyle(1.5, def.color, ready ? 1 : 0.4).strokeRect(x + 4, BAR_Y + 8, 26, 24)
      if (st.cd > 0) g.fillStyle(0x000000, 0.6).fillRect(x + w * (1 - Math.min(1, st.cd / def.cooldown)), BAR_Y + 4, w * Math.min(1, st.cd / def.cooldown), 32)
      g.lineStyle(1, ready ? def.color : COLORS.panelEdge, 1).strokeRect(x, BAR_Y + 4, w, 32)
      for (let k = 0; k < BALANCE.maxUsesPerAbility; k++) g.fillStyle(k < st.uses ? def.color : COLORS.panelEdge, 1).fillRect(x + w - 10 - k * 7, BAR_Y + 30, 5, 3)
      this.abilityText
        .get(id)!
        .setText(`${def.name}  ${def.free ? 'free' : def.cost}`)
        .setAlpha(ready ? 1 : 0.5)
    })

    // emergency pulse when Priya is nearly isolated
    this.alert.setAlpha(v.isolation > 75 ? 0.4 + 0.6 * Math.abs(Math.sin(now / 160)) : 0)

    // intel feed fade
    this.feedLines = this.feedLines.filter((f) => {
      const age = now - f.born
      if (age > 7000) {
        f.t.destroy()
        return false
      }
      f.t.setAlpha(age > 5500 ? 1 - (age - 5500) / 1500 : 1)
      return true
    })
  }

  /** Short plate that drops in under the console. */
  toast(msg: string, color: number = COLORS.white) {
    this.toastObj?.destroy()
    const t = text(this.scene, 0, 0, msg, 18, hex(COLORS.paper)).setOrigin(0.5)
    const w = t.width + 48
    const bg = this.scene.add.graphics()
    bg.fillStyle(COLORS.bg, 0.94).fillRect(-w / 2, -19, w, 38)
    bg.fillStyle(color, 1).fillRect(-w / 2, -19, 5, 38)
    bg.lineStyle(1, color, 0.8).strokeRect(-w / 2, -19, w, 38)
    t.setX(3)
    const c = this.scene.add.container(W / 2, HUD_H + 14, [bg, t]).setDepth(DEPTH + 5).setAlpha(0)
    this.toastObj = c
    this.scene.tweens.add({ targets: c, y: HUD_H + 36, alpha: 1, duration: 220, ease: 'Expo.easeOut' })
    this.scene.tweens.add({ targets: c, alpha: 0, y: HUD_H + 28, delay: 2200, duration: 300, onComplete: () => c.destroy() })
  }

  /** What the Barrier can read about Priya's choices. */
  intel(msg: string, now: number) {
    const t = text(this.scene, W - 14, HUD_H + 12, msg, 13, '#c9b8ff').setOrigin(1, 0).setDepth(DEPTH).setAlpha(0.95)
    this.feedLines.push({ t, born: now })
    if (this.feedLines.length > 5) this.feedLines.shift()?.t.destroy()
    this.feedLines.forEach((f, i) => (f.t.y = HUD_H + 12 + (this.feedLines.length - 1 - i) * 20))
  }
}
