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

const PLAZA: Zone = { minX: WEST, maxX: BUILDING_WEST, minZ: CONCOURSE_NORTH, maxZ: PLAZA_SOUTH }
const CONCOURSE: Zone = { minX: WEST, maxX: EAST, minZ: CONCOURSE_NORTH, maxZ: BUILDING_FRONT }
const PLATFORM: Zone = { minX: WEST, maxX: EAST, minZ: PLATFORM_NORTH, maxZ: PLATFORM_SOUTH }
const CROSSING: Zone = { minX: CROSSING_WEST, maxX: CROSSING_EAST, minZ: PLATFORM_SOUTH - 0.1, maxZ: CONCOURSE_NORTH + 0.1 }

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

function buildViewpoints(): THREE.Vector3[] {
  const eyes: THREE.Vector3[] = []
  for (const z of [(PLATFORM_NORTH + PLATFORM_SOUTH) / 2, CONCOURSE_NORTH + 0.5, BUILDING_FRONT - 1.6]) {
    for (let x = WEST + 1; x <= EAST - 1; x += 5) eyes.push(new THREE.Vector3(x, EYE_HEIGHT, z))
  }
  for (let x = WEST + 1; x <= BUILDING_WEST - 1; x += 5) eyes.push(new THREE.Vector3(x, EYE_HEIGHT, PLAZA_SOUTH - 1.5))
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

  isOnCrossing(x: number, z: number): boolean {
    return x >= CROSSING.minX && x <= CROSSING.maxX && z > PLATFORM_SOUTH && z < CONCOURSE_NORTH
  }

  override clamp(p: THREE.Vector3) {
    let best = nearestIn(CONCOURSE, p.x, p.z)
    const others = this.crossingOpen ? [PLAZA, PLATFORM, CROSSING] : [PLAZA, PLATFORM]
    for (const zone of others) {
      if (best.d === 0) break
      const next = nearestIn(zone, p.x, p.z)
      if (next.d < best.d) best = next
    }
    if (best.z !== p.z && TRACK_EDGES.has(best.z)) this.onEdge?.()
    p.x = best.x
    p.z = best.z
  }
}
