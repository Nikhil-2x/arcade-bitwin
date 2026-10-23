import Phaser from 'phaser'
import { BAR_Y, COLORS, H, HUD_H, W } from '../config/constants.ts'
import { ABILITIES } from '../data/abilities.ts'
import type { AbilityId } from '../types.ts'
import { hex, text } from './widgets.ts'

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

interface HudOptions {
  runnerLabel: string
  barrierLabel: string
  abilities: AbilityId[]
  aiBarrier: boolean
  onAbility: (id: AbilityId) => void
}

const DEPTH = 30

/** Top status bar, Barrier ability bar, toasts and the Barrier's intel feed. */
export class Hud {
  private g: Phaser.GameObjects.Graphics
  private timer: Phaser.GameObjects.Text
  private batteryText: Phaser.GameObjects.Text
  private chips: Phaser.GameObjects.Text
  private phoneInfo: Phaser.GameObjects.Text
  private abilityLabels = new Map<AbilityId, Phaser.GameObjects.Text>()
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
    text(scene, 16, 6, opts.runnerLabel, 16, hex(COLORS.cyan)).setDepth(DEPTH + 1)
    text(scene, 884, 6, opts.barrierLabel + (opts.aiBarrier ? '  (AI)' : ''), 16, hex(COLORS.purple)).setDepth(DEPTH + 1)
    this.timer = text(scene, 640, 4, '0:00', 34).setOrigin(0.5, 0).setDepth(DEPTH + 1)
    this.batteryText = text(scene, 100, 40, '', 15).setOrigin(0.5, 0).setDepth(DEPTH + 1)
    this.chips = text(scene, 212, 28, '', 15, '#ffffff').setDepth(DEPTH + 1)
    this.phoneInfo = text(scene, 640, 60, 'ROUTE HOME', 11, '#9eecff').setOrigin(0.5, 0).setDepth(DEPTH + 1)
    text(scene, 884, 28, 'ENERGY', 11, '#9eecff').setDepth(DEPTH + 1)
    text(scene, 1058, 28, 'ISOLATION', 11, '#ff9b9b').setDepth(DEPTH + 1)

    this.alert = scene.add.graphics().setDepth(DEPTH - 1).setAlpha(0)
    this.alert.lineStyle(26, COLORS.red, 0.55).strokeRect(0, HUD_H, W, BAR_Y - HUD_H)

