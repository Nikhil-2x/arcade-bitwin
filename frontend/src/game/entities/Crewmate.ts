import Phaser from 'phaser'

/**
 * Character entity.
 * - For Priya (color === 'pink'): renders the detailed girl from the reference image
 *   (brown hair, lavender hoodie, backpack, dark charcoal pants, purple sneakers with white soles,
 *    and glowing smartphone) with smooth procedural walking and idle breathing animations.
 * - For other colors: renders stylized Indian humanoid characters (Salim in tea-vendor vest,
 *   Aunty in saree, student allies with backpacks, guards with caps, etc.).
 */
export class Crewmate extends Phaser.GameObjects.Container {
  readonly color: string
  readonly isPriya: boolean

  // Priya specific body parts
  private priyaShadow?: Phaser.GameObjects.Image
  private priyaHairBack?: Phaser.GameObjects.Image
  private priyaLegL?: Phaser.GameObjects.Image
  private priyaLegR?: Phaser.GameObjects.Image
  private priyaArmBack?: Phaser.GameObjects.Image
  private priyaTorso?: Phaser.GameObjects.Image
  private priyaHead?: Phaser.GameObjects.Image
  private priyaArmFront?: Phaser.GameObjects.Image
  private priyaPhoneGlow?: Phaser.GameObjects.Image

  // Humanoid NPC body parts
  private humanLegL?: Phaser.GameObjects.Image
  private humanLegR?: Phaser.GameObjects.Image
  private humanTorso?: Phaser.GameObjects.Image
  private humanHead?: Phaser.GameObjects.Image

  // Legacy fallback
  private fallbackBody?: Phaser.GameObjects.Image
  private fallbackLegL?: Phaser.GameObjects.Image
  private fallbackLegR?: Phaser.GameObjects.Image

  private phase = Math.random() * 6
  private facing = 1
  private baseScale: number
  private label?: Phaser.GameObjects.Text
  private popping = false

  constructor(scene: Phaser.Scene, x: number, y: number, color: string, scale = 0.85) {
    super(scene, x, y)
    this.color = color
    this.isPriya = color === 'pink'
    this.baseScale = scale

    const tex = scene.textures

    if (this.isPriya && tex.exists('priya_head')) {
      // Assemble Priya: Girl matching reference image
      this.priyaShadow = scene.add.image(0, 4, 'priya_shadow').setScale(0.55).setOrigin(0.5, 0.5)
      this.priyaHairBack = scene.add.image(-4, -28, 'priya_hair_back').setScale(0.55).setOrigin(0.3, 0.15)
      this.priyaLegL = scene.add.image(-5, -14, 'priya_leg').setScale(0.55).setOrigin(0.5, 0.1)
      this.priyaArmBack = scene.add.image(-3, -22, 'priya_arm_back').setScale(0.55).setOrigin(0.5, 0.15)
      this.priyaTorso = scene.add.image(0, -18, 'priya_torso').setScale(0.55).setOrigin(0.5, 0.5)
      this.priyaLegR = scene.add.image(5, -14, 'priya_leg').setScale(0.55).setOrigin(0.5, 0.1)
      this.priyaHead = scene.add.image(2, -32, 'priya_head').setScale(0.55).setOrigin(0.5, 0.5)
      this.priyaArmFront = scene.add.image(6, -20, 'priya_arm_front').setScale(0.55).setOrigin(0.3, 0.2)
      this.priyaPhoneGlow = scene.add.image(20, -20, 'priya_phone_glow').setScale(0.45).setOrigin(0.5, 0.5).setAlpha(0.6).setBlendMode(Phaser.BlendModes.ADD)

      this.add([
        this.priyaShadow,
        this.priyaHairBack,
        this.priyaLegL,
        this.priyaArmBack,
        this.priyaTorso,
        this.priyaLegR,
        this.priyaHead,
        this.priyaArmFront,
        this.priyaPhoneGlow,
      ])
    } else if (tex.exists(`human_head_${color}`)) {
      // Assemble Stylized Humanoid Ally / NPC
      const shadow = scene.add.ellipse(0, 3, 26, 8, 0x000000, 0.4)
      this.humanLegL = scene.add.image(-5, -12, `human_leg_${color}`).setScale(0.52).setOrigin(0.5, 0)
      this.humanLegR = scene.add.image(5, -12, `human_leg_${color}`).setScale(0.52).setOrigin(0.5, 0)
      this.humanTorso = scene.add.image(0, -18, `human_torso_${color}`).setScale(0.52).setOrigin(0.5, 0.5)
      this.humanHead = scene.add.image(0, -32, `human_head_${color}`).setScale(0.52).setOrigin(0.5, 0.5)

      this.add([shadow, this.humanLegL, this.humanLegR, this.humanTorso, this.humanHead])
    } else {
      // Fallback
      const shadow = scene.add.ellipse(0, 3, 30, 10, 0x000000, 0.35)
      this.fallbackLegL = scene.add.image(-8, -10, `cm_leg_${color}`).setScale(0.5).setOrigin(0.5, 0)
      this.fallbackLegR = scene.add.image(8, -10, `cm_leg_${color}`).setScale(0.5).setOrigin(0.5, 0)
      this.fallbackBody = scene.add.image(0, -6, `cm_body_${color}`).setScale(0.5).setOrigin(0.5, 1)
      this.add([shadow, this.fallbackLegL, this.fallbackLegR, this.fallbackBody])
    }

    this.setScale(scale)
    scene.add.existing(this)
  }

