import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useLawGame } from '../../store/useLawGame.ts'
import type { Suspect } from '../../types.ts'
import type { Speech } from '../../ui/useSpeech.ts'
import { BANK_PEOPLE, QUEUE_SPACING, QUEUES, type Activity, type Carry, type PersonDef } from './bankCrowdData.ts'
import type { BankQueries } from './BankQueries.ts'
import { shadowTexture } from './bankTextures.ts'

const TALK_REACH = 2.1
const TALK_AIM = 0.82
const TALK_HOLD_S = 5
const YIELD_DISTANCE = 1.15
const TURN_SPEED = 6
const STRIDE_LENGTH = 0.72
/** People speed up and slow down over this many seconds, rather than starting and stopping dead. */
const EASE_RATE = 4.5
const NOTICE_DISTANCE = 3.4
const ARRIVED = 0.07
const QUEUE_WALK_SPEED = 1.05
/** How far aside a served customer steps to walk back past the line. */
const QUEUE_ASIDE = 0.85
const SERVE_MIN_S = 7
const SERVE_EXTRA_S = 7

const THIGH = 0.43
const SHIN = 0.43
const UPPER_ARM = 0.29
const FOREARM = 0.27
const LIMB_WIDTH = 0.115
const HIP_HEIGHT = THIGH + SHIN
/** Stretched capsules taper at their ends: without an overlap, every joint shows a gap. */
const JOINT_OVERLAP = 1.28
const SEAT_HEIGHT = 0.47

/** Capsules and spheres per person, in the order they sit in the instanced meshes. */
const CAPSULES = 11
const SPHERES = 6

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

interface Person {
  def: PersonDef
  act: Activity
  name: string
  say: Speech
  x: number
  z: number
  lastX: number
  lastZ: number
  yaw: number
  /** Which waypoint they are heading for. */
  next: number
  /** Walking cycle, radians. */
  phase: number
  /** 0 standing, 1 walking: blends the two poses together. */
  moving: number
  speed: number
  talking: number
  /** 0 to 1, how much of the talking gesture is showing. */
  gesture: number
  seed: number
  skin: string
  hair: string
  shirt: string
  /** Where a queuing customer is being sent, in order. */
  route: { x: number; z: number }[]
}

function buildPeople(suspects: readonly Suspect[], culpritId: string | undefined, phase: string, alibi: string | undefined): Person[] {
  const list: Person[] = []
  BANK_PEOPLE.forEach((def, i) => {
    const suspect = def.suspectId ? suspects.find((s) => s.id === def.suspectId) : undefined
    // While hiding, the culprit is the player. Once the detective arrives they are back in the hall.
    if (suspect && suspect.id === culpritId && phase !== 'search') return
    const line = suspect ? (suspect.id === culpritId && alibi ? alibi : suspect.statement) : def.role.line
    const name = suspect ? `${suspect.name}, ${suspect.role}` : def.role.name
    list.push({
      def,
      act: def.act,
      name,
      say: { name, text: line, suspect, law: suspect ? undefined : def.role.law },
      x: def.path[0][0],
      z: def.path[0][1],
      lastX: def.path[0][0],
      lastZ: def.path[0][1],
      yaw: def.yaw ?? 0,
      next: 1 % def.path.length,
      phase: i * 1.7,
      moving: 0,
      speed: 0,
      talking: 0,
      gesture: 0,
      seed: i * 2.39,
      skin: suspect?.skin ?? def.look.skin,
      hair: suspect?.hair ?? def.look.hair,
      shirt: suspect?.shirt ?? def.look.shirt,
      route: [],
    })
  })
  return list
}

/** One counter's line: `members[0]` is at the window. */
interface LiveQueue {
  members: Person[]
  /** Seconds until the customer at the window is done. */
  serving: number
}

