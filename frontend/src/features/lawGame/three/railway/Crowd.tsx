import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useLawGame } from '../../store/useLawGame.ts'
import type { Suspect } from '../../types.ts'
import type { Speech } from '../../ui/useSpeech.ts'
import { PEOPLE, type PersonDef } from './crowdData.ts'
import { CONCOURSE_NORTH, PLATFORM_SOUTH, type RailwayQueries } from './RailwayQueries.ts'

const TALK_REACH = 2.1
const TALK_AIM = 0.82
const TALK_HOLD_S = 5
const YIELD_DISTANCE = 1.15
const TURN_SPEED = 7
const LEG = 0.82
const SHIN_SWING = 0.62
const ARM_SWING = 0.5

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

interface Person {
  def: PersonDef
  name: string
  say: Speech
  x: number
  z: number
  yaw: number
  /** Which waypoint they are heading for. */
  next: number
  /** Walking cycle, radians. */
  phase: number
  /** Blends between standing still and walking. */
  moving: number
  talking: number
  posed: boolean
  /** Offsets idle motion so nobody moves in unison. */
  seed: number
  skin: string
  hair: string
  shirt: string
}

function buildPeople(suspects: readonly Suspect[], culpritId: string | undefined, phase: string, alibi: string | undefined): Person[] {
  const list: Person[] = []
  PEOPLE.forEach((def, i) => {
    const suspect = def.suspectId ? suspects.find((s) => s.id === def.suspectId) : undefined
    // While hiding, the culprit is the player. Once the detective arrives they are back on the platform.
    if (suspect && suspect.id === culpritId && phase !== 'search') return
    const line = suspect ? (suspect.id === culpritId && alibi ? alibi : suspect.statement) : def.role.line
    const name = suspect ? `${suspect.name}, ${suspect.role}` : def.role.name
    list.push({
      def,
      name,
      say: { name, text: line, suspect, law: suspect ? undefined : def.role.law },
      x: def.path[0][0],
      z: def.path[0][1],
      yaw: def.yaw ?? 0,
      next: 1 % def.path.length,
      phase: i * 1.7,
      moving: 0,
      talking: 0,
      posed: false,
      seed: i * 2.39,
      skin: suspect?.skin ?? def.look.skin,
      hair: suspect?.hair ?? def.look.hair,
      shirt: suspect?.shirt ?? def.look.shirt,
    })
  })
  return list
}

const crossesLine = (fromZ: number, toZ: number) => {
  const lo = Math.min(fromZ, toZ)
  const hi = Math.max(fromZ, toZ)
  return lo < PLATFORM_SOUTH + 0.1 && hi > CONCOURSE_NORTH - 0.1
}

/** Per-part matrices are rebuilt every frame without allocating: these are reused. */
const body = new THREE.Matrix4()
const part = new THREE.Matrix4()
const swing = new THREE.Matrix4()
const out = new THREE.Matrix4()
const qYaw = new THREE.Quaternion()
const vPos = new THREE.Vector3()
const vScale = new THREE.Vector3()
const up = new THREE.Vector3(0, 1, 0)
const toPerson = new THREE.Vector3()
const view = new THREE.Vector3()
const hidden = new THREE.Matrix4().makeScale(0, 0, 0)

/** Sets `out` to a box hanging from a joint: `jx,jy,jz` in body space, rotated by `angle` about x. */
function limb(jx: number, jy: number, jz: number, angle: number, sx: number, sy: number, sz: number) {
  part.makeTranslation(jx, jy, jz)
  swing.makeRotationX(angle)
  part.multiply(swing)
  swing.makeTranslation(0, -sy / 2, 0)
  part.multiply(swing)
  swing.makeScale(sx, sy, sz)
  part.multiply(swing)
  out.multiplyMatrices(body, part)
}

function piece(x: number, y: number, z: number, sx: number, sy: number, sz: number) {
  part.makeTranslation(x, y, z)
  swing.makeScale(sx, sy, sz)
  part.multiply(swing)
  out.multiplyMatrices(body, part)
}

