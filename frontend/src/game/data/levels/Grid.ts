import { COLS, ROWS } from '../../config/constants.ts'

/**
 * Tile legend
 *   x void (HUD)     # building / stall     t tree
 *   .  road          m market floor        u underpass      Z safe zone floor
 */
export class Grid {
  private cells: string[][]

  constructor() {
    this.cells = Array.from({ length: ROWS }, (_, r) =>
      Array.from({ length: COLS }, () => (r < 2 || r === ROWS - 1 ? 'x' : '#')),
    )
  }

  rect(ch: string, c: number, r: number, w: number, h: number) {
    for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) this.cells[y][x] = ch
    return this
  }

  rows(): string[] {
    return this.cells.map((row) => row.join(''))
  }
}