function buildQueues(people: Person[]): LiveQueue[] {
  return QUEUES.map((_, line) => ({
    members: people.filter((p) => p.def.line === line),
    serving: SERVE_MIN_S * 0.4 + line * 2.5,
  }))
}

/** Sends the served customer round to the back, and moves everyone else up a place. */
function advanceQueue(queue: LiveQueue, line: number) {
  const { head, back, side } = QUEUES[line]
  const [front, ...rest] = queue.members
  if (!front) return
  const place = (slot: number) => ({ x: head[0] + back[0] * slot * QUEUE_SPACING, z: head[1] + back[1] * slot * QUEUE_SPACING })
  const tail = place(rest.length)
  const from = place(0)
  front.route = [
    { x: from.x + side[0] * QUEUE_ASIDE, z: from.z + side[1] * QUEUE_ASIDE },
    { x: tail.x + side[0] * QUEUE_ASIDE, z: tail.z + side[1] * QUEUE_ASIDE },
    tail,
  ]
  rest.forEach((p, slot) => {
    p.route = [place(slot)]
  })
  queue.members = [...rest, front]
}

const CARRY_COLOUR: Record<Carry, string> = {
  folder: '#b5372e',
  phone: '#15171c',
  bag: '#5c2f22',
  mop: '#c8ad7f',
  paper: '#f2efe6',
}
const CARRY_SIZE: Record<Exclude<Carry, 'mop'>, readonly [number, number, number]> = {
  folder: [0.24, 0.3, 0.035],
  phone: [0.075, 0.15, 0.016],
  bag: [0.12, 0.27, 0.32],
  paper: [0.21, 0.28, 0.004],
}

/** Reused every frame, so that nothing allocates however large the crowd is. */
const body = new THREE.Matrix4()
const chain = new THREE.Matrix4()
const step = new THREE.Matrix4()
const out = new THREE.Matrix4()
const hand = new THREE.Matrix4()
const q1 = new THREE.Quaternion()
const q2 = new THREE.Quaternion()
const vPos = new THREE.Vector3()
const vScale = new THREE.Vector3()
const up = new THREE.Vector3(0, 1, 0)
const xAxis = new THREE.Vector3(1, 0, 0)
const toPerson = new THREE.Vector3()
const view = new THREE.Vector3()
const hidden = new THREE.Matrix4().makeScale(0, 0, 0)

/** The joint angles a person takes this frame: [swing, side] for each arm and leg's upper part, then the bend. */
const pose = {
  hip: HIP_HEIGHT,
  lean: 0,
  armL: [0, -0.1, -0.15],
  armR: [0, 0.1, -0.15],
  legL: [0, 0],
  legR: [0, 0],
}

function restPose() {
  pose.hip = HIP_HEIGHT
  pose.lean = 0
  pose.armL[0] = 0
  pose.armL[1] = -0.1
  pose.armL[2] = -0.15
  pose.armR[0] = 0
  pose.armR[1] = 0.1
  pose.armR[2] = -0.15
  pose.legL[0] = pose.legL[1] = 0
  pose.legR[0] = pose.legR[1] = 0
}

function setSeated(hip: number) {
  pose.hip = hip
  pose.legL[0] = pose.legR[0] = -1.45
  pose.legL[1] = pose.legR[1] = 1.45
  pose.armL[1] = -0.2
  pose.armR[1] = 0.2
}

