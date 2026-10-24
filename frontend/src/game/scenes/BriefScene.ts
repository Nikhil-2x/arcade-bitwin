import Phaser from 'phaser'
import { COLORS } from '../config/constants.ts'
import { ABILITIES } from '../data/abilities.ts'
import { CODE_PHRASES } from '../data/helplines.ts'
import { LEVELS } from '../data/levels/index.ts'
import { Net } from '../net/Net.ts'
import { Crewmate } from '../entities/Crewmate.ts'
import { GameState } from '../state/GameState.ts'
import type { PlayerIdx } from '../types.ts'
import { backdrop, display, frame, hex, panel, text } from '../ui/widgets.ts'
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
    this.cameras.main.fadeIn(400, 7, 9, 20)
    backdrop(this)
    this.add.rectangle(0, 0, 1280, 720, COLORS.bg, 0.55).setOrigin(0)
    frame(this, `NIGHT 0${def.id} / 03`, `${def.place}  /  ${def.time}S`.toUpperCase())

    display(this, 640, 30, def.title.toUpperCase(), 44, hex(COLORS.amber)).setOrigin(0.5, 0)
    text(this, 640, 92, def.tone, 15, hex(COLORS.muted)).setOrigin(0.5, 0)
    text(this, 640, 120, def.story, 17, hex(COLORS.paper), { align: 'center', wordWrap: { width: 980 }, lineSpacing: 4 }).setOrigin(0.5, 0)

    // Runner card
    panel(this, 60, 215, 520, 400, COLORS.panel, COLORS.cyan)
    this.playerChip(90, 230, step.runner, 'IS THE RUNNER', hex(COLORS.cyan))
    if (step.round === 1) this.swapStrip(step.runner, step.barrier)
    display(this, 90, 256, 'PRIYA', 40, '#ff8fd0')
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
    this.playerChip(730, 230, step.barrier, 'IS THE BARRIER', '#c9b8ff')
    display(this, 730, 256, def.persona.name.toUpperCase(), 32, '#b99cff')
    const ghost = this.add.image(1140, 300, 'ghost').setScale(1.1)
    this.tweens.add({ targets: ghost, y: 312, yoyo: true, repeat: -1, duration: 1200, ease: 'Sine.easeInOut' })
    text(this, 730, 305, def.persona.text, 15, '#ffffff', { wordWrap: { width: 360 }, lineSpacing: 3 })
    const abil = def.abilities.map((id, i) => `${i + 1}  ${ABILITIES[id].name}: ${ABILITIES[id].desc}`).join('\n')
    text(this, 730, 475, abil, 13, '#c9d3ff', { lineSpacing: 3 })
    text(this, 730, 590, ai ? 'The AI plays this side.' : 'Arrow keys move the ghost, 1-8 or click to use abilities', 13, '#9aa4d6')

    const go = display(this, 640, 652, 'PRESS SPACE TO START', 22, hex(COLORS.amber)).setOrigin(0.5)
    this.tweens.add({ targets: go, alpha: 0.35, yoyo: true, repeat: -1, duration: 700 })
    // either player may start; in a room the host runs it
    const start = Net.shared(this, 'start', () => this.start())
    this.input.keyboard?.once('keydown-SPACE', start)
    this.input.once('pointerdown', start)
  }

  /** "PLAYER 1" on a filled chip in that player's colour, then the role it plays this round. */
  private playerChip(x: number, y: number, who: PlayerIdx, role: string, roleColor: string) {
    const name = display(this, x + 8, y + 4, GameState.playerName(who).toUpperCase(), 14, hex(COLORS.bg)).setShadow(0, 0, 'transparent', 0).setDepth(1)
    this.add.rectangle(x, y, name.width + 16, 24, GameState.playerColor(who)).setOrigin(0)
    // on two computers, say which card is yours
    display(this, x + name.width + 28, y + 5, Net.online && Net.localPlayer === who ? `${role}  (YOU)` : role, 13, roleColor)
  }

  /** On the second round of a level, say plainly that the players have traded sides. */
  private swapStrip(runner: PlayerIdx, barrier: PlayerIdx) {
    const msg = `ROLES SWAPPED:  PLAYER ${runner + 1} IS NOW PRIYA,  PLAYER ${barrier + 1} IS THE BARRIER`
    const t = display(this, 640, 194, msg, 13, hex(COLORS.bg)).setOrigin(0.5).setShadow(0, 0, 'transparent', 0).setDepth(1)
    const plate = this.add.rectangle(640, 194, t.width + 36, 26, COLORS.amber)
    this.tweens.add({ targets: [plate, t], scaleX: { from: 0, to: 1 }, duration: 380, ease: 'Expo.easeOut', delay: 250 })
  }

  private start() {
    if (this.started) return
    this.started = true
    Sfx.click()
    const story = GameState.runner().story
    // Level 2 unlocks the Code Phrase: Priya agrees one with Meera first.
    if (GameState.step.level === 2 && !story.codePhrase) {
      Net.prompt(this, GameState.step.runner, {
        parent: 'Brief',
        title: 'Code Phrase unlocked',
        from: 'Meera (text)',
        body: 'Pick a secret phrase for Meera. If a call does not know it, it is not her.',
        options: CODE_PHRASES,
        accent: COLORS.cyan,
        onDone: (r: PromptResult) => {
          // no pick before the card timed out: keep the first phrase so Level 3's check still works
          story.codePhrase = CODE_PHRASES[r.choice[0] ?? 0]
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
