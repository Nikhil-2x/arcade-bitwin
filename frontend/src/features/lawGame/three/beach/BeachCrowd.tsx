import { useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useLawGame } from '../../store/useLawGame.ts'
import type { Suspect } from '../../types.ts'
import type { Speech } from '../../ui/useSpeech.ts'
import { BEACH_PEOPLE, type Activity, type Carry, type PersonDef } from './beachCrowdData.ts'
import { COURT, KICK_AREA } from './beachLayout.ts'
import type { BeachQueries } from './BeachQueries.ts'
import { shadowTexture } from './beachTextures.ts'

const TALK_REACH = 2.1
const TALK_AIM = 0.82
const TALK_HOLD_S = 5
const YIELD_DISTANCE = 1.15
const TURN_SPEED = 6
const STRIDE_LENGTH = 0.72
/** Standing and sitting people notice the player from here, and wave. */
const NOTICE_DISTANCE = 4.2
const WAVE_S = 1.8
const WAVE_AGAIN_S = 24
/** Distant swimmers wave back from further off: they cannot be walked up to. */
const FAR_WAVE_DISTANCE = 16

const THIGH = 0.43
const SHIN = 0.43
const UPPER_ARM = 0.29
const FOREARM = 0.27
const LIMB_WIDTH = 0.115
const HIP_HEIGHT = THIGH + SHIN
/** Stretched capsules taper at their ends: without an overlap, every joint shows a gap. */
const JOINT_OVERLAP = 1.28
const LOUNGER_REST = 0.47

const KICK_REACH = 0.95
const KICK_DISTANCE = 7.5
const BALL_RADIUS = 0.17
const VOLLEY_RADIUS = 0.11
const KIDS_SPEED = 2.4

/** Capsules and spheres per person, in the order they sit in the instanced meshes. */
const CAPSULES = 10
const SPHERES = 3

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

interface Person {
  def: PersonDef
  act: Activity
  name: string
  say: Speech
  x: number
  z: number
  /** Where they were last frame, so a stride can be read off however they got here. */
  lastX: number
  lastZ: number
  yaw: number
  next: number
  phase: number
  moving: number
  talking: number
  waving: number
  waveCooldown: number
  /** 0..1, driven by GSAP: the height of a jump, or the swing of a kick. */
  strike: number
  /** Their steps are being driven from a GSAP timeline. */
  scripted: boolean
  posed: boolean
  seed: number
  skin: string
  hair: string
  shirt: string
}

function buildPeople(suspects: readonly Suspect[], culpritId: string | undefined, phase: string, alibi: string | undefined): Person[] {
  const list: Person[] = []
  BEACH_PEOPLE.forEach((def, i) => {
    const suspect = def.suspectId ? suspects.find((s) => s.id === def.suspectId) : undefined
    // While hiding, the culprit is the player. Once the detective arrives they are back on the beach.
    if (suspect && suspect.id === culpritId && phase !== 'search') return
    const line = suspect ? (suspect.id === culpritId && alibi ? alibi : suspect.statement) : def.role.line
    const name = suspect ? `${suspect.name}, ${suspect.role}` : def.role.name
    const skin = suspect?.skin ?? def.look.skin
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
      talking: 0,
      waving: 0,
      waveCooldown: i * 0.7,
      strike: 0,
      scripted: def.act === 'kick',
      posed: false,
      seed: i * 2.39,
      skin,
      hair: suspect?.hair ?? def.look.hair,
      shirt: suspect?.shirt ?? def.look.shirt ?? skin,
    })
  })
  return list
}