function setPose(p: Person, t: number) {
  restPose()
  const idle = Math.sin(t * 0.8 + p.seed)
  const carry = p.def.look.carry
  switch (p.act) {
    case 'walk':
    case 'queue':
    case 'stand':
    case 'chat':
    case 'guard':
    case 'mop': {
      const swing = Math.sin(p.phase) * p.moving
      pose.legL[0] = swing * 0.58
      pose.legR[0] = -swing * 0.58
      pose.legL[1] = Math.max(0, -Math.sin(p.phase)) * 0.8 * p.moving
      pose.legR[1] = Math.max(0, Math.sin(p.phase)) * 0.8 * p.moving
      pose.hip += Math.abs(Math.cos(p.phase)) * 0.028 * p.moving - 0.012 * p.moving
      pose.armL[0] = -swing * 0.48 + idle * 0.03
      pose.armR[0] = swing * 0.48 - idle * 0.03
      pose.armL[2] = pose.armR[2] = -0.2 - p.moving * 0.2
      // Weight shifts from foot to foot while waiting.
      if (p.moving < 0.05 && (p.act === 'queue' || p.act === 'stand')) {
        const shift = Math.sin(t * 0.45 + p.seed)
        pose.legL[0] += shift * 0.03
        pose.legR[0] -= shift * 0.03
      }
      if (p.act === 'guard') {
        // Hands clasped behind the back.
        pose.armL[0] = pose.armR[0] = 0.55
        pose.armL[1] = -0.05
        pose.armR[1] = 0.05
        pose.armL[2] = pose.armR[2] = -1.05
      }
      if (p.act === 'chat') {
        pose.armR[0] = -0.7 + Math.sin(t * 2.4 + p.seed) * 0.2
        pose.armR[2] = -1.1 + Math.sin(t * 3.1 + p.seed) * 0.25
      }
      if (p.act === 'mop') {
        // Both hands on the handle, and the whole figure rocking with each sweep.
        const sweep = Math.sin(t * 1.7 + p.seed)
        pose.lean = 0.14
        pose.armL[0] = -0.85 + sweep * 0.3
        pose.armR[0] = -0.55 + sweep * 0.3
        pose.armL[1] = 0.1
        pose.armR[1] = -0.1
        pose.armL[2] = pose.armR[2] = -0.75
      }
      if (carry && p.act !== 'mop' && p.act !== 'guard' && carry !== 'bag' && p.act !== 'chat') {
        // Whatever is in the hand is held up to be looked at, or tucked in close.
        const look = carry === 'phone' ? 1 : 0.7
        pose.armR[0] = THREE.MathUtils.lerp(pose.armR[0], -0.72, look)
        pose.armR[2] = THREE.MathUtils.lerp(pose.armR[2], -1.15, look) + idle * 0.03
      }
      break
    }
    case 'sit': {
      setSeated(SEAT_HEIGHT)
      pose.armL[0] = pose.armR[0] = -0.42
      pose.armL[2] = pose.armR[2] = -0.75
      if (carry) {
        pose.armR[0] = -0.75 + idle * 0.06
        pose.armR[2] = -1.2
      }
      // A look up every so often, and a foot tapping.
      pose.legL[1] += Math.max(0, Math.sin(t * 1.3 + p.seed)) * 0.05
      break
    }
    case 'teller': {
      setSeated(SEAT_HEIGHT + 0.03)
      // Typing for a while, then counting notes, then back again.
      const counting = THREE.MathUtils.smoothstep(Math.sin(t * 0.17 + p.seed), 0.35, 0.65)
      const type = Math.sin(t * 8.5 + p.seed)
      pose.lean = 0.06
      pose.armL[0] = -0.82 + type * 0.035 * (1 - counting)
      pose.armR[0] = -0.82 - type * 0.035 * (1 - counting) + Math.sin(t * 11 + p.seed) * 0.05 * counting
      pose.armL[2] = pose.armR[2] = -0.72 - counting * 0.25
      pose.armL[1] = -0.04
      pose.armR[1] = 0.04
      break
    }
    case 'write': {
      pose.lean = 0.42
      pose.armL[0] = -0.62
      pose.armR[0] = -0.68 + Math.sin(t * 5.2 + p.seed) * 0.05
      pose.armL[2] = pose.armR[2] = -1
      pose.armL[1] = 0.1
      pose.armR[1] = -0.1
      break
    }
  }
  // Talking overrides the free hand, faded in and out so that it never snaps.
  if (p.gesture > 0.001) {
    const wave = p.gesture
    pose.armL[0] = THREE.MathUtils.lerp(pose.armL[0], -0.8 + Math.sin(t * 2.8 + p.seed) * 0.22, wave)
    pose.armL[2] = THREE.MathUtils.lerp(pose.armL[2], -1.15 + Math.sin(t * 3.5 + p.seed) * 0.22, wave)
  }
}

