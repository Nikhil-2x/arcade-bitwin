import Phaser from 'phaser'
import { COLORS } from '../config/constants.ts'
import { Crewmate } from '../entities/Crewmate.ts'
import { GameState } from '../state/GameState.ts'
import type { PlayerRecord } from '../state/GameState.ts'
import { backdrop, button, display, frame, hex, text } from '../ui/widgets.ts'
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
    this.cameras.main.fadeIn(500, 7, 9, 20)
    backdrop(this)
    const who = this.runners()[this.idx]
    const key = endingFor(GameState.players[who])
    const e = ENDINGS[key]
    // good endings leave the windows lit; bad ones go nearly dark
    this.add.rectangle(0, 0, 1280, 720, COLORS.bg, e.good ? 0.35 : 0.75).setOrigin(0)
    frame(this, 'ENDING', GameState.mode === 'duo' ? `PLAYER ${who + 1}` : '')
    Sfx[e.good ? 'win' : 'lose']()

    if (GameState.mode === 'duo') display(this, 640, 56, `PLAYER ${who + 1}'S PRIYA`, 16, hex(COLORS.muted)).setOrigin(0.5)
    const priya = new Crewmate(this, 640, 330, 'pink', 3)
    this.time.addEvent({ delay: 16, loop: true, callback: () => priya.animate(0.016, e.good, 1) })
    if (key === 'circle') this.circleOfAllies()

    const title = display(this, 640, 470, e.title, 54, hex(e.color)).setOrigin(0.5).setAlpha(0).setLetterSpacing(14)
    const line = text(this, 640, 535, e.line, 22, hex(COLORS.paper), { wordWrap: { width: 900 }, align: 'center' }).setOrigin(0.5).setAlpha(0)
    // the title tracks in from wide letter-spacing as it fades up
    const track = { s: 14 }
    this.tweens.add({ targets: track, s: 2, duration: 1400, delay: 600, ease: 'Expo.easeOut', onUpdate: () => title.setLetterSpacing(track.s) })
    this.tweens.add({ targets: [title, line], alpha: 1, duration: 900, delay: 600 })

    const last = this.idx >= this.runners().length - 1
    if (key === 'silence') {
      text(this, 640, 590, 'Replay as an ally?', 22, hex(COLORS.amber)).setOrigin(0.5)
      button(this, 460, 650, 280, 52, 'REPLAY AS AN ALLY', () => this.scene.start('Menu'), COLORS.amber, 16)
    }
    button(this, key === 'silence' ? 820 : 640, 650, 280, 52, last ? 'FINAL REFLECTION' : 'NEXT PRIYA', () => this.next(), COLORS.cyan, 16)
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
    backdrop(this)
    this.add.rectangle(0, 0, 1280, 720, COLORS.bg, 0.5).setOrigin(0)
    frame(this, 'REFLECTION')
    const lines = [
      'As the Barrier, you made her path harder with small gaps.',
      'As Priya, you felt what allies, lights and the right number can change.',
    ]
    lines.forEach((l, i) => {
      const t = text(this, 640, 230 + i * 50, l, 24, hex(COLORS.paper)).setOrigin(0.5).setAlpha(0)
      this.tweens.add({ targets: t, alpha: 1, duration: 700, delay: 300 + i * 1100 })
    })
    const ally = display(this, 640, 390, 'IN REAL LIFE, YOU CAN BE THE ALLY.', 30, hex(COLORS.amber)).setOrigin(0.5).setAlpha(0)
    this.tweens.add({ targets: ally, alpha: 1, duration: 900, delay: 2600 })
    button(this, 640, 560, 300, 58, 'SEE RESULTS', () => this.scene.start('Results'), COLORS.amber, 18)
  }
}
