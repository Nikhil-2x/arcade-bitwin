import Phaser from 'phaser'
import { COLORS } from '../config/constants.ts'
import { LEVELS } from '../data/levels/index.ts'
import { GameState } from '../state/GameState.ts'
import { backdrop, banner, button, display, frame, hex, panel, text } from '../ui/widgets.ts'
import type { PromptResult } from './PromptScene.ts'

const REASONS = {
  home: 'Priya reached home.',
  isolated: 'The Isolation meter filled: she was left alone in the dark.',
  time: 'The timer ran out before she got home.',
  calls: 'Three wrong calls: help did not reach her in time.',
} as const

const BYSTANDER_KEYS = ['ignore', 'checkIn', 'alert', 'call'] as const

/** Result of one round, the lesson card, and the bystander side scene after Level 3. */
export class RoundEndScene extends Phaser.Scene {
  constructor() {
    super('RoundEnd')
  }

  create() {
    this.bystanderDone = false
    const o = GameState.lastOutcome!
    const def = LEVELS[o.step.level]
    this.cameras.main.fadeIn(300, 7, 9, 20)
    backdrop(this)
    this.add.rectangle(0, 0, 1280, 720, COLORS.bg, 0.55).setOrigin(0)
    frame(this, `NIGHT 0${def.id} / 03`, 'ROUND REPORT')
    banner(this, 100, o.win ? 'RUNNER WINS' : 'BARRIER WINS', o.win ? COLORS.green : COLORS.red)
    text(this, 640, 188, REASONS[o.reason], 20, hex(COLORS.paper)).setOrigin(0.5)

    const stat = (x: number, title: string, color: number, lines: string[]) => {
      panel(this, x, 225, 400, 190, COLORS.panel, color)
      display(this, x + 24, 240, title, 14, hex(color))
      text(this, x + 24, 272, lines.join('\n'), 17, hex(COLORS.paper), { lineSpacing: 6 })
    }
    const ai = GameState.aiBarrier
    stat(110, `P${o.step.runner + 1}  PRIYA  +${o.runnerScore}`, COLORS.cyan, [
      `Time left: ${o.timeLeft.toFixed(0)}s`,
      `Battery: ${o.battery.toFixed(0)}%`,
      `Allies made: ${o.allies}`,
      `Calls: ${o.correct} right, ${o.wrong} wrong`,
      `Faults reported: ${o.faults}`,
    ])
    stat(770, `${ai ? 'AI' : `P${o.step.barrier + 1}`}  ${def.persona.name.toUpperCase()}  +${o.barrierScore}`, COLORS.purple, [
      'Seconds she was isolated, delayed,',
      'wrong calls and gaps exploited.',
      '',
      'Every one of these gaps could be repaired.',
    ])

    const notes = this.carryNotes()
    panel(this, 110, 430, 1060, 170, COLORS.panel, COLORS.amber)
    display(this, 134, 444, 'WHAT TO REMEMBER', 13, hex(COLORS.amber))
    text(this, 134, 470, def.afterRound, 17, hex(COLORS.paper), { wordWrap: { width: 1010 }, lineSpacing: 4 })
    if (notes) text(this, 134, 548, notes, 15, hex(COLORS.cyan), { wordWrap: { width: 1010 } })

    const b = button(this, 640, 650, 320, 56, 'CONTINUE', () => this.next(), COLORS.amber, 20)
    this.input.keyboard?.once('keydown-SPACE', () => b.container.emit('pointerdown'))
  }

  /** A one-line preview of how this Priya's choices change the next level. */
  private carryNotes() {
    const o = GameState.lastOutcome!
    if (o.step.level === 3) return ''
    const s = GameState.players[o.step.runner].story
    const bits: string[] = []
    if (o.step.level === 1) {
      if (s.reportedLight) bits.push('Level 3 will have a community-lit lane.')
      if (s.tookShortcut >= 2) bits.push('Shortcuts drained time and battery: Level 2 starts lower.')
    } else {
      if (s.helpedKavya) bits.push('Kavya opens a bonus path in Level 3.')
      if (s.fellForScam) bits.push('The fake message will come back in Level 3.')
      if (o.battery < 30) bits.push('Battery is under 30%: Level 3 starts with a nearly dead phone.')
    }
    return bits.length ? 'Next: ' + bits.join('  ') : ''
  }

  private next() {
    const o = GameState.lastOutcome!
    if (o.step.level === 3 && !this.bystanderDone) return this.bystander()
    this.advance()
  }

  private bystanderDone = false

  /** The Barrier player steps out of the Barrier role for a short bystander scene. */
  private bystander() {
    this.bystanderDone = true
    const o = GameState.lastOutcome!
    const who = GameState.aiBarrier ? 0 : o.step.barrier
    this.scene.launch('Prompt', {
      parent: 'RoundEnd',
      title: `Bystander round${GameState.aiBarrier ? '' : `: Player ${who + 1}`}`,
      body: 'You are a bystander now. Someone is struggling on a street corner and you see them. What do you do?',
      options: ['Ignore', 'Check in', 'Alert authority', 'Call helpline'],
      correct: [1, 2, 3],
      reason: 'Silence helps no one. Checking in, alerting someone or calling the helpline can change what happens next.',
      accent: COLORS.yellow,
      onDone: (r: PromptResult) => {
        const rec = GameState.players[who]
        rec.bystander = BYSTANDER_KEYS[r.choice[0]] ?? 'ignore'
        rec.barrierScore += r.correct ? 60 : 0
        GameState.tally[3]!.bystander[who] += r.correct ? 60 : 0
        GameState.surpriseAlly = r.correct
        this.advance()
      },
    })
  }

  private advance() {
    GameState.stepIndex++
    this.cameras.main.fadeOut(300, 0, 0, 0)
    // once every round of the chosen level is played, show who won the level
    this.time.delayedCall(320, () => this.scene.start(GameState.done ? 'LevelResult' : 'Brief'))
  }
}