interface Meshes {
  capsules: THREE.InstancedMesh
  spheres: THREE.InstancedMesh
  skirts: THREE.InstancedMesh
  carried: THREE.InstancedMesh
  shadows: THREE.InstancedMesh
}

function piece(x: number, y: number, z: number, sx: number, sy: number, sz: number) {
  chain.makeTranslation(x, y, z)
  step.makeScale(sx, sy, sz)
  chain.multiply(step)
  out.multiplyMatrices(body, chain)
}

/** A two-part limb from a joint, writing both capsules, and leaving the far end in `hand`. */
function limb(capsules: THREE.InstancedMesh, index: number, jx: number, jy: number, swing: number, side: number, bend: number, upper: number, lower: number, width: number) {
  chain.makeTranslation(jx, jy, 0)
  step.makeRotationZ(side)
  chain.multiply(step)
  step.makeRotationX(swing)
  chain.multiply(step)

  step.makeTranslation(0, -upper / 2, 0)
  out.multiplyMatrices(chain, step)
  step.makeScale(width, (upper / 2) * JOINT_OVERLAP, width)
  out.multiply(step)
  out.premultiply(body)
  capsules.setMatrixAt(index, out)

  step.makeTranslation(0, -upper, 0)
  chain.multiply(step)
  step.makeRotationX(bend)
  chain.multiply(step)

  step.makeTranslation(0, -lower / 2, 0)
  out.multiplyMatrices(chain, step)
  step.makeScale(width * 0.88, (lower / 2) * JOINT_OVERLAP, width * 0.88)
  out.multiply(step)
  out.premultiply(body)
  capsules.setMatrixAt(index + 1, out)

  step.makeTranslation(0, -lower, 0)
  hand.multiplyMatrices(body, chain).multiply(step)
}

/** Draws a sphere at the end of the limb just posed: a shoe or a hand. */
function endOfLimb(spheres: THREE.InstancedMesh, index: number, offsetZ: number, sx: number, sy: number, sz: number) {
  step.makeTranslation(0, 0, offsetZ)
  out.multiplyMatrices(hand, step)
  step.makeScale(sx, sy, sz)
  out.multiply(step)
  spheres.setMatrixAt(index, out)
}

