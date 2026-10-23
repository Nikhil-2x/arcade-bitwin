import Phaser from 'phaser'
import { COLORS } from '../config/constants.ts'
import { Crewmate } from '../entities/Crewmate.ts'
import { CREW_COLORS } from '../entities/palette.ts'
import { GameState } from '../state/GameState.ts'
import { button, panel, starfield, text } from '../ui/widgets.ts'
import { Sfx } from '../utils/sfx.ts'

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu')
  }

  create() {
    this.cameras.main.fadeIn(400, 0, 0, 0)
    starfield(this)
    this.spawnDrifters()

    const title = text(this, 640, 120, 'CIRCLE OF ALLIES', 78, '#9eecff', { strokeThickness: 12 }).setOrigin(0.5)
    this.tweens.add({ targets: title, y: 128, yoyo: true, repeat: -1, duration: 1800, ease: 'Sine.easeInOut' })
    text(this, 640, 188, 'Three nights. One way home. Nobody should walk it alone.', 22, '#c9d3ff').setOrigin(0.5)

    button(this, 640, 300, 420, 64, '1 Player  (vs AI Barrier)', () => this.begin('solo'), COLORS.cyan, 26)
    button(this, 640, 384, 420, 64, '2 Players  (local, roles swap)', () => this.begin('duo'), COLORS.yellow, 26)

    const how = panel(this, 340, 450, 600, 190, COLORS.panel, COLORS.panelEdge)
    how.setAlpha(0.95)
    text(this, 640, 462, 'HOW TO PLAY', 16, '#9eecff').setOrigin(0.5, 0)
    text(
      this,
      640,
      490,
      'Runner (Priya):  WASD move   SPACE use / hold to report   F phone torch\nE share location   Q call an ally (30 aware)\n\nBarrier:  Arrow keys move the ghost   1-8 or click to use abilities\n(in 1 Player the Barrier is an AI)',
      16,
      '#ffffff',
      { align: 'center', lineSpacing: 6 },
    ).setOrigin(0.5, 0)

    const mute = text(this, 1250, 696, 'sound: on  (M)', 14, '#9aa4d6').setOrigin(1, 0.5)
    this.input.keyboard?.on('keydown-M', () => mute.setText(`sound: ${Sfx.toggleMute() ? 'off' : 'on'}  (M)`))
    text(this, 30, 696, 'A story about lights, people and places', 14, '#9aa4d6').setOrigin(0, 0.5)
  }

  private begin(mode: 'solo' | 'duo') {
    GameState.newGame(mode)
    this.cameras.main.fadeOut(300, 0, 0, 0)
    this.time.delayedCall(320, () => this.scene.start('Prologue'))
  }

  /** Crewmates floating across space with a slow tumble, like the classic title screen. */
  private spawnDrifters() {
    const names = Object.keys(CREW_COLORS)
    names.forEach((name, i) => {
      const crew = new Crewmate(this, -80, 0, name, 0.8 + Math.random() * 0.6).setDepth(2).setAlpha(0.85)
      const launch = () => {
        crew.setPosition(-120, 80 + Math.random() * 560)
        this.tweens.add({ targets: crew, x: 1400, duration: 14000 + Math.random() * 12000, onComplete: launch })
      }
      this.tweens.add({ targets: crew, angle: i % 2 ? 360 : -360, duration: 9000 + i * 900, repeat: -1 })
      this.time.delayedCall(i * 1800, launch)
    })
  }
}
