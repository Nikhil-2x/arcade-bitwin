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

/**
 * Bakes the entire static map into one crisp texture.
 * Clearly differentiates the walkable road/lanes from the impassable sideways/dividers,
 * while incorporating rich Indian street visuals (Salim's Chai Tapri, Bus Stop, Scooter, etc.).
 */
export function bakeWorld(scene: Phaser.Scene, world: World, theme: Theme, key: string) {
  const p = PALETTES[theme]
  const g = scene.make.graphics({ x: 0, y: 0 }, false)

  // 1. Dark night background base
  g.fillStyle(p.ground, 1).fillRect(0, 0, W, H)

  const isWall = (c: number, r: number) => c < 0 || r < 0 || c >= COLS || r >= ROWS || !world.floor(c, r)

  // 2. Draw Walkable Floors (Roads, Lanes, Pavements, Safe Zones)
  for (let r = 2; r < ROWS - 1; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = c * TILE
      const y = r * TILE
      const ch = world.grid[r][c]
      if (ch === 'x') continue
      if (!isWall(c, r)) drawFloor(g, p, theme, ch, c, r, x, y, isWall)
    }
  }

  // 3. Draw Non-Walkable Barriers (3D Green Hedges, Dividers, Walls, Buildings)
  for (let r = 2; r < ROWS - 1; r++) {
    for (let c = 0; c < COLS; c++) {
      if (world.grid[r][c] === 'x' || !isWall(c, r)) continue
      drawWall(g, p, theme, world, c, r, isWall)
    }
  }

  // 4. Draw Street Decor & Indian Props
  const labels: { x: number; y: number; text: string; color: string; size: number }[] = []
  for (const d of world.data.decor ?? []) drawDecor(g, scene, p, d, labels)

  if (scene.textures.exists(key)) scene.textures.remove(key)
  g.generateTexture(key, W, H)
  g.destroy()

  return labels.map((l) =>
    scene.add
      .text(l.x, l.y, l.text, {
        fontFamily: FONT,
        fontSize: `${l.size}px`,
        color: l.color,
        stroke: '#05060f',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(3),
  )
}

/**
 * Draws the walkable road surface:
 * Clear, distinct asphalt roadway with road curbs, white center lane dashes,
 * bold zebra crossings at corners, and wet asphalt sheen glimmers.
 */
function drawFloor(
  g: Phaser.GameObjects.Graphics,
  p: Palette,
  theme: Theme,
  ch: string,
  c: number,
  r: number,
  x: number,
  y: number,
  isWall: (c: number, r: number) => boolean,
) {
  // 1. Asphalt Road Surface (smooth, dark, clearly distinct from sidewalks and walls)
  const base = ch === 'Z' ? p.zone : (c + r) % 2 ? p.floorA : p.floorB
  g.fillStyle(base, 1).fillRect(x, y, TILE, TILE)

  if (ch === 'u') {
    // Hazard stripes along tunnel edges
    if ((c + r) % 2 === 0) g.fillStyle(0xf5e663, 0.14).fillRect(x, y, TILE, 6)
  } else if (ch === 'Z') {
    // Safe zone warm terracotta pavers
    g.fillStyle(0x8a5833, 1).fillRect(x + 2, y + 2, TILE - 4, TILE - 4)
    g.lineStyle(1, 0x451a03, 0.6).strokeRect(x + 2, y + 2, TILE - 4, TILE - 4)
  } else if (theme === 'lane') {
    // Road curbs bordering the dividers / walls:
    // Top curb stone facing impassable wall
    if (isWall(c, r - 1)) {
      g.fillStyle(0x475569, 1).fillRect(x, y, TILE, 3)
      g.fillStyle(0x0f172a, 0.6).fillRect(x, y + 3, TILE, 2)
    }
    // Bottom curb stone facing impassable wall
    if (isWall(c, r + 1)) {
      g.fillStyle(0x0f172a, 0.6).fillRect(x, y + TILE - 5, TILE, 2)
      g.fillStyle(0x475569, 1).fillRect(x, y + TILE - 3, TILE, 3)
    }

    // White dashed center line dividing the upper and lower halves of each 2-tile road corridor
    // In Level 1 lanes are rows [14, 15], [11, 12], [8, 9], [5, 6] -> boundary is at bottom of rows 14, 11, 8, 5
    if ((r === 14 || r === 11 || r === 8 || r === 5) && !isWall(c, r + 1) && c > 1 && c < 29) {
      if (c % 2 === 0) {
        g.fillStyle(0xffffff, 0.45).fillRect(x + 4, y + TILE - 1.5, TILE - 8, 3)
      }
    }

    // Rain puddle glimmers on wet asphalt
    if (hash(c, r) % 8 === 0) {
      g.fillStyle(0xffd166, 0.1).fillEllipse(x + 20, y + 20, 16, 6)
    }
  } else if (theme === 'market' && hash(c, r) % 9 === 0) {
    g.fillStyle(0xffe66d, 0.12).fillCircle(x + 20, y + 20, 3)
  }

  // Pedestrian zebra crossing at turning corners where Priya crosses lanes
  if ((c === 29 || c === 30) && (r === 13 || r === 7)) {
    g.fillStyle(0xffffff, 0.6)
    for (let i = 0; i < 4; i++) g.fillRect(x + i * 10 + 2, y + 4, 6, TILE - 8)
  } else if ((c === 1 || c === 2) && r === 10) {
    g.fillStyle(0xffffff, 0.6)
    for (let i = 0; i < 4; i++) g.fillRect(x + i * 10 + 2, y + 4, 6, TILE - 8)
  }
}

/**
 * Draws non-walkable barriers:
 * - Raised concrete median dividers with dense 3D green hedges AND ornamental black wrought-iron railings!
 * - Terminal iron posts with brass finials marking the edges of alley openings and shortcut gates!
 * - Boundary walls and apartment buildings with warm lit windows and dark border outlines.
 */
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

  // Detect thin 1-tile dividing barriers between lanes
  const thin = (!isWall(c, r - 1) && !isWall(c, r + 1)) || (!isWall(c - 1, r) && !isWall(c + 1, r))

  if (thin) {
    // ── PROMINENT 3D RAISED HEDGE WITH WROUGHT-IRON STREET RAILING ──
    // 1. Raised concrete curb base
    g.fillStyle(0x1e293b, 1).fillRoundedRect(x + 2, y + 4, TILE - 4, TILE - 8, 6)
    g.fillStyle(0x334155, 1).fillRect(x + 2, y + TILE - 6, TILE - 4, 3)

    // 2. Solid hedge planter base (rich forest green)
    g.fillStyle(p.thin, 1).fillRoundedRect(x + 2, y + 6, TILE - 4, TILE - 12, 6)
    // 3D Beveled Top (bright green rounded highlight cap)
    g.fillStyle(p.thinTop, 1).fillRoundedRect(x + 2, y + 6, TILE - 4, 13, 6)
    // Dark border
    g.lineStyle(2.5, OUTLINE, 1).strokeRoundedRect(x + 2, y + 6, TILE - 4, TILE - 12, 6)

    // Leafy sprigs and foliage clusters
    g.fillStyle(0x15803d, 0.9).fillCircle(x + 10, y + 12, 3).fillCircle(x + 24, y + 12, 3)
    g.fillStyle(0x4ade80, 0.8).fillCircle(x + 16, y + 9, 2.5).fillCircle(x + 30, y + 9, 2.5)

    // 3. Black wrought-iron street railing on top of hedge (matching reference image)
    // Horizontal top and mid rails
    g.lineStyle(2, OUTLINE, 1).lineBetween(x + 2, y + 9, x + TILE - 2, y + 9)
    g.lineStyle(1.5, OUTLINE, 1).lineBetween(x + 2, y + 17, x + TILE - 2, y + 17)

    // Vertical pickets with pointed spear finials
    for (let px = x + 7; px < x + TILE - 2; px += 10) {
      g.fillStyle(OUTLINE, 1).fillRect(px - 1, y + 7, 2, 14)
      g.fillTriangle(px - 2, y + 7, px + 2, y + 7, px, y + 4)
    }

    // Terminal sturdy iron post with brass cap at openings/turns
    if (!isWall(c - 1, r)) {
      // Left edge faces an open walkway
      g.fillStyle(OUTLINE, 1).fillRect(x + 2, y + 4, 4, 19)
      g.fillStyle(0xffd166, 1).fillCircle(x + 4, y + 3, 2.5)
    }
    if (!isWall(c + 1, r)) {
      // Right edge faces an open walkway
      g.fillStyle(OUTLINE, 1).fillRect(x + TILE - 6, y + 4, 4, 19)
      g.fillStyle(0xffd166, 1).fillCircle(x + TILE - 4, y + 3, 2.5)
    }
    return
  }

  // ── FULL BOUNDARY WALLS & BUILDINGS ──
  // Wall base
  g.fillStyle(p.wall, 1).fillRect(x, y, TILE, TILE)

  // Roof / Upper facade
  const roofH = isWall(c, r + 1) ? TILE : TILE - 10
  const roofColor = theme === 'market' ? [0xd1495b, 0xedae49, 0x00798c, 0x7b2cbf][hash(c >> 1, r) % 4] : p.roof
  g.fillStyle(roofColor, 1).fillRect(x, y, TILE, roofH)

  // Market awnings
  if (theme === 'market' && !isWall(c, r + 1)) {
    g.fillStyle(0xffffff, 0.35)
    for (let i = 0; i < 4; i++) g.fillRect(x + i * 10, y, 5, roofH)
  }

  // Warm glowing apartment windows on residential buildings
  if (theme === 'lane' && !isWall(c, r + 1) && hash(c, r) % 3 !== 0) {
    // Golden lit window
    g.fillStyle(0xffd166, 0.95).fillRect(x + 10, y + roofH - 8, 12, 9)
    g.lineStyle(1.5, 0x1e182e, 1).strokeRect(x + 10, y + roofH - 8, 12, 9)
    // Window mullion
    g.lineBetween(x + 16, y + roofH - 8, x + 16, y + roofH + 1)
    // Window sill
    g.fillStyle(0x475569, 1).fillRect(x + 8, y + roofH + 1, 16, 2)
  }

  // Bold dark outline along only the edges that face the open walkable road
  g.lineStyle(4, OUTLINE, 1)
  if (!isWall(c, r - 1)) g.lineBetween(x, y, x + TILE, y)
  if (!isWall(c, r + 1)) g.lineBetween(x, y + TILE, x + TILE, y + TILE)
  if (!isWall(c - 1, r)) g.lineBetween(x, y, x, y + TILE)
  if (!isWall(c + 1, r)) g.lineBetween(x + TILE, y, x + TILE, y + TILE)

  void world
}

