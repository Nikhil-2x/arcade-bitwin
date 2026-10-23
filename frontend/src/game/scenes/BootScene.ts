import Phaser from 'phaser'
import { COLORS, W } from '../config/constants.ts'
import { buildTextures } from '../entities/textures.ts'
import { GameState } from '../state/GameState.ts'
import type { LevelId } from '../types.ts'
import { display, frame, hex, text } from '../ui/widgets.ts'
import { Sfx } from '../utils/sfx.ts'

const SEGMENTS = 24

/**
 * Loader: one streetlight flickers on while a segmented meter fills and the counter ticks up.
 * Ends on an "enter" gate so the first click also unlocks browser audio for the trailer.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot')
  }

  create() {
    this.cameras.main.setBackgroundColor(hex(COLORS.bg))
    buildTextures(this)

    const dev = /dev=([123])/.exec(location.hash)
    if (dev) {
      GameState.newGame('solo')
      GameState.startLevel(Number(dev[1]) as LevelId)
      const s = GameState.players[0].story
      s.checkedIn = true
      if (dev[1] === '3') s.reportedLight = s.helpedKavya = true
      return this.scene.start('Level')
    }

    frame(this, 'BOOT', 'WARD 14  /  COLONY GATE')

    // the lamp: pole, head, cone, all dark until the meter is nearly full
    const lx = W / 2
    this.add.rectangle(lx, 236, 6, 150, 0x1b2148)
    this.add.rectangle(lx - 18, 162, 42, 6, 0x1b2148)
    const cone = this.add.triangle(0, 0, lx - 38, 168, lx - 150, 330, lx + 74, 330, COLORS.amber, 0.16).setOrigin(0).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD)
    const head = this.add.circle(lx - 38, 168, 12, COLORS.amber).setAlpha(0.12)

    const title = display(this, W / 2, 380, 'CIRCLE OF ALLIES', 46, hex(COLORS.paper)).setOrigin(0.5).setAlpha(0)
    const status = text(this, W / 2, 428, 'Preparing the night...', 17, hex(COLORS.muted)).setOrigin(0.5)
    const bar = this.add.graphics()
    const seg = 18
    const bx = W / 2 - (SEGMENTS * (seg + 2)) / 2 - 24
    const pct = display(this, bx + SEGMENTS * (seg + 2) + 12, 470, '000', 14, hex(COLORS.amber)).setOrigin(0, 0.5)
    const drawBar = (p: number) => {
      bar.clear()
      for (let i = 0; i < SEGMENTS; i++) {
        const on = i < Math.round(p * SEGMENTS)
        bar.fillStyle(on ? COLORS.amber : 0x1b2148, on ? 1 : 0.9).fillRect(bx + i * (seg + 2), 464, seg, 12)
      }
    }
    drawBar(0)

    const steps = ['Preparing the night...', 'Switching on the streetlights...', 'Waking up the tea stall...', 'Charging the phone...']
    const load = { p: 0 }
    const fonts = Promise.race([
      Promise.all([document.fonts.load('24px "Varela Round"'), document.fonts.load('24px "Bungee"')]),
      new Promise((r) => setTimeout(r, 1500)),
    ]).then(() => {
      // text drawn before the webfonts arrived is cached in the fallback face; redraw it
      this.children.list.forEach((o) => o instanceof Phaser.GameObjects.Text && o.updateText())
    })

    this.tweens.add({ targets: title, alpha: 1, duration: 500 })
    this.tweens.add({
      targets: load,
      p: 1,
      duration: 1700,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        drawBar(load.p)
        pct.setText(Math.round(load.p * 100).toString().padStart(3, '0'))
        status.setText(steps[Math.min(steps.length - 1, Math.floor(load.p * steps.length))])
        if (load.p > 0.82 && cone.alpha === 0) this.ignite(head, cone)
      },
      onComplete: () => void fonts.then(() => this.gate(status, location.hash.includes('skipIntro'))),
    })
  }

  /** The lamp stutters on like old wiring. */
  private ignite(head: Phaser.GameObjects.Arc, cone: Phaser.GameObjects.Triangle) {
    cone.setAlpha(0.01)
    this.tweens.add({
      targets: [head, cone],
      alpha: { from: 0.15, to: 1 },
      duration: 70,
      yoyo: true,
      repeat: 3,
      ease: 'Stepped',
      onComplete: () => {
        head.setAlpha(1)
        cone.setAlpha(1)
      },
    })
  }

  private gate(status: Phaser.GameObjects.Text, toMenu: boolean) {
    status.setText('Click or press any key to enter').setColor(hex(COLORS.paper))
    this.tweens.add({ targets: status, alpha: 0.35, duration: 650, yoyo: true, repeat: -1 })
    let gone = false
    const go = () => {
      if (gone) return
      gone = true
      Sfx.click()
      this.cameras.main.fadeOut(400, 7, 9, 20)
      this.time.delayedCall(420, () => this.scene.start(toMenu ? 'Menu' : 'Trailer'))
    }
    this.input.once('pointerdown', go)
    this.input.keyboard?.once('keydown', go)
  }
}
