import Phaser from 'phaser'

/**
 * Empty scene that runs on top of a Level to hold its HUD when the Level camera is zoomed in
 * (Priya's own screen on two computers), so the console stays sharp and fixed to the screen.
 */
export class LevelHudScene extends Phaser.Scene {
  constructor() {
    super('LevelHud')
  }
}
