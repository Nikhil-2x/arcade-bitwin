import Phaser from 'phaser'
import { COLORS } from '../config/constants.ts'
import { ABILITIES } from '../data/abilities.ts'
import { CODE_PHRASES } from '../data/helplines.ts'
import { LEVELS } from '../data/levels/index.ts'
import { Crewmate } from '../entities/Crewmate.ts'
import { GameState } from '../state/GameState.ts'
import { panel, starfield, text } from '../ui/widgets.ts'
import { Sfx } from '../utils/sfx.ts'
import type { PromptResult } from './PromptScene.ts'

/**
 * Role reveal before every round, modelled on the crew reveal screen:
 * who is Priya, who is the Barrier, and the Barrier's perspective text.
 */
export class BriefScene extends Phaser.Scene {
  private started = false

  constructor() {
    super('Brief')
  }

  create() {
    this.started = false
    const step = GameState.step
    const def = LEVELS[step.level]
    const ai = GameState.aiBarrier
    this.cameras.main.setBackgroundColor('#070a1f')
    this.cameras.main.fadeIn(400, 0, 0, 0)
    starfield(this)

    text(this, 640, 34, `LEVEL ${def.id}  -  ${def.title.toUpperCase()}`, 38, '#9eecff', { strokeThickness: 8 }).setOrigin(0.5)
    text(this, 640, 78, `${def.place}   |   ${def.time}s   |   ${def.tone}`, 15, '#9aa4d6').setOrigin(0.5)
    text(this, 640, 112, def.story, 17, '#ffffff', { align: 'center', wordWrap: { width: 1000 }, lineSpacing: 4 }).setOrigin(0.5, 0)

    // Runner card
    panel(this, 60, 215, 520, 400, 0x0c1030, COLORS.cyan)
    text(this, 90, 232, `PLAYER ${step.runner + 1}  -  THE RUNNER`, 18, '#9eecff')
    text(this, 90, 258, 'PRIYA', 40, '#ff8fd0')
    const priya = new Crewmate(this, 470, 345, 'pink', 2.3)
    this.add.existing(priya)
    this.time.addEvent({ delay: 16, loop: true, callback: () => priya.animate(0.016, true, 1) })
    text(
      this,
      90,
      318,
      'Get home before the timer ends\nand before the Isolation meter fills.\n\nWASD  move\nSPACE  use / hold to report\nF  phone torch      E  share location\nQ  call an ally (30 aware points)\n\nAllies widen your light and block\nBarrier abilities.',
      17,
      '#ffffff',
      { lineSpacing: 5 },
    )

    // Barrier card
    panel(this, 700, 215, 520, 400, 0x120c30, COLORS.purple)
    text(this, 730, 232, `${ai ? 'AI' : `PLAYER ${step.barrier + 1}`}  -  THE BARRIER`, 18, '#c9b8ff')
    text(this, 730, 258, def.persona.name.toUpperCase(), 34, '#b99cff')
    const ghost = this.add.image(1140, 300, 'ghost').setScale(1.1)
    this.tweens.add({ targets: ghost, y: 312, yoyo: true, repeat: -1, duration: 1200, ease: 'Sine.easeInOut' })
    text(this, 730, 305, def.persona.text, 15, '#ffffff', { wordWrap: { width: 360 }, lineSpacing: 3 })
    const abil = def.abilities.map((id, i) => `${i + 1}  ${ABILITIES[id].name}: ${ABILITIES[id].desc}`).join('\n')
    text(this, 730, 475, abil, 13, '#c9d3ff', { lineSpacing: 3 })
    text(this, 730, 590, ai ? 'The AI plays this side.' : 'Arrow keys move the ghost, 1-8 or click to use abilities', 13, '#9aa4d6')

    const go = text(this, 640, 658, 'Press SPACE to start', 28, '#f5e663').setOrigin(0.5)
    this.tweens.add({ targets: go, alpha: 0.35, yoyo: true, repeat: -1, duration: 700 })
    this.input.keyboard?.once('keydown-SPACE', () => this.start())
    this.input.once('pointerdown', () => this.start())
  }

  private start() {
    if (this.started) return
    this.started = true
    Sfx.click()
    const story = GameState.runner().story
    // Level 2 unlocks the Code Phrase: Priya agrees one with Meera first.
    if (GameState.step.level === 2 && !story.codePhrase) {
      this.scene.launch('Prompt', {
        parent: 'Brief',
        title: 'Code Phrase unlocked',
        from: 'Meera (text)',
        body: 'Pick a secret phrase for Meera. If a call does not know it, it is not her.',
        options: CODE_PHRASES,
        accent: COLORS.cyan,
        onDone: (r: PromptResult) => {
          story.codePhrase = CODE_PHRASES[r.choice[0]]
          this.go()
        },
      })
      return
    }
    this.go()
  }

  private go() {
    this.cameras.main.fadeOut(300, 0, 0, 0)
    this.time.delayedCall(320, () => this.scene.start('Level'))
  }
}