  /** Floating name tag under the character. */
  setLabel(text: string, font: string) {
    if (!this.label) {
      this.label = this.scene.add
        .text(0, 14, text, {
          fontFamily: font,
          fontSize: '13px',
          color: '#ffffff',
          stroke: '#05060f',
          strokeThickness: 4,
        })
        .setOrigin(0.5, 0)
      this.add(this.label)
    }
    this.label.setText(text)
    return this
  }

  /** Set character facing direction explicitly (1 = right, -1 = left). */
  setFacing(dir: 1 | -1) {
    this.facing = dir
    if (!this.popping) {
      this.scaleX = this.baseScale * this.facing
      if (this.label) this.label.scaleX = this.facing
    }
    return this
  }

  /** Call every frame. `vx` drives the facing, `moving` selects walk vs idle. */
  animate(dt: number, moving: boolean, vx = 0) {
    if (vx > 0.05) this.facing = 1
    else if (vx < -0.05) this.facing = -1

    if (!this.popping) {
      this.scaleX = this.baseScale * this.facing
      if (this.label) this.label.scaleX = this.facing
    }

    if (this.isPriya && this.priyaLegL && this.priyaLegR && this.priyaTorso && this.priyaHead) {
      this.animatePriya(dt, moving, vx)
    } else if (this.humanLegL && this.humanLegR && this.humanTorso && this.humanHead) {
      this.animateHumanoid(dt, moving)
    } else if (this.fallbackBody && this.fallbackLegL && this.fallbackLegR) {
      this.animateFallback(dt, moving)
    }
  }

