import * as THREE from 'three'
import { acceleratedRaycast, MeshBVH } from 'three-mesh-bvh'
import { EYE_HEIGHT } from '../../config.ts'
import { RoomQueries } from '../RoomQueries.ts'

interface Zone {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export const WEST = -27.2
export const EAST = 20
export const PLAZA_SOUTH = 19
export const CONCOURSE_NORTH = 9.05
export const PLATFORM_NORTH = 4.75
export const PLATFORM_SOUTH = 6.45
export const CROSSING_WEST = -16.8
export const CROSSING_EAST = -15.35
/** Where the plaza narrows to the strip in front of the station building, whose hall stays shut. */
const BUILDING_WEST = -13
const BUILDING_FRONT = 14.4

/** The doors the player can board by, as x positions on the platform side of the train. */
export const DOORS: readonly number[] = [-11.93, -4.89]
export const DOOR_HALF_WIDTH = 0.24
/** The walkable length of the train. */
export const COACH_WEST = -19.6
export const COACH_EAST = 2.6
export const AISLE_NORTH = 2.88
export const AISLE_SOUTH = 3.56
/** Centre line of the coach and the top of its floor, above the concourse. */
export const COACH_Z = 3.22
export const COACH_FLOOR = 0.742
export const COACH_CEILING = 2.48

/** The head rides a little lower aboard: the model's coaches are small. */
const EYE_DROP_ABOARD = 0.1
const STEP_RISE = COACH_FLOOR - EYE_DROP_ABOARD
/** The climb runs from the platform edge to just inside the door. */
const RAMP_OUTER_Z = PLATFORM_NORTH - 0.03
const RAMP_INNER_Z = 3.95
/** How far along the platform the door draws the player in, as the opening is narrower than they are. */
const DOOR_PULL = 0.65
/** Keeps the camera in the opening, clear of the frame. */
const DOOR_LANE = 0.12

const PLAZA: Zone = { minX: WEST, maxX: BUILDING_WEST, minZ: CONCOURSE_NORTH, maxZ: PLAZA_SOUTH }
const CONCOURSE: Zone = { minX: WEST, maxX: EAST, minZ: CONCOURSE_NORTH, maxZ: BUILDING_FRONT }
const PLATFORM: Zone = { minX: WEST, maxX: EAST, minZ: PLATFORM_NORTH, maxZ: PLATFORM_SOUTH }
const CROSSING: Zone = { minX: CROSSING_WEST, maxX: CROSSING_EAST, minZ: PLATFORM_SOUTH - 0.1, maxZ: CONCOURSE_NORTH + 0.1 }
const AISLE: Zone = { minX: COACH_WEST, maxX: COACH_EAST, minZ: AISLE_NORTH, maxZ: AISLE_SOUTH }
const DOORWAYS: Zone[] = DOORS.map((x) => ({ minX: x - DOOR_LANE, maxX: x + DOOR_LANE, minZ: AISLE_SOUTH - 0.1, maxZ: PLATFORM_NORTH + 0.1 }))

/** Stopping at one of these means the track is right there. */
const TRACK_EDGES = new Set([CONCOURSE_NORTH, PLATFORM_NORTH, PLATFORM_SOUTH])

/** Material of what the player walks over rather than into. */
export const GROUND_MATERIAL = 'RailwayGround'
export const CART_TOP_MATERIAL = 'ParcelCartTop'
/** The platform stands this far above the concourse floor. */
export const PLATFORM_TOP = 0.11

const SIGHT_RANGE = 15
/** Meshes too small to be worth a BVH. */
const BVH_MIN_TRIANGLES = 2000
const PERSON_RADIUS = 0.42
const STRIDE = 1.5
const BOB_HEIGHT = 0.024

function buildViewpoints(): THREE.Vector3[] {
  const eyes: THREE.Vector3[] = []
  for (const z of [(PLATFORM_NORTH + PLATFORM_SOUTH) / 2, CONCOURSE_NORTH + 0.5, BUILDING_FRONT - 1.6]) {
    for (let x = WEST + 1; x <= EAST - 1; x += 5) eyes.push(new THREE.Vector3(x, EYE_HEIGHT, z))
  }
  for (let x = WEST + 1; x <= BUILDING_WEST - 1; x += 5) eyes.push(new THREE.Vector3(x, EYE_HEIGHT, PLAZA_SOUTH - 1.5))
  // Aboard too, so what is hidden on the train is judged from where a searcher would stand.
  for (let x = COACH_WEST + 1; x <= COACH_EAST - 1; x += 3) eyes.push(new THREE.Vector3(x, EYE_HEIGHT + STEP_RISE, COACH_Z))
  return eyes
}

function nearestIn(zone: Zone, x: number, z: number) {
  const px = THREE.MathUtils.clamp(x, zone.minX, zone.maxX)
  const pz = THREE.MathUtils.clamp(z, zone.minZ, zone.maxZ)
  return { x: px, z: pz, d: (px - x) ** 2 + (pz - z) ** 2 }
}

/**
 * The station: tracks sit almost level with the floor, so nothing but these zones keeps the player
 * off them. The model is far larger than the classroom, so its big meshes get a BVH: without one,
 * each of the many rays a frame would test every triangle.
 */
export class RailwayQueries extends RoomQueries {
  /** False while a train is coming through: nobody may step onto the crossing. */
  private crossingOpen = true
  private stride = 0
  private bob = 0
  private onStep: (() => void) | null = null
  /** x, z pairs for everyone standing about: walked around, not through. */
  private people: Float32Array = new Float32Array(0)
  private peopleCount = 0
  private talkPrompt: string | null = null
  private talk: (() => void) | null = null

