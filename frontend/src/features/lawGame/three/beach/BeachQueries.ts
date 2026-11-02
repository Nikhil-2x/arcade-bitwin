import * as THREE from 'three'
import { EYE_HEIGHT, PLAYER_RADIUS } from '../../config.ts'
import { CrowdedQueries, prepareForRaycast } from '../CrowdedQueries.ts'
import { beachGround, type BeachGround } from './beachGround.ts'
import { CLUTTER_MATERIAL, SCAN_MATERIAL } from './beachLayout.ts'

const SIGHT_RANGE = 15
const VIEWPOINT_SPACING = 7
/** An aimed spot this close to the sea is under the water, and no place for evidence. */
const MIN_PLACE_HEIGHT = 0.06

const WHISTLE_QUIET_MS = 20000
const HEAD_DAMPING = 11

const ORBIT_RADIUS = 66
const ORBIT_HEIGHT = 34
const ORBIT_SPEED = 0.05
const ORBIT_LOOK = new THREE.Vector3(2, 2, 6)

function buildViewpoints(ground: BeachGround): THREE.Vector3[] {
  const eyes: THREE.Vector3[] = []
  const [minX, minZ, width, depth] = ground.bounds
  for (let x = minX; x < minX + width; x += VIEWPOINT_SPACING) {
    for (let z = minZ; z < minZ + depth; z += VIEWPOINT_SPACING) {
      if (ground.isWalkable(x, z)) eyes.push(new THREE.Vector3(x, EYE_HEIGHT + ground.heightAt(x, z), z))
    }
  }
  return eyes
}

const orbitPosition = new THREE.Vector3()
const firstPerson = new THREE.Vector3()
const firstPersonTurn = new THREE.Quaternion()
const orbitTurn = new THREE.Quaternion()
const orbitMatrix = new THREE.Matrix4()
const worldUp = new THREE.Vector3(0, 1, 0)

/** The beach has no walls. Its boundary is the ground itself, read from the scan. */
export class BeachQueries extends CrowdedQueries {
  readonly ground: BeachGround
  /** 1 = the drone's view, 0 = the player's own eyes. Eased by the drone shot. */
  readonly drone = { blend: 1, angle: 0.6 }
  private readonly lastGood = new THREE.Vector3()
  private hasLastGood = false
  private onWhistle: (() => void) | null = null
  private nextWhistle = 0
  private eyeY: number | null = null
  private lastFrame = performance.now()

  constructor(root: THREE.Object3D) {
    const ground = beachGround()
    const [minX, minZ, width, depth] = ground.bounds
    super(root, {
      ignored: new Set(),
      walkThrough: new Set([SCAN_MATERIAL, CLUTTER_MATERIAL]),
      floor: new THREE.Box3(new THREE.Vector3(minX, 0, minZ), new THREE.Vector3(minX + width, 0, minZ + depth)),
      viewpoints: buildViewpoints(ground),
      sightRange: SIGHT_RANGE,
      prepare: prepareForRaycast,
    })
    this.ground = ground
  }

  override floorAt(x: number, z: number): number {
    return this.ground.heightAt(x, z)
  }

  override surfaceY(x: number, z: number, fromY = this.ground.heightAt(x, z) + 2.5): number | null {
    return super.surfaceY(x, z, fromY)
  }

  override aim(camera: THREE.Camera, reach: number) {
    const hit = super.aim(camera, reach)
    return hit && hit.point.y >= MIN_PLACE_HEIGHT ? hit : null
  }

  protected override canStep(pos: THREE.Vector3, dx: number, dz: number): boolean {
    const length = Math.hypot(dx, dz)
    if (length === 0) return true
    const reach = (PLAYER_RADIUS + length) / length
    const x = pos.x + dx * reach
    const z = pos.z + dz * reach
    if (this.ground.isWalkable(x, z)) return true
    if (this.ground.isSeaward(x, z)) this.reachedTheEdge()
    return false
  }

  setWhistleListener(listener: (() => void) | null) {
    this.onWhistle = listener
  }

  private reachedTheEdge() {
    this.onEdge?.()
    const now = performance.now()
    if (now < this.nextWhistle) return
    this.nextWhistle = now + WHISTLE_QUIET_MS
    this.onWhistle?.()
  }

  override clamp(p: THREE.Vector3) {
    this.stepAroundPeople(p)
    // Being nudged by someone must never push the player off the ground.
    if (this.ground.isWalkable(p.x, p.z)) {
      this.lastGood.copy(p)
      this.hasLastGood = true
    } else if (this.hasLastGood) {
      p.x = this.lastGood.x
      p.z = this.lastGood.z
    }
  }

  override adjustCamera(camera: THREE.Camera) {
    // A scan is lumpy however much its ground is smoothed: the head rides over what is left, as legs would.
    const now = performance.now()
    const dt = Math.min((now - this.lastFrame) / 1000, 0.1)
    this.lastFrame = now
    this.eyeY = this.eyeY === null ? camera.position.y : THREE.MathUtils.damp(this.eyeY, camera.position.y, HEAD_DAMPING, dt)
    camera.position.y = this.eyeY

    const { blend, angle } = this.drone
    if (blend <= 0) return
    firstPerson.copy(camera.position)
    firstPersonTurn.copy(camera.quaternion)
    orbitPosition.set(Math.sin(angle) * ORBIT_RADIUS, ORBIT_HEIGHT, Math.cos(angle) * ORBIT_RADIUS)
    orbitMatrix.lookAt(orbitPosition, ORBIT_LOOK, worldUp)
    orbitTurn.setFromRotationMatrix(orbitMatrix)
    camera.position.lerpVectors(firstPerson, orbitPosition, blend)
    camera.quaternion.copy(firstPersonTurn).slerp(orbitTurn, blend)
  }

  skipDrone() {
    this.drone.blend = 0
  }

  /** Called by the drone shot each frame until the player has landed. */
  turnDrone(dt: number) {
    this.drone.angle += dt * ORBIT_SPEED
  }
}
