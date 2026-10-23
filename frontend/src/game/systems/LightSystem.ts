import Phaser from 'phaser'
import { H, W } from '../config/constants.ts'

/**
 * Darkness overlay. Every frame the overlay is filled and soft circles are
 * erased out of it wherever there is light (Priya, allies, lamps, safe zones).
 */
export class LightSystem {
  private rt: Phaser.GameObjects.RenderTexture
  private brush: Phaser.GameObjects.Image

  private darkness: number

  constructor(scene: Phaser.Scene, darkness: number) {
    this.darkness = darkness
    this.rt = scene.add.renderTexture(0, 0, W, H).setOrigin(0, 0).setDepth(10)
    this.brush = scene.make.image({ key: 'light', add: false })
  }

  begin() {
    this.rt.clear()
    this.rt.fill(0x04061a, this.darkness)
  }

  add(x: number, y: number, radius: number, strength = 1) {
    this.brush.setPosition(x, y).setDisplaySize(radius * 2, radius * 2).setAlpha(strength)
    this.rt.erase(this.brush)
  }

  destroy() {
    this.rt.destroy()
    this.brush.destroy()
  }
}
