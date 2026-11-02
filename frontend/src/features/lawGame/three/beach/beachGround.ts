import * as THREE from 'three'

/** One unit of the scan is about 6.5 metres: its parasols come out 2.6 m across. */
export const SCAN_SCALE = 6.5
/** Where the sea sits in the scan's own height: just over the top of the lumpy, water-coloured part of its mesh. */
const SCAN_WATER = -0.535
/** Puts the middle of the bay at x = z = 0, the sea at y = 0, and everything else in metres. */
export const SCAN_POSITION: readonly [number, number, number] = [-1.7 * SCAN_SCALE, -SCAN_WATER * SCAN_SCALE, 17.8 * SCAN_SCALE]
/** The model's own node transform, as gltfjsx wrote it out. */
export const MODEL_POSITION: readonly [number, number, number] = [0.53, 6.793, -1.346]
export const MODEL_ROTATION: readonly [number, number, number] = [-1.954, 0.067, 0.029]

const CELL = 0.26
const NO_DATA = -99
/** Land lower than this over the sea is shallows, not somewhere to stand. */
const SHORE_CLEARANCE = 0.16
/** The largest rise between neighbouring cells a person can walk: above this it is a wall, a tree or a rock face. */
const MAX_STEP = 0.16
/** On the sand deck, from which everything walkable can be reached. */
const SEED: readonly [number, number] = [-1.4, 16]
/** Smooths the scan's lumps under the feet, in cells. */
const SMOOTH_RADIUS = 4

export class BeachGround {
  readonly width: number
  readonly depth: number
  readonly minX: number
  readonly minZ: number
  /** Metres above the sea, including roofs and tree tops. */
  readonly surface: Float32Array
  /** The same, smoothed and with obstacles removed: what a foot actually follows. */
  readonly walkHeight: Float32Array
  readonly walkable: Uint8Array

  constructor(geometries: readonly THREE.BufferGeometry[]) {
    const matrix = new THREE.Matrix4().compose(new THREE.Vector3(...SCAN_POSITION), new THREE.Quaternion(), new THREE.Vector3(SCAN_SCALE, SCAN_SCALE, SCAN_SCALE))
    matrix.multiply(new THREE.Matrix4().compose(new THREE.Vector3(...MODEL_POSITION), new THREE.Quaternion().setFromEuler(new THREE.Euler(...MODEL_ROTATION)), new THREE.Vector3(1, 1, 1)))

    const points = geometries.map((g) => {
      const position = g.attributes.position
      const out = new Float32Array(position.count * 3)
      const v = new THREE.Vector3()
      for (let i = 0; i < position.count; i++) {
        v.fromBufferAttribute(position, i).applyMatrix4(matrix)
        out[i * 3] = v.x
        out[i * 3 + 1] = v.y
        out[i * 3 + 2] = v.z
      }
      return out
    })
    let minX = Infinity
    let maxX = -Infinity
    let minZ = Infinity
    let maxZ = -Infinity
    for (const p of points) {
      for (let i = 0; i < p.length; i += 3) {
        if (p[i] < minX) minX = p[i]
        if (p[i] > maxX) maxX = p[i]
        if (p[i + 2] < minZ) minZ = p[i + 2]
        if (p[i + 2] > maxZ) maxZ = p[i + 2]
      }
    }
    this.minX = minX
    this.minZ = minZ
    this.width = Math.ceil((maxX - minX) / CELL) + 1
    this.depth = Math.ceil((maxZ - minZ) / CELL) + 1

    const top = this.rasterise(geometries, points)
    this.surface = this.median(top)
    this.walkable = this.findWalkable()
    this.walkHeight = this.smoothOverWalkable()
  }