function drawPerson(p: Person, i: number, t: number, m: Meshes) {
  const { look } = p.def
  setPose(p, t)
  const sway = p.act === 'stand' || p.act === 'queue' ? Math.sin(t * 0.7 + p.seed) * 0.02 : 0
  q1.setFromAxisAngle(up, p.yaw + sway)
  q2.setFromAxisAngle(xAxis, pose.lean)
  q1.multiply(q2)
  vPos.set(p.x, 0, p.z)
  vScale.setScalar(look.height)
  body.compose(vPos, q1, vScale)

  const hip = pose.hip
  const c = i * CAPSULES
  piece(0, hip + 0.3, 0, 0.33, 0.33, 0.2)
  m.capsules.setMatrixAt(c, out)
  piece(0, hip + 0.03, 0, 0.32, 0.13, 0.2)
  m.capsules.setMatrixAt(c + 1, out)
  piece(0, hip + 0.62, 0.005, 0.1, 0.08, 0.1)
  m.capsules.setMatrixAt(c + 10, out)

  const s = i * SPHERES
  // Heads turn on their own, a beat ahead of the shoulders.
  const glance = Math.sin(t * 0.31 + p.seed * 1.7) * 0.012
  piece(glance, hip + 0.76, 0.012, 0.23, 0.27, 0.25)
  m.spheres.setMatrixAt(s, out)
  piece(glance, hip + 0.8, -0.018, 0.25, 0.25, 0.26)
  m.spheres.setMatrixAt(s + 1, out)

  limb(m.capsules, c + 6, -0.09, hip, pose.legL[0], 0, pose.legL[1], THIGH, SHIN, LIMB_WIDTH * 1.25)
  endOfLimb(m.spheres, s + 2, 0.045, 0.105, 0.075, 0.24)
  limb(m.capsules, c + 8, 0.09, hip, pose.legR[0], 0, pose.legR[1], THIGH, SHIN, LIMB_WIDTH * 1.25)
  endOfLimb(m.spheres, s + 3, 0.045, 0.105, 0.075, 0.24)

  limb(m.capsules, c + 2, -0.2, hip + 0.53, pose.armL[0], pose.armL[1], pose.armL[2], UPPER_ARM, FOREARM, LIMB_WIDTH * 0.8)
  endOfLimb(m.spheres, s + 4, 0, 0.085, 0.1, 0.085)
  limb(m.capsules, c + 4, 0.2, hip + 0.53, pose.armR[0], pose.armR[1], pose.armR[2], UPPER_ARM, FOREARM, LIMB_WIDTH * 0.8)
  endOfLimb(m.spheres, s + 5, 0, 0.085, 0.1, 0.085)

  // Carried things ride on the right hand, whatever pose it is in.
  const carrying = look.carry
  if (carrying === 'mop') {
    piece(0.05, 0.72, 0.34, 0.035, 1.42, 0.035)
    m.carried.setMatrixAt(i, out)
  } else if (carrying) {
    const size = CARRY_SIZE[carrying]
    step.makeScale(size[0], size[1], size[2])
    out.multiplyMatrices(hand, step)
    m.carried.setMatrixAt(i, out)
  } else {
    m.carried.setMatrixAt(i, hidden)
  }

  if (look.dress && p.act !== 'sit' && p.act !== 'teller') {
    piece(0, hip - 0.3, 0, 0.5, 0.72, 0.4)
    m.skirts.setMatrixAt(i, out)
  } else {
    m.skirts.setMatrixAt(i, hidden)
  }

  // The hall's lighting makes no shadows of its own: this ties each figure to the floor.
  const size = p.act === 'sit' || p.act === 'teller' ? 1.1 : 0.95
  vPos.set(p.x, 0.012, p.z)
  vScale.set(size * look.height, size * look.height, 1)
  q1.setFromAxisAngle(xAxis, -Math.PI / 2)
  out.compose(vPos, q1, vScale)
  m.shadows.setMatrixAt(i, out)
}

function turnToward(p: Person, target: number, dt: number) {
  let delta = target - p.yaw
  while (delta > Math.PI) delta -= Math.PI * 2
  while (delta < -Math.PI) delta += Math.PI * 2
  // Eased, so that a turn begins and ends gently however large it is.
  p.yaw += delta * (1 - Math.exp(-dt * TURN_SPEED))
}