  private animatePriya(dt: number, moving: boolean, vx: number) {
    if (moving) {
      this.phase += dt * 11
      const s = Math.sin(this.phase)
      const c = Math.cos(this.phase)
      const stride = s * 24

      // Left leg stride & lift
      this.priyaLegL!.setAngle(stride)
      this.priyaLegL!.y = -14 - Math.max(0, -s) * 3.5

      // Right leg stride & lift
      this.priyaLegR!.setAngle(-stride)
      this.priyaLegR!.y = -14 - Math.max(0, s) * 3.5

      // Torso & head vertical bob
      const yBob = -Math.abs(s) * 2.8
      this.priyaTorso!.y = -18 + yBob
      this.priyaHead!.y = -32 + yBob * 0.9

      // Forward lean when walking/running
      const lean = Math.min(6, Math.max(1, Math.abs(vx) * 0.05))
      this.priyaTorso!.setAngle(lean)
      this.priyaHead!.setAngle(lean * 0.5)

      // Hair ponytail dynamic sway
      if (this.priyaHairBack) {
        this.priyaHairBack.setAngle(-stride * 0.6 + c * 8 - 6)
      }

      // Back arm swinging opposite to leg
      if (this.priyaArmBack) {
        this.priyaArmBack.setAngle(-stride * 0.8)
        this.priyaArmBack.y = -22 + yBob * 0.5
      }

      // Front arm holding phone (steady with subtle breathing/step pulse)
      if (this.priyaArmFront) {
        this.priyaArmFront.setAngle(-s * 4)
        this.priyaArmFront.y = -20 + yBob * 0.8
      }

      // Phone screen light glow pulse
      if (this.priyaPhoneGlow) {
        this.priyaPhoneGlow.y = -20 + yBob * 0.8
        this.priyaPhoneGlow.setAlpha(0.55 + Math.sin(this.phase * 2) * 0.18)
      }
    } else {
      // Idle Breathing Animation
      this.phase += dt * 2.8
      const breath = Math.sin(this.phase)

      this.priyaLegL!.setAngle(0).y = -14
      this.priyaLegR!.setAngle(0).y = -14

      this.priyaTorso!.y = -18 + breath * 0.8
      this.priyaTorso!.setAngle(0)
      this.priyaHead!.y = -32 + breath * 1.2
      this.priyaHead!.setAngle(0)

      if (this.priyaHairBack) {
        this.priyaHairBack.setAngle(breath * 3)
      }
      if (this.priyaArmBack) {
        this.priyaArmBack.setAngle(0).y = -22 + breath * 0.5
      }
      if (this.priyaArmFront) {
        this.priyaArmFront.setAngle(breath * 2).y = -20 + breath * 0.8
      }
      if (this.priyaPhoneGlow) {
        this.priyaPhoneGlow.y = -20 + breath * 0.8
        this.priyaPhoneGlow.setAlpha(0.5 + breath * 0.12)
      }
    }
  }

  private animateHumanoid(dt: number, moving: boolean) {
    if (moving) {
      this.phase += dt * 10
      const s = Math.sin(this.phase)
      this.humanLegL!.setAngle(s * 20)
      this.humanLegR!.setAngle(-s * 20)
      const yBob = -Math.abs(s) * 2
      this.humanTorso!.y = -18 + yBob
      this.humanHead!.y = -32 + yBob
    } else {
      this.phase += dt * 2.5
      const breath = Math.sin(this.phase)
      this.humanLegL!.setAngle(0)
      this.humanLegR!.setAngle(0)
      this.humanTorso!.y = -18 + breath * 0.6
      this.humanHead!.y = -32 + breath * 0.8
    }
  }

  private animateFallback(dt: number, moving: boolean) {
    if (moving) {
      this.phase += dt * 14
      const s = Math.sin(this.phase)
      this.fallbackLegL!.setPosition(-8 + s * 4, -10 - Math.max(0, s) * 4)
      this.fallbackLegR!.setPosition(8 - s * 4, -10 - Math.max(0, -s) * 4)
      this.fallbackBody!.y = -6 - Math.abs(s) * 2.5
      this.fallbackBody!.scaleY = 0.5 * (1 - Math.abs(s) * 0.04)
    } else {
      this.phase += dt * 3
      this.fallbackLegL!.setPosition(-8, -10)
      this.fallbackLegR!.setPosition(8, -10)
      this.fallbackBody!.y = -6
      this.fallbackBody!.scaleY = 0.5 * (1 + Math.sin(this.phase) * 0.018)
    }
  }

  /** Pop in with bounce ease. */
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