const CARRY_COLOUR: Record<Carry, string> = {
  drink: '#ff8f3a',
  book: '#2f6f9e',
  phone: '#15171c',
  surfboard: '#f4c04e',
  icecream: '#fff2c9',
  tray: '#3fa7c9',
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

/** The joint angles a person takes this frame. */
const pose = {
  hip: HIP_HEIGHT,
  pitch: 0,
  armL: [0, -0.1, -0.15],
  armR: [0, 0.1, -0.15],
  legL: [0, 0],
  legR: [0, 0],
}

function restPose() {
  pose.hip = HIP_HEIGHT
  pose.pitch = 0
  pose.armL[0] = 0
  pose.armL[1] = -0.1
  pose.armL[2] = -0.15
  pose.armR[0] = 0
  pose.armR[1] = 0.1
  pose.armR[2] = -0.15
  pose.legL[0] = pose.legL[1] = 0
  pose.legR[0] = pose.legR[1] = 0
}

function setPose(p: Person, t: number) {
  restPose()
  const idle = Math.sin(t * 0.8 + p.seed)
  switch (p.act) {
    case 'walk':
    case 'kick':
    case 'stand':
    case 'chat':
    case 'selfie':
    case 'volley': {
      const swing = Math.sin(p.phase) * p.moving
      const lift = p.act === 'kick' ? 0.9 : 0.62
      pose.legL[0] = swing * lift
      pose.legR[0] = -swing * lift
      pose.legL[1] = Math.max(0, -Math.sin(p.phase)) * 0.8 * p.moving
      pose.legR[1] = Math.max(0, Math.sin(p.phase)) * 0.8 * p.moving
      pose.hip += Math.abs(Math.cos(p.phase)) * 0.03 * p.moving
      pose.armL[0] = -swing * 0.5 + idle * 0.03
      pose.armR[0] = swing * 0.5 - idle * 0.03
      if (p.act === 'chat') {
        pose.armR[0] = -0.7 + Math.sin(t * 2.4 + p.seed) * 0.2
        pose.armR[2] = -1.1 + Math.sin(t * 3.1 + p.seed) * 0.25
      }
      if (p.act === 'selfie') {
        pose.armR[0] = -1.75
        pose.armR[1] = 0.25
        pose.armR[2] = -0.25
        pose.armL[1] = -0.55 + idle * 0.05
        pose.armL[2] = -1.3
      }
      if (p.act === 'volley') {
        // A low ready stance, springing up with both arms when the ball arrives.
        const ready = 1 - p.strike
        pose.hip += p.strike * 0.34 - ready * 0.08
        pose.legL[0] = -0.34 * ready
        pose.legR[0] = -0.34 * ready
        pose.legL[1] = 0.68 * ready
        pose.legR[1] = 0.68 * ready
        pose.armL[0] = -0.8 * ready - 2.9 * p.strike
        pose.armR[0] = -0.8 * ready - 2.9 * p.strike
        pose.armL[2] = pose.armR[2] = -0.3 * ready - 0.1
      }
      if (p.act === 'kick' && p.strike > 0) {
        pose.legR[0] = -1.25 * p.strike
        pose.legR[1] = 0.25 * (1 - p.strike)
        pose.armL[0] = -0.8 * p.strike
      }
      break
    }
    case 'sunbathe': {
      pose.pitch = -Math.PI / 2
      // Now and then one knee comes up, or an arm goes behind the head.
      const knee = THREE.MathUtils.smoothstep(Math.sin(t * 0.21 + p.seed), 0.45, 0.85)
      pose.legL[0] = -0.75 * knee
      pose.legL[1] = 1.5 * knee
      const reach = THREE.MathUtils.smoothstep(Math.sin(t * 0.13 + p.seed * 1.7), 0.2, 0.7)
      pose.armR[0] = -2.75 * reach
      pose.armR[2] = -1.6 * reach - 0.1
      pose.armL[1] = -0.2
      if (p.def.look.carry === 'book') {
        pose.armL[0] = pose.armR[0] = -1.15
        pose.armL[2] = pose.armR[2] = -1.25
      }
      break
    }
    case 'sit':
    case 'lookout': {
      const high = p.act === 'lookout'
      pose.hip = high ? 0.47 : 0.15
      pose.legL[0] = pose.legR[0] = high ? -1.45 : -1.05
      pose.legL[1] = pose.legR[1] = high ? 1.45 : 1.55
      pose.armL[0] = pose.armR[0] = high ? -0.4 : 0.55
      pose.armL[1] = -0.22
      pose.armR[1] = 0.22
      pose.armL[2] = pose.armR[2] = high ? -0.9 : -0.1
      if (p.def.look.carry) {
        pose.armR[0] = -0.9 + Math.sin(t * 0.7 + p.seed) * 0.12
        pose.armR[2] = -1.35
      }
      if (high) {
        // Scanning the water, a hand up against the glare.
        const shade = THREE.MathUtils.smoothstep(Math.sin(t * 0.4), 0, 0.5)
        pose.armR[0] = -0.4 - 2 * shade
        pose.armR[2] = -0.9 - 0.9 * shade
      }
      break
    }
    case 'dance': {
      const beat = t * 4.8 + p.seed
      pose.hip += Math.abs(Math.sin(beat)) * 0.07 - 0.04
      pose.legL[0] = -0.2 - Math.max(0, Math.sin(beat)) * 0.45
      pose.legL[1] = 0.35 + Math.max(0, Math.sin(beat)) * 0.75
      pose.legR[0] = -0.2 - Math.max(0, -Math.sin(beat)) * 0.45
      pose.legR[1] = 0.35 + Math.max(0, -Math.sin(beat)) * 0.75
      pose.armL[0] = -2.2 + Math.sin(beat * 0.5) * 0.7
      pose.armR[0] = -2.2 - Math.sin(beat * 0.5) * 0.7
      pose.armL[1] = -0.35
      pose.armR[1] = 0.35
      pose.armL[2] = pose.armR[2] = -0.8 + Math.sin(beat) * 0.3
      break
    }
    case 'build': {
      pose.hip = 0.4
      pose.pitch = 0.38
      pose.legL[0] = pose.legR[0] = -0.05
      pose.legL[1] = pose.legR[1] = 1.55
      pose.armL[0] = -1.05 + Math.sin(t * 3.2 + p.seed) * 0.28
      pose.armR[0] = -1.05 - Math.sin(t * 3.2 + p.seed) * 0.28
      pose.armL[2] = pose.armR[2] = -0.4
      break
    }
    case 'swim': {
      pose.pitch = 1.32
      const stroke = p.phase * 0.75
      pose.armL[0] = -stroke
      pose.armR[0] = -stroke - Math.PI
      pose.armL[2] = pose.armR[2] = -0.25
      const flutter = Math.sin(t * 7 + p.seed) * 0.22
      pose.legL[0] = flutter
      pose.legR[0] = -flutter
      break
    }
    case 'float': {
      pose.armL[1] = -1.25
      pose.armR[1] = 1.25
      pose.armL[2] = pose.armR[2] = -0.4 + idle * 0.15
      const kick = Math.sin(t * 0.9 + p.seed) * 0.3
      pose.legL[0] = kick
      pose.legR[0] = -kick
      break
    }
  }
  if (p.waving > 0) {
    const up = Math.min(1, Math.min(p.waving, WAVE_S - p.waving) * 5)
    pose.armR[0] *= 1 - up
    pose.armR[1] = 0.1 + up * 2.55
    pose.armR[2] = -0.15 - up * 0.2 + Math.sin(t * 10 + p.seed) * 0.22 * up
  }
}

interface Meshes {
  capsules: THREE.InstancedMesh
  spheres: THREE.InstancedMesh
  skirts: THREE.InstancedMesh
  carried: THREE.InstancedMesh
  rings: THREE.InstancedMesh
  shadows: THREE.InstancedMesh
}

/** Scale `sx, sy, sz`, translated to x, y, z in body space. */
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

function drawPerson(p: Person, i: number, t: number, y: number, m: Meshes) {
  const { look } = p.def
  setPose(p, t)
  const sway = p.act === 'stand' || p.act === 'chat' ? Math.sin(t * 0.8 + p.seed) * 0.03 : 0
  q1.setFromAxisAngle(up, p.yaw + sway + (p.act === 'dance' ? Math.sin(t * 0.9 + p.seed) * 0.8 : 0))
  q2.setFromAxisAngle(xAxis, pose.pitch)
  q1.multiply(q2)
  vPos.set(p.x, y, p.z)
  vScale.setScalar(look.height)
  body.compose(vPos, q1, vScale)

  const hip = pose.hip
  const c = i * CAPSULES
  piece(0, hip + 0.3, 0, 0.33, 0.33, 0.2)
  m.capsules.setMatrixAt(c, out)
  piece(0, hip + 0.03, 0, 0.32, 0.13, 0.2)
  m.capsules.setMatrixAt(c + 1, out)

  const s = i * SPHERES
  piece(0, hip + 0.76, 0.012, 0.23, 0.27, 0.25)
  m.spheres.setMatrixAt(s, out)
  piece(0, hip + 0.8, -0.018, 0.25, 0.25, 0.26)
  m.spheres.setMatrixAt(s + 1, out)
  if (look.hat) {
    piece(0, hip + 0.88, 0, 0.58, 0.09, 0.58)
    m.spheres.setMatrixAt(s + 2, out)
  } else {
    m.spheres.setMatrixAt(s + 2, hidden)
  }

  limb(m.capsules, c + 6, -0.09, hip, pose.legL[0], 0, pose.legL[1], THIGH, SHIN, LIMB_WIDTH * 1.25)
  limb(m.capsules, c + 8, 0.09, hip, pose.legR[0], 0, pose.legR[1], THIGH, SHIN, LIMB_WIDTH * 1.25)

  limb(m.capsules, c + 2, -0.2, hip + 0.53, pose.armL[0], pose.armL[1], pose.armL[2], UPPER_ARM, FOREARM, LIMB_WIDTH * 0.8)
  limb(m.capsules, c + 4, 0.2, hip + 0.53, pose.armR[0], pose.armR[1], pose.armR[2], UPPER_ARM, FOREARM, LIMB_WIDTH * 0.8)

  // Carried things ride on the right hand, whatever pose it is in.
  const carrying = look.carry
  if (carrying === 'surfboard') {
    piece(0.32, hip + 0.1, 0, 0.09, 1.05, 0.28)
    m.carried.setMatrixAt(i, out)
  } else if (carrying) {
    const size = carrying === 'book' ? [0.2, 0.26, 0.04] : carrying === 'tray' ? [0.34, 0.14, 0.26] : carrying === 'phone' ? [0.075, 0.15, 0.015] : [0.07, 0.14, 0.07]
    step.makeScale(size[0], size[1], size[2])
    out.multiplyMatrices(hand, step)
    m.carried.setMatrixAt(i, out)
  } else {
    m.carried.setMatrixAt(i, hidden)
  }

  if (look.dress && (p.act === 'walk' || p.act === 'stand' || p.act === 'chat' || p.act === 'dance')) {
    piece(0, hip - 0.22, 0, 0.5, 0.56, 0.4)
    m.skirts.setMatrixAt(i, out)
  } else {
    m.skirts.setMatrixAt(i, hidden)
  }

  if (p.act === 'float') {
    piece(0, hip + 0.12, 0, 0.5, 0.5, 0.5)
    m.rings.setMatrixAt(i, out)
  } else {
    m.rings.setMatrixAt(i, hidden)
  }
}

function shadowOf(p: Person, i: number, ground: number, m: Meshes) {
  const inWater = p.act === 'swim' || p.act === 'float' || p.act === 'lookout'
  if (inWater) {
    m.shadows.setMatrixAt(i, hidden)
    return
  }
  // Long towards the west, as the baked shadows of the parasols fall. Lifted with a jump, it would lie.
  const size = p.act === 'sunbathe' ? 1.8 : p.act === 'sit' || p.act === 'build' ? 1.05 : 0.95
  const lift = p.act === 'sunbathe' ? 0 : 0.2
  vPos.set(p.x - lift, ground + 0.035, p.z + lift * 0.3)
  vScale.set(size * p.def.look.height, 1, size * p.def.look.height)
  q1.identity()
  out.compose(vPos, q1, vScale)
  m.shadows.setMatrixAt(i, out)
}

function turnToward(p: Person, target: number, dt: number) {
  let delta = target - p.yaw
  while (delta > Math.PI) delta -= Math.PI * 2
  while (delta < -Math.PI) delta += Math.PI * 2
  p.yaw += delta * Math.min(1, dt * TURN_SPEED)
}

function stepPerson(p: Person, i: number, people: Person[], positions: Float32Array, q: BeachQueries, px: number, pz: number, dt: number, t: number, still: boolean, m: Meshes) {
  const { def } = p
  const toX = px - p.x
  const toZ = pz - p.z
  const dist = Math.hypot(toX, toZ)
  p.talking = Math.max(0, p.talking - dt)
  p.waving = Math.max(0, p.waving - dt)
  p.waveCooldown = Math.max(0, p.waveCooldown - dt)

  if (def.path.length > 1 && !still && p.talking === 0 && !p.scripted) {
    const [tx, tz] = def.path[p.next]
    const dx = tx - p.x
    const dz = tz - p.z
    const d = Math.hypot(dx, dz)
    if (d < 0.1) {
      p.next = (p.next + 1) % def.path.length
    } else {
      const dirX = dx / d
      const dirZ = dz / d
      // Give way to the player, and to anyone just ahead on the same line.
      let blocked = dist < YIELD_DISTANCE && (toX * dirX + toZ * dirZ) / (dist || 1) > 0.35
      for (let j = 0; j < i && !blocked; j++) {
        const ax = people[j].x - p.x
        const az = people[j].z - p.z
        if (ax * ax + az * az < 0.72 && ax * dirX + az * dirZ > 0) blocked = true
      }
      if (!blocked) {
        const stride = Math.min(d, (def.speed ?? 1) * dt)
        p.x += dirX * stride
        p.z += dirZ * stride
        turnToward(p, Math.atan2(dirX, dirZ), dt)
      }
    }
  }

  // However they moved, by the loop above or a timeline, their legs follow.
  const moved = Math.hypot(p.x - p.lastX, p.z - p.lastZ)
  p.lastX = p.x
  p.lastZ = p.z
  const moving = moved > 0.0005
  p.phase += p.act === 'swim' ? dt * 3 : (moved / (STRIDE_LENGTH * def.look.height)) * Math.PI
  p.moving += ((moving ? 1 : 0) - p.moving) * Math.min(1, dt * 8)

  const stationary = !moving && def.path.length === 1
  const canWave = p.act !== 'sunbathe' && p.act !== 'build' && p.act !== 'volley' && p.act !== 'kick' && p.act !== 'lookout'
  const noticeAt = p.act === 'swim' || p.act === 'float' ? FAR_WAVE_DISTANCE : NOTICE_DISTANCE
  if (canWave && p.waveCooldown === 0 && dist < noticeAt) {
    p.waving = WAVE_S
    p.waveCooldown = WAVE_AGAIN_S
  }
  if (p.talking > 0 || (stationary && dist < NOTICE_DISTANCE && p.act !== 'sunbathe' && p.act !== 'sit' && p.act !== 'lookout' && p.act !== 'volley' && p.act !== 'build')) {
    if (p.act !== 'sunbathe') turnToward(p, Math.atan2(toX, toZ), dt)
  }

  positions[i * 2] = p.x
  positions[i * 2 + 1] = p.z

  const inWater = p.act === 'swim' || p.act === 'float'
  const ground = q.ground.heightAt(p.x, p.z)
  const foot = inWater
    ? (p.act === 'swim' ? -0.32 : -1.02) * def.look.height + Math.sin(t * 1.1 + p.seed) * 0.05
    : (def.y ?? 0) + ground + (p.act === 'sunbathe' ? LOUNGER_REST : 0)

  // Sunbathers barely move, and there are many: when nobody is near, every few frames will do.
  if (p.act === 'sunbathe' && p.posed && dist > 22 && (Math.floor(t * 12) + i) % 6 !== 0) return
  p.posed = true
  let x = p.x
  let z = p.z
  if (p.act === 'sunbathe') {
    // The origin is at the feet: the body lies back from there along the lounger.
    const reach = 0.82 * def.look.height
    x += Math.sin(p.yaw) * reach
    z += Math.cos(p.yaw) * reach
  }
  const saveX = p.x
  const saveZ = p.z
  p.x = x
  p.z = z
  drawPerson(p, i, t, foot, m)
  p.x = saveX
  p.z = saveZ
  shadowOf(p, i, ground, m)
}

function stepCrowd(people: Person[], positions: Float32Array, q: BeachQueries, px: number, pz: number, dt: number, t: number, still: boolean, m: Meshes) {
  for (let i = 0; i < people.length; i++) stepPerson(people[i], i, people, positions, q, px, pz, dt, t, still, m)
}

function settleKids(people: Person[]) {
  for (const p of people) if (p.act === 'kick') p.strike = 0
}

function startTalking(p: Person) {
  p.talking = TALK_HOLD_S
  p.waving = WAVE_S
}

/** Who the player is looking at, if they are close enough to talk to. */
function nearestFaced(people: Person[], camera: THREE.Camera, q: BeachQueries) {
  camera.getWorldDirection(view)
  let best = -1
  let bestAim = TALK_AIM
  for (let i = 0; i < people.length; i++) {
    const p = people[i]
    const d = Math.hypot(camera.position.x - p.x, camera.position.z - p.z)
    if (d >= TALK_REACH || d < 0.01) continue
    const low = p.act === 'sunbathe' || p.act === 'sit' || p.act === 'build'
    const y = q.ground.heightAt(p.x, p.z) + (low ? 0.5 : 1.1 * p.def.look.height)
    toPerson.set(p.x - camera.position.x, y - camera.position.y, p.z - camera.position.z).normalize()
    const aim = toPerson.dot(view)
    if (aim > bestAim) {
      bestAim = aim
      best = i
    }
  }
  return best
}

/** A ball on a GSAP arc: flat across, up and over in height, as a thrown thing moves. */
function arc(ball: THREE.Object3D, toX: number, toZ: number, toY: number, height: number, seconds: number) {
  const peak = Math.max(ball.position.y, toY) + height
  return gsap
    .timeline()
    .to(ball.position, { x: toX, z: toZ, duration: seconds, ease: 'none' }, 0)
    .to(ball.position, { y: peak, duration: seconds / 2, ease: 'sine.out' }, 0)
    .to(ball.position, { y: toY, duration: seconds / 2, ease: 'sine.in' }, seconds / 2)
}

/** The net rally: each player goes up for the ball just as it arrives. */
function runRally(players: Person[], ball: THREE.Object3D, q: BeachQueries) {
  if (players.length < 2) return
  const handHeight = (p: Person) => q.ground.heightAt(p.x, p.z) + 2.05 * p.def.look.height
  ball.position.set(players[0].x, handHeight(players[0]), players[0].z)
  let at = 0
  // Crosses the net every time: the first half of the team plays the second half.
  const half = Math.floor(players.length / 2)
  const hit = () => {
    const from = players[at]
    const across = at < half ? half + ((at + 1) % (players.length - half)) : (at + 1) % half
    const to = players[across]
    const seconds = 1.05 + Math.abs(Math.sin(at * 12.9 + ball.position.x)) * 0.35
    gsap.timeline({ onComplete: hit }).add(arc(ball, to.x, to.z, handHeight(to), 2.1, seconds), 0)
      .to(to, { strike: 1, duration: 0.2, ease: 'power2.out' }, seconds - 0.2)
      .to(to, { strike: 0, duration: 0.42, ease: 'sine.inOut' }, seconds)
    gsap.to(from, { strike: 0, duration: 0.3, overwrite: 'auto' })
    at = across
  }
  hit()
}

const THANKS = ['Whoa, nice kick! Again, again!', 'Hey, that was mine! Good one though.', 'Not towards the water, okay? Grandpa says the red flags mean no.']

export function BeachCrowd({ q, onSpeech }: { q: BeachQueries; onSpeech?: (speech: Speech) => void }) {
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
  const nextThanks = useRef(0)
  const ballBusy = useRef(false)
  const kickNext = useRef<(() => void) | null>(null)
  /** The kid on their way to the ball: called off if the player gets there first. */
  const kidRun = useRef<gsap.core.Timeline | null>(null)

  const capsules = useRef<THREE.InstancedMesh>(null)
  const spheres = useRef<THREE.InstancedMesh>(null)
  const skirts = useRef<THREE.InstancedMesh>(null)
  const carried = useRef<THREE.InstancedMesh>(null)
  const rings = useRef<THREE.InstancedMesh>(null)
  const shadows = useRef<THREE.InstancedMesh>(null)
  const volleyball = useRef<THREE.Mesh>(null)
  const kickBall = useRef<THREE.Group>(null)

  useEffect(() => {
    const color = new THREE.Color()
    people.forEach((p, i) => {
      const look = p.def.look
      const c = i * CAPSULES
      capsules.current?.setColorAt(c, color.set(p.shirt))
      capsules.current?.setColorAt(c + 1, color.set(look.shorts))
      for (const part of [2, 3, 4, 5, 7, 9]) capsules.current?.setColorAt(c + part, color.set(p.skin))
      for (const part of [6, 8]) capsules.current?.setColorAt(c + part, color.set(look.dress ? look.shorts : p.skin))
      const s = i * SPHERES
      spheres.current?.setColorAt(s, color.set(p.skin))
      spheres.current?.setColorAt(s + 1, color.set(p.hair))
      spheres.current?.setColorAt(s + 2, color.set('#e8d9a8'))
      skirts.current?.setColorAt(i, color.set(look.shorts))
      carried.current?.setColorAt(i, color.set(look.carry ? CARRY_COLOUR[look.carry] : '#000'))
      rings.current?.setColorAt(i, color.set(i % 2 ? '#f4c04e' : '#ec6a5c'))
    })
    for (const mesh of [capsules, spheres, skirts, carried, rings]) if (mesh.current?.instanceColor) mesh.current.instanceColor.needsUpdate = true
  }, [people])

  useEffect(() => {
    q.setPeople(positions, count)
    return () => {
      q.setPeople(new Float32Array(0), 0)
      q.setTalkTarget(null, null)
    }
  }, [q, positions, count])

  // Timelines belong to GSAP: rally and kickabout run on until the screen goes, then all of it is torn down.
  useEffect(() => {
    const ball = kickBall.current
    const net = volleyball.current
    if (!ball || !net) return
    const ctx = gsap.context(() => {
      const start = [KICK_AREA[0], KICK_AREA[1]]
      ball.position.set(start[0], q.ground.heightAt(start[0], start[1]) + BALL_RADIUS, start[1])
      if (still) {
        net.position.set(COURT[0], q.ground.heightAt(COURT[0], COURT[1]) + VOLLEY_RADIUS, COURT[1] + 1.5)
        return
      }
      runRally(people.filter((p) => p.act === 'volley'), net, q)

      const kids = people.filter((p) => p.act === 'kick')
      let last = 0
      const kickRound = () => {
        if (ballBusy.current || !kids.length) return
        last = (last + 1) % kids.length
        const kid = kids[last]
        const tx = ball.position.x - 0.32
        const tz = ball.position.z - 0.1
        const run = Math.hypot(tx - kid.x, tz - kid.z) / KIDS_SPEED
        kid.yaw = Math.atan2(tx - kid.x, tz - kid.z)
        gsap.killTweensOf(kid)
        kidRun.current = gsap
          .timeline()
          .to(kid, { x: tx, z: tz, duration: Math.max(0.2, run), ease: 'sine.inOut' })
          .to(kid, { strike: 1, duration: 0.14, ease: 'power2.out' })
          .call(() => {
            let angle = Math.random() * Math.PI * 2
            let x = ball.position.x
            let z = ball.position.z
            // Keeps the game on the sand, and away from the deck's edges.
            for (let tries = 0; tries < 8; tries++) {
              const r = 2.5 + Math.random() * 3.5
              const cx = KICK_AREA[0] + Math.cos(angle) * r
              const cz = KICK_AREA[1] + Math.sin(angle) * r
              if (q.ground.isWalkable(cx, cz)) {
                x = cx
                z = cz
                break
              }
              angle += 1
            }
            // Only one kick at a time: the ball is claimed until it lands.
            ballBusy.current = true
            launchBall(ball, x, z, q, 1.3, () => {
              ballBusy.current = false
              gsap.delayedCall(0.3, kickRound)
            })
          })
          .to(kid, { strike: 0, duration: 0.25, ease: 'sine.out' })
      }
      kickNext.current = kickRound
      gsap.delayedCall(1, kickRound)
    })
    return () => {
      kickNext.current = null
      ctx.revert()
    }
  }, [people, q, still])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    time.current += dt
    const t = time.current
    const m: Meshes = { capsules: capsules.current!, spheres: spheres.current!, skirts: skirts.current!, carried: carried.current!, rings: rings.current!, shadows: shadows.current! }
    if (!m.capsules) return
    const px = camera.position.x
    const pz = camera.position.z
    stepCrowd(people, positions, q, px, pz, dt, t, still, m)
    for (const mesh of [m.capsules, m.spheres, m.skirts, m.carried, m.rings, m.shadows]) mesh.instanceMatrix.needsUpdate = true

    // Walk into the ball and it goes where you are looking.
    const ball = kickBall.current
    if (ball && !ballBusy.current && document.pointerLockElement && q.drone.blend <= 0) {
      const d = Math.hypot(ball.position.x - px, ball.position.z - pz)
      if (d < KICK_REACH) {
        camera.getWorldDirection(view)
        const flat = Math.hypot(view.x, view.z) || 1
        let length = KICK_DISTANCE
        let x = ball.position.x
        let z = ball.position.z
        while (length > 1.5) {
          x = ball.position.x + (view.x / flat) * length
          z = ball.position.z + (view.z / flat) * length
          if (q.ground.isWalkable(x, z)) break
          length -= 1
          x = ball.position.x
          z = ball.position.z
        }
        kidRun.current?.kill()
        settleKids(people)
        ballBusy.current = true
        launchBall(ball, x, z, q, 2.2, () => {
          ballBusy.current = false
          gsap.delayedCall(0.8, () => kickNext.current?.())
        })
        if (t > nextThanks.current) {
          nextThanks.current = t + 20
          const kid = people.find((p) => p.act === 'kick')
          if (kid) speech.current?.({ name: kid.name, text: THANKS[Math.floor(t) % THANKS.length] })
        }
      }
    }

    const best = nearestFaced(people, camera, q)
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
        <meshStandardMaterial roughness={0.72} />
      </instancedMesh>
      <instancedMesh ref={spheres} args={[undefined, undefined, count * SPHERES]} frustumCulled={false}>
        <sphereGeometry args={[0.5, 14, 10]} />
        <meshStandardMaterial roughness={0.75} />
      </instancedMesh>
      <instancedMesh ref={skirts} args={[undefined, undefined, count]} frustumCulled={false}>
        <cylinderGeometry args={[0.32, 0.5, 1, 12]} />
        <meshStandardMaterial roughness={0.85} />
      </instancedMesh>
      <instancedMesh ref={carried} args={[undefined, undefined, count]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.5} />
      </instancedMesh>
      <instancedMesh ref={rings} args={[undefined, undefined, count]} frustumCulled={false}>
        <torusGeometry args={[0.62, 0.2, 10, 20]} />
        <meshStandardMaterial roughness={0.4} />
      </instancedMesh>
      <instancedMesh ref={shadows} args={[undefined, undefined, count]} frustumCulled={false} raycast={() => null} renderOrder={0}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={shadowTexture()} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-2} />
      </instancedMesh>
      <mesh ref={volleyball}>
        <sphereGeometry args={[VOLLEY_RADIUS, 16, 12]} />
        <meshStandardMaterial color="#f7f1d8" roughness={0.45} />
      </mesh>
      <group ref={kickBall}>
        {['#ec6a5c', '#f2efe6', '#3fa7c9', '#f4c04e'].map((colour, i) => (
          <mesh key={colour} rotation={[0, (i * Math.PI) / 2, 0]}>
            <sphereGeometry args={[BALL_RADIUS, 12, 12, 0, Math.PI / 2]} />
            <meshStandardMaterial color={colour} roughness={0.35} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/** Up and over to the target, a smaller hop or two, a roll to rest: spinning the whole way. */
function launchBall(ball: THREE.Object3D, x: number, z: number, q: BeachQueries, height: number, done: () => void) {
  const fromX = ball.position.x
  const fromZ = ball.position.z
  const distance = Math.hypot(x - fromX, z - fromZ)
  const seconds = THREE.MathUtils.clamp(0.45 + distance * 0.11, 0.5, 1.4)
  const rest = (px: number, pz: number) => q.ground.heightAt(px, pz) + BALL_RADIUS
  // Past the landing, only as far as the ground carries on.
  const hopX = x + ((x - fromX) / (distance || 1)) * 0.9
  const hopZ = z + ((z - fromZ) / (distance || 1)) * 0.9
  const hops = q.ground.isWalkable(hopX, hopZ)
  const endX = hops ? hopX : x
  const endZ = hops ? hopZ : z
  const spin = ball.rotation
  const line = gsap.timeline({ onComplete: done })
  line.add(arc(ball, x, z, rest(x, z), height, seconds), 0)
  line.add(arc(ball, endX, endZ, rest(endX, endZ), height * 0.22, 0.42), seconds)
  line.to(spin, { x: spin.x + distance * 1.5, y: spin.y + distance * 0.5, duration: seconds + 0.42, ease: 'power1.out' }, 0)
}
