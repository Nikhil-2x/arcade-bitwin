import Phaser from 'phaser'
import { COLORS, H, W } from '../config/constants.ts'
import { backdrop, frame, soundToggle } from '../ui/widgets.ts'

/**
 * Backdrop for the two-player room screen. The create / join form itself is a React page
 * drawn over the canvas (pages/RoomPage.tsx), so the room code can be typed, pasted and copied.
 */
export class RoomScene extends Phaser.Scene {
  constructor() {
    super('Room')
  }

  create() {
    // keys captured by an earlier level (W, A, S, D, Space...) would otherwise be swallowed by the code field
    this.input.keyboard?.clearCaptures()
    this.cameras.main.fadeIn(350, 7, 9, 20)
    backdrop(this)
    this.add.rectangle(0, 0, W, H, COLORS.bg, 0.6).setOrigin(0)
    frame(this, 'TWO PLAYERS', 'ONE KEYBOARD OR TWO COMPUTERS')
    soundToggle(this, W - 40, H - 52)
  }
}
