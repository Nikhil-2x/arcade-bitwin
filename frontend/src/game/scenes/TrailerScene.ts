import Phaser from 'phaser'
import { COLORS, FONT, H, W } from '../config/constants.ts'
import { button, soundToggle } from '../ui/widgets.ts'
import { Sfx } from '../utils/sfx.ts'
import { TrailerAudio } from '../utils/TrailerAudio.ts'
import { Crewmate } from '../entities/Crewmate.ts'

/**
 * 2D Cinematic Animated Movie Trailer for Circle of Allies.
 * Plays automatically like a film, telling Priya's story and previewing the game.
 */
export class TrailerScene extends Phaser.Scene {
  private timelineTimer?: Phaser.Time.TimerEvent
  private trailerContainer!: Phaser.GameObjects.Container
  private hudContainer!: Phaser.GameObjects.Container
  private isFinishing = false
  public currentShot = 0

  constructor() {
    super('Trailer')
  }

  create() {
    this.isFinishing = false
    this.cameras.main.fadeIn(800, 0, 0, 0)
    this.cameras.main.setBackgroundColor('#05060f')

    // Root cinematic container
    this.trailerContainer = this.add.container(0, 0)
    // pinned to the screen so it ignores the shot 1 camera pan
    this.hudContainer = this.add.container(0, 0).setDepth(100).setScrollFactor(0)

    // Build cinematic HUD (Skip Trailer & Sound Toggle)
    this.createHud()

    // Start cinematic soundscape
    if (!Sfx.muted) TrailerAudio.start()

    // ESC skips; M (sound) is bound by the toggle itself
    this.input.keyboard?.on('keydown-ESC', () => this.finishTrailer())

    // Sequence the 7 cinematic shots
    this.playShot1()
  }

  private createHud() {
    const skip = button(this, W - 112, 44, 168, 40, 'SKIP', () => this.finishTrailer(), COLORS.amber, 14, { key: 'ESC' })
    const sound = soundToggle(this, W - 40, H - 34, (muted) => (muted ? TrailerAudio.stop() : TrailerAudio.start()))
    this.hudContainer.add([skip.container, sound])
  }

