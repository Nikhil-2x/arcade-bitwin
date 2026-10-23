import Phaser from 'phaser'
import { COLS, FONT, H, ROWS, TILE, W } from '../config/constants.ts'
import type { DecorDef, Theme } from '../types.ts'
import type { World } from './World.ts'
import { OUTLINE } from '../entities/palette.ts'

interface Palette {
  ground: number
  floorA: number
  floorB: number
  zone: number
  wall: number
  roof: number
  thin: number
  thinTop: number
  accent: number
}

const PALETTES: Record<Theme, Palette> = {
  lane: { ground: 0x141a38, floorA: 0x2c365f, floorB: 0x323d6b, zone: 0x7a5232, wall: 0x3b3159, roof: 0x5a4a82, thin: 0x1f7a49, thinTop: 0x2fa563, accent: 0xffd166 },
  market: { ground: 0x1a1230, floorA: 0x4a3a66, floorB: 0x544376, zone: 0x7c3f58, wall: 0x6d3a54, roof: 0xd1495b, thin: 0x8a5a2b, thinTop: 0xc58a43, accent: 0xffe66d },
  underpass: { ground: 0x0c0f20, floorA: 0x222843, floorB: 0x272e4d, zone: 0x2a6a72, wall: 0x1a1f38, roof: 0x2a3150, thin: 0x4a5272, thinTop: 0x6c75a0, accent: 0xf5e663 },
}

const hash = (c: number, r: number) => Math.abs((c * 73856093) ^ (r * 19349663))

