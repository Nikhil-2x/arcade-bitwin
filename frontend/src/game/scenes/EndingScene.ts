import Phaser from 'phaser'
import { COLORS } from '../config/constants.ts'
import { Crewmate } from '../entities/Crewmate.ts'
import { GameState } from '../state/GameState.ts'
import type { PlayerRecord } from '../state/GameState.ts'
import { button, starfield, text } from '../ui/widgets.ts'
import { Sfx } from '../utils/sfx.ts'

type EndingKey = 'circle' | 'alone' | 'help' | 'silence'

const ENDINGS: Record<EndingKey, { title: string; line: string; color: number; good: boolean }> = {
  circle: { title: 'THE CIRCLE COMPLETE', line: 'She was never alone. Neither can anyone be, if the circle holds.', color: COLORS.green, good: true },
  alone: { title: 'WALKED IT ALONE', line: 'She made it. But safety should not depend on luck.', color: COLORS.yellow, good: true },
  help: { title: 'HELP ARRIVED', line: 'Help did not come fast enough, but it came. Next time, it can be sooner.', color: COLORS.cyan, good: false },
  silence: { title: 'THE SILENCE WINS', line: 'No one came. That is the real cost of looking away.', color: COLORS.red, good: false },
}

export function endingFor(p: PlayerRecord): EndingKey {
  const s = p.story
  if (s.won[3]) return s.networkScore >= 4 && s.reportedLight && s.wrongCalls <= 2 ? 'circle' : 'alone'
  if (p.l3Correct >= 2 && p.l3Allies >= 1) return 'help'
  return 'silence'
}

/** One ending per Priya, then the final reflection. */
export class EndingScene extends Phaser.Scene {
  private idx = 0

  constructor() {
    super('Ending')
  }

  create() {
    this.idx = 0
    this.show()
  }

  private runners() {
    return GameState.mode === 'duo' ? [0, 1] : [0]
  }

  private show() {
    this.time.removeAllEvents()
    this.tweens.killAll()
    this.children.removeAll(true)
    this.cameras.main.setBackgroundColor('#04050d')
    this.cameras.main.fadeIn(500, 0, 0, 0)
    starfield(this)
    const who = this.runners()[this.idx]
    const key = endingFor(GameState.players[who])
    const e = ENDINGS[key]
    Sfx[e.good ? 'win' : 'lose']()

    if (GameState.mode === 'duo') text(this, 640, 50, `PLAYER ${who + 1}'s PRIYA`, 22, '#9aa4d6').setOrigin(0.5)
    const priya = new Crewmate(this, 640, 330, 'pink', 3)
    this.time.addEvent({ delay: 16, loop: true, callback: () => priya.animate(0.016, e.good, 1) })
    if (key === 'circle') this.circleOfAllies()

    const title = text(this, 640, 470, e.title, 54, '#' + e.color.toString(16).padStart(6, '0'), { strokeThickness: 10 }).setOrigin(0.5).setAlpha(0)
    const line = text(this, 640, 535, e.line, 22, '#ffffff', { wordWrap: { width: 900 }, align: 'center' }).setOrigin(0.5).setAlpha(0)
    this.tweens.add({ targets: [title, line], alpha: 1, duration: 900, delay: 600 })

    const last = this.idx >= this.runners().length - 1
    if (key === 'silence') {
      text(this, 640, 590, 'Replay as an ally?', 22, '#f5e663').setOrigin(0.5)
      button(this, 460, 650, 260, 52, 'Replay as an ally', () => this.scene.start('Menu'), COLORS.yellow, 20)
    }
    button(this, key === 'silence' ? 820 : 640, 650, 260, 52, last ? 'Final reflection' : 'Next Priya', () => this.next(), COLORS.cyan, 20)
  }

  /** Allies standing in a circle around Priya for the best ending. */
  private circleOfAllies() {
    ;['cyan', 'yellow', 'orange', 'green', 'blue', 'lime'].forEach((c, i) => {
      const a = (i / 6) * Math.PI * 2
      const crew = new Crewmate(this, 640 + Math.cos(a) * 260, 330 + Math.sin(a) * 100, c, 1.1).setAlpha(0)
      this.tweens.add({ targets: crew, alpha: 1, duration: 500, delay: 800 + i * 250 })
    })
  }

  private next() {
    if (this.idx < this.runners().length - 1) {
      this.idx++
      return this.show()
    }
    this.reflection()
  }

  private reflection() {
    this.time.removeAllEvents()
    this.tweens.killAll()
    this.children.removeAll(true)
    starfield(this)
    text(
      this,
      640,
      300,
      'As the Barrier, you made her path harder with small gaps.\nAs Priya, you felt what allies, lights and the right number can change.\n\nIn real life, you can be the ally.',
      28,
      '#ffffff',
      { align: 'center', lineSpacing: 12, wordWrap: { width: 1000 } },
    ).setOrigin(0.5)
    button(this, 640, 560, 300, 58, 'See results', () => this.scene.start('Results'), COLORS.green, 22)
  }
}
