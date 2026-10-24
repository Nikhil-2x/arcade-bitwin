import Phaser from 'phaser'
import { COLORS } from '../config/constants.ts'
import { Net } from '../net/Net.ts'
import { GameState } from '../state/GameState.ts'
import type { PlayerIdx } from '../types.ts'
import { frame, hex, text } from '../ui/widgets.ts'
import { Sfx } from '../utils/sfx.ts'
import type { PromptResult } from './PromptScene.ts'

/** Black screen, heartbeat, a phone buzz and CHOICE 0 for each Priya. */
export class PrologueScene extends Phaser.Scene {
  constructor() {
    super('Prologue')
  }

  create() {
    this.cameras.main.setBackgroundColor('#000000')
    frame(this, 'PROLOGUE', 'BEFORE NIGHT 01')
    const pulse = this.add.circle(640, 360, 40, 0x9eecff, 0.0)
    this.tweens.add({ targets: pulse, alpha: { from: 0.25, to: 0 }, scale: { from: 1, to: 14 }, duration: 900, repeat: 2, onRepeat: () => Sfx.heartbeat() })
    Sfx.heartbeat()
    // in a room the host runs the questions; the guest's screen only plays the narration when told
    if (Net.isGuest) return Net.onCue(this, 'narrate', () => this.narrate())
    this.time.delayedCall(2600, () => this.ask(0))
  }

  private ask(k: number) {
    const runners = GameState.mode === 'duo' ? 2 : 1
    if (k >= runners) return this.narrate()
    Sfx.phone()
    const who = runners > 1 ? `Player ${k + 1}, ` : ''
    Net.prompt(this, k as PlayerIdx, {
      parent: 'Prologue',
      title: `${who}before you leave`,
      from: 'Meera (text)',
      body: 'Reached home? Tell me when you leave.',
      options: ['"I will text you when I am out."  (Meera becomes your Check-In Contact)', '"I am fine, do not worry."  (No backup this level)'],
      accent: COLORS.cyan,
      onDone: (r: PromptResult) => {
        GameState.players[k].story.checkedIn = r.choice[0] === 0
        this.ask(k + 1)
      },
    })
  }

  private narrate() {
    Net.cue(this, 'narrate')
    const lines = ['Priya checks her battery. 100%.', 'Three nights, one way home.', 'She is not alone. She just does not know it yet.']
    lines.forEach((l, i) => {
      const t = text(this, 640, 300 + i * 50, l, i === 2 ? 26 : 22, i === 2 ? hex(COLORS.amber) : hex(COLORS.paper)).setOrigin(0.5).setAlpha(0)
      this.tweens.add({ targets: t, alpha: 1, y: t.y - 8, duration: 700, delay: i * 1400, ease: 'Cubic.easeOut' })
    })
    if (Net.isGuest) return
    this.time.delayedCall(5600, () => {
      GameState.prologueDone = true
      this.cameras.main.fadeOut(500, 0, 0, 0)
      this.time.delayedCall(520, () => this.scene.start('Brief'))
    })
  }
}
