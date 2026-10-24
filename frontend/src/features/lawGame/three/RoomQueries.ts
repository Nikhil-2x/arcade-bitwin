import * as THREE from 'three'
import { EYE_HEIGHT, PLAYER_RADIUS } from '../config.ts'

/** Never blocks the player or the line of sight. */
const IGNORED = new Set(['Outline', 'CellingMat', 'Lights', 'CracksMat', 'DecalsMat', 'CurtainMat', 'GlassMat'])
/** Clutter you can walk past: it should not stop movement, though it can still hide things. */
const WALK_THROUGH = new Set(['PapersMat', 'PencilsMat', 'Pencil1Mat', 'BooksMat', 'Book1Mat', 'FloorMat', 'None'])

const PROBE_HEIGHTS = [0.2, 0.5, 0.75]
const PROBE_SIDES = [-0.2, 0, 0.2]
const DOWN = new THREE.Vector3(0, -1, 0)
const UP = new THREE.Vector3(0, 1, 0)

/**
 * Everything the game asks of the classroom geometry: where the floor is, what blocks a step,
 * where a dropped item lands and how well it is hidden. Built once from the loaded model.
 */
export class RoomQueries {
  readonly floor = new THREE.Box3()
  /** Bounding box of every mesh using a given material name, for landmarks like the teacher's desk. */
  private readonly boxes = new Map<string, THREE.Box3>()
  private readonly occluders: THREE.Object3D[] = []
  private readonly solids: THREE.Object3D[] = []
  private readonly ray = new THREE.Raycaster()
  private readonly viewpoints: THREE.Vector3[] = []

  readonly root: THREE.Object3D

  constructor(root: THREE.Object3D) {
    this.root = root
    root.updateWorldMatrix(true, true)
    root.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return
      const name = (o.material as THREE.Material).name
      if (name === 'FloorMat') this.floor.expandByObject(o)
      if (!this.boxes.has(name)) this.boxes.set(name, new THREE.Box3())
      this.boxes.get(name)!.expandByObject(o)
      if (IGNORED.has(name)) return
      this.occluders.push(o)
      if (!WALK_THROUGH.has(name)) this.solids.push(o)
    })
    // Sample eyes spread over the floor, used to judge what can be seen from where.
    const inset = 0.5
    const { min, max } = this.floor
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 3; j++) {
        const x = THREE.MathUtils.lerp(min.x + inset, max.x - inset, i / 3)
        const z = THREE.MathUtils.lerp(min.z + inset, max.z - inset, j / 2)
        this.viewpoints.push(new THREE.Vector3(x, EYE_HEIGHT, z))
      }
    }
  }

  box(material: string): THREE.Box3 | undefined {
    return this.boxes.get(material)
  }

  /** The first thing along the crosshair, among the room and the given targets. */
  pick(camera: THREE.Camera, reach: number, targets: THREE.Object3D[]): THREE.Intersection | null {
    this.ray.setFromCamera(new THREE.Vector2(0, 0), camera)
    this.ray.near = 0
    this.ray.far = reach
    return this.ray.intersectObjects([...this.occluders, ...targets], true)[0] ?? null
  }

  /** Clamp a point inside the floor, with a margin from the walls. */
  clamp(p: THREE.Vector3, margin = PLAYER_RADIUS) {
    p.x = THREE.MathUtils.clamp(p.x, this.floor.min.x + margin, this.floor.max.x - margin)
    p.z = THREE.MathUtils.clamp(p.z, this.floor.min.z + margin, this.floor.max.z - margin)
  }

  private blocked(from: THREE.Vector3, dir: THREE.Vector3, dist: number): boolean {
    if (dir.lengthSq() === 0) return false
    this.ray.set(from, dir)
    this.ray.near = 0
    this.ray.far = dist
    return this.ray.intersectObjects(this.solids, false).length > 0
  }

  /** Move on the floor plane, sliding along whatever is in the way. Mutates `pos`. */
  move(pos: THREE.Vector3, dx: number, dz: number) {
    const probe = new THREE.Vector3()
    const dir = new THREE.Vector3()
    const side = new THREE.Vector3()
    const free = (sx: number, sz: number) => {
      if (sx === 0 && sz === 0) return true
      dir.set(sx, 0, sz).normalize()
      side.set(-dir.z, 0, dir.x)
      const reach = PLAYER_RADIUS + Math.hypot(sx, sz)
      // Several heights and a little to each side, so a desk with a gap under it still stops you.
      for (const h of PROBE_HEIGHTS) {
        for (const o of PROBE_SIDES) {
          probe.set(pos.x + side.x * o, h, pos.z + side.z * o)
          if (this.blocked(probe, dir, reach)) return false
        }
      }
      return true
    }
    if (free(dx, 0)) pos.x += dx
    if (free(0, dz)) pos.z += dz
    this.clamp(pos)
  }

  /** The height of the highest surface under (x, z), searching down from `fromY`. */
  surfaceY(x: number, z: number, fromY = 2.5): number | null {
    this.ray.set(new THREE.Vector3(x, fromY, z), DOWN)
    this.ray.near = 0
    this.ray.far = fromY + 1
    const hit = this.ray.intersectObjects(this.occluders, false)[0]
    return hit ? hit.point.y : null
  }

  /** What the crosshair points at, within `reach`: a world point and the surface normal there. */
  aim(camera: THREE.Camera, reach: number): { point: THREE.Vector3; normal: THREE.Vector3 } | null {
    this.ray.setFromCamera(new THREE.Vector2(0, 0), camera)
    this.ray.near = 0
    this.ray.far = reach
    const hit = this.ray.intersectObjects(this.occluders, false)[0]
    if (!hit) return null
    const normal = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : UP.clone()
    // Meshes can be double-sided or flipped: always face the normal toward the viewer.
    if (normal.dot(this.ray.ray.direction) > 0) normal.negate()
    return { point: hit.point, normal }
  }

  /** True if something solid sits above the point within `height`: under a desk, a shelf, a bag. */
  coveredAbove(p: THREE.Vector3, height = 1.1): boolean {
    this.ray.set(p, UP)
    this.ray.near = 0.02
    this.ray.far = height
    return this.ray.intersectObjects(this.occluders, false).length > 0
  }

  /** 0 = visible from every sample spot in the room, 1 = visible from none. */
  concealment(p: THREE.Vector3): number {
    const target = p.clone()
    target.y += 0.06
    let hidden = 0
    const dir = new THREE.Vector3()
    for (const v of this.viewpoints) {
      dir.subVectors(target, v)
      const dist = dir.length()
      dir.normalize()
      this.ray.set(v, dir)
      this.ray.near = 0
      this.ray.far = dist - 0.1
      if (this.ray.intersectObjects(this.occluders, false).length > 0) hidden++
    }
    let c = hidden / this.viewpoints.length
    // Tucked under something counts for more than a clear sight line suggests.
    if (this.coveredAbove(p)) c = Math.min(1, c + 0.25)
    return Math.round(c * 100) / 100
  }
}
