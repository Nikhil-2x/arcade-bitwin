import Phaser from 'phaser'
import { COLORS } from '../config/constants.ts'
import { LEVELS } from '../data/levels/index.ts'
import { GameState } from '../state/GameState.ts'
import { banner, button, panel, starfield, text } from '../ui/widgets.ts'
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
    this.cameras.main.setBackgroundColor('#070a1f')
    this.cameras.main.fadeIn(300, 0, 0, 0)
    starfield(this)
    banner(this, 100, o.win ? 'RUNNER WINS' : 'BARRIER WINS', o.win ? COLORS.green : COLORS.red)
    text(this, 640, 188, REASONS[o.reason], 20, '#ffffff').setOrigin(0.5)

    const stat = (x: number, title: string, color: number, lines: string[]) => {
      panel(this, x, 225, 400, 190, 0x0c1030, color)
      text(this, x + 24, 238, title, 18, '#' + color.toString(16).padStart(6, '0'))
      text(this, x + 24, 270, lines.join('\n'), 17, '#ffffff', { lineSpacing: 6 })
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
    panel(this, 110, 430, 1060, 170, 0x0c1030, COLORS.yellow)
    text(this, 134, 442, 'WHAT TO REMEMBER', 16, '#f5e663')
    text(this, 134, 468, def.afterRound, 17, '#ffffff', { wordWrap: { width: 1010 }, lineSpacing: 4 })
    if (notes) text(this, 134, 548, notes, 15, '#9eecff', { wordWrap: { width: 1010 } })

    const b = button(this, 640, 650, 320, 56, 'Continue', () => this.next(), COLORS.green, 24)
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
      if (!o.win) bits.push(s.checkedIn ? 'Meera worries and arrives to help in Level 2.' : 'Nobody was told: no backup in Level 2.')
    } else {
      if (s.helpedKavya) bits.push('Kavya will be waiting in Level 3 with a bonus path.')
      if (s.fellForScam) bits.push('The fake message will come back in Level 3.')
      if (o.battery < 30) bits.push('Battery is under 30%: Level 3 starts with a nearly dead phone.')
      if (s.networkScore >= 3) bits.push('A strong network: more allies at the start of Level 3.')
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
        GameState.surpriseAlly = r.correct
        this.advance()
      },
    })
  }

  private advance() {
    GameState.stepIndex++
    this.cameras.main.fadeOut(300, 0, 0, 0)
    this.time.delayedCall(320, () => this.scene.start(GameState.done ? 'Ending' : 'Brief'))
  }
}