  constructor(root: THREE.Object3D) {
    super(root, {
      ignored: new Set(),
      walkThrough: new Set([GROUND_MATERIAL]),
      floor: new THREE.Box3(new THREE.Vector3(WEST, 0, PLATFORM_NORTH), new THREE.Vector3(EAST, 0, PLAZA_SOUTH)),
      viewpoints: buildViewpoints(),
      sightRange: SIGHT_RANGE,
      prepare: (mesh) => {
        const { geometry } = mesh
        const triangles = (geometry.index?.count ?? geometry.attributes.position.count) / 3
        if (triangles < BVH_MIN_TRIANGLES) return
        // The geometry is cached across the hide and search screens, so build its tree only once.
        geometry.boundsTree ??= new MeshBVH(geometry)
        mesh.raycast = acceleratedRaycast
      },
    })
    this.ray.firstHitOnly = true
  }

  setCrossingOpen(open: boolean) {
    this.crossingOpen = open
  }

  isCrossingOpen() {
    return this.crossingOpen
  }

  isOnCrossing(x: number, z: number): boolean {
    return x >= CROSSING.minX && x <= CROSSING.maxX && z > PLATFORM_SOUTH && z < CONCOURSE_NORTH
  }

  setPeople(positions: Float32Array, count: number) {
    this.people = positions
    this.peopleCount = count
  }

  setStepListener(listener: (() => void) | null) {
    this.onStep = listener
  }

  setTalkTarget(prompt: string | null, talk: (() => void) | null) {
    this.talkPrompt = prompt
    this.talk = talk
  }

  override contextPrompt() {
    return this.talkPrompt
  }

  override contextAct() {
    this.talk?.()
  }

  override floorAt(_x: number, z: number): number {
    if (z >= RAMP_OUTER_Z) return 0
    return THREE.MathUtils.clamp((RAMP_OUTER_Z - z) / (RAMP_OUTER_Z - RAMP_INNER_Z), 0, 1) * STEP_RISE
  }

  override headBob(walked: number): number {
    if (walked > 0) {
      const before = Math.floor(this.stride)
      this.stride += (walked / STRIDE) * 2
      if (Math.floor(this.stride) !== before) this.onStep?.()
      this.bob = Math.abs(Math.sin(this.stride * Math.PI)) * BOB_HEIGHT
    } else {
      this.bob *= 0.86
    }
    return this.bob - BOB_HEIGHT / 2
  }

  protected override ignoresSolids(pos: THREE.Vector3): boolean {
    // In the doorway the zones hold the player in the opening, and the frame is too tight for the rays.
    return pos.z < PLATFORM_NORTH + 0.05 && pos.z > AISLE_SOUTH - 0.05 && DOORS.some((x) => Math.abs(pos.x - x) < DOOR_LANE + 0.02)
  }

  override clamp(p: THREE.Vector3) {
    this.stepAroundPeople(p)
    // Walking at a door lines the player up with it, so boarding never takes pixel-perfect aim.
    if (p.z < PLATFORM_NORTH + 0.25 && p.z > AISLE_SOUTH) {
      for (const x of DOORS) {
        if (Math.abs(p.x - x) < DOOR_PULL) p.x = THREE.MathUtils.clamp(p.x, x - DOOR_LANE, x + DOOR_LANE)
      }
    }
    let best = nearestIn(CONCOURSE, p.x, p.z)
    const open = this.crossingOpen
    for (const zone of [PLAZA, PLATFORM, ...(open ? [CROSSING] : []), AISLE, ...DOORWAYS]) {
      if (best.d === 0) break
      const next = nearestIn(zone, p.x, p.z)
      if (next.d < best.d) best = next
    }
    if (best.z !== p.z && TRACK_EDGES.has(best.z)) this.onEdge?.()
    p.x = best.x
    p.z = best.z
  }

  private stepAroundPeople(p: THREE.Vector3) {
    for (let i = 0; i < this.peopleCount; i++) {
      const dx = p.x - this.people[i * 2]
      const dz = p.z - this.people[i * 2 + 1]
      const d = Math.hypot(dx, dz)
      if (d > 0.001 && d < PERSON_RADIUS) {
        p.x += (dx / d) * (PERSON_RADIUS - d)
        p.z += (dz / d) * (PERSON_RADIUS - d)
      }
    }
  }
}