/** Bakes the whole static map (floors, walls, decor) into one texture. Returns text labels to place. */
export function bakeWorld(scene: Phaser.Scene, world: World, theme: Theme, key: string) {
  const p = PALETTES[theme]
  const g = scene.make.graphics({ x: 0, y: 0 }, false)
  g.fillStyle(p.ground, 1).fillRect(0, 0, W, H)

  const isWall = (c: number, r: number) => c < 0 || r < 0 || c >= COLS || r >= ROWS || !world.floor(c, r)

  for (let r = 2; r < ROWS - 1; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = c * TILE
      const y = r * TILE
      const ch = world.grid[r][c]
      if (ch === 'x') continue
      if (!isWall(c, r)) drawFloor(g, p, theme, ch, c, r, x, y)
    }
  }
  for (let r = 2; r < ROWS - 1; r++) {
    for (let c = 0; c < COLS; c++) {
      if (world.grid[r][c] === 'x' || !isWall(c, r)) continue
      drawWall(g, p, theme, world, c, r, isWall)
    }
  }

  const labels: { x: number; y: number; text: string; color: string; size: number }[] = []
  for (const d of world.data.decor ?? []) drawDecor(g, p, d, labels)

  if (scene.textures.exists(key)) scene.textures.remove(key)
  g.generateTexture(key, W, H)
  g.destroy()
  return labels.map((l) =>
    scene.add
      .text(l.x, l.y, l.text, { fontFamily: FONT, fontSize: `${l.size}px`, color: l.color, stroke: '#05060f', strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(3),
  )
}

function drawFloor(g: Phaser.GameObjects.Graphics, p: Palette, theme: Theme, ch: string, c: number, r: number, x: number, y: number) {
  const base = ch === 'Z' ? p.zone : (c + r) % 2 ? p.floorA : p.floorB
  g.fillStyle(base, 1).fillRect(x, y, TILE, TILE)
  if (ch === 'u') {
    // hazard stripes along the tunnel edges
    if ((c + r) % 2 === 0) g.fillStyle(0xf5e663, 0.12).fillRect(x, y, TILE, 6)
  } else if (ch === 'Z') {
    g.fillStyle(0xffffff, 0.08).fillRect(x + 4, y + 4, TILE - 8, TILE - 8)
  } else if (theme === 'lane' && hash(c, r) % 7 === 0) {
    g.fillStyle(0xffffff, 0.05).fillRect(x + 12, y + 18, 16, 3)
  } else if (theme === 'market' && hash(c, r) % 9 === 0) {
    g.fillStyle(0xffe66d, 0.12).fillCircle(x + 20, y + 20, 3)
  }
}

function drawWall(
  g: Phaser.GameObjects.Graphics,
  p: Palette,
  theme: Theme,
  world: World,
  c: number,
  r: number,
  isWall: (c: number, r: number) => boolean,
) {
  const x = c * TILE
  const y = r * TILE
  const thin = (!isWall(c, r - 1) && !isWall(c, r + 1)) || (!isWall(c - 1, r) && !isWall(c + 1, r))
  if (thin) {
    g.fillStyle(p.thin, 1).fillRoundedRect(x + 2, y + 6, TILE - 4, TILE - 10, 8)
    g.fillStyle(p.thinTop, 1).fillRoundedRect(x + 2, y + 6, TILE - 4, 14, 8)
    g.lineStyle(3, OUTLINE, 1).strokeRoundedRect(x + 2, y + 6, TILE - 4, TILE - 10, 8)
    return
  }
  g.fillStyle(p.wall, 1).fillRect(x, y, TILE, TILE)
  const roofH = isWall(c, r + 1) ? TILE : TILE - 10
  g.fillStyle(theme === 'market' ? [0xd1495b, 0xedae49, 0x00798c, 0x7b2cbf][hash(c >> 1, r) % 4] : p.roof, 1).fillRect(x, y, TILE, roofH)
  if (theme === 'market' && !isWall(c, r + 1)) {
    g.fillStyle(0xffffff, 0.35)
    for (let i = 0; i < 4; i++) g.fillRect(x + i * 10, y, 5, roofH)
  }
  if (theme === 'lane' && !isWall(c, r + 1) && hash(c, r) % 3 !== 0) {
    g.fillStyle(0xffd166, 0.65).fillRect(x + 10, y + roofH - 4, 8, 8)
  }
  // outline only the edges that face open ground
  g.lineStyle(4, OUTLINE, 1)
  if (!isWall(c, r - 1)) g.lineBetween(x, y, x + TILE, y)
  if (!isWall(c, r + 1)) g.lineBetween(x, y + TILE, x + TILE, y + TILE)
  if (!isWall(c - 1, r)) g.lineBetween(x, y, x, y + TILE)
  if (!isWall(c + 1, r)) g.lineBetween(x + TILE, y, x + TILE, y + TILE)
  void world
}

function drawDecor(
  g: Phaser.GameObjects.Graphics,
  p: Palette,
  d: DecorDef,
  labels: { x: number; y: number; text: string; color: string; size: number }[],
) {
  const cx = d.c * TILE + TILE / 2
  const cy = d.r * TILE + TILE / 2
  if (d.type === 'stall') {
    g.fillStyle(0x5b3a1e, 1).fillRoundedRect(cx - 34, cy - 10, 68, 30, 4)
    for (let i = 0; i < 6; i++) g.fillStyle(i % 2 ? 0xffffff : 0xe63946, 1).fillRect(cx - 36 + i * 12, cy - 22, 12, 14)
    g.lineStyle(3, OUTLINE, 1).strokeRect(cx - 36, cy - 22, 72, 14)
    labels.push({ x: cx, y: cy + 8, text: d.label ?? '', color: '#ffe', size: 12 })
  } else if (d.type === 'hospital') {
    g.fillStyle(0xeaf2ff, 1).fillRoundedRect(cx - 70, cy - 22, 140, 38, 6).lineStyle(4, OUTLINE, 1).strokeRoundedRect(cx - 70, cy - 22, 140, 38, 6)
    g.fillStyle(0xe63946, 1).fillRect(cx - 54, cy - 14, 22, 8).fillRect(cx - 47, cy - 21, 8, 22)
    labels.push({ x: cx + 14, y: cy - 3, text: d.label ?? '', color: '#e63946', size: 14 })
  } else if (d.type === 'house') {
    g.fillStyle(0xffd166, 0.9).fillRoundedRect(cx - 18, cy - 6, 36, 30, 6).lineStyle(4, OUTLINE, 1).strokeRoundedRect(cx - 18, cy - 6, 36, 30, 6)
    labels.push({ x: cx, y: cy - 20, text: d.label ?? '', color: '#ffd166', size: 14 })
  } else if (d.type === 'barricade') {
    for (let i = 0; i < 4; i++) g.fillStyle(i % 2 ? 0xffffff : 0xff7a00, 1).fillRect(cx - 40 + i * 20, cy - 8, 20, 16)
    g.lineStyle(3, OUTLINE, 1).strokeRect(cx - 40, cy - 8, 80, 16)
    labels.push({ x: cx, y: cy + 20, text: d.label ?? '', color: '#ffb36b', size: 12 })
  } else if (d.type === 'cab') {
    g.fillStyle(0xffd23f, 1).fillRoundedRect(cx - 34, cy - 4, 68, 26, 10).lineStyle(4, OUTLINE, 1).strokeRoundedRect(cx - 34, cy - 4, 68, 26, 10)
    g.fillStyle(0xb6eefc, 1).fillRoundedRect(cx - 18, cy - 12, 36, 14, 6)
    g.fillStyle(OUTLINE, 1).fillCircle(cx - 20, cy + 22, 6).fillCircle(cx + 20, cy + 22, 6)
  }
  void p
}