/**
 * Draws authentic street decor & Indian props:
 * - Salim's Chai Tapri ("चाय" / "Salim Tea") with corrugated roof, warm light, kettles, Mr. Salim!
 * - Bus Stop Shelter ("The Last Bus") with canopy, blue bus sign, bench, route map!
 * - Vintage Indian Scooter (Bajaj Chetak style)!
 * - Welcoming Home goal!
 * - Cab / Auto-rickshaw!
 */
function drawDecor(
  g: Phaser.GameObjects.Graphics,
  scene: Phaser.Scene,
  p: Palette,
  d: DecorDef,
  labels: { x: number; y: number; text: string; color: string; size: number }[],
) {
  const cx = d.c * TILE + TILE / 2
  const cy = d.r * TILE + TILE / 2
  const tex = scene.textures

  if (d.type === 'stall') {
    // ── SALIM'S CHAI TAPRI ("चाय" / "Salim Tea") ──
    // Wooden stall counter
    g.fillStyle(0x5b3a1e, 1).fillRoundedRect(cx - 36, cy - 8, 72, 30, 4)
    g.lineStyle(2, OUTLINE, 1).strokeRoundedRect(cx - 36, cy - 8, 72, 30, 4)

    // Slanted corrugated tin awning roof with red/white or yellow/red stripes
    for (let i = 0; i < 6; i++) {
      g.fillStyle(i % 2 ? 0xffffff : 0xe63946, 1).fillRect(cx - 36 + i * 12, cy - 24, 12, 16)
    }
    g.lineStyle(3, OUTLINE, 1).strokeRect(cx - 36, cy - 24, 72, 16)

    // Warm hanging Edison bulb glow
    g.fillStyle(0xffd166, 0.45).fillCircle(cx, cy - 4, 14)
    g.fillStyle(0xffffff, 1).fillCircle(cx, cy - 4, 3)

    // Aluminum chai kettle on counter
    g.fillStyle(0xcbd5e1, 1).fillCircle(cx - 20, cy + 2, 5)
    g.fillRect(cx - 24, cy + 2, 8, 6)

    // Devanagari "चाय" / English signboard
    labels.push({ x: cx, y: cy + 12, text: d.label ?? 'चाय', color: '#ffe66d', size: 12 })
  } else if (d.type === 'bus_stop') {
    // ── BUS STOP SHELTER ("The Last Bus") ──
    // Dark steel canopy frame
    g.fillStyle(0x1e293b, 1).fillRect(cx - 28, cy - 18, 56, 32)
    g.lineStyle(2, 0x38bdf8, 0.8).strokeRect(cx - 28, cy - 18, 56, 32)
    // Overhead light fixture glow
    g.fillStyle(0xfef08a, 0.4).fillCircle(cx, cy - 8, 12)
    // Slatted bench
    g.fillStyle(0x78350f, 1).fillRect(cx - 20, cy + 4, 40, 5)
    // Blue bus sign pole
    g.fillStyle(0x0284c7, 1).fillRoundedRect(cx + 20, cy - 26, 16, 14, 2)
    g.fillStyle(0xffffff, 1).fillRect(cx + 23, cy - 23, 10, 8)
    labels.push({ x: cx, y: cy + 20, text: 'LAST BUS', color: '#38bdf8', size: 10 })
  } else if (d.type === 'scooter') {
    // ── VINTAGE INDIAN SCOOTER ──
    if (tex.exists('prop_scooter')) {
      scene.add.image(cx, cy, 'prop_scooter').setScale(0.65).setDepth(4)
    } else {
      // Fallback scooter graphics
      g.fillStyle(0xa7c4bc, 1).fillRoundedRect(cx - 16, cy - 6, 32, 14, 6)
      g.fillStyle(0x1e293b, 1).fillCircle(cx - 12, cy + 10, 5).fillCircle(cx + 12, cy + 10, 5)
      g.fillStyle(0xffffff, 1).fillCircle(cx + 14, cy - 4, 3)
    }
  } else if (d.type === 'house') {
    // ── WELCOMING HOME (GOAL) ──
    g.fillStyle(0x312e81, 1).fillRoundedRect(cx - 20, cy - 10, 40, 36, 6)
    g.lineStyle(3, 0xffd166, 1).strokeRoundedRect(cx - 20, cy - 10, 40, 36, 6)
    // Warm golden door / entryway
    g.fillStyle(0xffd166, 0.95).fillRoundedRect(cx - 8, cy + 4, 16, 22, 3)
    // Porch light glow
    g.fillStyle(0xffffff, 1).fillCircle(cx, cy - 2, 4)
    labels.push({ x: cx, y: cy - 22, text: d.label ?? 'HOME', color: '#ffd166', size: 14 })
  } else if (d.type === 'hospital') {
    // ── HOSPITAL / CLINIC ──
    g.fillStyle(0xeaf2ff, 1).fillRoundedRect(cx - 70, cy - 22, 140, 38, 6)
    g.lineStyle(4, OUTLINE, 1).strokeRoundedRect(cx - 70, cy - 22, 140, 38, 6)
    g.fillStyle(0xe63946, 1).fillRect(cx - 54, cy - 14, 22, 8).fillRect(cx - 47, cy - 21, 8, 22)
    labels.push({ x: cx + 14, y: cy - 3, text: d.label ?? '', color: '#e63946', size: 14 })
  } else if (d.type === 'barricade') {
    // Striped barricade (only when placed in non-gate decor)
    for (let i = 0; i < 4; i++) g.fillStyle(i % 2 ? 0xffffff : 0xff7a00, 1).fillRect(cx - 40 + i * 20, cy - 8, 20, 16)
    g.lineStyle(3, OUTLINE, 1).strokeRect(cx - 40, cy - 8, 80, 16)
    labels.push({ x: cx, y: cy + 20, text: d.label ?? '', color: '#ffb36b', size: 12 })
  } else if (d.type === 'cab') {
    // Auto-rickshaw / Taxi
    g.fillStyle(0xfacc15, 1).fillRoundedRect(cx - 28, cy - 10, 56, 16, 6)
    g.fillStyle(0x15803d, 1).fillRoundedRect(cx - 30, cy + 4, 60, 18, 4)
    g.lineStyle(3, OUTLINE, 1).strokeRoundedRect(cx - 30, cy - 10, 60, 32, 6)
    g.fillStyle(OUTLINE, 1).fillCircle(cx - 18, cy + 22, 6).fillCircle(cx + 18, cy + 22, 6)
  }

  void p
}
