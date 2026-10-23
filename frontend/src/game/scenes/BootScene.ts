import Phaser from 'phaser'
import { FONT } from '../config/constants.ts'
import { buildTextures } from '../entities/textures.ts'
import { GameState } from '../state/GameState.ts'

/** Builds every procedural texture, waits for the web font, then opens the menu. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot')
  }

  create() {
    buildTextures(this)
    const label = this.add.text(640, 360, 'Loading...', { fontFamily: FONT, fontSize: '28px', color: '#9eecff' }).setOrigin(0.5)
    const go = () => {
      // Developer shortcut: index.html#dev=2 jumps straight into level 2 (solo, AI barrier).
      const dev = /dev=([123])/.exec(location.hash)
      if (dev) {
        GameState.newGame('solo')
        GameState.stepIndex = Number(dev[1]) - 1
        const s = GameState.players[0].story
        s.checkedIn = true
        if (dev[1] === '3') s.reportedLight = s.helpedKavya = true
        return this.scene.start('Level')
      }
      this.scene.start('Menu')
    }
    // Make sure the rounded font is ready so first-frame text is not measured with the fallback.
    Promise.race([document.fonts.load(`24px "Varela Round"`), new Promise((r) => setTimeout(r, 1200))]).then(() => {
      label.destroy()
      go()
    })
  }
}