  /** SHOT 1: A City That Never Sleeps (0s - 6.5s) */
  private playShot1() {
    this.currentShot = 1
    this.trailerContainer.removeAll(true)

    // Midnight sky gradient
    const sky = this.add.graphics()
    sky.fillGradientStyle(0x02040a, 0x02040a, 0x090d1e, 0x090d1e, 1)
    sky.fillRect(0, 0, W, H)
    this.trailerContainer.add(sky)

    // Distant city skyline silhouettes with lit windows
    const skyline = this.add.graphics()
    skyline.fillStyle(0x060914, 1)
    for (let x = 0; x < W + 200; x += 45) {
      const bh = 140 + Math.sin(x * 0.05) * 80 + (x % 3) * 40
      skyline.fillRect(x, H - 200 - bh, 42, bh + 200)
    }
    // Windows in distant buildings
    for (let i = 0; i < 45; i++) {
      const wx = 30 + (i * 28) % W
      const wy = H - 320 + ((i * 37) % 180)
      const color = i % 2 === 0 ? 0xfbbf24 : 0x38bdf8
      skyline.fillStyle(color, 0.45)
      skyline.fillRect(wx, wy, 4, 6)
    }
    this.trailerContainer.add(skyline)

    // Overhead telephone & electrical wires
    const wires = this.add.graphics()
    wires.lineStyle(1.5, 0x1e293b, 0.8)
    const wire1 = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(0, 240), new Phaser.Math.Vector2(W / 2, 290), new Phaser.Math.Vector2(W, 220))
    wires.strokePoints(wire1.getPoints(24))
    const wire2 = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(0, 270), new Phaser.Math.Vector2(W / 2, 330), new Phaser.Math.Vector2(W, 260))
    wires.strokePoints(wire2.getPoints(24))
    this.trailerContainer.add(wires)

    // Wet asphalt road
    const road = this.add.graphics()
    road.fillStyle(0x0a0e1c, 1)
    road.fillRect(0, H - 180, W, 180)
    // Sidewalk curb
    road.fillStyle(0x1e293b, 1)
    road.fillRect(0, H - 186, W, 6)
    // Wet road reflection streaks
    road.fillStyle(0xfbbf24, 0.12)
    road.fillRect(360, H - 160, 180, 25)
    road.fillRect(780, H - 130, 240, 30)
    this.trailerContainer.add(road)

    // Streetlight pole at center-right
    const pole = this.add.graphics()
    pole.fillStyle(0x1e293b, 1)
    pole.fillRect(840, H - 380, 8, 200)
    pole.fillRect(800, H - 386, 48, 8)
    // Lamp head & warm glow cone
    const lampLight = this.add.circle(800, H - 380, 22, 0xfbbf24, 0.9)
    const cone = this.add.graphics()
    cone.fillStyle(0xfbbf24, 0.08)
    cone.fillTriangle(800, H - 380, 680, H - 40, 920, H - 40)
    this.trailerContainer.add([pole, lampLight, cone])

    // Subtle streetlight flicker
    this.tweens.add({
      targets: [lampLight, cone],
      alpha: { from: 0.9, to: 0.35 },
      duration: 120,
      yoyo: true,
      repeat: 3,
      delay: 1500,
      ease: 'Stepped',
    })

    // Rain particles
    this.createRain(40)

    // Establishing camera pan from left to right
    this.cameras.main.scrollX = -120
    this.tweens.add({
      targets: this.cameras.main,
      scrollX: 60,
      duration: 6500,
      ease: 'Sine.easeOut',
    })

    // Cinematic narrative title
    const caption1 = this.add.text(W / 2, 140, 'A CITY THAT NEVER SLEEPS', {
      fontFamily: FONT,
      fontSize: '32px',
      color: '#ffffff',
      stroke: '#05060f',
      strokeThickness: 8,
    }).setOrigin(0.5).setAlpha(0)

    const caption2 = this.add.text(W / 2, 185, 'Between the lights... there are gaps nobody notices.', {
      fontFamily: FONT,
      fontSize: '20px',
      color: '#9eecff',
      stroke: '#05060f',
      strokeThickness: 6,
    }).setOrigin(0.5).setAlpha(0)

    this.trailerContainer.add([caption1, caption2])

    this.tweens.add({ targets: caption1, alpha: 1, duration: 900, delay: 800 })
    this.tweens.add({ targets: caption2, alpha: 1, duration: 900, delay: 1800 })

    // Transition to Shot 2 at 6.2s
    this.time.delayedCall(6200, () => this.playShot2())
  }

  /** SHOT 2: Priya (6.2s - 13.5s) */
  private playShot2() {
    this.currentShot = 2
    this.cameras.main.scrollX = 0
    this.cameras.main.fadeIn(400, 0, 0, 0)
    this.trailerContainer.removeAll(true)

    // Night background
    const bg = this.add.rectangle(W / 2, H / 2, W, H, 0x070a14)
    this.trailerContainer.add(bg)

    // Bus stop shelter
    const shelter = this.add.graphics()
    // Glass back pane
    shelter.fillStyle(0x0891b2, 0.25)
    shelter.fillRect(680, H - 360, 240, 180)
    // Metal frame & roof
    shelter.fillStyle(0x334155, 1)
    shelter.fillRect(670, H - 368, 260, 12)
    shelter.fillRect(670, H - 368, 10, 188)
    shelter.fillRect(920, H - 368, 10, 188)
    // Bench
    shelter.fillStyle(0x475569, 1)
    shelter.fillRect(710, H - 240, 180, 10)
    // Bus stop sign
    shelter.fillStyle(0x0284c7, 1)
    shelter.fillRect(720, H - 410, 160, 36)
    const signTxt = this.add.text(800, H - 392, 'WARD 14 // COLONY GATE', {
      fontFamily: FONT,
      fontSize: '11px',
      color: '#ffffff',
    }).setOrigin(0.5)
    this.trailerContainer.add([shelter, signTxt])

    // Streetlight illuminating the bus stop
    const lamp = this.add.circle(800, H - 430, 24, 0xfbbf24, 0.95)
    const cone = this.add.graphics()
    cone.fillStyle(0xfbbf24, 0.09)
    cone.fillTriangle(800, H - 430, 620, H - 100, 980, H - 100)
    this.trailerContainer.add([lamp, cone])

    // Wet road
    const road = this.add.rectangle(W / 2, H - 90, W, 180, 0x090d1a)
    this.trailerContainer.add(road)

    // Animated Bus arrives from left
    const busContainer = this.add.container(-400, H - 240)
    const busBody = this.add.graphics()
    busBody.fillStyle(0x1e3a8a, 1)
    busBody.fillRoundedRect(0, 0, 340, 140, 12)
    // Windows
    busBody.fillStyle(0x67e8f9, 0.6)
    busBody.fillRect(30, 25, 60, 50)
    busBody.fillRect(110, 25, 60, 50)
    busBody.fillRect(190, 25, 60, 50)
    // Headlights
    busBody.fillStyle(0xfef08a, 1)
    busBody.fillCircle(335, 110, 14)
    // Headlight light beam
    const headBeam = this.add.graphics()
    headBeam.fillStyle(0xfef08a, 0.18)
    headBeam.fillTriangle(335, 110, 800, 50, 800, 220)
    busContainer.add([busBody, headBeam])
    this.trailerContainer.add(busContainer)

    // Play bus sound
    TrailerAudio.playBusArrival()

    // Bus drives in to stop at x = 480
    this.tweens.add({
      targets: busContainer,
      x: 480,
      duration: 1800,
      ease: 'Quad.easeOut',
      onComplete: () => {
        // Priya steps out from the bus doors
        this.createPriyaCharacter()
        // Bus drives away after 1.8s
        this.time.delayedCall(1600, () => {
          this.tweens.add({
            targets: busContainer,
            x: W + 400,
            duration: 2200,
            ease: 'Quad.easeIn',
          })
        })
      },
    })

    // Rain
    this.createRain(30)

    // Transition to Shot 3 at 13.5s
    this.time.delayedCall(7300, () => this.playShot3())
  }

  private createPriyaCharacter() {
    // Priya girl character from the game matching reference image
    const priya = new Crewmate(this, 720, H - 190, 'pink', 1.8).setDepth(20).setFacing(-1)
    this.trailerContainer.add(priya)

    let isMoving = false
    let facingX = -1
    this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => priya.animate(0.016, isMoving, isMoving ? facingX : 0),
    })

    // Priya starts walking forward toward the left
    this.time.delayedCall(1200, () => {
      isMoving = true
      facingX = -1

      this.tweens.add({
        targets: priya,
        x: 440,
        duration: 4000,
        ease: 'Linear',
        onComplete: () => {
          isMoving = false
        },
      })

      // Footsteps sound
      TrailerAudio.playFootsteps()

      // Phone lights up & notification arrives
      this.time.delayedCall(1500, () => {
        TrailerAudio.playPhoneChime()

        // Holographic text message popup from Meera
        const msgBox = this.add.container(440, H - 360).setAlpha(0).setDepth(30)
        const bubble = this.add.graphics()
        bubble.fillStyle(0x0f172a, 0.92)
        bubble.lineStyle(2, 0x38bdf8, 0.8)
        bubble.fillRoundedRect(-170, -40, 340, 80, 16)
        bubble.strokeRoundedRect(-170, -40, 340, 80, 16)

        const from = this.add.text(-150, -28, 'MEERA (TEXT)', {
          fontFamily: FONT,
          fontSize: '11px',
          color: '#38bdf8',
        })
        const bodyTxt = this.add.text(-150, -8, '"Reached home? Tell me when you leave."', {
          fontFamily: FONT,
          fontSize: '15px',
          color: '#ffffff',
        })

        msgBox.add([bubble, from, bodyTxt])
        this.trailerContainer.add(msgBox)

        this.tweens.add({
          targets: msgBox,
          alpha: 1,
          y: H - 370,
          duration: 400,
          ease: 'Back.easeOut',
        })
      })
    })
  }

  /** SHOT 3: The Gaps (13.5s - 21.5s) */
  private playShot3() {
    this.currentShot = 3
    this.cameras.main.fadeIn(300, 0, 0, 0)
    this.trailerContainer.removeAll(true)

    // Dark lane background
    const bg = this.add.rectangle(W / 2, H / 2, W, H, 0x05070e)
    this.trailerContainer.add(bg)

    // Long perspective street
    const street = this.add.graphics()
    street.fillStyle(0x080b16, 1)
    street.fillRect(0, H - 240, W, 240)
    // Cracked pavement
    street.lineStyle(1.5, 0x1e293b, 0.7)
    street.moveTo(0, H - 120).lineTo(W, H - 120).strokePath()
    this.trailerContainer.add(street)

    // Priya walking down the lane
    const priya = new Crewmate(this, 380, H - 190, 'pink', 1.6).setDepth(10).setFacing(1)
    this.trailerContainer.add(priya)
    this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => priya.animate(0.016, true, 1),
    })

    // Overhead Streetlight that flickers and shuts off
    const pole = this.add.graphics()
    pole.fillStyle(0x334155, 1)
    pole.fillRect(480, H - 460, 10, 240)
    pole.fillRect(440, H - 468, 50, 10)
    const lampGlow = this.add.circle(440, H - 460, 30, 0xfbbf24, 0.9)
    const cone = this.add.graphics()
    cone.fillStyle(0xfbbf24, 0.12)
    cone.fillTriangle(440, H - 460, 260, H - 80, 620, H - 80)
    this.trailerContainer.add([pole, lampGlow, cone])

    // Gate closing further ahead at x = 860
    const gate = this.add.graphics()
    gate.lineStyle(4, 0x475569, 1)
    for (let g = 0; g < 6; g++) gate.lineBetween(860 + g * 16, H - 340, 860 + g * 16, H - 140)
    gate.strokeRect(860, H - 340, 96, 200)
    this.trailerContainer.add(gate)

    // Misleading road sign pointing into darkness
    const sign = this.add.container(720, H - 280)
    const sBoard = this.add.graphics()
    sBoard.fillStyle(0x7f1d1d, 0.9)
    sBoard.fillRoundedRect(-50, -20, 100, 40, 8)
    const sTxt = this.add.text(0, 0, 'DETOUR →', { fontFamily: FONT, fontSize: '14px', color: '#fca5a5' }).setOrigin(0.5)
    sign.add([sBoard, sTxt])
    this.trailerContainer.add(sign)

    // At t + 1.2s: Streetlight sparks, pops, and goes dark!
    this.time.delayedCall(1200, () => {
      TrailerAudio.playLampPop()
      this.tweens.add({
        targets: [lampGlow, cone],
        alpha: 0,
        duration: 100,
        onComplete: () => {
          // Plunge into cold darkness
          const darkVignette = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.65)
          this.trailerContainer.add(darkVignette)
        },
      })
    })

    // At t + 2.5s: Colony gate slams shut!
    this.time.delayedCall(2500, () => {
      TrailerAudio.playGateClang()
      this.cameras.main.shake(120, 0.008)
    })

    // Tension heartbeat pulse
    this.time.delayedCall(3200, () => TrailerAudio.playTensionPulse())
    this.time.delayedCall(4800, () => TrailerAudio.playTensionPulse())

    // Spectral Barrier presence drifting across
    const ghost = this.add.image(W + 100, H - 360, 'ghost').setScale(1.2).setAlpha(0.35)
    this.trailerContainer.add(ghost)
    this.tweens.add({
      targets: ghost,
      x: -150,
      y: H - 380,
      duration: 6500,
      ease: 'Sine.easeInOut',
    })

    // Dramatic narrative text
    const tLine1 = this.add.text(W / 2, 120, 'THE GAPS IN THE CITY', {
      fontFamily: FONT,
      fontSize: '34px',
      color: '#f87171',
      stroke: '#05060f',
      strokeThickness: 8,
    }).setOrigin(0.5).setAlpha(0)

    const tLine2 = this.add.text(W / 2, 170, 'Broken lamps. Closed gates. Misleading signs.', {
      fontFamily: FONT,
      fontSize: '20px',
      color: '#cbd5e1',
      stroke: '#05060f',
      strokeThickness: 6,
    }).setOrigin(0.5).setAlpha(0)

    const tLine3 = this.add.text(W / 2, 205, 'The danger is not a villain. It is every place left unattended.', {
      fontFamily: FONT,
      fontSize: '16px',
      color: '#94a3b8',
      stroke: '#05060f',
      strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0)

    this.trailerContainer.add([tLine1, tLine2, tLine3])
    this.tweens.add({ targets: tLine1, alpha: 1, duration: 600, delay: 500 })
    this.tweens.add({ targets: tLine2, alpha: 1, duration: 600, delay: 1800 })
    this.tweens.add({ targets: tLine3, alpha: 1, duration: 600, delay: 3000 })

    // Transition to Shot 4 at 21.5s
    this.time.delayedCall(8000, () => this.playShot4())
  }

  /** SHOT 4: One Light Changes Everything (21.5s - 31.5s) */
  private playShot4() {
    this.currentShot = 4
    this.cameras.main.fadeIn(500, 0, 0, 0)
    this.trailerContainer.removeAll(true)

    // Deep blue night background
    const bg = this.add.rectangle(W / 2, H / 2, W, H, 0x060914)
    this.trailerContainer.add(bg)

    // Road & lane
    const road = this.add.rectangle(W / 2, H - 120, W, 240, 0x0d1224)
    this.trailerContainer.add(road)

    // Priya standing at center-left with small cyan circle
    const phoneLight = this.add.circle(360, H - 170, 70, 0x00e5ff, 0.15)
    const priya = new Crewmate(this, 360, H - 190, 'pink', 1.6).setDepth(10).setFacing(1)
    this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => priya.animate(0.016, false, 0),
    })
    this.trailerContainer.add([phoneLight, priya])

    // Mr. Salim's Tea Stall at right
    const teaStall = this.add.container(880, H - 280)
    const stallBody = this.add.graphics()
    // Counter
    stallBody.fillStyle(0x334155, 1)
    stallBody.fillRect(-70, 0, 140, 80)
    // Awning
    stallBody.fillStyle(0xf97316, 1)
    stallBody.fillRect(-85, -50, 170, 50)
    // Kettle & cups
    stallBody.fillStyle(0x94a3b8, 1)
    stallBody.fillRect(-20, -15, 30, 20)

    const salim = new Crewmate(this, 0, 10, 'orange', 1.3).setFacing(-1)
    this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => salim.animate(0.016, false, 0),
    })
    teaStall.add([stallBody, salim])
    this.trailerContainer.add(teaStall)

    // At t + 1.2s: Salim switches on the warm golden lamp!
    this.time.delayedCall(1200, () => {
      // Warm uplifting theme begins!
      TrailerAudio.playUpliftingTheme()

      const warmGlow = this.add.circle(880, H - 320, 140, 0xfbbf24, 0.22)
      const bulb = this.add.circle(880, H - 320, 16, 0xfef08a, 1.0)
      this.trailerContainer.add([warmGlow, bulb])

      // Luminous cyan-amber connection thread traces between Priya and Salim!
      const thread = this.add.graphics()
      thread.lineStyle(3, 0x00e5ff, 0.9)
      const threadCurve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(360, H - 190), new Phaser.Math.Vector2(620, H - 270), new Phaser.Math.Vector2(880, H - 260))
      thread.strokePoints(threadCurve.getPoints(24))
      this.trailerContainer.add(thread)

      // Light ripple ignites cascading streetlights along the road!
      for (let s = 0; s < 4; s++) {
        const lx = 200 + s * 240
        this.time.delayedCall(s * 300, () => {
          const sLight = this.add.circle(lx, H - 420, 26, 0xfbbf24, 0.9)
          const sCone = this.add.graphics()
          sCone.fillStyle(0xfbbf24, 0.1)
          sCone.fillTriangle(lx, H - 420, lx - 110, H - 80, lx + 110, H - 80)
          this.trailerContainer.add([sLight, sCone])
        })
      }

      // Priya's light radius expands dramatically!
      this.tweens.add({
        targets: phoneLight,
        radius: 260,
        alpha: 0.35,
        duration: 1200,
        ease: 'Quad.easeOut',
      })
    })

    // Cinematic message
    const line1 = this.add.text(W / 2, 100, 'ONE LIGHT CHANGES EVERYTHING', {
      fontFamily: FONT,
      fontSize: '36px',
      color: '#fbbf24',
      stroke: '#05060f',
      strokeThickness: 8,
    }).setOrigin(0.5).setAlpha(0)

    const line2 = this.add.text(W / 2, 150, 'When people, infrastructure, and community connect...', {
      fontFamily: FONT,
      fontSize: '20px',
      color: '#ffffff',
      stroke: '#05060f',
      strokeThickness: 6,
    }).setOrigin(0.5).setAlpha(0)

    const line3 = this.add.text(W / 2, 185, 'Darkness loses its hold.', {
      fontFamily: FONT,
      fontSize: '22px',
      color: '#9eecff',
      stroke: '#05060f',
      strokeThickness: 6,
    }).setOrigin(0.5).setAlpha(0)

    this.trailerContainer.add([line1, line2, line3])
    this.tweens.add({ targets: line1, alpha: 1, duration: 600, delay: 600 })
    this.tweens.add({ targets: line2, alpha: 1, duration: 600, delay: 2000 })
    this.tweens.add({ targets: line3, alpha: 1, duration: 600, delay: 3500 })

    // Transition to Shot 5 at 31.5s
    this.time.delayedCall(9800, () => this.playShot5())
  }

  /** SHOT 5: Three Nights (31.5s - 40.5s) */
  private playShot5() {
    this.currentShot = 5
    this.cameras.main.flash(200, 255, 255, 255)
    this.trailerContainer.removeAll(true)

    // Driving rhythmic montage music
    TrailerAudio.playMontageBeat(10)

    // Background
    const bg = this.add.rectangle(W / 2, H / 2, W, H, 0x05060f)
    this.trailerContainer.add(bg)

    // Fast 3-stage montage container
    const montageBox = this.add.container(W / 2, H / 2)
    this.trailerContainer.add(montageBox)

    const showStage = (title: string, sub: string, desc: string, tint: number, charType: 'priya' | 'green' | 'ghost') => {
      montageBox.removeAll(true)

      const card = this.add.graphics()
      card.fillStyle(0x0f172a, 0.95)
      card.lineStyle(3, tint, 0.9)
      card.fillRoundedRect(-380, -180, 760, 360, 24)
      card.strokeRoundedRect(-380, -180, 760, 360, 24)

      const tTxt = this.add.text(0, -110, title, {
        fontFamily: FONT,
        fontSize: '38px',
        color: '#ffffff',
        stroke: '#05060f',
        strokeThickness: 6,
      }).setOrigin(0.5)

      const subTxt = this.add.text(0, -60, sub, {
        fontFamily: FONT,
        fontSize: '18px',
        color: '#9eecff',
      }).setOrigin(0.5)

      let avatar: Phaser.GameObjects.GameObject
      if (charType === 'priya') {
        const c = new Crewmate(this, 0, 30, 'pink', 1.7).setFacing(1)
        c.animate(0.016, true, 1)
        this.time.addEvent({ delay: 16, loop: true, callback: () => c.animate(0.016, true, 1) })
        avatar = c
      } else if (charType === 'green') {
        const c = new Crewmate(this, 0, 30, 'green', 1.5).setFacing(1)
        c.animate(0.016, true, 1)
        this.time.addEvent({ delay: 16, loop: true, callback: () => c.animate(0.016, true, 1) })
        avatar = c
      } else {
        avatar = this.add.image(0, 10, 'ghost').setScale(1.2)
      }

      const descTxt = this.add.text(0, 105, desc, {
        fontFamily: FONT,
        fontSize: '17px',
        color: '#cbd5e1',
        align: 'center',
      }).setOrigin(0.5)

      montageBox.add([card, tTxt, subTxt, avatar, descTxt])
      this.cameras.main.shake(80, 0.005)
    }

    // Stage 1: Night 1 (0s)
    showStage('NIGHT 1: THE LAST BUS', 'The Neighborhood Lane', 'Flickering streetlights, closed gates, and Salim’s tea stall.', 0xf59e0b, 'priya')

    // Stage 2: Night 2 (2.8s)
    this.time.delayedCall(2800, () => {
      showStage('NIGHT 2: MARKET NIGHT', 'Festival Bazaar & Transit', 'A bustling crowd where nobody is looking. Learn to verify, not just trust.', 0x06b6d4, 'green')
    })

    // Stage 3: Night 3 (5.6s)
    this.time.delayedCall(5600, () => {
      showStage('NIGHT 3: THE UNDERPASS', 'Citywide Power Outage', 'When the entire power grid fails, only your community network remains.', 0xa855f7, 'ghost')
    })

    // Transition to Shot 6 at 40.5s
    this.time.delayedCall(8800, () => this.playShot6())
  }

  /** SHOT 6: Two Sides of the Same City (40.5s - 47.5s) */
  private playShot6() {
    this.currentShot = 6
    this.cameras.main.fadeIn(300, 0, 0, 0)
    this.trailerContainer.removeAll(true)

    // Dark tactical background
    const bg = this.add.rectangle(W / 2, H / 2, W, H, 0x04060d)
    this.trailerContainer.add(bg)

    // Split screen composition: Runner (Left) vs Barrier (Right)
    const divider = this.add.graphics()
    divider.lineStyle(2, 0x38bdf8, 0.4)
    divider.lineBetween(W / 2, 80, W / 2, H - 80)
    this.trailerContainer.add(divider)

    // Left: The Runner (Priya)
    const runnerBox = this.add.container(W / 4, H / 2)
    const rGlow = this.add.circle(0, 0, 160, 0x00e5ff, 0.12)
    const rPriya = new Crewmate(this, 0, 5, 'pink', 1.8).setFacing(1)
    this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => rPriya.animate(0.016, true, 1),
    })
    const rTitle = this.add.text(0, 65, 'THE RUNNER: PRIYA', {
      fontFamily: FONT,
      fontSize: '22px',
      color: '#9eecff',
      stroke: '#05060f',
      strokeThickness: 5,
    }).setOrigin(0.5)
    const rDesc = this.add.text(0, 100, 'Reports broken lights • Calls trusted allies • Verifies routes', {
      fontFamily: FONT,
      fontSize: '13px',
      color: '#cbd5e1',
    }).setOrigin(0.5)
    runnerBox.add([rGlow, rPriya, rTitle, rDesc])

    // Right: The Barrier (The Gaps)
    const barrierBox = this.add.container((3 * W) / 4, H / 2)
    const bGlow = this.add.circle(0, 0, 160, 0xa855f7, 0.12)
    const bGhost = this.add.image(0, -30, 'ghost').setScale(1.3)
    const bTitle = this.add.text(0, 60, 'THE BARRIER: THE GAPS', {
      fontFamily: FONT,
      fontSize: '22px',
      color: '#c084fc',
      stroke: '#05060f',
      strokeThickness: 5,
    }).setOrigin(0.5)
    const bDesc = this.add.text(0, 95, 'Cuts streetlights • Closes gates • Deploys decoy signs', {
      fontFamily: FONT,
      fontSize: '13px',
      color: '#cbd5e1',
    }).setOrigin(0.5)
    barrierBox.add([bGlow, bGhost, bTitle, bDesc])

    this.trailerContainer.add([runnerBox, barrierBox])

    // Floating animation
    this.tweens.add({ targets: rPriya, y: -5, yoyo: true, repeat: -1, duration: 800 })
    this.tweens.add({ targets: bGhost, y: -22, yoyo: true, repeat: -1, duration: 1100 })

    // Big central caption
    const mainCaption = this.add.text(W / 2, 70, 'TWO PLAYERS. TWO ROLES. ONE CITY THAT CAN CHANGE.', {
      fontFamily: FONT,
      fontSize: '26px',
      color: '#ffffff',
      stroke: '#05060f',
      strokeThickness: 8,
    }).setOrigin(0.5)
    this.trailerContainer.add(mainCaption)

    // Transition to Shot 7 at 47.5s
    this.time.delayedCall(7000, () => this.playShot7())
  }

  /** SHOT 7: Title Reveal & Enter the City (47.5s - end) */
  private playShot7() {
    this.currentShot = 7
    this.cameras.main.flash(350, 255, 255, 255)
    this.trailerContainer.removeAll(true)

    // Sound: Climax impact & resonant musical resolution!
    TrailerAudio.playTitleImpact()

    // Pure midnight background
    const bg = this.add.rectangle(W / 2, H / 2, W, H, 0x05060f)
    this.trailerContainer.add(bg)

    // Circle of Allies constellation forming around the city!
    const circleRing = this.add.graphics()
    circleRing.lineStyle(2.5, 0x00e5ff, 0.4)
    circleRing.strokeCircle(W / 2, H / 2 - 20, 220)
    this.trailerContainer.add(circleRing)

    // Illuminated node beacons along the circle
    for (let a = 0; a < 12; a++) {
      const angle = (a / 12) * Math.PI * 2
      const nx = W / 2 + Math.cos(angle) * 220
      const ny = H / 2 - 20 + Math.sin(angle) * 220
      const dot = this.add.circle(nx, ny, 7, a % 2 === 0 ? 0x00e5ff : 0xfbbf24, 0.95)
      const glow = this.add.circle(nx, ny, 16, a % 2 === 0 ? 0x00e5ff : 0xfbbf24, 0.3)
      this.trailerContainer.add([glow, dot])
    }

    // Central Title Reveal
    const title = this.add.text(W / 2, H / 2 - 50, 'CIRCLE OF ALLIES', {
      fontFamily: FONT,
      fontSize: '72px',
      color: '#ffffff',
      stroke: '#00e5ff',
      strokeThickness: 10,
    }).setOrigin(0.5).setAlpha(0).setScale(0.8)

    const tagline = this.add.text(W / 2, H / 2 + 30, 'THE CITY IS NOT THE ENEMY. THE GAPS ARE.', {
      fontFamily: FONT,
      fontSize: '22px',
      color: '#fbbf24',
      stroke: '#05060f',
      strokeThickness: 6,
    }).setOrigin(0.5).setAlpha(0)

    const subline = this.add.text(W / 2, H / 2 + 65, '“Every light matters. Every ally changes the route.”', {
      fontFamily: FONT,
      fontSize: '16px',
      color: '#9eecff',
    }).setOrigin(0.5).setAlpha(0)

    this.trailerContainer.add([title, tagline, subline])

    // Title reveal animation
    this.tweens.add({
      targets: title,
      alpha: 1,
      scale: 1,
      duration: 1000,
      ease: 'Back.easeOut',
    })
    this.tweens.add({ targets: tagline, alpha: 1, duration: 800, delay: 600 })
    this.tweens.add({ targets: subline, alpha: 1, duration: 800, delay: 1200 })

    // Primary CTA: ENTER THE CITY
    const btnBg = this.add.graphics()
    btnBg.fillStyle(0x00e5ff, 1)
    btnBg.fillRoundedRect(-140, -28, 280, 56, 28)

    const btnTxt = this.add.text(0, 0, 'ENTER THE CITY', {
      fontFamily: FONT,
      fontSize: '20px',
      color: '#05060f',
    }).setOrigin(0.5)

    const ctaButton = this.add.container(W / 2, H / 2 + 160, [btnBg, btnTxt])
      .setSize(280, 56)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0)

    this.trailerContainer.add(ctaButton)

    this.tweens.add({
      targets: ctaButton,
      alpha: 1,
      y: H / 2 + 150,
      duration: 700,
      delay: 1600,
      ease: 'Back.easeOut',
    })

    // Pulse animation on CTA button
    this.tweens.add({
      targets: ctaButton,
      scaleX: 1.04,
      scaleY: 1.04,
      yoyo: true,
      repeat: -1,
      duration: 1000,
      ease: 'Sine.easeInOut',
    })

    ctaButton.on('pointerdown', () => this.finishTrailer())
  }

  private createRain(count = 35) {
    for (let i = 0; i < count; i++) {
      const rx = Phaser.Math.Between(0, W)
      const ry = Phaser.Math.Between(0, H)
      const drop = this.add.rectangle(rx, ry, 1.5, Phaser.Math.Between(12, 22), 0x38bdf8, 0.4)
      this.trailerContainer.add(drop)
      this.tweens.add({
        targets: drop,
        y: H + 30,
        x: rx - 20,
        duration: Phaser.Math.Between(350, 600),
        repeat: -1,
        ease: 'Linear',
      })
    }
  }

  private finishTrailer() {
    if (this.isFinishing) return
    this.isFinishing = true

    // Stop trailer audio cleanly
    TrailerAudio.stop()
    Sfx.click()

    // Smooth fade to black, then hand off to MenuScene
    this.cameras.main.fadeOut(500, 0, 0, 0)
    this.time.delayedCall(520, () => {
      this.scene.start('Menu')
    })
  }

  shutdown() {
    TrailerAudio.stop()
    if (this.timelineTimer) this.timelineTimer.destroy()
  }
}
