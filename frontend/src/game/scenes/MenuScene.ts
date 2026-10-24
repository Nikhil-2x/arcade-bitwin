import Phaser from 'phaser'
import { COLORS, H, W } from '../config/constants.ts'
import { LEVELS } from '../data/levels/index.ts'
import { Crewmate } from '../entities/Crewmate.ts'
import { CREW_COLORS } from '../entities/palette.ts'
import { GameState } from '../state/GameState.ts'
import type { LevelId } from '../types.ts'
import { backdrop, button, display, flashlight, frame, hex, panel, soundToggle, text } from '../ui/widgets.ts'
import { Sfx } from '../utils/sfx.ts'

const LEFT = 96

/**
 * Title screen. The city sits in darkness and the pointer is a flashlight; it widens over
 * anything you can press, the same way allies widen Priya's light in the game.
 */
export class MenuScene extends Phaser.Scene {
  private drawer?: Phaser.GameObjects.Container
  private leaving = false

  constructor() {
    super('Menu')
  }

  create() {
    this.leaving = false
    this.drawer = undefined
    this.cameras.main.fadeIn(400, 7, 9, 20)
    backdrop(this)
    this.spawnDrifters()
    flashlight(this, 1)
    frame(this, 'MENU', 'A STORY ABOUT LIGHTS, PEOPLE AND PLACES')
    soundToggle(this, W - 40, H - 52)

    this.sign()
    text(this, LEFT, 330, 'Three nights. One way home.\nNobody should walk it alone.', 21, hex(COLORS.paper), { lineSpacing: 8 }).setDepth(3)
    this.nights()
    this.modes()

    const kb = this.input.keyboard
    kb?.on('keydown-ONE', () => this.begin('solo'))
    kb?.on('keydown-TWO', () => this.begin('duo'))
    kb?.on('keydown-H', () => this.toggleDrawer())
    kb?.on('keydown-ESC', () => this.drawer && this.toggleDrawer())
    kb?.on('keydown-T', () => this.go('Trailer'))
  }

  /** Two-line shop sign that stutters on, then hums. */
  private sign() {
    const lines = ['CIRCLE', 'OF ALLIES']
    lines.forEach((l, i) => {
      const y = 120 + i * 92
      // padded so the blurred glow isn't clipped to the glyph box
      const glow = display(this, LEFT - 40, y - 40, l, 92, hex(COLORS.amber), { padding: { x: 40, y: 40 } }).setDepth(2).setAlpha(0)
      glow.setShadow(0, 0, hex(COLORS.amber), 28, false, true)
      const tube = display(this, LEFT, y, l, 92, '#fff3d6').setDepth(3).setAlpha(0)
      this.tweens.chain({
        targets: [glow, tube],
        tweens: [
          { alpha: 1, duration: 60, delay: 350 + i * 260 },
          { alpha: 0.1, duration: 50 },
          { alpha: 1, duration: 60 },
          { alpha: 0.25, duration: 90, delay: 80 },
          { alpha: 1, duration: 80, onComplete: () => i === 1 && Sfx.pop() },
        ],
      })
      // a faint buzz in the second tube, like every sign on the high street
      if (i === 1) this.time.addEvent({ delay: 4200, loop: true, startAt: 1000, callback: () => this.tweens.add({ targets: glow, alpha: 0.55, duration: 50, yoyo: true, repeat: 1 }) })
    })
  }

  private modes() {
    const x = 980
    const entries = [
      { key: '1', label: 'PLAY SOLO', sub: 'You are Priya. The AI plays the Barrier.', mode: 'solo' as const, color: COLORS.amber },
      { key: '2', label: 'PLAY TOGETHER', sub: 'One keyboard or two computers. Roles swap each night.', mode: 'duo' as const, color: COLORS.cyan },
    ]
    entries.forEach((e, i) => {
      const y = 214 + i * 128
      const b = button(this, x, y, 420, 74, e.label, () => this.begin(e.mode), e.color, 26, { key: e.key })
      b.container.setDepth(4)
      text(this, x - 210, y + 46, e.sub, 15, hex(COLORS.muted)).setDepth(4)
      b.container.setAlpha(0).setX(x + 40)
      this.tweens.add({ targets: b.container, alpha: 1, x, duration: 500, delay: 900 + i * 120, ease: 'Expo.easeOut' })
    })
    const small = [
      { key: 'H', label: 'HOW TO PLAY', fn: () => this.toggleDrawer(), x: x - 108 },
      { key: 'T', label: 'TRAILER', fn: () => this.go('Trailer'), x: x + 108 },
    ]
    small.forEach((s) => button(this, s.x, 478, 204, 48, s.label, s.fn, COLORS.muted, 15, { key: s.key }).container.setDepth(4))
  }