  /** The highest triangle over each cell. Far quicker than casting a ray per cell. */
  private rasterise(geometries: readonly THREE.BufferGeometry[], points: Float32Array[]) {
    const { width: W, depth: H, minX, minZ } = this
    const grid = new Float32Array(W * H).fill(NO_DATA)
    geometries.forEach((geometry, n) => {
      const p = points[n]
      const index = geometry.index!
      for (let t = 0; t < index.count; t += 3) {
        const a = index.getX(t) * 3
        const b = index.getX(t + 1) * 3
        const c = index.getX(t + 2) * 3
        const ax = (p[a] - minX) / CELL
        const az = (p[a + 2] - minZ) / CELL
        const bx = (p[b] - minX) / CELL
        const bz = (p[b + 2] - minZ) / CELL
        const cx = (p[c] - minX) / CELL
        const cz = (p[c + 2] - minZ) / CELL
        const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz)
        if (Math.abs(d) < 1e-9) continue
        const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx)))
        const x1 = Math.min(W - 1, Math.ceil(Math.max(ax, bx, cx)))
        const z0 = Math.max(0, Math.floor(Math.min(az, bz, cz)))
        const z1 = Math.min(H - 1, Math.ceil(Math.max(az, bz, cz)))
        for (let z = z0; z <= z1; z++) {
          for (let x = x0; x <= x1; x++) {
            const l1 = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / d
            const l2 = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / d
            const l3 = 1 - l1 - l2
            if (l1 < -0.02 || l2 < -0.02 || l3 < -0.02) continue
            const y = l1 * p[a + 1] + l2 * p[b + 1] + l3 * p[c + 1]
            if (y > grid[z * W + x]) grid[z * W + x] = y
          }
        }
      }
    })
    return grid
  }

  /** Removes the single-cell spikes every scan is full of. */
  private median(grid: Float32Array) {
    const { width: W, depth: H } = this
    const out = new Float32Array(W * H)
    const near: number[] = []
    for (let z = 0; z < H; z++) {
      for (let x = 0; x < W; x++) {
        near.length = 0
        for (let dz = -1; dz <= 1; dz++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx
            const nz = z + dz
            if (nx >= 0 && nz >= 0 && nx < W && nz < H) near.push(grid[nz * W + nx])
          }
        }
        near.sort((a, b) => a - b)
        out[z * W + x] = near[near.length >> 1]
      }
    }
    return out
  }

  private flood(allowed: (next: number, from: number) => boolean, seed: number) {
    const { width: W, depth: H } = this
    const seen = new Uint8Array(W * H)
    const stack = [seed]
    seen[seed] = 1
    while (stack.length) {
      const k = stack.pop()!
      const x = k % W
      const z = (k - x) / W
      const visit = (next: number) => {
        if (seen[next] || !allowed(next, k)) return
        seen[next] = 1
        stack.push(next)
      }
      if (x > 0) visit(k - 1)
      if (x < W - 1) visit(k + 1)
      if (z > 0) visit(k - W)
      if (z < H - 1) visit(k + W)
    }
    return seen
  }

  /** Whatever can be reached on foot from the deck, without climbing or wading: the scan draws its own paths. */
  private findWalkable() {
    const { width: W, depth: H, surface } = this
    const seed = this.cell(SEED[0], SEED[1])
    const reached = this.flood((next, from) => surface[next] >= SHORE_CLEARANCE && Math.abs(surface[next] - surface[from]) <= MAX_STEP, seed)
    // Cracks and specks in a scan are not real: a majority vote closes them and evens out the edge.
    const closed = new Uint8Array(W * H)
    for (let z = 1; z < H - 1; z++) {
      for (let x = 1; x < W - 1; x++) {
        let sum = 0
        for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) sum += reached[(z + dz) * W + x + dx]
        closed[z * W + x] = sum >= 5 ? 1 : 0
      }
    }
    return this.flood((next) => closed[next] === 1, seed)
  }

  private smoothOverWalkable() {
    const { width: W, depth: H, surface, walkable } = this
    const out = new Float32Array(surface)
    const r = SMOOTH_RADIUS
    for (let z = 0; z < H; z++) {
      for (let x = 0; x < W; x++) {
        let sum = 0
        let weight = 0
        for (let dz = -r; dz <= r; dz++) {
          const nz = z + dz
          if (nz < 0 || nz >= H) continue
          for (let dx = -r; dx <= r; dx++) {
            const nx = x + dx
            if (nx < 0 || nx >= W || !walkable[nz * W + nx]) continue
            sum += surface[nz * W + nx]
            weight++
          }
        }
        // Reaches past the edge on purpose, so a foot beside a wall never climbs the wall.
        if (weight) out[z * W + x] = sum / weight
      }
    }
    return out
  }

  private cell(x: number, z: number) {
    const cx = THREE.MathUtils.clamp(Math.round((x - this.minX) / CELL), 0, this.width - 1)
    const cz = THREE.MathUtils.clamp(Math.round((z - this.minZ) / CELL), 0, this.depth - 1)
    return cz * this.width + cx
  }

  isWalkable(x: number, z: number) {
    const fx = (x - this.minX) / CELL
    const fz = (z - this.minZ) / CELL
    if (fx < 0 || fz < 0 || fx >= this.width - 1 || fz >= this.depth - 1) return false
    return this.walkable[this.cell(x, z)] === 1
  }

  /** True when the ground here drops into the sea, rather than rising into something solid. */
  isSeaward(x: number, z: number) {
    const fx = (x - this.minX) / CELL
    const fz = (z - this.minZ) / CELL
    if (fx < 0 || fz < 0 || fx >= this.width - 1 || fz >= this.depth - 1) return true
    return this.surface[this.cell(x, z)] < SHORE_CLEARANCE + 0.25
  }

  /** Smooth height under a foot, in metres above the sea. */
  heightAt(x: number, z: number) {
    const { width: W, depth: H, walkHeight } = this
    const fx = THREE.MathUtils.clamp((x - this.minX) / CELL, 0, W - 1.001)
    const fz = THREE.MathUtils.clamp((z - this.minZ) / CELL, 0, H - 1.001)
    const x0 = Math.floor(fx)
    const z0 = Math.floor(fz)
    const tx = fx - x0
    const tz = fz - z0
    const k = z0 * W + x0
    const a = walkHeight[k] + (walkHeight[k + 1] - walkHeight[k]) * tx
    const b = walkHeight[k + W] + (walkHeight[k + W + 1] - walkHeight[k + W]) * tx
    return Math.max(0, a + (b - a) * tz)
  }

  /** The top of whatever is here, including roofs and parasols. */
  surfaceAt(x: number, z: number) {
    return this.surface[this.cell(x, z)]
  }

  /** Heights as a texture, so the water knows how deep it is. Encoded -3 m to +3 m. */
  heightTexture() {
    const { width: W, depth: H, surface } = this
    const data = new Uint8Array(W * H)
    for (let i = 0; i < data.length; i++) {
      const y = surface[i] <= NO_DATA + 1 ? -3 : surface[i]
      data[i] = Math.round(THREE.MathUtils.clamp((y + 3) / 6, 0, 1) * 255)
    }
    const texture = new THREE.DataTexture(data, W, H, THREE.RedFormat)
    texture.minFilter = texture.magFilter = THREE.LinearFilter
    texture.needsUpdate = true
    return texture
  }

  /** World-space rectangle the height texture covers: x, z, width, depth. */
  get bounds(): [number, number, number, number] {
    return [this.minX, this.minZ, (this.width - 1) * CELL, (this.depth - 1) * CELL]
  }
}

let ground: BeachGround | null = null

/** Built once from the loaded model. The same ground serves both rounds. */
export function buildBeachGround(geometries: readonly THREE.BufferGeometry[]) {
  ground ??= new BeachGround(geometries)
  return ground
}

export function beachGround() {
  if (!ground) throw new Error('The beach model has not loaded yet')
  return ground
}
