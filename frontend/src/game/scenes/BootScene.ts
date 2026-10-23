import Phaser from 'phaser'
import { FONT, H, W } from '../config/constants.ts'
import { buildTextures } from '../entities/textures.ts'
import { GameState } from '../state/GameState.ts'

/**
 * Atmospheric cinematic loading sequence:
 * Pitch black screen -> single streetlight flickers on -> circle of mini streetlights turn on -> transitions to Trailer.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot')
  }

  create() {
    this.cameras.main.setBackgroundColor('#05060f')

    // Rain streaks in the dark
    for (let i = 0; i < 25; i++) {
      const rx = Phaser.Math.Between(0, W)
      const ry = Phaser.Math.Between(0, H)
      const drop = this.add.rectangle(rx, ry, 1.5, Phaser.Math.Between(10, 18), 0x38bdf8, 0.25)
      this.tweens.add({
        targets: drop,
        y: H + 20,
        duration: Phaser.Math.Between(400, 700),
        repeat: -1,
        ease: 'Linear',
      })
    }

    // Streetlight post and lamp at center-top
    this.add.rectangle(640, 170, 6, 120, 0x1e293b)
    const lampLight = this.add.circle(640, 110, 24, 0xfbbf24, 0.1)
    const lampGlow = this.add.circle(640, 110, 65, 0xfbbf24, 0.05)

    // Flicker streetlight into life
    this.tweens.add({
      targets: [lampLight, lampGlow],
      alpha: { from: 0.1, to: 0.95 },
      duration: 80,
      yoyo: true,
      repeat: 4,
      ease: 'Stepped',
      onComplete: () => {
        lampLight.setAlpha(0.95)
        lampGlow.setAlpha(0.18)
      },
    })

    // Title & status
    const title = this.add.text(640, 320, 'CIRCLE OF ALLIES', {
      fontFamily: FONT,
      fontSize: '38px',
      color: '#ffffff',
      stroke: '#05060f',
      strokeThickness: 8,
    }).setOrigin(0.5).setAlpha(0)

    const status = this.add.text(640, 370, 'PREPARING THE CITY...', {
      fontFamily: FONT,
      fontSize: '15px',
      color: '#9eecff',
      letterSpacing: 4,
    }).setOrigin(0.5).setAlpha(0)

    this.tweens.add({ targets: [title, status], alpha: 1, duration: 600, delay: 200 })

    // Animated loading indicator: Circle of streetlights turning on one by one
    const circleNodes: Phaser.GameObjects.Arc[] = []
    const totalNodes = 12
    const radius = 64
    const centerY = 470

    for (let i = 0; i < totalNodes; i++) {
      const angle = (i / totalNodes) * Math.PI * 2 - Math.PI / 2
      const nx = 640 + Math.cos(angle) * radius
      const ny = centerY + Math.sin(angle) * radius
      const node = this.add.circle(nx, ny, 5, 0x1e293b, 1)
      circleNodes.push(node)
    }

    // Light up nodes sequentially
    circleNodes.forEach((node, idx) => {
      this.time.delayedCall(idx * 80, () => {
        node.setFillStyle(0x00e5ff, 1)
        this.add.circle(node.x, node.y, 11, 0x00e5ff, 0.3)
      })
    })

    // Execute actual procedural texture building & font loading
    buildTextures(this)

    const dev = /dev=([123])/.exec(location.hash)
    const skip = location.hash.includes('skipIntro')

    const advance = () => {
      if (dev) {
        GameState.newGame('solo')
        GameState.stepIndex = Number(dev[1]) - 1
        const s = GameState.players[0].story
        s.checkedIn = true
        if (dev[1] === '3') s.reportedLight = s.helpedKavya = true
        return this.scene.start('Level')
      }
      if (skip) {
        return this.scene.start('Menu')
      }
      // Normal visit transitions directly into TrailerScene!
      this.cameras.main.fadeOut(400, 0, 0, 0)
      this.time.delayedCall(420, () => {
        this.scene.start('Trailer')
      })
    }

    // Wait for actual font readiness and ensure clean transition
    Promise.race([
      document.fonts.load(`24px "Varela Round"`),
      new Promise((r) => setTimeout(r, 1100)),
    ]).then(() => {
      // Small pause for the circle lights animation to complete
      this.time.delayedCall(1000, advance)
    })
  }
}
