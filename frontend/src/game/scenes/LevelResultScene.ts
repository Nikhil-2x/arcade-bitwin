import Phaser from 'phaser'
import { COLORS } from '../config/constants.ts'
import { LEVELS } from '../data/levels/index.ts'
import { GameState } from '../state/GameState.ts'
import type { PlayerIdx } from '../types.ts'
import { backdrop, banner, button, display, frame, hex, panel, text } from '../ui/widgets.ts'
import { Sfx } from '../utils/sfx.ts'

/**
 * Winner of the level just played. Each player's total is what they scored on both sides:
 * as Priya, as the Barrier, plus the Level 3 bystander bonus. Solo compares you with the AI.
 */
export class LevelResultScene extends Phaser.Scene {
  private leaving = false

  constructor() {
    super('LevelResult')
  }

  create() {
    this.leaving = false
    const level = GameState.steps[0].level
    const def = LEVELS[level]
    const t = GameState.tally[level]!
    const solo = GameState.aiBarrier
    const total = (p: PlayerIdx) => t.runner[p] + t.barrier[p] + t.bystander[p]
    const scores: [number, number] = [total(0), total(1)]

    this.cameras.main.fadeIn(300, 7, 9, 20)
    backdrop(this)
    this.add.rectangle(0, 0, 1280, 720, COLORS.bg, 0.6).setOrigin(0)
    frame(this, `NIGHT 0${level} / 03`, 'LEVEL RESULT')
    display(this, 640, 34, `${def.title.toUpperCase()}  /  LEVEL RESULT`, 14, hex(COLORS.muted)).setOrigin(0.5, 0)

    const tie = scores[0] === scores[1]
    const winner: PlayerIdx = scores[0] >= scores[1] ? 0 : 1
    const headline = tie ? "IT'S A TIE" : solo ? (winner === 0 ? 'YOU WIN' : 'THE AI WINS') : `PLAYER ${winner + 1} WINS`
    banner(this, 120, headline, tie ? COLORS.amber : GameState.playerColor(winner))
    Sfx[tie || !solo || winner === 0 ? 'win' : 'lose']()

    // one card per side of the comparison; rows only for the roles that player actually played
    const card = (x: number, p: PlayerIdx) => {
      const color = GameState.playerColor(p)
      const won = !tie && winner === p
      panel(this, x, 220, 460, 300, COLORS.panel, won ? color : COLORS.panelEdge)
      const name = display(this, x + 34, 246, (solo && p === 0 ? 'YOU' : GameState.playerName(p)).toUpperCase(), 16, hex(COLORS.bg)).setShadow(0, 0, 'transparent', 0).setDepth(1)
      this.add.rectangle(x + 26, 242, name.width + 16, 26, color).setOrigin(0)
      if (won) display(this, x + 434, 248, 'WINNER', 13, hex(color)).setOrigin(1, 0)

      const rows: [string, number][] = []
      if (!solo || p === 0) rows.push(['As Priya (Runner)', t.runner[p]])
      if (!solo || p === 1) rows.push(['As the Barrier', t.barrier[p]])
      if (level === 3 && (!solo || p === 0)) rows.push(['Bystander bonus', t.bystander[p]])
      rows.forEach(([label, v], i) => {
        const y = 300 + i * 40
        text(this, x + 34, y, label, 18, hex(COLORS.paper))
        display(this, x + 426, y, `${v}`, 18, hex(COLORS.paper)).setOrigin(1, 0)
      })
      this.add.rectangle(x + 34, 446, 392, 1, COLORS.panelEdge).setOrigin(0)
      display(this, x + 34, 462, 'TOTAL', 16, hex(COLORS.muted))
      const big = display(this, x + 426, 452, '0', 40, hex(won ? color : COLORS.paper)).setOrigin(1, 0)
      // count the total up so the comparison lands as a moment
      const c = { v: 0 }
      this.tweens.add({ targets: c, v: scores[p], duration: 900, delay: 500, ease: 'Cubic.easeOut', onUpdate: () => big.setText(`${Math.round(c.v)}`) })
    }
    card(150, 0)
    card(670, 1)

    if (solo) text(this, 640, 548, 'Your Runner score against the AI Barrier score for this level.', 15, hex(COLORS.muted)).setOrigin(0.5, 0)
    else text(this, 640, 548, 'Each total adds what that player scored as Priya and as the Barrier.', 15, hex(COLORS.muted)).setOrigin(0.5, 0)

    const last = level === 3
    const b = button(this, 640, 630, 360, 56, last ? 'SEE THE ENDING' : 'CHOOSE ANOTHER LEVEL', () => this.go(last ? 'Ending' : 'LevelSelect'), COLORS.amber, 18)
    this.input.keyboard?.once('keydown-SPACE', () => b.container.emit('pointerdown'))
  }

  private go(key: string) {
    if (this.leaving) return
    this.leaving = true
    this.cameras.main.fadeOut(300, 7, 9, 20)
    this.time.delayedCall(320, () => this.scene.start(key))
  }
}
