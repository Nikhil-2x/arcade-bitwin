import { COLS, ROWS, TILE } from '../config/constants.ts'
import type { MapData } from '../types.ts'

const SOLID = new Set(['#', 't', 'x'])

/** Tile grid, collision, closable gates and path finding. No rendering in here. */
export class World {
  readonly grid: string[]
  readonly closed = new Set<string>()
  private gateAt = new Map<string, string>()
  /** Walking distance (in tiles) to the goal, ignoring gates. -1 = unreachable. */
  private dist: Int16Array
  private maxDist = 1

  readonly data: MapData

  constructor(data: MapData) {
    this.data = data
    this.grid = data.grid
    for (const g of data.gates) for (const [c, r] of g.tiles) this.gateAt.set(`${c},${r}`, g.id)
    this.dist = this.buildDistanceField()
  }

  static tile(v: number) {
    return Math.floor(v / TILE)
  }

  static center(c: number, r: number): [number, number] {
    return [c * TILE + TILE / 2, r * TILE + TILE / 2]
  }

  private inBounds(c: number, r: number) {
    return c >= 0 && r >= 0 && c < COLS && r < ROWS
  }

  /** Floor that exists, ignoring gates. */
  floor(c: number, r: number) {
    return this.inBounds(c, r) && !SOLID.has(this.grid[r][c])
  }

  walkable(c: number, r: number) {
    if (!this.floor(c, r)) return false
    const gate = this.gateAt.get(`${c},${r}`)
    return !(gate && this.closed.has(gate))
  }

  isGateOpen(id: string) {
    return !this.closed.has(id)
  }

  private hits(px: number, py: number, rad: number) {
    return (
      !this.walkable(World.tile(px - rad), World.tile(py - rad)) ||
      !this.walkable(World.tile(px + rad), World.tile(py - rad)) ||
      !this.walkable(World.tile(px - rad), World.tile(py + rad)) ||
      !this.walkable(World.tile(px + rad), World.tile(py + rad))
    )
  }

  /** Axis-separated move so characters slide along walls. */
  move(x: number, y: number, dx: number, dy: number, rad = 10): [number, number] {
    let nx = x + dx
    let ny = y
    if (this.hits(nx, ny, rad)) nx = x
    ny = y + dy
    if (this.hits(nx, ny, rad)) ny = y
    return [nx, ny]
  }

  /** Is this point inside a rectangle given in tiles? */
  inRect(x: number, y: number, rect: [number, number, number, number]) {
    return x >= rect[0] * TILE && x < (rect[0] + rect[2]) * TILE && y >= rect[1] * TILE && y < (rect[1] + rect[3]) * TILE
  }

  inAny(x: number, y: number, rects?: [number, number, number, number][]) {
    return !!rects?.some((r) => this.inRect(x, y, r))
  }

  /** 0 at the start, 1 at the goal. */
  progress(x: number, y: number) {
    const d = this.dist[World.tile(y) * COLS + World.tile(x)]
    return d < 0 ? 0 : Math.max(0, Math.min(1, 1 - d / this.maxDist))
  }

  private buildDistanceField() {
    const dist = new Int16Array(COLS * ROWS).fill(-1)
    const [gc, gr, gw, gh] = this.data.goal
    const queue: number[] = []
    for (let r = gr; r < gr + gh; r++)
      for (let c = gc; c < gc + gw; c++) {
        dist[r * COLS + c] = 0
        queue.push(r * COLS + c)
      }
    for (let i = 0; i < queue.length; i++) {
      const cur = queue[i]
      const c = cur % COLS
      const r = Math.floor(cur / COLS)
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = c + dc
        const nr = r + dr
        if (!this.floor(nc, nr) || dist[nr * COLS + nc] >= 0) continue
        dist[nr * COLS + nc] = dist[cur] + 1
        queue.push(nr * COLS + nc)
      }
    }
    const [sc, sr] = this.data.spawn
    this.maxDist = Math.max(1, dist[sr * COLS + sc])
    return dist
  }

  /** Direction index (0 right, 1 down, 2 left, 3 up) that leads towards, or away from, the goal. */
  dirTowardGoal(c: number, r: number, away = false): number {
    const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]]
    let best = 0
    let bestVal = away ? -1 : 9999
    dirs.forEach(([dc, dr], i) => {
      if (!this.floor(c + dc, r + dr)) return
      const d = this.dist[(r + dr) * COLS + (c + dc)]
      if (d < 0) return
      if (away ? d > bestVal : d < bestVal) {
        bestVal = d
        best = i
      }
    })
    return best
  }

  /** Breadth-first path between two points, as pixel waypoints. Respects closed gates. */
  path(fromX: number, fromY: number, toX: number, toY: number): [number, number][] {
    const start = World.tile(fromY) * COLS + World.tile(fromX)
    const goal = World.tile(toY) * COLS + World.tile(toX)
    const prev = new Int16Array(COLS * ROWS).fill(-2)
    prev[start] = -1
    const queue = [start]
    for (let i = 0; i < queue.length && prev[goal] === -2; i++) {
      const cur = queue[i]
      const c = cur % COLS
      const r = Math.floor(cur / COLS)
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = c + dc
        const nr = r + dr
        if (!this.walkable(nc, nr) || prev[nr * COLS + nc] !== -2) continue
        prev[nr * COLS + nc] = cur
        queue.push(nr * COLS + nc)
      }
    }
    if (prev[goal] === -2) return []
    const out: [number, number][] = []
    for (let n = goal; n !== -1; n = prev[n]) out.push(World.center(n % COLS, Math.floor(n / COLS)))
    return out.reverse()
  }
}
