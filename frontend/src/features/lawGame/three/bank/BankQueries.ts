import * as THREE from 'three'
import { EYE_HEIGHT, PLAYER_RADIUS } from '../../config.ts'
import { CrowdedQueries, prepareForRaycast } from '../CrowdedQueries.ts'
import { CLUTTER_MATERIAL, COLLIDER_MATERIAL, GLASS_COLLIDER_MATERIAL, ROPE_EAST, ROPE_WEST, ROPE_Z } from './bankLayout.ts'

const SIGHT_RANGE = 15
const VIEWPOINT_SPACING = 6
const WARN_QUIET_MS = 20000
/** A step needs a floor under it: searched for this far down, from a little above floor level. */
const GROUND_PROBE_FROM = 0.3
const GROUND_PROBE_LENGTH = 0.8

const INTRO_HEIGHT = 11
const INTRO_Z = 30
const INTRO_SWAY = 7
const INTRO_SPEED = 0.09
const INTRO_LOOK = new THREE.Vector3(-2.25, 3, -6)

const DOWN = new THREE.Vector3(0, -1, 0)
const probe = new THREE.Vector3()
const introPosition = new THREE.Vector3()
const firstPerson = new THREE.Vector3()
const firstPersonTurn = new THREE.Quaternion()
const introTurn = new THREE.Quaternion()
const introMatrix = new THREE.Matrix4()
const worldUp = new THREE.Vector3(0, 1, 0)

/**
 * The materials of everything the model draws. Rays skip them all and only meet the colliders, which
 * is what keeps a frame's many rays cheap. The props the game adds are not marked as from the model, so they stay solid.
 */
function drawnMaterials(root: THREE.Object3D) {
  const names = new Set<string>()
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || !o.userData.fromModel) return
    names.add((o.material as THREE.Material).name)
  })
  names.delete(COLLIDER_MATERIAL)
  names.delete(GLASS_COLLIDER_MATERIAL)
  // Props the game adds mostly have no material name at all.
  names.delete('')
  return names
}

function buildViewpoints() {
  const eyes: THREE.Vector3[] = []
  for (let x = -18; x <= 14; x += VIEWPOINT_SPACING) {
    for (let z = -29; z <= 37; z += VIEWPOINT_SPACING) eyes.push(new THREE.Vector3(x, EYE_HEIGHT, z))
  }
  return eyes
}

const inStaffOnly = (x: number, z: number) => z < ROPE_Z + PLAYER_RADIUS && x > ROPE_WEST - PLAYER_RADIUS && x < ROPE_EAST + PLAYER_RADIUS

export class BankQueries extends CrowdedQueries {
  /** 1 = looking down the hall from above, 0 = the player's own eyes. Eased when the player clicks in. */
  readonly intro = { blend: 1, angle: 0 }
  private readonly ground: THREE.Object3D[] = []
  private onWarn: (() => void) | null = null
  private nextWarn = 0
  private stationPrompt: string | null = null
  private stationAct: (() => void) | null = null
  private crowd: Float32Array = new Float32Array(0)
  private crowdCount = 0

  constructor(root: THREE.Object3D) {
    super(root, {
      ignored: drawnMaterials(root),
      walkThrough: new Set([CLUTTER_MATERIAL]),
      seeThrough: new Set([GLASS_COLLIDER_MATERIAL]),
      floor: new THREE.Box3(new THREE.Vector3(-26, 0, -46), new THREE.Vector3(22, 0, 44)),
      viewpoints: buildViewpoints(),
      sightRange: SIGHT_RANGE,
      prepare: (mesh) => {
        const name = (mesh.material as THREE.Material).name
        if (name === COLLIDER_MATERIAL || name === GLASS_COLLIDER_MATERIAL) prepareForRaycast(mesh)
      },
    })
    root.traverse((o) => {
      if (o instanceof THREE.Mesh && (o.material as THREE.Material).name === COLLIDER_MATERIAL) this.ground.push(o)
    })
  }

  override setPeople(positions: Float32Array, count: number) {
    super.setPeople(positions, count)
    this.crowd = positions
    this.crowdCount = count
  }

  /** Is anyone in the crowd this close? Automatic doors want to know. */
  anyoneWithin(x: number, z: number, radius: number) {
    for (let i = 0; i < this.crowdCount; i++) {
      const dx = this.crowd[i * 2] - x
      const dz = this.crowd[i * 2 + 1] - z
      if (dx * dx + dz * dz < radius * radius) return true
    }
    return false
  }

  /** A machine or desk the player can use. People come first if both are in reach. */
  setStation(prompt: string | null, act: (() => void) | null) {
    this.stationPrompt = prompt
    this.stationAct = act
  }

  override contextPrompt() {
    return super.contextPrompt() ?? this.stationPrompt
  }

  override contextAct() {
    if (super.contextPrompt()) super.contextAct()
    else this.stationAct?.()
  }

  setWarnListener(listener: (() => void) | null) {
    this.onWarn = listener
  }

  private hasFloor(x: number, z: number) {
    this.ray.set(probe.set(x, GROUND_PROBE_FROM, z), DOWN)
    this.ray.near = 0
    this.ray.far = GROUND_PROBE_LENGTH
    return this.ray.intersectObjects(this.ground, false).length > 0
  }

  protected override canStep(pos: THREE.Vector3, dx: number, dz: number): boolean {
    const length = Math.hypot(dx, dz)
    if (length === 0) return true
    const reach = (PLAYER_RADIUS + length) / length
    const x = pos.x + dx * reach
    const z = pos.z + dz * reach
    if (inStaffOnly(x, z)) {
      this.reachedTheRope()
      return false
    }
    return this.hasFloor(x, z)
  }

  private reachedTheRope() {
    this.onEdge?.()
    const now = performance.now()
    if (now < this.nextWarn) return
    this.nextWarn = now + WARN_QUIET_MS
    this.onWarn?.()
  }

  override clamp(p: THREE.Vector3) {
    this.stepAroundPeople(p)
    super.clamp(p)
  }

  override adjustCamera(camera: THREE.Camera) {
    const { blend, angle } = this.intro
    if (blend <= 0) return
    firstPerson.copy(camera.position)
    firstPersonTurn.copy(camera.quaternion)
    introPosition.set(INTRO_LOOK.x + Math.sin(angle) * INTRO_SWAY, INTRO_HEIGHT, INTRO_Z)
    introMatrix.lookAt(introPosition, INTRO_LOOK, worldUp)
    introTurn.setFromRotationMatrix(introMatrix)
    camera.position.lerpVectors(firstPerson, introPosition, blend)
    camera.quaternion.copy(firstPersonTurn).slerp(introTurn, blend)
  }

  skipIntro() {
    this.intro.blend = 0
  }

  /** Called each frame until the player has landed. */
  driftIntro(dt: number) {
    this.intro.angle += dt * INTRO_SPEED
  }
}
