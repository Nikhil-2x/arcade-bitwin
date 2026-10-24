import Phaser from 'phaser'
import { COLORS, H, W } from '../config/constants.ts'
import { LEVELS } from '../data/levels/index.ts'
import { GameState } from '../state/GameState.ts'
import type { LevelId } from '../types.ts'
import { backdrop, button, display, frame, hex, panel, soundToggle, text } from '../ui/widgets.ts'

const CARD_W = 340
const CARD_H = 380
const CARD_Y = 170

/** Shown after picking 1 or 2 players. Every level is open; the chosen one is played on its own. */
export class LevelSelectScene extends Phaser.Scene {
  private leaving = false

  constructor() {
    super('LevelSelect')
  }

  create() {
    this.leaving = false
    const duo = GameState.mode === 'duo'
    this.cameras.main.fadeIn(350, 7, 9, 20)
    backdrop(this)
    this.add.rectangle(0, 0, W, H, COLORS.bg, 0.55).setOrigin(0)
    frame(this, 'SELECT LEVEL', duo ? 'TWO PLAYERS  /  ROLES SWAP EACH ROUND' : 'SOLO  /  AI PLAYS THE BARRIER')
    soundToggle(this, W - 40, H - 52)

    display(this, W / 2, 56, 'CHOOSE A NIGHT', 40, hex(COLORS.amber)).setOrigin(0.5, 0)
    text(
      this,
      W / 2,
      116,
      duo ? 'Every level is open. Each one is played twice: Player 1 starts as Priya, then you swap.' : 'Every level is open. Pick one to play.',
      17,
      hex(COLORS.muted),
    ).setOrigin(0.5, 0)

    const gap = (W - 3 * CARD_W) / 4
    ;([1, 2, 3] as LevelId[]).forEach((id, i) => this.card(gap + i * (CARD_W + gap), id, i))

    const backTo = duo ? 'Room' : 'Menu'
    const back = button(this, 150, CARD_Y + CARD_H + 56, 200, 46, 'BACK', () => this.go(backTo), COLORS.muted, 15, { key: 'ESC' })
    back.container.setDepth(5)

    const kb = this.input.keyboard
    kb?.on('keydown-ONE', () => this.pick(1))
    kb?.on('keydown-TWO', () => this.pick(2))
    kb?.on('keydown-THREE', () => this.pick(3))
    kb?.on('keydown-ESC', () => this.go(backTo))
  }

  private card(x: number, id: LevelId, i: number) {
    const def = LEVELS[id]
    const items: Phaser.GameObjects.GameObject[] = []
    items.push(panel(this, x, CARD_Y, CARD_W, CARD_H, COLORS.panel, COLORS.amber))
    items.push(display(this, x + 28, CARD_Y + 22, `0${id}`, 54, hex(COLORS.amber)))
    items.push(display(this, x + 28, CARD_Y + 96, def.title.toUpperCase(), 22, hex(COLORS.paper)))
    items.push(text(this, x + 28, CARD_Y + 132, `${def.place}  /  ${def.time} seconds`, 15, hex(COLORS.muted)))
    items.push(text(this, x + 28, CARD_Y + 166, def.tone, 15, hex(COLORS.paper), { wordWrap: { width: CARD_W - 56 }, lineSpacing: 4 }))
    items.push(display(this, x + 28, CARD_Y + 236, 'THE BARRIER', 11, hex(COLORS.muted)))
    items.push(display(this, x + 28, CARD_Y + 254, def.persona.name.toUpperCase(), 16, '#c9b8ff'))
    items.push(text(this, x + 28, CARD_Y + 280, `${def.abilities.length} abilities`, 14, hex(COLORS.muted)))
    const play = button(this, x + CARD_W / 2, CARD_Y + CARD_H - 40, CARD_W - 56, 50, 'PLAY', () => this.pick(id), COLORS.amber, 18, { key: `${id}` })
    items.push(play.container)

    // cards rise in one after another
    items.forEach((o) => {
      const t = o as unknown as Phaser.GameObjects.Components.Transform & Phaser.GameObjects.Components.Alpha
      const y = t.y
      t.y = y + 30
      t.alpha = 0
      this.tweens.add({ targets: o, y, alpha: 1, duration: 450, delay: 120 + i * 110, ease: 'Expo.easeOut' })
    })
  }

  private pick(level: LevelId) {
    if (this.leaving) return
    GameState.startLevel(level)
    this.go(GameState.prologueDone ? 'Brief' : 'Prologue')
  }

  private go(key: string) {
    if (this.leaving) return
    this.leaving = true
    this.cameras.main.fadeOut(300, 7, 9, 20)
    this.time.delayedCall(320, () => this.scene.start(key))
  }
}