    const n = opts.abilities.length
    const bw = Math.min(190, (W - 24) / n - 6)
    const startX = (W - n * (bw + 6) + 6) / 2
    opts.abilities.forEach((id, i) => {
      const x = startX + i * (bw + 6)
      this.slot.push({ x, w: bw })
      const label = text(scene, x + bw / 2, BAR_Y + 20, '', 14, '#fff').setOrigin(0.5).setDepth(DEPTH + 2)
      this.abilityLabels.set(id, label)
      scene.add
        .zone(x + bw / 2, BAR_Y + 20, bw, 36)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => opts.onAbility(id))
    })
  }

  update(v: HudView, now: number) {
    const g = this.g
    g.clear()
    g.fillStyle(0x080b22, 0.97).fillRect(0, 0, W, HUD_H)
    g.lineStyle(4, COLORS.panelEdge, 1).lineBetween(0, HUD_H, W, HUD_H)
    g.fillStyle(0x080b22, 0.97).fillRect(0, BAR_Y, W, H - BAR_Y)
    g.lineStyle(4, COLORS.panelEdge, 1).lineBetween(0, BAR_Y, W, BAR_Y)

    // phone battery
    const bat = Math.max(0, v.battery)
    const batColor = bat > 50 ? COLORS.green : bat > 20 ? COLORS.yellow : COLORS.red
    g.fillStyle(0x000000, 0.6).fillRoundedRect(16, 30, 170, 24, 8)
    g.fillStyle(batColor, 1).fillRoundedRect(18, 32, Math.max(0, 166 * (bat / 100)), 20, 6)
    g.lineStyle(3, 0xffffff, 0.9).strokeRoundedRect(16, 30, 170, 24, 8)
    g.fillStyle(0xffffff, 0.9).fillRect(186, 37, 4, 10)
    this.batteryText.setText(`${bat.toFixed(0)}%${v.flashlight ? '  torch' : ''}`).setPosition(101, 34)
    this.chips.setText(`Allies ${v.allies}\nAware ${v.awareness}  Share ${v.shareUses}`)

    // timer + route progress (task-bar style)
    const m = Math.floor(Math.max(0, v.timeLeft) / 60)
    const s = Math.floor(Math.max(0, v.timeLeft) % 60)
    this.timer.setText(`${m}:${s.toString().padStart(2, '0')}`).setColor(v.timeLeft < 15 ? '#ff6b6b' : '#ffffff')
    g.fillStyle(0x000000, 0.6).fillRoundedRect(500, 46, 280, 12, 6)
    g.fillStyle(COLORS.green, 1).fillRoundedRect(500, 46, Math.max(8, 280 * v.progress), 12, 6)
    g.lineStyle(2, 0xffffff, 0.8).strokeRoundedRect(500, 46, 280, 12, 6)
    this.phoneInfo.setPosition(640, 60)

    // barrier meters
    g.fillStyle(0x000000, 0.6).fillRoundedRect(884, 42, 150, 14, 6)
    g.fillStyle(0x4fc3ff, 1).fillRoundedRect(884, 42, Math.max(0, 150 * (v.energy / 100)), 14, 6)
    g.lineStyle(2, 0xffffff, 0.8).strokeRoundedRect(884, 42, 150, 14, 6)
    g.fillStyle(0x000000, 0.6).fillRoundedRect(1058, 42, 200, 14, 6)
    g.fillStyle(COLORS.red, 1).fillRoundedRect(1058, 42, Math.max(0, 200 * (v.isolation / 100)), 14, 6)
    g.lineStyle(2, 0xffffff, 0.8).strokeRoundedRect(1058, 42, 200, 14, 6)

    // ability buttons
    this.opts.abilities.forEach((id, i) => {
      const { x, w } = this.slot[i]
      const def = ABILITIES[id]
      const st = v.abilityState(id)
      const ready = st.reason === null
      g.fillStyle(0x10142e, 1).fillRoundedRect(x, BAR_Y + 3, w, 34, 10)
      g.fillStyle(def.color, ready ? 1 : 0.35).fillRoundedRect(x, BAR_Y + 3, 8, 34, { tl: 10, tr: 0, bl: 10, br: 0 })
      if (st.cd > 0) g.fillStyle(0x000000, 0.55).fillRoundedRect(x, BAR_Y + 3, w * Math.min(1, st.cd / def.cooldown), 34, 10)
      g.lineStyle(2, ready ? def.color : 0x2b3470, 1).strokeRoundedRect(x, BAR_Y + 3, w, 34, 10)
      const cost = def.free ? 'free' : def.cost
      this.abilityLabels
        .get(id)!
        .setText(`${i + 1} ${def.name} ${cost}${st.reason ? '' : ''}  x${st.uses}`)
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

  /** Short pill message in the centre of the screen. */
  toast(msg: string, color: number = COLORS.white) {
    this.toastObj?.destroy()
    const t = text(this.scene, 0, 0, msg, 22, hex(color)).setOrigin(0.5)
    const bg = this.scene.add.graphics()
    bg.fillStyle(0x080b22, 0.92).fillRoundedRect(-t.width / 2 - 18, -20, t.width + 36, 40, 20)
    bg.lineStyle(3, color, 1).strokeRoundedRect(-t.width / 2 - 18, -20, t.width + 36, 40, 20)
    const c = this.scene.add.container(640, HUD_H + 34, [bg, t]).setDepth(DEPTH + 5)
    this.toastObj = c
    this.scene.tweens.add({ targets: c, alpha: 0, delay: 2200, duration: 400, onComplete: () => c.destroy() })
  }

  /** What the Barrier can read about Priya's choices. */
  intel(msg: string, now: number) {
    this.feedLines.forEach((f) => (f.t.y -= 20))
    const t = text(this.scene, W - 12, HUD_H + 10 + 0, msg, 13, '#c9b8ff').setOrigin(1, 0).setDepth(DEPTH).setAlpha(0.95)
    this.feedLines.push({ t, born: now })
    if (this.feedLines.length > 5) this.feedLines.shift()?.t.destroy()
    this.feedLines.forEach((f, i) => (f.t.y = HUD_H + 10 + (this.feedLines.length - 1 - i) * 20))
  }
}