function stepPerson(p: Person, i: number, people: Person[], positions: Float32Array, px: number, pz: number, dt: number, t: number, still: boolean, m: Meshes) {
  const { def } = p
  const toX = px - p.x
  const toZ = pz - p.z
  const dist = Math.hypot(toX, toZ)
  p.talking = Math.max(0, p.talking - dt)
  p.gesture += ((p.talking > 0 ? 1 : 0) - p.gesture) * (1 - Math.exp(-dt * 5))

  // Where they want to be this frame, if anywhere.
  let targetX = p.x
  let targetZ = p.z
  let wantsToGo = false
  if (!still && p.talking === 0) {
    if (p.act === 'queue') {
      const stop = p.route[0]
      if (stop) {
        targetX = stop.x
        targetZ = stop.z
        wantsToGo = true
        if (Math.hypot(targetX - p.x, targetZ - p.z) < ARRIVED) p.route.shift()
      }
    } else if (def.path.length > 1) {
      const [tx, tz] = def.path[p.next]
      if (Math.hypot(tx - p.x, tz - p.z) < 0.14) p.next = (p.next + 1) % def.path.length
      targetX = def.path[p.next][0]
      targetZ = def.path[p.next][1]
      wantsToGo = true
    }
  }

  let wanted = 0
  const dx = targetX - p.x
  const dz = targetZ - p.z
  const d = Math.hypot(dx, dz)
  if (wantsToGo && d > 0.001) {
    const dirX = dx / d
    const dirZ = dz / d
    // Give way to the player, and to anyone just ahead on the same line.
    let blocked = dist < YIELD_DISTANCE && (toX * dirX + toZ * dirZ) / (dist || 1) > 0.35
    for (let j = 0; j < people.length && !blocked; j++) {
      if (j === i) continue
      const ax = people[j].x - p.x
      const az = people[j].z - p.z
      if (ax * ax + az * az < 0.6 && ax * dirX + az * dirZ > 0.2) blocked = people[j].def.path.length > 1 || people[j].act === 'queue' ? j < i : true
    }
    if (!blocked) wanted = (p.act === 'queue' ? QUEUE_WALK_SPEED : def.speed ?? 1) * Math.min(1, d / 0.4 + 0.25)
  }
  p.speed += (wanted - p.speed) * (1 - Math.exp(-dt * EASE_RATE))
  if (p.speed > 0.01 && d > 0.001) {
    const stride = Math.min(d, p.speed * dt)
    p.x += (dx / d) * stride
    p.z += (dz / d) * stride
    turnToward(p, Math.atan2(dx, dz), dt)
  }

  // However they got here, their legs follow the ground they covered: no feet sliding.
  const moved = Math.hypot(p.x - p.lastX, p.z - p.lastZ)
  p.lastX = p.x
  p.lastZ = p.z
  p.phase += (moved / (STRIDE_LENGTH * def.look.height)) * Math.PI
  p.moving += ((moved > 0.0004 ? 1 : 0) - p.moving) * (1 - Math.exp(-dt * 8))

  const seated = p.act === 'sit' || p.act === 'teller'
  if (!seated && moved <= 0.0004) {
    if (p.talking > 0 || (dist < NOTICE_DISTANCE && (p.act === 'stand' || p.act === 'chat' || p.act === 'guard'))) {
      turnToward(p, Math.atan2(toX, toZ), dt)
    } else if (p.act === 'queue') {
      const { back } = QUEUES[def.line ?? 0]
      turnToward(p, Math.atan2(-back[0], -back[1]), dt)
    } else if (def.yaw !== undefined) {
      turnToward(p, def.yaw, dt)
    }
  }

  positions[i * 2] = p.x
  positions[i * 2 + 1] = p.z
  drawPerson(p, i, t, m)
}

function startTalking(p: Person) {
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
    const y = (p.act === 'sit' || p.act === 'teller' ? 0.85 : 1.15) * p.def.look.height
    toPerson.set(p.x - camera.position.x, y - camera.position.y, p.z - camera.position.z).normalize()
    const aim = toPerson.dot(view)
    if (aim > bestAim) {
      bestAim = aim
      best = i
    }
  }
  return best
}