const headGeometry = new THREE.IcosahedronGeometry(0.5, 1)
const hairGeometry = new THREE.SphereGeometry(0.5, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.56)
const boxGeometry = new THREE.BoxGeometry(1, 1, 1)
const dressGeometry = new THREE.CylinderGeometry(0.32, 0.5, 1, 8)

/**
 * Everyone at the station, in one draw call per body part however many there are. No model files:
 * they are built from simple shapes like the rest of the scene's props, and animated in this one loop.
 */
export function Crowd({ q, onSpeech }: { q: RailwayQueries; onSpeech?: (speech: Speech) => void }) {
  const { camera } = useThree()
  const theCase = useLawGame((s) => s.theCase)
  const world = useLawGame((s) => s.world)
  const phase = useLawGame((s) => s.phase)
  const speech = useRef(onSpeech)
  useEffect(() => {
    speech.current = onSpeech
  })

  // Rebuilt only when the screen changes: the crowd holds its own state from then on.
  const people = useMemo(
    () => buildPeople(theCase.suspects, world?.characterId, phase, phase === 'search' ? world?.statement : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theCase, world?.characterId, phase],
  )
  const count = people.length
  const positions = useMemo(() => new Float32Array(count * 2), [count])
  const still = useMemo(() => reducedMotion(), [])
  const facing = useRef(-1)
  const time = useRef(0)

  const heads = useRef<THREE.InstancedMesh>(null)
  const hairs = useRef<THREE.InstancedMesh>(null)
  const torsos = useRef<THREE.InstancedMesh>(null)
  const limbs = useRef<THREE.InstancedMesh>(null)
  const dresses = useRef<THREE.InstancedMesh>(null)
  const props = useRef<THREE.InstancedMesh>(null)

  useEffect(() => {
    const color = new THREE.Color()
    people.forEach((p, i) => {
      heads.current?.setColorAt(i, color.set(p.skin))
      hairs.current?.setColorAt(i, color.set(p.hair))
      torsos.current?.setColorAt(i, color.set(p.shirt))
      dresses.current?.setColorAt(i, color.set(p.def.look.legs))
      props.current?.setColorAt(i, color.set(p.def.look.carry === 'headload' ? '#a39a7c' : p.def.look.carry === 'backpack' ? '#3a4a5c' : '#5c2f22'))
      limbs.current?.setColorAt(i * 4, color.set(p.def.look.legs))
      limbs.current?.setColorAt(i * 4 + 1, color.set(p.def.look.legs))
      limbs.current?.setColorAt(i * 4 + 2, color.set(p.skin))
      limbs.current?.setColorAt(i * 4 + 3, color.set(p.skin))
    })
    for (const mesh of [heads, hairs, torsos, limbs, dresses, props]) if (mesh.current?.instanceColor) mesh.current.instanceColor.needsUpdate = true
  }, [people])

  useEffect(() => {
    q.setPeople(positions, count)
    return () => {
      q.setPeople(new Float32Array(0), 0)
      q.setTalkTarget(null, null)
    }
  }, [q, positions, count])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    time.current += dt
    stepCrowd(people, positions, q, camera, dt, time.current, still, heads.current, hairs.current, torsos.current, limbs.current, dresses.current, props.current)
    for (const mesh of [heads, hairs, torsos, limbs, dresses, props]) if (mesh.current) mesh.current.instanceMatrix.needsUpdate = true

    const best = nearestFaced(people, camera)
    if (best !== facing.current) {
      facing.current = best
      const chosen = best >= 0 ? people[best] : null
      q.setTalkTarget(
        chosen ? `E  Talk to ${chosen.name}` : null,
        chosen
          ? () => {
              startTalking(chosen)
              speech.current?.(chosen.say)
            }
          : null,
      )
    }
  })

  return (
    <group>
      <instancedMesh ref={heads} args={[headGeometry, undefined, count]} frustumCulled={false}>
        <meshStandardMaterial roughness={0.75} flatShading />
      </instancedMesh>
      <instancedMesh ref={hairs} args={[hairGeometry, undefined, count]} frustumCulled={false}>
        <meshStandardMaterial roughness={0.9} flatShading />
      </instancedMesh>
      <instancedMesh ref={torsos} args={[boxGeometry, undefined, count]} frustumCulled={false}>
        <meshStandardMaterial roughness={0.85} />
      </instancedMesh>
      <instancedMesh ref={limbs} args={[boxGeometry, undefined, count * 4]} frustumCulled={false}>
        <meshStandardMaterial roughness={0.85} />
      </instancedMesh>
      <instancedMesh ref={dresses} args={[dressGeometry, undefined, count]} frustumCulled={false}>
        <meshStandardMaterial roughness={0.85} flatShading />
      </instancedMesh>
      <instancedMesh ref={props} args={[boxGeometry, undefined, count]} frustumCulled={false}>
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
    </group>
  )
}

