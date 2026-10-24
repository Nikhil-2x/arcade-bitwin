import Phaser from 'phaser'
import { COLORS } from '../config/constants.ts'
import { Net } from '../net/Net.ts'
import { GameState } from '../state/GameState.ts'
import type { PlayerRecord } from '../state/GameState.ts'
import { backdrop, button, display, frame, hex, panel, text } from '../ui/widgets.ts'

export function badgesFor(p: PlayerRecord): string[] {
  const out: string[] = []
  if (p.faults >= 2) out.push('Light Keeper')
  if (p.allies >= 4) out.push('Network Builder')
  if (p.callsMade > 0 && p.callsCorrect === p.callsMade) out.push('Helpline Hero')
  if (p.bystander && p.bystander !== 'ignore') out.push('Bystander Hero')
  return out
}

/** Helpline report, Barrier ledger, badges and a copyable summary card. */
export class ResultsScene extends Phaser.Scene {
  constructor() {
    super('Results')
  }

  create() {
    this.cameras.main.fadeIn(400, 7, 9, 20)
    backdrop(this)
    this.add.rectangle(0, 0, 1280, 720, COLORS.bg, 0.6).setOrigin(0)
    frame(this, 'RESULTS', 'IN REAL LIFE, YOU CAN BE THE ALLY')
    display(this, 640, 40, 'RESULTS', 36, hex(COLORS.amber)).setOrigin(0.5)

    const ids = GameState.mode === 'duo' ? [0, 1] : [0]
    const w = ids.length === 2 ? 580 : 760
    const startX = ids.length === 2 ? 50 : 260
    const lines: string[] = ['Circle of Allies: results']
    ids.forEach((id, k) => {
      const p = GameState.players[id]
      const x = startX + k * (w + 20)
      panel(this, x, 80, w, 500, COLORS.panel, k ? COLORS.yellow : COLORS.cyan)
      display(this, x + 24, 96, `PLAYER ${id + 1}`, 18, k ? '#f5e663' : '#9eecff')
      const solo = GameState.mode === 'solo'
      const barrierRec = solo ? GameState.players[1] : p
      display(this, x + w - 24, 100, `RUNNER ${p.runnerScore}   ${solo ? 'AI BARRIER' : 'BARRIER'} ${barrierRec.barrierScore}`, 12, hex(COLORS.paper)).setOrigin(1, 0)

      const missed = p.missedHelplines.length
        ? p.missedHelplines.slice(0, 4).map((m) => `- ${m.text.slice(0, 54)}${m.text.length > 54 ? '...' : ''}\n   Right: ${m.answer}`).join('\n')
        : 'None missed!'
      display(this, x + 24, 136, 'HELPLINE REPORT', 12, '#9eecff')
      text(this, x + 24, 158, `Calls made: ${p.callsMade}    Correct: ${p.callsCorrect}\nNumbers you missed:\n${missed}`, 14, '#ffffff', { lineSpacing: 4, wordWrap: { width: w - 48 } })

      const e = barrierRec.exploits
      display(this, x + 24, 348, solo ? 'BARRIER LEDGER (AI)' : 'BARRIER LEDGER', 12, '#c9b8ff')
      text(this, x + 24, 370, `Lights switched off: ${e.lights}   Gates closed: ${e.gates}\nDecoys placed: ${e.decoys}   Other gaps: ${e.other}\nEvery one of these could be repaired.`, 14, '#ffffff', { lineSpacing: 4 })

      const badges = badgesFor(p)
      display(this, x + 24, 452, 'BADGES', 12, '#f5e663')
      text(this, x + 24, 474, badges.length ? badges.join('   |   ') : 'No badges yet: report lights, build a network, call the right number.', 15, '#ffffff', { wordWrap: { width: w - 48 } })
      text(this, x + 24, 530, `Faults reported ${p.faults}  |  Allies made ${p.allies}  |  Wrong calls ${p.story.wrongCalls}`, 13, '#9aa4d6')

      lines.push(`P${id + 1}: runner ${p.runnerScore}, barrier ${p.barrierScore}, calls ${p.callsCorrect}/${p.callsMade}, allies ${p.allies}, badges: ${badges.join(', ') || 'none'}`)
    })
    lines.push('In real life, you can be the ally.')

    const copy = button(this, 440, 650, 300, 56, 'COPY RESULT CARD', () => {
      void navigator.clipboard?.writeText(lines.join('\n'))
      const label = copy.container.getAt(1) as Phaser.GameObjects.Text
      label.setText('COPIED')
    }, COLORS.cyan, 17)
    button(this, 840, 650, 300, 56, 'PLAY AGAIN', Net.shared(this, 'menu', () => this.scene.start('Menu')), COLORS.amber, 17)
  }
}
