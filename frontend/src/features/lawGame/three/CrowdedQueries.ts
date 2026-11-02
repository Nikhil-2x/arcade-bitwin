import * as THREE from 'three'
import { acceleratedRaycast, MeshBVH } from 'three-mesh-bvh'
import { RoomQueries, type RoomQueryOptions } from './RoomQueries.ts'

/** Meshes too small to be worth a BVH. */
const BVH_MIN_TRIANGLES = 2000
const PERSON_RADIUS = 0.42
const STRIDE = 1.5
const BOB_HEIGHT = 0.024

/** Big models need a BVH: without one, each of the many rays a frame would test every triangle. */
export function prepareForRaycast(mesh: THREE.Mesh) {
  const { geometry } = mesh
  const triangles = (geometry.index?.count ?? geometry.attributes.position.count) / 3
  if (triangles < BVH_MIN_TRIANGLES) return
  // The geometry is cached across the hide and search screens, so build its tree only once.
  geometry.boundsTree ??= new MeshBVH(geometry)
  mesh.raycast = acceleratedRaycast
}

/** A world with people in it: they can be talked to and walked around, and the player has a stride. */
export class CrowdedQueries extends RoomQueries {
  private stride = 0
  private bob = 0
  private onStep: (() => void) | null = null
  /** x, z pairs for everyone standing about: walked around, not through. */
  private people: Float32Array = new Float32Array(0)
  private peopleCount = 0
  private talkPrompt: string | null = null
  private talk: (() => void) | null = null

  constructor(root: THREE.Object3D, options: RoomQueryOptions) {
    super(root, options)
    this.ray.firstHitOnly = true
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

  protected stepAroundPeople(p: THREE.Vector3) {
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