const startTalking = (p: Person) => {
  p.talking = TALK_HOLD_S
}

/** Who the player is looking at, if they are close enough to talk to. */
function nearestFaced(people: Person[], camera: THREE.Camera) {
  camera.getWorldDirection(view)
  let best = -1
  let bestAim = TALK_AIM
  for (let i = 0; i < people.length; i++) {
    const p = people[i]
    const d = Math.hypot(camera.position.x - p.x, camera.position.z - p.z)
    if (d >= TALK_REACH || d < 0.01) continue
    toPerson.set(p.x - camera.position.x, 1.2 + (p.def.y ?? 0) - camera.position.y, p.z - camera.position.z).normalize()
    const aim = toPerson.dot(view)
    if (aim > bestAim) {
      bestAim = aim
      best = i
    }
  }
  return best
}

function stepCrowd(
  people: Person[],
  positions: Float32Array,
  q: RailwayQueries,
  camera: THREE.Camera,
  dt: number,
  t: number,
  still: boolean,
  heads: THREE.InstancedMesh | null,
  hairs: THREE.InstancedMesh | null,
  torsos: THREE.InstancedMesh | null,
  limbs: THREE.InstancedMesh | null,
  dresses: THREE.InstancedMesh | null,
  props: THREE.InstancedMesh | null,
) {
  const px = camera.position.x
  const pz = camera.position.z
  for (let i = 0; i < people.length; i++) {
    const p = people[i]
    const { def } = p
    const toPlayerX = px - p.x
    const toPlayerZ = pz - p.z
    const playerDist = Math.hypot(toPlayerX, toPlayerZ)
    p.talking = Math.max(0, p.talking - dt)

    let wantMove = false
    if (def.path.length > 1 && !still && p.talking === 0) {
      const [tx, tz] = def.path[p.next]
      const dx = tx - p.x
      const dz = tz - p.z
      const d = Math.hypot(dx, dz)
      if (d < 0.08) {
        p.next = (p.next + 1) % def.path.length
      } else {
        const dirX = dx / d
        const dirZ = dz / d
        // Give way to the player, and to anyone just ahead on the same line.
        let blocked = playerDist < YIELD_DISTANCE && (toPlayerX * dirX + toPlayerZ * dirZ) / (playerDist || 1) > 0.35
        for (let j = 0; j < i && !blocked; j++) {
          const ax = people[j].x - p.x
          const az = people[j].z - p.z
          if (ax * ax + az * az < 0.72 && ax * dirX + az * dirZ > 0) blocked = true
        }
        // Nobody steps on to the boards with the crossing lights flashing.
        if (!q.isCrossingOpen() && crossesLine(p.z, tz) && !q.isOnCrossing(p.x, p.z)) blocked = true
        if (!blocked) {
          wantMove = true
          const stride = Math.min(d, (def.speed ?? 1) * dt)
          p.x += dirX * stride
          p.z += dirZ * stride
          p.phase += (stride / 0.72) * Math.PI
          turnToward(p, Math.atan2(dirX, dirZ), dt)
        }
      }
    }
    if (p.talking > 0) turnToward(p, Math.atan2(toPlayerX, toPlayerZ), dt)
    p.moving += ((wantMove ? 1 : 0) - p.moving) * Math.min(1, dt * 8)

    positions[i * 2] = p.x
    positions[i * 2 + 1] = p.z
    // Seated people never move, and there are many: pose them once, unless they turn to talk.
    if (def.seated && p.posed && p.talking === 0) continue
    p.posed = true
    pose(p, i, t, heads, hairs, torsos, limbs, dresses, props)
  }
}

