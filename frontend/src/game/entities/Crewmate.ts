import Phaser from 'phaser'

/**
 * Among-Us style bean character. Legs swing and the body bobs while walking
 * and breathes while idle; the backpack side flips with the walking direction.
 */
export class Crewmate extends Phaser.GameObjects.Container {
  readonly color: string
  private bodyImg: Phaser.GameObjects.Image
  private legL: Phaser.GameObjects.Image
  private legR: Phaser.GameObjects.Image
  private phase = Math.random() * 6
  private facing = 1
  private baseScale: number
  private label?: Phaser.GameObjects.Text
  private popping = false

  constructor(scene: Phaser.Scene, x: number, y: number, color: string, scale = 0.85) {
    super(scene, x, y)
    this.color = color
    this.baseScale = scale
    const shadow = scene.add.ellipse(0, 3, 30, 10, 0x000000, 0.35)
    this.legL = scene.add.image(-8, -10, `cm_leg_${color}`).setScale(0.5).setOrigin(0.5, 0)
    this.legR = scene.add.image(8, -10, `cm_leg_${color}`).setScale(0.5).setOrigin(0.5, 0)
    this.bodyImg = scene.add.image(0, -6, `cm_body_${color}`).setScale(0.5).setOrigin(0.5, 1)
    this.add([shadow, this.legL, this.legR, this.bodyImg])
    this.setScale(scale)
    scene.add.existing(this)
  }

  /** Floating name tag under the character. */
  setLabel(text: string, font: string) {
    if (!this.label) {
      this.label = this.scene.add
        .text(0, 12, text, { fontFamily: font, fontSize: '13px', color: '#fff', stroke: '#05060f', strokeThickness: 4 })
        .setOrigin(0.5, 0)
      this.add(this.label)
    }
    this.label.setText(text)
    return this
  }

  /** Call every frame. `vx` drives the facing, `moving` selects walk vs idle. */
  animate(dt: number, moving: boolean, vx = 0) {
    if (vx > 5) this.facing = 1
    else if (vx < -5) this.facing = -1
    if (!this.popping) {
      this.scaleX = this.baseScale * this.facing
      if (this.label) this.label.scaleX = this.facing
    }
    if (moving) {
      this.phase += dt * 14
      const s = Math.sin(this.phase)
      this.legL.setPosition(-8 + s * 4, -10 - Math.max(0, s) * 4)
      this.legR.setPosition(8 - s * 4, -10 - Math.max(0, -s) * 4)
      this.bodyImg.y = -6 - Math.abs(s) * 2.5
      this.bodyImg.scaleY = 0.5 * (1 - Math.abs(s) * 0.04)
    } else {
      this.phase += dt * 3
      this.legL.setPosition(-8, -10)
      this.legR.setPosition(8, -10)
      this.bodyImg.y = -6
      this.bodyImg.scaleY = 0.5 * (1 + Math.sin(this.phase) * 0.018)
    }
  }

  /** Among-Us vent pop: bounce in from nothing. */
  popIn(delay = 0) {
    this.popping = true
    this.setScale(0, 0)
    this.scene.tweens.add({
      targets: this,
      scaleX: this.baseScale * this.facing,
      scaleY: this.baseScale,
      duration: 380,
      delay,
      ease: 'Back.easeOut',
      onComplete: () => (this.popping = false),
    })
  }

  popOut(onDone?: () => void) {
    this.scene.tweens.add({
      targets: this,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: 300,
      ease: 'Back.easeIn',
      onComplete: () => onDone?.(),
    })
  }
}