  /** The three nights as a lit route: hover a stop to switch its lamp on and read the place. */
  private nights() {
    const y = 470
    const x0 = LEFT + 10
    const gap = 200
    const g = this.add.graphics().setDepth(3)
    g.lineStyle(2, COLORS.panelEdge, 1).lineBetween(x0, y, x0 + gap * 2, y)
    display(this, LEFT, y - 56, 'THREE NIGHTS', 12, hex(COLORS.muted)).setDepth(3)
    const info = text(this, LEFT, y + 74, '', 15, hex(COLORS.paper), { wordWrap: { width: 520 } }).setDepth(3)
    ;([1, 2, 3] as LevelId[]).forEach((id, i) => {
      const def = LEVELS[id]
      const nx = x0 + i * gap
      const halo = this.add.circle(nx, y, 22, COLORS.amber, 0.18).setDepth(3).setScale(0)
      const node = this.add.circle(nx, y, 8, COLORS.bg).setStrokeStyle(2, COLORS.amber).setDepth(3)
      display(this, nx, y - 30, `0${id}`, 14, hex(COLORS.amber)).setOrigin(0.5).setDepth(3)
      const name = text(this, nx, y + 22, def.title, 15, hex(COLORS.muted)).setOrigin(0.5, 0).setDepth(3)
      const hit = this.add.zone(nx, y + 10, 180, 80).setInteractive({ useHandCursor: true }).setDepth(5)
      hit.on('pointerover', () => {
        Sfx.hover()
        node.setFillStyle(COLORS.amber)
        name.setColor(hex(COLORS.paper))
        this.tweens.add({ targets: halo, scale: 1, duration: 200, ease: 'Back.easeOut' })
        info.setText(`${def.place}. ${def.time} seconds. ${def.tone}`)
      })
      hit.on('pointerout', () => {
        node.setFillStyle(COLORS.bg)
        name.setColor(hex(COLORS.muted))
        this.tweens.add({ targets: halo, scale: 0, duration: 150 })
        info.setText('')
      })
    })
  }

  private toggleDrawer() {
    if (this.drawer) {
      const d = this.drawer
      this.drawer = undefined
      this.tweens.add({ targets: d, x: W, duration: 260, ease: 'Cubic.easeIn', onComplete: () => d.destroy() })
      return
    }
    const w = 520
    const d = this.add.container(W, 0).setDepth(95)
    // dims the menu left of the drawer; clicking it closes the drawer
    const shade = this.add.rectangle(-W + w, 0, W - w, H, 0x000000, 0.5).setOrigin(0).setInteractive()
    shade.on('pointerdown', () => this.toggleDrawer())
    d.add(shade)
    d.add(this.add.rectangle(0, 40, w - 30, H - 80, COLORS.bg).setOrigin(0))
    d.add(panel(this, 0, 40, w - 30, H - 80, COLORS.panel, COLORS.amber))
    d.add(display(this, 36, 70, 'HOW TO PLAY', 22, hex(COLORS.amber)))
    const block = (y: number, head: string, color: number, rows: [string, string][]) => {
      d.add(display(this, 36, y, head, 13, hex(color)))
      rows.forEach(([k, v], i) => {
        d.add(display(this, 36, y + 30 + i * 30, k, 13, hex(COLORS.paper)))
        d.add(text(this, 150, y + 28 + i * 30, v, 16, hex(COLORS.paper)))
      })
    }
    block(130, 'PRIYA, THE RUNNER', COLORS.cyan, [
      ['WASD', 'Move'],
      ['SPACE', 'Use, or hold to report a fault'],
      ['F', 'Phone torch'],
      ['E', 'Share location'],
      ['Q', 'Call an ally (30 awareness)'],
    ])
    block(330, 'THE BARRIER', COLORS.purple, [
      ['ARROWS', 'Move the ghost'],
      ['1 - 8', 'Use abilities, or click them'],
    ])
    d.add(text(this, 36, 470, 'In solo play the AI is the Barrier. Reach home before the timer ends and before the Isolation meter fills.', 15, hex(COLORS.muted), { wordWrap: { width: w - 100 }, lineSpacing: 6 }))
    d.add(button(this, (w - 30) / 2, H - 100, 200, 46, 'CLOSE', () => this.toggleDrawer(), COLORS.amber, 15, { key: 'H' }).container)
    this.drawer = d
    this.tweens.add({ targets: d, x: W - w, duration: 360, ease: 'Expo.easeOut' })
  }

  private begin(mode: 'solo' | 'duo') {
    if (this.drawer || this.leaving) return
    GameState.newGame(mode)
    // two players first choose how they play: a room across two computers, or one keyboard
    this.go(mode === 'duo' ? 'Room' : 'LevelSelect')
  }

  private go(key: string) {
    if (this.leaving) return
    this.leaving = true
    this.cameras.main.fadeOut(300, 7, 9, 20)
    this.time.delayedCall(320, () => this.scene.start(key))
  }

  /** Crewmates floating through the dark, only visible when the light finds them. */
  private spawnDrifters() {
    Object.keys(CREW_COLORS).forEach((name, i) => {
      const crew = new Crewmate(this, -80, 0, name, 0.8 + Math.random() * 0.6).setAlpha(0.9)
      const launch = () => {
        crew.setPosition(-120, 80 + Math.random() * 560)
        this.tweens.add({ targets: crew, x: W + 120, duration: 14000 + Math.random() * 12000, onComplete: launch })
      }
      this.tweens.add({ targets: crew, angle: i % 2 ? 360 : -360, duration: 9000 + i * 900, repeat: -1 })
      this.time.delayedCall(i * 1800, launch)
    })
  }
}