/** Everyone in the bank, built from simple shapes in five draw calls however many there are. */
export function BankCrowd({ q, onSpeech }: { q: BankQueries; onSpeech?: (speech: Speech) => void }) {
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
  const queues = useMemo(() => buildQueues(people), [people])
  const count = people.length
  const positions = useMemo(() => new Float32Array(count * 2), [count])
  const still = useMemo(() => reducedMotion(), [])
  const facing = useRef(-1)
  const time = useRef(0)

  const capsules = useRef<THREE.InstancedMesh>(null)
  const spheres = useRef<THREE.InstancedMesh>(null)
  const skirts = useRef<THREE.InstancedMesh>(null)
  const carried = useRef<THREE.InstancedMesh>(null)
  const shadows = useRef<THREE.InstancedMesh>(null)

  useEffect(() => {
    const color = new THREE.Color()
    people.forEach((p, i) => {
      const look = p.def.look
      const c = i * CAPSULES
      capsules.current?.setColorAt(c, color.set(p.shirt))
      capsules.current?.setColorAt(c + 1, color.set(look.dress ? p.shirt : look.trousers))
      for (const part of [2, 3, 4, 5]) capsules.current?.setColorAt(c + part, color.set(p.shirt))
      for (const part of [6, 7, 8, 9]) capsules.current?.setColorAt(c + part, color.set(look.trousers))
      capsules.current?.setColorAt(c + 10, color.set(p.skin))
      const s = i * SPHERES
      spheres.current?.setColorAt(s, color.set(p.skin))
      spheres.current?.setColorAt(s + 1, color.set(p.hair))
      spheres.current?.setColorAt(s + 2, color.set('#1a1512'))
      spheres.current?.setColorAt(s + 3, color.set('#1a1512'))
      spheres.current?.setColorAt(s + 4, color.set(p.skin))
      spheres.current?.setColorAt(s + 5, color.set(p.skin))
      skirts.current?.setColorAt(i, color.set(look.trousers))
      carried.current?.setColorAt(i, color.set(look.carry ? CARRY_COLOUR[look.carry] : '#000'))
    })
    for (const mesh of [capsules, spheres, skirts, carried]) if (mesh.current?.instanceColor) mesh.current.instanceColor.needsUpdate = true
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
    const t = time.current
    if (!capsules.current || !spheres.current || !skirts.current || !carried.current || !shadows.current) return
    const m: Meshes = { capsules: capsules.current, spheres: spheres.current, skirts: skirts.current, carried: carried.current, shadows: shadows.current }

    if (!still) {
      queues.forEach((queue, line) => {
        const front = queue.members[0]
        // The clock only runs once they are at the window, and not while they talk to the player.
        if (!front || front.route.length || front.talking > 0) return
        queue.serving -= dt
        if (queue.serving <= 0) {
          advanceQueue(queue, line)
          queue.serving = SERVE_MIN_S + ((t * 7.13 + line) % 1) * SERVE_EXTRA_S
        }
      })
    }

    for (let i = 0; i < people.length; i++) stepPerson(people[i], i, people, positions, camera.position.x, camera.position.z, dt, t, still, m)
    for (const mesh of [m.capsules, m.spheres, m.skirts, m.carried, m.shadows]) mesh.instanceMatrix.needsUpdate = true

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
      <instancedMesh ref={capsules} args={[undefined, undefined, count * CAPSULES]} frustumCulled={false}>
        <capsuleGeometry args={[0.5, 1, 4, 10]} />
        <meshStandardMaterial roughness={0.78} />
      </instancedMesh>
      <instancedMesh ref={spheres} args={[undefined, undefined, count * SPHERES]} frustumCulled={false}>
        <sphereGeometry args={[0.5, 14, 10]} />
        <meshStandardMaterial roughness={0.72} />
      </instancedMesh>
      <instancedMesh ref={skirts} args={[undefined, undefined, count]} frustumCulled={false}>
        <cylinderGeometry args={[0.32, 0.5, 1, 12]} />
        <meshStandardMaterial roughness={0.85} />
      </instancedMesh>
      <instancedMesh ref={carried} args={[undefined, undefined, count]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.55} />
      </instancedMesh>
      <instancedMesh ref={shadows} args={[undefined, undefined, count]} frustumCulled={false} raycast={() => null}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={shadowTexture()} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-2} />
      </instancedMesh>
    </group>
  )
}
