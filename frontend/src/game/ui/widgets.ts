import Phaser from 'phaser'
import { COLORS, FONT } from '../config/constants.ts'
import { Sfx } from '../utils/sfx.ts'

export const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`

export function text(
  scene: Phaser.Scene,
  x: number,
  y: number,
  str: string,
  size = 18,
  color = '#ffffff',
  extra: Phaser.Types.GameObjects.Text.TextStyle = {},
) {
  return scene.add.text(x, y, str, {
    fontFamily: FONT,
    fontSize: `${size}px`,
    color,
    stroke: '#05060f',
    strokeThickness: Math.max(2, Math.round(size / 6)),
    ...extra,
  })
}

export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, fill: number = COLORS.panel, edge: number = COLORS.panelEdge, radius = 14) {
  const g = scene.add.graphics()
  g.fillStyle(fill, 0.96).fillRoundedRect(x, y, w, h, radius)
  g.lineStyle(4, edge, 1).strokeRoundedRect(x, y, w, h, radius)
  return g
}

export interface ButtonHandle {
  container: Phaser.GameObjects.Container
  setEnabled(v: boolean): void
}

/** Chunky rounded button with hover squash, keyboard-free (clicks and taps). */
export function button(scene: Phaser.Scene, x: number, y: number, w: number, h: number, label: string, onClick: () => void, color: number = COLORS.cyan, size = 22): ButtonHandle {
  const c = scene.add.container(x, y)
  const g = scene.add.graphics()
  const draw = (fill: number, edge: number) => {
    g.clear()
    g.fillStyle(0x000000, 0.4).fillRoundedRect(-w / 2 + 3, -h / 2 + 5, w, h, 16)
    g.fillStyle(fill, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 16)
    g.lineStyle(4, edge, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 16)
  }
  draw(0x10142e, color)
  const t = text(scene, 0, 0, label, size, hex(color)).setOrigin(0.5)
  c.add([g, t])
  c.setSize(w, h)
  let enabled = true
  c.setInteractive({ useHandCursor: true })
  c.on('pointerover', () => {
    if (!enabled) return
    draw(color, 0xffffff)
    t.setColor('#05060f').setStroke('#ffffff', 0)
    scene.tweens.add({ targets: c, scale: 1.05, duration: 90 })
  })
  c.on('pointerout', () => {
    draw(0x10142e, color)
    t.setColor(hex(color)).setStroke('#05060f', 4)
    scene.tweens.add({ targets: c, scale: 1, duration: 90 })
  })
  c.on('pointerdown', () => {
    if (!enabled) return
    Sfx.click()
    onClick()
  })
  return {
    container: c,
    setEnabled(v: boolean) {
      enabled = v
      c.setAlpha(v ? 1 : 0.4)
    },
  }
}

/** Big banner text that slides in, like the Victory / Defeat screens. */
export function banner(scene: Phaser.Scene, y: number, label: string, color: number) {
  const g = scene.add.graphics().setDepth(50)
  g.fillStyle(0x000000, 0.65).fillRect(0, y - 70, 1280, 140)
  g.lineStyle(4, color, 1).lineBetween(0, y - 70, 1280, y - 70).lineBetween(0, y + 70, 1280, y + 70)
  const t = text(scene, 1500, y, label, 96, hex(color), { strokeThickness: 12 }).setOrigin(0.5).setDepth(51)
  scene.tweens.add({ targets: t, x: 640, duration: 520, ease: 'Back.easeOut' })
  return [g, t]
}

/** Drifting starfield used on menu-like screens. */
export function starfield(scene: Phaser.Scene) {
  for (let layer = 0; layer < 3; layer++) {
    const speed = 12 + layer * 22
    for (let i = 0; i < 40; i++) {
      const s = scene.add.image(Math.random() * 1280, Math.random() * 720, 'star').setAlpha(0.3 + layer * 0.25).setScale(0.5 + layer * 0.5)
      scene.tweens.add({
        targets: s,
        x: -10,
        duration: (s.x + 10) / speed * 1000,
        onComplete: () => loopStar(scene, s, speed),
      })
    }
  }
}

function loopStar(scene: Phaser.Scene, s: Phaser.GameObjects.Image, speed: number) {
  s.x = 1290
  s.y = Math.random() * 720
  scene.tweens.add({ targets: s, x: -10, duration: 1300 / speed * 1000, onComplete: () => loopStar(scene, s, speed) })
}
