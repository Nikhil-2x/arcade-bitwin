import Phaser from 'phaser'
import { CREW_COLORS, OUTLINE } from './palette.ts'

/** Generates every texture the game needs once, so no asset files are shipped. */
export function buildTextures(scene: Phaser.Scene) {
  const tex = scene.textures
  const g = scene.make.graphics({ x: 0, y: 0 }, false)

  // Crewmate body + legs per colour. Drawn at 2x and displayed at 0.5x for crisp edges.
  for (const [name, [main, shade]] of Object.entries(CREW_COLORS)) {
    if (tex.exists(`cm_body_${name}`)) continue
    g.clear()
    g.lineStyle(4, OUTLINE, 1)
    // backpack
    g.fillStyle(shade, 1).fillRoundedRect(4, 34, 20, 40, 8).strokeRoundedRect(4, 34, 20, 40, 8)
    // body: shade underneath, lit shape on top-left
    const r = { tl: 28, tr: 28, bl: 14, br: 14 }
    g.fillStyle(shade, 1).fillRoundedRect(18, 6, 56, 72, r)
    g.fillStyle(main, 1).fillRoundedRect(18, 6, 46, 64, { tl: 26, tr: 24, bl: 12, br: 6 })
    g.strokeRoundedRect(18, 6, 56, 72, r)
    // visor
    g.fillStyle(0x6fa5b8, 1).fillRoundedRect(38, 22, 40, 26, 13)
    g.fillStyle(0xb6eefc, 1).fillRoundedRect(38, 22, 40, 20, 10)
    g.fillStyle(0xffffff, 0.9).fillRoundedRect(44, 25, 16, 6, 3)
    g.lineStyle(4, OUTLINE, 1).strokeRoundedRect(38, 22, 40, 26, 13)
    g.generateTexture(`cm_body_${name}`, 80, 84)

    g.clear()
    g.lineStyle(4, OUTLINE, 1)
    g.fillStyle(shade, 1).fillRoundedRect(3, 2, 22, 26, { tl: 3, tr: 3, bl: 10, br: 10 })
    g.fillStyle(main, 1).fillRoundedRect(3, 2, 17, 22, { tl: 3, tr: 2, bl: 9, br: 4 })
    g.strokeRoundedRect(3, 2, 22, 26, { tl: 3, tr: 3, bl: 10, br: 10 })
    g.generateTexture(`cm_leg_${name}`, 28, 32)
  }

  // Ghost used as the Barrier's cursor (floating, wavy hem).
  if (!tex.exists('ghost')) {
    g.clear()
    const pts: Phaser.Types.Math.Vector2Like[] = []
    for (let a = Math.PI; a <= Math.PI * 2; a += 0.15) pts.push({ x: 40 + Math.cos(a) * 28, y: 38 + Math.sin(a) * 30 })
    pts.push({ x: 68, y: 80 })
    for (let i = 0; i <= 6; i++) pts.push({ x: 68 - i * (56 / 6), y: 80 + (i % 2 ? -6 : 4) })
    g.fillStyle(0xb99cff, 0.75).fillPoints(pts, true)
    g.lineStyle(4, 0x2a1670, 1).strokePoints(pts, true)
    g.fillStyle(0x2a1670, 1).fillEllipse(30, 34, 10, 14).fillEllipse(52, 34, 10, 14)
    g.generateTexture('ghost', 80, 92)
  }

  // Soft light brush for the darkness mask.
  if (!tex.exists('light')) {
    const size = 256
    const canvas = tex.createCanvas('light', size, size)!
    const c = canvas.getContext()
    const grd = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    grd.addColorStop(0, 'rgba(255,255,255,1)')
    grd.addColorStop(0.55, 'rgba(255,255,255,0.85)')
    grd.addColorStop(1, 'rgba(255,255,255,0)')
    c.fillStyle = grd
    c.fillRect(0, 0, size, size)
    canvas.refresh()
  }

  if (!tex.exists('dot')) {
    g.clear().fillStyle(0xffffff, 1).fillCircle(6, 6, 6)
    g.generateTexture('dot', 12, 12)
  }
  if (!tex.exists('star')) {
    g.clear().fillStyle(0xffffff, 1).fillCircle(2, 2, 2)
    g.generateTexture('star', 4, 4)
  }
  g.destroy()
}