function turnToward(p: Person, target: number, dt: number) {
  let delta = target - p.yaw
  while (delta > Math.PI) delta -= Math.PI * 2
  while (delta < -Math.PI) delta += Math.PI * 2
  p.yaw += delta * Math.min(1, dt * TURN_SPEED)
}

function pose(
  p: Person,
  i: number,
  t: number,
  heads: THREE.InstancedMesh | null,
  hairs: THREE.InstancedMesh | null,
  torsos: THREE.InstancedMesh | null,
  limbs: THREE.InstancedMesh | null,
  dresses: THREE.InstancedMesh | null,
  props: THREE.InstancedMesh | null,
) {
  if (!heads || !hairs || !torsos || !limbs || !dresses || !props) return
  const { look, seated, y = 0 } = p.def
  const dress = !!look.dress
  const walk = Math.sin(p.phase) * p.moving
  const bob = Math.abs(Math.cos(p.phase)) * 0.035 * p.moving
  const idle = Math.sin(t * 0.8 + p.seed) * (1 - p.moving)
  const hipY = seated ? 0.45 : LEG + bob

  qYaw.setFromAxisAngle(up, p.yaw + (seated ? 0 : idle * 0.03))
  vPos.set(p.x, y, p.z)
  vScale.setScalar(look.height)
  body.compose(vPos, qYaw, vScale)

  piece(0, hipY + 0.31, 0, 0.36, 0.62, 0.21)
  torsos.setMatrixAt(i, out)
  const headTurn = idle * 0.12
  piece(headTurn * 0.1, hipY + 0.74, 0.012, 0.24, 0.27, 0.25)
  heads.setMatrixAt(i, out)
  piece(headTurn * 0.1, hipY + 0.78, -0.015, 0.265, 0.27, 0.27)
  hairs.setMatrixAt(i, out)

  // Legs: seated people have them bent forward, walkers swing them, dresses hide them.
  if (dress && !seated) {
    limbs.setMatrixAt(i * 4, hidden)
    limbs.setMatrixAt(i * 4 + 1, hidden)
    piece(0, hipY / 2 + 0.02, 0, 0.66, hipY, 0.5)
    dresses.setMatrixAt(i, out)
  } else {
    const a = seated ? -1.45 : walk * SHIN_SWING
    const b = seated ? -1.45 : -walk * SHIN_SWING
    const length = seated ? 0.46 : LEG
    limb(-0.095, hipY, 0, a, 0.13, length, 0.14)
    limbs.setMatrixAt(i * 4, out)
    limb(0.095, hipY, 0, b, 0.13, length, 0.14)
    limbs.setMatrixAt(i * 4 + 1, out)
    dresses.setMatrixAt(i, hidden)
  }

  // Arms: opposite the legs. The porter holds the load up; a suitcase pins one arm down.
  const carrying = look.carry
  const armA = carrying === 'headload' ? -2.9 : seated ? -0.5 : -walk * ARM_SWING + idle * 0.03
  const armB = carrying === 'headload' ? -2.9 : carrying === 'suitcase' ? 0.04 : seated ? -0.5 : walk * ARM_SWING - idle * 0.03
  limb(-0.235, hipY + 0.6, 0, armA, 0.09, 0.56, 0.1)
  limbs.setMatrixAt(i * 4 + 2, out)
  limb(0.235, hipY + 0.6, 0, armB, 0.09, 0.56, 0.1)
  limbs.setMatrixAt(i * 4 + 3, out)

  if (carrying === 'suitcase') piece(0.28, hipY - 0.29, 0.02, 0.1, 0.34, 0.44)
  else if (carrying === 'backpack') piece(0, hipY + 0.36, -0.17, 0.29, 0.4, 0.13)
  else if (carrying === 'headload') piece(0, hipY + 1.04, 0, 0.48, 0.28, 0.62)
  else {
    props.setMatrixAt(i, hidden)
    return
  }
  props.setMatrixAt(i, out)
}

