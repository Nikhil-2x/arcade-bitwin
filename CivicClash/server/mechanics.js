/**
 * PATCH-B — Arenas & Sabotage Mechanics (server-authoritative)
 *
 * Adds server-synced interactive mechanisms to every level of Civic Clash:
 *   door (switchable shutters / gates), lights (killable lights + emergency beacon),
 *   camera (jammable CCTV with a witness cone), plate (pressure-plate traps),
 *   noise (crowd-attracting sound source), valve (timed hydrant valve),
 *   fire (spreading fire cells), traffic (moving vehicles + signal phases),
 *   crane (swinging load).
 *
 * Plug-in contract (the ONLY hook needed in gameManager.js):
 *     (await import('./mechanics.js')).attachMechanics(GameManager)
 *
 * attachMechanics() wraps — never replaces — these GameManager methods:
 *   initObjects, tick, handleObjectAction, getTelemetry, getTelemetryForPlayer,
 *   generateCivicDebrief
 * and adds:
 *   getMechanismSnapshot(role), getDynamicObstacles(), onPlayerMoved(id, x, z)
 *
 * Every mechanism is registered as an interactable `gm.objects['mech_*']`, so the
 * existing `object:action` socket flow (range validation, role, broadcast) is reused.
 *
 * DESIGN RULES (enforced by server/test_mechanics.js)
 *  - Every sabotage is TELEGRAPHED (visible state + warning phase) so it can be spotted.
 *  - Every sabotage has COUNTERPLAY: repair / override / reboot / disarm / crank bypass.
 *  - Every sabotage is TEMPORARY (auto-expires) and the Runner can harden a repaired
 *    mechanism so it cannot be instantly re-sabotaged.
 *  - Colliders never seal critical objectives: a detour always exists.
 *  - Sabotage energy / cooldowns / costs stay server-side (never in public snapshots).
 *
 * NOTE (pre-existing, outside this patch): the level escape anchor (18, 18) sits inside
 * the high-rise collider, so Saboteur escape reachability is owned by the arenas patch.
 */

import { getLevelObstacles, isPositionBlocked } from './spatialCollision.js'

export const MECH_VERSION = 1

// ─────────────────────────────────────────────────────────────
// SMALL HELPERS
// ─────────────────────────────────────────────────────────────
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const dist2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz)
const rectC = (cx, cz, hw, hd) => ({ minX: cx - hw, maxX: cx + hw, minZ: cz - hd, maxZ: cz + hd })
const inRect = (r, x, z, pad = 0) =>
  x >= r.minX - pad && x <= r.maxX + pad && z >= r.minZ - pad && z <= r.maxZ + pad
const yawTo = (cx, cz, tx, tz) => Math.atan2(tx - cx, tz - cz)
const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1))
const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`

/**
 * Shared motion model (mirrored 1:1 in engine/mechanismsView.ts).
 * Hazards are NOT streamed per-frame: the server publishes motion parameters and
 * both server collision and client rendering evaluate the same pure function.
 */
export function motionPos(m, t) {
  switch (m.k) {
    case 'lin':
      return m.x0 + m.v * (t - m.t0)
    case 'sin':
      return m.c + m.a * Math.sin(m.p0 + m.w * (t - m.t0))
    case 'lerp':
      return m.from + (m.to - m.from) * clamp((t - m.t0) / m.dur, 0, 1)
    default:
      return m.x || 0
  }
}

const CRANE_LOAD = 2.8 // square footprint of the swinging load
const CAR_LEN = 4.4
const CAR_WID = 1.9

// ─────────────────────────────────────────────────────────────
// LEVEL SPECS
// ─────────────────────────────────────────────────────────────
const LESSON = {
  traffic:
    'Cross only at crossings and wait for the WALK signal. Jumping a signal is a punishable offence under the Motor Vehicles (Amendment) Act 2019.',
  shutter:
    'Good Samaritan protection (Sec. 134A MV Act): shopkeepers who share CCTV or help police cannot be harassed. Evidence rooms must stay accessible to investigators.',
  lights:
    'Public premises must keep emergency lighting on during outages. In the dark, move toward the green emergency light — never feel your way into hazards.',
  cctv:
    'CCTV footage is evidence. Preserve the original recording and hand it over with the proper certificate so it is admissible in court.',
  noise:
    'Crowds at an emergency scene delay ambulances. Bystanders should clear access routes, not gather around noise or spectacle.',
  fire:
    'Never use water on an electrical fire. Cut power first, then use a Class C CO2 or dry-powder extinguisher (NBC 2016 Part 4).',
  hydrant:
    'Water + live wiring = electrocution. Isolate the main breaker BEFORE opening the hydrant to fight a market fire.',
  firedoor:
    'Fire exits and compartment doors must never be locked or blocked while people are inside — this is punishable under the NBC and the Disaster Management Act.',
  plate:
    'Tampering with safety equipment and hidden devices is a crime. If you spot a suspicious device, keep clear and report it to 112.',
  crane:
    'Lifting appliances need certified operators, load charts and regular inspection under the BOCW Act 1996. Stay out of the swing radius.',
  cage:
    'Safety records must be available to inspectors. Hiding or destroying them is an offence under the BOCW Act 1996.'
}

function levelSpec(level) {
  if (level === 2) {
    return {
      signature: {
        id: 'mech_l2_fire_n',
        name: 'Spreading Fire Cells',
        icon: '🔥',
        tagline:
          'Fire spreads cell by cell and an inferno seals a lane. Trip the main breaker first, then fight it with CO2 or hydrant water.'
      },
      chaos: {
        id: 'l2_flashover',
        name: 'Gas Cylinder Flashover',
        icon: '💥',
        warnAt: 92,
        shockAt: 100,
        responseAt: 118,
        endAt: 134,
        warnText: 'A gas cylinder is overheating in the bazaar — flashover imminent!',
        shockText: 'FLASHOVER! Fire jumps a stage in every cell and the lights blow.',
        responseText: 'Fire brigade arrives — fires knocked back, hydrant pressurised, power restored. Runner window!'
      },
      mechs: [
        fireSpec('mech_l2_fire_n', 'North Lane Fire', 0.5, -7.2),
        fireSpec('mech_l2_fire_e', 'East Lane Fire', 6.0, 0.0),
        fireSpec('mech_l2_fire_s', 'South Lane Fire', -0.5, 7.2),
        fireSpec('mech_l2_fire_w', 'West Lane Fire', -9.0, 0.0),
        {
          id: 'mech_l2_firedoor',
          type: 'door',
          name: 'Compartment Fire Gate',
          icon: '🚪',
          zone: 'Shop Zone',
          x: -5.2,
          z: -10.8,
          radius: 3.0,
          lesson: LESSON.firedoor,
          rect: rectC(-9.5, -10.8, 3.5, 0.4),
          lockSec: 16,
          warnSec: 3,
          cost: 25,
          cd: 22,
          harden: 24,
          verb: 'compartment gate'
        },
        {
          id: 'mech_l2_power',
          type: 'lights',
          name: 'Bazaar Lighting Circuit',
          icon: '💡',
          zone: 'Shop Zone',
          x: -13.0,
          z: -5.0,
          radius: 3.0,
          lesson: LESSON.lights,
          zoneC: { x: -9, z: -5, r: 11 },
          beacon: { x: -8.2, z: -5.5, r: 4.2 },
          cost: 15,
          cd: 20,
          darkSec: 22,
          harden: 22
        },
        {
          id: 'mech_l2_hydrant',
          type: 'valve',
          name: 'Hydrant Pressure Valve',
          icon: '🚰',
          zone: 'Accident Zone',
          x: -5.5,
          z: -4.0,
          radius: 3.0,
          lesson: LESSON.hydrant,
          cost: 20,
          cd: 20,
          openSec: 40,
          seizeSec: 12
        },
        {
          id: 'mech_l2_cctv',
          type: 'camera',
          name: 'Bazaar Safety Camera',
          icon: '📹',
          zone: 'Traffic Zone',
          x: 9.0,
          z: -5.5,
          radius: 3.0,
          lesson: LESSON.cctv,
          yaw: yawTo(9.0, -5.5, -1.0, 1.0),
          fov: 100,
          range: 20,
          cost: 25,
          cd: 22,
          jamSec: 22,
          harden: 25
        },
        {
          id: 'mech_l2_plate',
          type: 'plate',
          name: 'Floor Pressure Plate',
          icon: '⚠️',
          zone: 'Shop Zone',
          x: -10.0,
          z: -5.0,
          radius: 3.0,
          lesson: LESSON.plate,
          size: 1.9,
          effect: 'lockdown',
          link: 'mech_l2_firedoor',
          cost: 15,
          cd: 15,
          armSec: 40,
          harden: 25
        }
      ]
    }
  }

  if (level === 3) {
    return {
      signature: {
        id: 'mech_l3_crane',
        name: 'Tower-Crane Swinging Load',
        icon: '🏗️',
        tagline:
          'A crane load sweeps the north walkway. Time your crossing, park the crane at the control box, or detour north of its arc.'
      },
      chaos: {
        id: 'l3_brake_failure',
        name: 'Crane Brake Failure',
        icon: '⚠️',
        warnAt: 105,
        shockAt: 113,
        responseAt: 131,
        endAt: 147,
        warnText: 'Hydraulic pressure is dropping on the tower crane — brake failure imminent!',
        shockText: 'BRAKE FAILURE! The load swings wild and the floodlights trip.',
        responseText: 'Site safety officer hits the E-STOP — crane parked, floodlights back. Runner window!'
      },
      mechs: [
        {
          id: 'mech_l3_crane',
          type: 'crane',
          name: 'Tower Crane Controls',
          icon: '🏗️',
          zone: 'Accident Zone',
          x: -1.0,
          z: -12.6,
          radius: 3.2,
          lesson: LESSON.crane,
          z0: -8.6,
          cx: 0,
          amp: 7,
          ampWild: 7.8,
          period: 14,
          periodWild: 6,
          parkX: 10.5,
          parkSec: 24,
          warnSec: 3,
          wildSec: 14,
          cost: 25,
          cd: 24,
          harden: 10
        },
        {
          id: 'mech_l3_cage',
          type: 'door',
          name: 'Safety Records Cage',
          icon: '🔐',
          zone: 'Shop Zone',
          x: -12.2,
          z: -10.2,
          radius: 3.0,
          lesson: LESSON.cage,
          rect: rectC(-14.6, -11.8, 2.2, 0.2),
          gates: 'obj_safety_records',
          lockSec: 18,
          warnSec: 2.5,
          cost: 25,
          cd: 22,
          harden: 24,
          verb: 'records cage'
        },
        {
          id: 'mech_l3_floods',
          type: 'lights',
          name: 'Floodlight Circuit',
          icon: '💡',
          zone: 'Accident Zone',
          x: -12.5,
          z: -4.0,
          radius: 3.0,
          lesson: LESSON.lights,
          zoneC: { x: -6, z: -6, r: 12 },
          beacon: { x: -8.5, z: -6.0, r: 4.0 },
          cost: 15,
          cd: 20,
          darkSec: 22,
          harden: 22
        },
        {
          id: 'mech_l3_cctv',
          type: 'camera',
          name: 'Perimeter Camera',
          icon: '📹',
          zone: 'Traffic Zone',
          x: -5.0,
          z: 7.2,
          radius: 3.0,
          lesson: LESSON.cctv,
          yaw: yawTo(-5.0, 7.2, 1.0, -2.0),
          fov: 100,
          range: 20,
          cost: 25,
          cd: 22,
          jamSec: 22,
          harden: 25
        },
        {
          id: 'mech_l3_horn',
          type: 'noise',
          name: 'Reversing-Horn Rig',
          icon: '📢',
          zone: 'Shop Zone',
          x: -4.5,
          z: 15.5,
          radius: 3.0,
          lesson: LESSON.noise,
          attractR: 20,
          blareSec: 14,
          cost: 15,
          cd: 18,
          harden: 20
        },
        {
          id: 'mech_l3_plate',
          type: 'plate',
          name: 'Floor Pressure Plate',
          icon: '⚠️',
          zone: 'Accident Zone',
          x: 4.0,
          z: -4.6,
          radius: 3.0,
          lesson: LESSON.plate,
          size: 1.9,
          effect: 'noise',
          attractR: 20,
          cost: 15,
          cd: 15,
          armSec: 40,
          harden: 25
        }
      ]
    }
  }

  return {
    signature: {
      id: 'mech_l1_traffic',
      name: 'Rush-Hour Traffic Grid',
      icon: '🚦',
      tagline:
        'Cars sweep the arterial road. Press WALK to halt traffic — or flood the road with rush-hour traffic. Never cross against the signal.'
    },
    chaos: {
      id: 'l1_gridlock',
      name: 'Rush-Hour Gridlock',
      icon: '🚨',
      warnAt: 100,
      shockAt: 108,
      responseAt: 126,
      endAt: 142,
      warnText: 'Sirens in the distance — a VIP convoy is about to disrupt Sector 4 traffic!',
      shockText: 'GRIDLOCK SURGE! Traffic floods the road and every camera drops out.',
      responseText: '112 patrol units clear the road — WALK phase live, cameras rebooting. Runner window!'
    },
    mechs: [
      {
        id: 'mech_l1_traffic',
        type: 'traffic',
        name: 'Pedestrian Crossing Controller',
        icon: '🚦',
        zone: 'Traffic Zone',
        x: -12.0,
        z: 7.6,
        radius: 3.2,
        lesson: LESSON.traffic,
        lanes: [
          { z: -5.5, dir: 1 },
          { z: 5.5, dir: -1 }
        ],
        walkSec: 14,
        rushSec: 14,
        walkCd: 16,
        cost: 25,
        cd: 24
      },
      {
        id: 'mech_l1_shutter',
        type: 'door',
        name: 'Dhaba Security Shutter',
        icon: '🏪',
        zone: 'Shop Zone',
        x: -16.0,
        z: -9.6,
        radius: 3.0,
        lesson: LESSON.shutter,
        rect: { minX: -17.5, maxX: -14.5, minZ: -12.2, maxZ: -11.0 },
        gates: 'obj_cctv',
        lockSec: 18,
        warnSec: 2.5,
        cost: 25,
        cd: 22,
        harden: 24,
        verb: 'security shutter'
      },
      {
        id: 'mech_l1_lights',
        type: 'lights',
        name: 'Dhaba Lane Light Circuit',
        icon: '💡',
        zone: 'Shop Zone',
        x: -5.5,
        z: -9.5,
        radius: 3.0,
        lesson: LESSON.lights,
        zoneC: { x: -14, z: -11, r: 10 },
        beacon: { x: -8.2, z: -9.2, r: 4.0 },
        cost: 15,
        cd: 20,
        darkSec: 22,
        harden: 22
      },
      {
        id: 'mech_l1_cctv',
        type: 'camera',
        name: 'Junction Traffic Camera',
        icon: '📹',
        zone: 'Traffic Zone',
        x: 5.6,
        z: -7.0,
        radius: 3.0,
        lesson: LESSON.cctv,
        yaw: yawTo(5.6, -7.0, -2.0, 2.0),
        fov: 100,
        range: 20,
        cost: 25,
        cd: 22,
        jamSec: 22,
        harden: 25
      },
      {
        id: 'mech_l1_noise',
        type: 'noise',
        name: 'Street-side Loudspeaker',
        icon: '📢',
        zone: 'Traffic Zone',
        x: 9.4,
        z: 9.6,
        radius: 3.0,
        lesson: LESSON.noise,
        attractR: 20,
        blareSec: 14,
        cost: 15,
        cd: 18,
        harden: 20
      }
    ]
  }
}

function fireSpec(id, name, x, z) {
  return {
    id,
    type: 'fire',
    name,
    icon: '🔥',
    zone: 'Accident Zone',
    x,
    z,
    radius: 3.4,
    lesson: LESSON.fire,
    half: 1.8,
    startLevel: id.endsWith('_s') ? 0 : 1,
    growSec: 26,
    infernoSec: 28,
    cost: 20,
    cd: 18,
    suppressCd: 12
  }
}

// ─────────────────────────────────────────────────────────────
// CORE STATE
// ─────────────────────────────────────────────────────────────
let EPOCH = 0

function createState(gm) {
  const level = gm.currentLevel || 1
  const spec = levelSpec(level)
  const S = {
    version: MECH_VERSION,
    epoch: ++EPOCH,
    level,
    spec,
    tSec: 0,
    lastTickWall: Date.now(),
    mechs: {},
    order: [],
    hazards: [],
    hSeq: 0,
    events: [],
    evSeq: 0,
    lessonShown: new Set(),
    pos: {},
    attract: [],
    flagCount: 0,
    fireRate: 1,
    chaos: { phase: 'idle', applied: { shock: false, response: false } },
    stats: { sabotaged: {}, fixed: {} },
    fireOutAwarded: false
  }
  for (const s of spec.mechs) {
    const M = {
      id: s.id,
      type: s.type,
      name: s.name,
      icon: s.icon,
      zone: s.zone,
      x: s.x,
      z: s.z,
      radius: s.radius,
      lesson: s.lesson,
      cfg: s,
      state: 'idle',
      timer: 0,
      hardened: 0,
      sabCd: 0,
      runCd: 0
    }
    TYPES[s.type].init(S, M)
    S.mechs[M.id] = M
    S.order.push(M.id)
  }
  return S
}

function registerAnchors(gm, S) {
  for (const id of S.order) {
    const M = S.mechs[id]
    gm.objects[id] = {
      id,
      name: M.name,
      zone: M.zone,
      position: { x: M.x, y: 0, z: M.z },
      radius: M.radius,
      state: M.state,
      disabledTimer: 0,
      isMechanism: true
    }
  }
}

function syncAnchors(gm, S) {
  for (const id of S.order) {
    const a = gm.objects[id]
    const M = S.mechs[id]
    if (a) {
      a.state = M.state
      a.disabledTimer = Math.ceil(M.timer || 0)
    }
  }
}

function isRunning(gm) {
  return gm.phase === 'ROUND_ACTIVE' && !gm.isPaused
}

function mechTime(gm) {
  const S = gm.mech
  if (!S) return 0
  if (!isRunning(gm)) return S.tSec
  return S.tSec + clamp((Date.now() - S.lastTickWall) / 1000, 0, 1)
}

function playerIdByRole(gm, role) {
  for (const pid in gm.playerRoles) if (gm.playerRoles[pid] === role) return pid
  return null
}

// ─────────────────────────────────────────────────────────────
// EVENTS, SCORING, WITNESSING
// ─────────────────────────────────────────────────────────────
const FEED_TYPE = { sabotage: 'sabotage', repair: 'emergency', chaos: 'traffic', evidence: 'evidence', info: 'cooperation' }

function pushEvent(gm, S, kind, text, M, opts = {}) {
  const ev = { id: ++S.evSeq, kind, text, t: S.tSec, icon: (M && M.icon) || opts.icon || '⚙️' }
  if (M && M.lesson && !S.lessonShown.has(M.id) && !opts.noLesson) {
    S.lessonShown.add(M.id)
    ev.lesson = M.lesson
  }
  if (opts.lesson) ev.lesson = opts.lesson
  S.events.push(ev)
  if (S.events.length > 10) S.events.shift()
  gm.addEventFeedItem(`${ev.icon} ${text}`, FEED_TYPE[kind] || 'emergency')
}

function award(gm, ctx, key, pts, desc) {
  return gm.awardScore(ctx.actorId, ctx.role, key, pts, desc)
}

function isDarkAt(S, x, z) {
  // The emergency beacon of ANY light circuit always keeps its pool lit.
  for (const id of S.order) {
    const M = S.mechs[id]
    if (M.type === 'lights' && dist2(x, z, M.cfg.beacon.x, M.cfg.beacon.z) <= M.cfg.beacon.r) return false
  }
  for (const id of S.order) {
    const M = S.mechs[id]
    if (M.type === 'lights' && M.state === 'dark' && dist2(x, z, M.cfg.zoneC.x, M.cfg.zoneC.z) <= M.cfg.zoneC.r) return true
  }
  return false
}

function inCameraCone(cam, x, z) {
  const dx = x - cam.x
  const dz = z - cam.z
  const d = Math.hypot(dx, dz)
  if (d > cam.cfg.range || d < 0.01) return d < 0.01
  let diff = Math.atan2(dx, dz) - cam.cfg.yaw
  while (diff > Math.PI) diff -= Math.PI * 2
  while (diff < -Math.PI) diff += Math.PI * 2
  return Math.abs(diff) <= (cam.cfg.fov * Math.PI) / 360
}

/** Cameras that are ONLINE and have light on the scene record tampering (evidence for the Runner). */
function witness(gm, S, pos, M) {
  if (!pos) return false
  if (isDarkAt(S, pos.x, pos.z)) return false
  for (const id of S.order) {
    const cam = S.mechs[id]
    if (cam.type !== 'camera' || cam.state !== 'online') continue
    if (cam.flags >= 3 || S.tSec - cam.lastFlag < 12) continue
    if (!inCameraCone(cam, pos.x, pos.z)) continue
    cam.flags += 1
    cam.lastFlag = S.tSec
    S.flagCount += 1
    gm.addInformation({
      id: `info_cctv_flag_${S.epoch}_${S.flagCount}`,
      title: 'CCTV Flag: Tampering Captured',
      description: `${cam.name} recorded an unidentified person tampering with the ${M.name} at ${mmss(S.tSec)}.`,
      source: cam.name,
      reliability: 'HIGH',
      verified: true
    })
    gm.suspicionLevel = Math.min(100, gm.suspicionLevel + 18)
    pushEvent(gm, S, 'evidence', `${cam.name} flagged tampering at the ${M.name}! Footage logged to the case file.`, cam)
    return true
  }
  return false
}

// ─────────────────────────────────────────────────────────────
// CROWD ATTRACTION (noise sources, trap plates)
// ─────────────────────────────────────────────────────────────
function mobileNpcIds(gm) {
  return Object.keys(gm.npcRoutines || {}).filter((id) => gm.npcs[id])
}

function pickTarget(gm, x, z, idx, total) {
  const obstacles = getLevelObstacles(gm.currentLevel || 1)
  const ang = (idx / Math.max(1, total)) * Math.PI * 2 + 0.6
  for (let r = 2.2; r >= 0.0; r -= 0.5) {
    const tx = x + Math.cos(ang) * r
    const tz = z + Math.sin(ang) * r
    if (!isPositionBlocked(tx, tz, 0.45, obstacles).blocked) return { x: tx, z: tz }
  }
  return { x, z }
}

function startAttract(gm, S, key, x, z, r, secs) {
  const src = { key, x, z, r, until: S.tSec + secs, targets: {} }
  S.attract = S.attract.filter((a) => a.key !== key)
  S.attract.push(src)
  assertAttract(gm, S, src)
}

function assertAttract(gm, S, src) {
  const ids = mobileNpcIds(gm)
  ids.forEach((id, i) => {
    const npc = gm.npcs[id]
    const routine = gm.npcRoutines[id]
    if (!npc || !routine || npc.state === 'IN_CONVERSATION') return
    if (dist2(npc.position.x, npc.position.z, src.x, src.z) > src.r) return
    if (!src.targets[id]) src.targets[id] = pickTarget(gm, src.x, src.z, i, ids.length)
    if (!routine.specialTarget) routine.specialTarget = { ...src.targets[id] }
  })
}

function stopAttract(gm, S, key) {
  const src = S.attract.find((a) => a.key === key)
  if (!src) return []
  const released = []
  for (const id in src.targets) {
    const routine = gm.npcRoutines[id]
    if (routine) routine.specialTarget = null
    released.push(id)
  }
  S.attract = S.attract.filter((a) => a.key !== key)
  return released
}

function rally(gm, x, z, r, amount) {
  let n = 0
  for (const id of mobileNpcIds(gm)) {
    const npc = gm.npcs[id]
    if (dist2(npc.position.x, npc.position.z, x, z) <= r) {
      npc.cooperation = clamp((npc.cooperation || 0) + amount, 0, 100)
      n += 1
    }
  }
  return n
}

// ─────────────────────────────────────────────────────────────
// SHARED SABOTAGE / COUNTER PLUMBING
// ─────────────────────────────────────────────────────────────
const fail = (message) => ({ success: false, message })

function sabotageGate(gm, S, M, cfg) {
  if (M.hardened > 0) return fail(`Locked out by the Runner's emergency override (${Math.ceil(M.hardened)}s).`)
  if (M.sabCd > 0) return fail(`Cooldown: ${Math.ceil(M.sabCd)}s remaining`)
  if (gm.sabotageEnergy < cfg.cost) return fail(`Needs ${cfg.cost} sabotage energy.`)
  return null
}

function sabotageCommit(gm, S, M, ctx, cfg, pts, text, extraSuspicion = 12) {
  gm.sabotageEnergy = Math.max(0, gm.sabotageEnergy - cfg.cost)
  M.sabCd = cfg.cd
  gm.suspicionLevel = Math.min(100, gm.suspicionLevel + extraSuspicion)
  S.stats.sabotaged[M.id] = { text: M.name, lesson: M.lesson, countered: false }
  award(gm, ctx, `MECH_SAB_${M.id}`, pts, `Sabotaged ${M.name}`)
  pushEvent(gm, S, 'sabotage', text, M)
  const seen = witness(gm, S, ctx.pos, M)
  return seen
}

function counterCommit(gm, S, M, ctx, pts, text) {
  if (S.stats.sabotaged[M.id]) S.stats.sabotaged[M.id].countered = true
  S.stats.fixed[M.id] = { text: M.name, lesson: M.lesson }
  award(gm, ctx, `MECH_FIX_${M.id}`, pts, `Countered sabotage on ${M.name}`)
  pushEvent(gm, S, 'repair', text, M)
}

// ─────────────────────────────────────────────────────────────
// MECHANISM TYPES
// ─────────────────────────────────────────────────────────────
const TYPES = {}

// ── DOOR / SHUTTER ───────────────────────────────────────────
TYPES.door = {
  init(S, M) {
    M.state = 'open'
    M.retries = 0
  },
  tick(gm, S, M) {
    if (M.state === 'closing') {
      M.timer -= 1
      if (M.timer <= 0) {
        if (doorOccupied(S, M) && M.retries < 4) {
          M.retries += 1
          M.timer = 1
        } else if (doorOccupied(S, M)) {
          M.state = 'open'
          M.timer = 0
          pushEvent(gm, S, 'info', `${M.name}: safety sensor detected a person — gate aborted and re-opened.`, M, { noLesson: true })
        } else {
          M.state = 'locked'
          M.timer = M.cfg.lockSec
        }
      }
    } else if (M.state === 'locked') {
      M.timer -= 1
      if (M.timer <= 0) {
        M.state = 'open'
        M.timer = 0
        pushEvent(gm, S, 'info', `${M.name} motor reset — it re-opened automatically.`, M, { noLesson: true })
      }
    }
  },
  sabotage(gm, S, M, ctx) {
    const cfg = M.cfg
    if (M.state !== 'open') return fail(`The ${cfg.verb} is already ${M.state}.`)
    const blocked = sabotageGate(gm, S, M, cfg)
    if (blocked) return blocked
    M.state = 'closing'
    M.timer = cfg.warnSec
    M.retries = 0
    const seen = sabotageCommit(gm, S, M, ctx, cfg, 8, `The ${cfg.verb} alarm sounds — it is slamming shut!`, 12)
    return {
      success: true,
      message: seen
        ? `${M.name} is closing — but a camera caught you!`
        : `${M.name} is closing. It auto-resets in ${cfg.lockSec}s.`
    }
  },
  counter(gm, S, M, ctx) {
    const cfg = M.cfg
    if (M.state === 'closing' || M.state === 'locked') {
      M.state = 'open'
      M.timer = 0
      M.hardened = cfg.harden
      counterCommit(gm, S, M, ctx, 7, `${M.name} manually overridden and propped open.`)
      return { success: true, message: `Override successful! ${M.name} is propped open and locked out from tampering for ${cfg.harden}s.` }
    }
    if (M.runCd > 0) return fail(`Already secured. Cooldown ${Math.ceil(M.runCd)}s.`)
    if (M.hardened > 0) return fail(`Already secured open (${Math.ceil(M.hardened)}s).`)
    M.hardened = Math.round(cfg.harden * 0.7)
    M.runCd = cfg.harden
    pushEvent(gm, S, 'repair', `${M.name} pre-secured open.`, M, { noLesson: true })
    return { success: true, message: `Pre-secured the ${cfg.verb} open for ${M.hardened}s — it cannot be shut.` }
  },
  prompt(S, M, role) {
    if (role === 'saboteur') {
      return M.state === 'open' && M.hardened <= 0 ? `Slam ${M.cfg.verb} shut (${M.cfg.cost}⚡)` : `${M.cfg.verb} — unavailable`
    }
    if (M.state === 'closing' || M.state === 'locked') return `Override ${M.cfg.verb} — force it open`
    return M.hardened > 0 ? `${M.cfg.verb} secured open` : `Secure ${M.cfg.verb} open`
  },
  pub(M) {
    return { rect: M.cfg.rect, gates: M.cfg.gates || null, lockSec: M.cfg.lockSec }
  }
}

function doorOccupied(S, M) {
  for (const pid in S.pos) {
    const p = S.pos[pid]
    if (inRect(M.cfg.rect, p.x, p.z, 0.95)) return true
  }
  return false
}

// ── LIGHTS (killable lights + always-on emergency beacon) ─────
TYPES.lights = {
  init(S, M) {
    M.state = 'on'
  },
  tick(gm, S, M) {
    if (M.state === 'flicker') {
      M.timer -= 1
      if (M.timer <= 0) {
        M.state = 'dark'
        M.timer = M.cfg.darkSec
      }
    } else if (M.state === 'dark') {
      M.timer -= 1
      if (M.timer <= 0) {
        M.state = 'restoring'
        M.timer = 2
        pushEvent(gm, S, 'info', `${M.name}: breaker auto-reset — power returning.`, M, { noLesson: true })
      }
    } else if (M.state === 'restoring') {
      M.timer -= 1
      if (M.timer <= 0) {
        M.state = 'on'
        M.timer = 0
      }
    }
  },
  sabotage(gm, S, M, ctx) {
    const cfg = M.cfg
    if (M.state !== 'on') return fail('The circuit is already failing.')
    const blocked = sabotageGate(gm, S, M, cfg)
    if (blocked) return blocked
    M.state = 'flicker'
    M.timer = 2
    const seen = sabotageCommit(gm, S, M, ctx, cfg, 8, `${M.name} is flickering — somebody threw the breaker! Only the emergency light stays on.`, 10)
    return {
      success: true,
      message: seen ? 'Lights cut — but a camera got you on film first!' : `Lights cut for ~${cfg.darkSec}s. The green emergency beacon stays lit.`
    }
  },
  counter(gm, S, M, ctx) {
    const cfg = M.cfg
    if (M.state === 'flicker' || M.state === 'dark') {
      M.state = 'restoring'
      M.timer = 3
      M.hardened = cfg.harden
      counterCommit(gm, S, M, ctx, 7, `${M.name} repaired — breaker locked on.`)
      return { success: true, message: `Breaker reset! Power returns and the circuit is tamper-proof for ${cfg.harden}s.` }
    }
    if (M.runCd > 0 || M.hardened > 0) return fail('Circuit already healthy and protected.')
    M.hardened = Math.round(cfg.harden * 0.6)
    M.runCd = cfg.harden
    return { success: true, message: `Fitted a tamper lock on the breaker (${M.hardened}s).` }
  },
  prompt(S, M, role) {
    if (role === 'saboteur') return M.state === 'on' && M.hardened <= 0 ? `Throw the breaker — kill the lights (${M.cfg.cost}⚡)` : 'Breaker unavailable'
    if (M.state === 'dark' || M.state === 'flicker') return 'Reset the breaker — restore the lights'
    return M.hardened > 0 ? 'Breaker locked on' : 'Fit a tamper lock on the breaker'
  },
  pub(M) {
    return { zone: M.cfg.zoneC, beacon: M.cfg.beacon }
  }
}

// ── CAMERA (jammable CCTV) ───────────────────────────────────
TYPES.camera = {
  init(S, M) {
    M.state = 'online'
    M.flags = 0
    M.lastFlag = -99
  },
  tick(gm, S, M) {
    if (M.state === 'jammed') {
      M.timer -= 1
      if (M.timer <= 0) {
        M.state = 'rebooting'
        M.timer = 3
      }
    } else if (M.state === 'rebooting') {
      M.timer -= 1
      if (M.timer <= 0) {
        M.state = 'online'
        M.timer = 0
        pushEvent(gm, S, 'info', `${M.name} is back online.`, M, { noLesson: true })
      }
    }
  },
  sabotage(gm, S, M, ctx) {
    const cfg = M.cfg
    if (M.state !== 'online') return fail('That camera is already offline.')
    const blocked = sabotageGate(gm, S, M, cfg)
    if (blocked) return blocked
    // The camera (and any other online camera in view) may film the act BEFORE the jam lands.
    const seen = sabotageCommit(gm, S, M, ctx, cfg, 8, `${M.name} signal is jammed — static on the feed!`, 14)
    M.state = 'jammed'
    M.timer = cfg.jamSec
    return { success: true, message: seen ? 'Camera jammed — but a camera caught you on the way in!' : `Camera jammed for ${cfg.jamSec}s.` }
  },
  counter(gm, S, M, ctx) {
    const cfg = M.cfg
    if (M.state === 'jammed') {
      M.state = 'rebooting'
      M.timer = 4
      M.hardened = cfg.harden
      counterCommit(gm, S, M, ctx, 7, `${M.name} reboot started — signal hardened against jamming.`)
      return { success: true, message: `Rebooting camera… it will resist jamming for ${cfg.harden}s.` }
    }
    if (M.state === 'rebooting') return fail('Reboot already in progress.')
    if (M.runCd > 0 || M.hardened > 0) return fail('Camera already shielded.')
    M.hardened = Math.round(cfg.harden * 0.6)
    M.runCd = cfg.harden
    return { success: true, message: `Fitted an anti-jam shield (${M.hardened}s).` }
  },
  prompt(S, M, role) {
    if (role === 'saboteur') return M.state === 'online' && M.hardened <= 0 ? `Jam the camera signal (${M.cfg.cost}⚡)` : 'Camera unavailable'
    if (M.state === 'jammed') return 'Reboot the camera — clear the jam'
    return M.hardened > 0 ? 'Camera shielded' : 'Fit an anti-jam shield'
  },
  pub(M) {
    return { yaw: M.cfg.yaw, fov: M.cfg.fov, range: M.cfg.range }
  }
}

// ── PRESSURE PLATE (visible trap) ────────────────────────────
TYPES.plate = {
  init(S, M) {
    M.state = 'idle'
    M.rect = rectC(M.x, M.z, M.cfg.size / 2, M.cfg.size / 2)
  },
  tick(gm, S, M) {
    if (M.state === 'armed') {
      M.timer -= 1
      if (M.timer <= 0) {
        M.state = 'idle'
        M.timer = 0
        pushEvent(gm, S, 'info', `${M.name} trap fizzled out and disarmed.`, M, { noLesson: true })
      }
    } else if (M.state === 'fired') {
      M.timer -= 1
      if (M.timer <= 0) {
        M.state = 'idle'
        M.timer = 0
      }
    }
  },
  sabotage(gm, S, M, ctx) {
    const cfg = M.cfg
    if (M.state !== 'idle') return fail(`The plate is already ${M.state}.`)
    const blocked = sabotageGate(gm, S, M, cfg)
    if (blocked) return blocked
    M.state = 'armed'
    M.timer = cfg.armSec
    const seen = sabotageCommit(gm, S, M, ctx, cfg, 6, `A pressure plate has been armed — it glows red!`, 8)
    return { success: true, message: seen ? 'Plate armed — but a camera saw you rig it!' : `Plate armed for ${cfg.armSec}s. Anyone stepping on it sets it off — including you.` }
  },
  counter(gm, S, M, ctx) {
    const cfg = M.cfg
    if (M.state === 'armed') {
      M.state = 'idle'
      M.timer = 0
      M.hardened = cfg.harden
      counterCommit(gm, S, M, ctx, 6, `${M.name} safely disarmed.`)
      return { success: true, message: `Plate disarmed and sealed against re-arming for ${cfg.harden}s.` }
    }
    return fail('Plate is not armed — it is safe to walk over.')
  },
  prompt(S, M, role) {
    if (role === 'saboteur') return M.state === 'idle' && M.hardened <= 0 ? `Arm the pressure plate (${M.cfg.cost}⚡)` : 'Plate unavailable'
    return M.state === 'armed' ? 'DISARM the trap plate' : 'Inspect pressure plate (safe)'
  },
  pub(M) {
    return { rect: M.rect, effect: M.cfg.effect }
  }
}

function firePlate(gm, S, M, playerId) {
  const role = gm.playerRoles[playerId]
  M.state = 'fired'
  M.timer = 8
  if (M.cfg.effect === 'lockdown') {
    const door = S.mechs[M.cfg.link]
    if (door && door.state === 'open' && door.hardened <= 0) {
      door.state = 'closing'
      door.timer = 1
      door.retries = 0
      pushEvent(gm, S, 'sabotage', `Trap plate triggered! ${door.name} is sealing!`, M)
    } else {
      pushEvent(gm, S, 'info', `Trap plate clicked — but ${door ? door.name : 'its gate'} is secured and stayed open.`, M)
    }
  } else {
    startAttract(gm, S, `plate_${M.id}`, M.x, M.z, M.cfg.attractR || 20, 10)
    pushEvent(gm, S, 'sabotage', `Trap plate triggered! A siren draws the crowd toward ${M.name}.`, M)
    if (role === 'runner') {
      const n = rally(gm, M.x, M.z, M.cfg.attractR || 20, 6)
      if (n > 0) {
        gm.awardScore(playerId, 'runner', `MECH_EXPLOIT_${M.id}`, 5, 'Turned a trap plate into a crowd rally point')
        pushEvent(gm, S, 'repair', `The Runner turned the trap into a rally point — ${n} bystanders are now more cooperative.`, M, { noLesson: true })
      }
    }
  }
}

// ── NOISE (crowd-attracting source) ──────────────────────────
TYPES.noise = {
  init(S, M) {
    M.state = 'idle'
  },
  tick(gm, S, M) {
    if (M.state === 'blaring') {
      M.timer -= 1
      const src = S.attract.find((a) => a.key === M.id)
      if (src) assertAttract(gm, S, src)
      if (M.timer <= 0) {
        stopAttract(gm, S, M.id)
        M.state = 'idle'
        M.timer = 0
        pushEvent(gm, S, 'info', `${M.name} cut out — the crowd drifts back to what it was doing.`, M, { noLesson: true })
      }
    }
  },
  sabotage(gm, S, M, ctx) {
    const cfg = M.cfg
    if (M.state !== 'idle') return fail('The speaker is already blaring.')
    const blocked = sabotageGate(gm, S, M, cfg)
    if (blocked) return blocked
    M.state = 'blaring'
    M.timer = cfg.blareSec
    startAttract(gm, S, M.id, M.x, M.z, cfg.attractR, cfg.blareSec)
    const seen = sabotageCommit(gm, S, M, ctx, cfg, 8, `${M.name} is blasting! Bystanders turn and head toward the noise.`, 10)
    return { success: true, message: seen ? 'Noise started — camera footage logged.' : `Noise blasting for ${cfg.blareSec}s — nearby bystanders are drifting toward it.` }
  },
  counter(gm, S, M, ctx) {
    const cfg = M.cfg
    if (M.state === 'blaring') {
      const released = stopAttract(gm, S, M.id)
      const n = rally(gm, M.x, M.z, 6, 8)
      M.state = 'idle'
      M.timer = 0
      M.hardened = cfg.harden
      counterCommit(gm, S, M, ctx, 7, `${M.name} silenced${n ? ` — ${n} bystanders you gathered are now cooperative` : ''}.`)
      return { success: true, message: `Silenced! ${released.length} bystanders were drawn here — marshal them to help (+cooperation).` }
    }
    if (M.runCd > 0 || M.hardened > 0) return fail('Speaker already disabled.')
    M.hardened = Math.round(cfg.harden * 0.6)
    M.runCd = cfg.harden
    return { success: true, message: `Pulled the speaker fuse (${M.hardened}s).` }
  },
  prompt(S, M, role) {
    if (role === 'saboteur') return M.state === 'idle' && M.hardened <= 0 ? `Blast the speaker — lure the crowd (${M.cfg.cost}⚡)` : 'Speaker unavailable'
    return M.state === 'blaring' ? 'SILENCE the speaker — marshal the crowd' : M.hardened > 0 ? 'Speaker disabled' : 'Pull the speaker fuse'
  },
  pub(M) {
    return { attractR: M.cfg.attractR }
  }
}

// ── VALVE (timed hydrant pressure) ───────────────────────────
TYPES.valve = {
  init(S, M) {
    M.state = 'closed'
    M.crank = 0
  },
  tick(gm, S, M) {
    if (M.state === 'open') {
      M.timer -= 1
      applyHydrant(gm, S, M)
      if (M.timer <= 0) {
        M.state = 'closed'
        M.timer = 0
        pushEvent(gm, S, 'info', 'Hydrant pressure ran out — reopen the valve to keep the hose live.', M, { noLesson: true })
      }
    } else if (M.state === 'seized') {
      M.timer -= 1
      if (M.timer <= 0) {
        M.state = 'closed'
        M.timer = 0
        M.crank = 0
      }
    }
  },
  sabotage(gm, S, M, ctx) {
    const cfg = M.cfg
    if (M.state !== 'open') return fail('There is no pressure to bleed — wait for the valve to be opened.')
    const blocked = sabotageGate(gm, S, M, cfg)
    if (blocked) return blocked
    M.state = 'seized'
    M.timer = cfg.seizeSec
    M.crank = 0
    const seen = sabotageCommit(gm, S, M, ctx, cfg, 8, `Hydrant valve seized! Pressure bled off — it needs a manual crank.`, 12)
    return { success: true, message: seen ? 'Valve seized — camera has you on film.' : `Valve seized for ${cfg.seizeSec}s.` }
  },
  counter(gm, S, M, ctx) {
    const cfg = M.cfg
    if (M.state === 'closed' && M.runCd > 0) return fail(`Interlock resetting (${Math.ceil(M.runCd)}s).`)
    const supply = gm.objects.obj_water_source
    if (supply && supply.state === 'closed') return fail('The municipal supply is shut — open the Municipal Hydrant first.')
    if (M.state === 'seized') {
      M.crank += 1
      if (M.crank >= 3) {
        M.state = 'open'
        M.timer = cfg.openSec
        M.crank = 0
        counterCommit(gm, S, M, ctx, 7, 'Hydrant valve cranked open by hand — pressure restored.')
        return { success: true, message: 'Manual crank complete — water pressure is back!' }
      }
      return { success: true, message: `Cranking the seized valve by hand… ${M.crank}/3` }
    }
    if (M.state === 'open') {
      M.timer = cfg.openSec
      return { success: true, message: `Pressure topped up to ${cfg.openSec}s.` }
    }
    // closed → open, but only safely if power is isolated
    const panel = gm.objects.obj_electrical_panel
    if (panel && panel.state !== 'tripped') {
      M.runCd = 6
      pushEvent(gm, S, 'info', 'Interlock tripped: live wiring near the hydrant! Isolate the main breaker BEFORE using water.', M)
      return fail('INTERLOCK TRIPPED — live electrical panel nearby. Cut the main breaker first (never use water on electrical fires!).')
    }
    M.state = 'open'
    M.timer = cfg.openSec
    award(gm, ctx, `MECH_FIX_${M.id}`, 7, 'Opened hydrant pressure safely after isolating power')
    pushEvent(gm, S, 'repair', 'Hydrant pressure valve opened — hoses are live on safe, de-energised wiring.', M)
    return { success: true, message: `Hydrant live for ${cfg.openSec}s. Fire cells in range are being cooled.` }
  },
  prompt(S, M, role) {
    if (role === 'saboteur') return M.state === 'open' && M.hardened <= 0 ? `Bleed the pressure — seize the valve (${M.cfg.cost}⚡)` : 'Valve unavailable'
    if (M.state === 'seized') return `Hand-crank the seized valve (${M.crank}/3)`
    return M.state === 'open' ? 'Top up hydrant pressure' : 'Open hydrant pressure valve'
  },
  pub(M) {
    return { crank: M.crank }
  }
}

function applyHydrant(gm, S, M) {
  for (const id of S.order) {
    const F = S.mechs[id]
    if (F.type !== 'fire' || F.intensity <= 0) continue
    if (dist2(F.x, F.z, M.x, M.z) > 16) continue
    F.cool += 1
    if (F.cool >= 10) {
      F.cool = 0
      F.intensity -= 1
      F.grow = 0
      F.inferno = 0
      if (F.intensity === 0) pushEvent(gm, S, 'repair', `Hydrant water extinguished the ${F.name}.`, F, { noLesson: true })
    }
  }
}

// ── FIRE (spreading cells; SIGNATURE for level 2) ────────────
const FIRE_LABEL = ['OUT', 'SMOLDERING', 'BLAZING', 'INFERNO']

TYPES.fire = {
  init(S, M) {
    M.intensity = M.cfg.startLevel
    M.grow = 0
    M.cool = 0
    M.ember = 0
    M.inferno = 0
    M.suppressCdLeft = 0
    M.rect = rectC(M.x, M.z, M.cfg.half, M.cfg.half)
    M.state = FIRE_LABEL[M.intensity]
  },
  tick(gm, S, M) {
    const cfg = M.cfg
    if (M.intensity > 0 && M.intensity < 3) {
      M.grow += S.fireRate
      if (M.grow >= cfg.growSec) {
        M.grow = 0
        M.intensity += 1
        pushEvent(gm, S, M.intensity === 3 ? 'sabotage' : 'info', `${M.name} is spreading — now ${FIRE_LABEL[M.intensity]}${M.intensity === 3 ? ' and sealing the lane!' : '.'}`, M, { noLesson: M.intensity < 3 })
      }
    } else if (M.intensity >= 3) {
      M.inferno += 1
      if (M.inferno >= cfg.infernoSec) {
        M.inferno = 0
        M.intensity = 1
        M.grow = 0
        pushEvent(gm, S, 'repair', `Fire crews knocked down the ${M.name} — the lane reopens.`, M, { noLesson: true })
      }
    } else {
      // embers from neighbouring blazes slowly re-ignite an extinguished cell
      const hot = S.order.some((id) => S.mechs[id].type === 'fire' && S.mechs[id].intensity >= 2)
      if (hot) {
        M.ember += 1
        if (M.ember >= 40) {
          M.ember = 0
          M.intensity = 1
          pushEvent(gm, S, 'info', `Embers re-ignited the ${M.name}.`, M, { noLesson: true })
        }
      }
    }
    if (M.suppressCdLeft > 0) M.suppressCdLeft -= 1
    M.state = FIRE_LABEL[M.intensity]
  },
  sabotage(gm, S, M, ctx) {
    const cfg = M.cfg
    if (M.intensity >= 3) return fail('That cell is already an inferno.')
    const blocked = sabotageGate(gm, S, M, cfg)
    if (blocked) return blocked
    M.intensity = Math.max(1, M.intensity + 1)
    M.grow = 0
    M.cool = 0
    M.state = FIRE_LABEL[M.intensity]
    const seen = sabotageCommit(gm, S, M, ctx, cfg, 7, `A gas cylinder was opened near the ${M.name} — it flares to ${FIRE_LABEL[M.intensity]}!`, 12)
    return { success: true, message: seen ? 'You fed the fire — a camera filmed it.' : `Fed the fire — it is now ${FIRE_LABEL[M.intensity]}.` }
  },
  counter(gm, S, M, ctx) {
    if (M.intensity <= 0) return fail('This cell is already out.')
    if (M.suppressCdLeft > 0) return fail(`Extinguisher recharging (${M.suppressCdLeft}s).`)
    if (!gm.inventory.includes('CO2 Fire Extinguisher')) {
      return fail('You need the CO2 Fire Extinguisher from the safety station. NEVER use water on live wiring!')
    }
    M.intensity = Math.max(0, M.intensity - 2)
    M.grow = 0
    M.inferno = 0
    M.suppressCdLeft = M.cfg.suppressCd
    M.state = FIRE_LABEL[M.intensity]
    counterCommit(gm, S, M, ctx, 4, `${M.name} suppressed with CO2 — now ${FIRE_LABEL[M.intensity]}.`)
    return { success: true, message: `CO2 blast! The ${M.name} drops to ${FIRE_LABEL[M.intensity]}. (Class C extinguishers are safe on electrical fires.)` }
  },
  prompt(S, M, role) {
    if (role === 'saboteur') return M.intensity < 3 ? `Open a gas cylinder — feed the fire (${M.cfg.cost}⚡)` : 'Fire already raging'
    return M.intensity > 0 ? 'Suppress fire with CO2 extinguisher' : 'Fire is out'
  },
  pub(M) {
    return { intensity: M.intensity, rect: M.rect, inferno: M.intensity >= 3 ? Math.max(0, M.cfg.infernoSec - M.inferno) : 0 }
  }
}

// ── TRAFFIC (moving hazards + signal phases; SIGNATURE for level 1) ──
TYPES.traffic = {
  init(S, M) {
    M.state = 'flow'
    M.lanes = M.cfg.lanes.map((l, i) => ({ z: l.z, dir: l.dir, next: 2 + i * 3 }))
  },
  tick(gm, S, M) {
    if (M.state === 'walk' || M.state === 'rush') {
      M.timer -= 1
      if (M.timer <= 0) setTrafficMode(gm, S, M, 'flow', 0, false)
    }
    const t = S.tSec
    for (const lane of M.lanes) {
      if (M.state !== 'walk' && t >= lane.next) {
        const clear = !S.hazards.some(
          (h) => h.kind === 'car' && h.z === lane.z && Math.abs(motionPos(h.motion, t) + lane.dir * 34) < 9
        )
        if (clear) {
          const speed = M.state === 'rush' ? 11 : 6.5
          S.hazards.push({
            id: `veh_${++S.hSeq}`,
            kind: 'car',
            z: lane.z,
            dir: lane.dir,
            len: CAR_LEN,
            wid: CAR_WID,
            tint: randInt(0, 5),
            motion: { k: 'lin', x0: -lane.dir * 34, v: lane.dir * speed, t0: t }
          })
        }
        lane.next = t + (M.state === 'rush' ? randInt(2, 4) : randInt(5, 8))
      }
    }
    S.hazards = S.hazards.filter((h) => h.kind !== 'car' || Math.abs(motionPos(h.motion, t)) <= 37)
  },
  sabotage(gm, S, M, ctx) {
    const cfg = M.cfg
    if (S.chaos.lock) return fail('The grid is in chaos — controls are unresponsive.')
    if (M.state === 'walk') return fail('Pedestrian WALK phase is live — the controller rejects overrides.')
    if (M.state === 'rush') return fail('Rush-hour override is already active.')
    const blocked = sabotageGate(gm, S, M, cfg)
    if (blocked) return blocked
    setTrafficMode(gm, S, M, 'rush', cfg.rushSec, false)
    const seen = sabotageCommit(gm, S, M, ctx, cfg, 9, 'Signal controller overridden — RUSH HOUR! Cars are flooding the road at speed.', 14)
    return { success: true, message: seen ? 'Rush override on — but a camera saw you at the controller.' : `Rush-hour override for ${cfg.rushSec}s.` }
  },
  counter(gm, S, M, ctx) {
    const cfg = M.cfg
    if (S.chaos.lock) return fail('The grid is in chaos — wait for the response crews.')
    if (M.state === 'walk') return fail('WALK phase already active — cross now!')
    if (M.runCd > 0) return fail(`WALK button recharging (${Math.ceil(M.runCd)}s).`)
    const wasRush = M.state === 'rush'
    setTrafficMode(gm, S, M, 'walk', cfg.walkSec, false)
    M.hardened = cfg.walkSec + 10
    M.runCd = cfg.walkSec + cfg.walkCd
    if (wasRush && S.stats.sabotaged[M.id]) S.stats.sabotaged[M.id].countered = true
    S.stats.fixed[M.id] = { text: M.name, lesson: M.lesson }
    award(gm, ctx, `MECH_FIX_${M.id}`, 8, 'Triggered the pedestrian WALK phase')
    pushEvent(gm, S, 'repair', `WALK phase! Approaching cars brake at the stop lines for ${cfg.walkSec}s.`, M)
    return { success: true, message: `WALK phase for ${cfg.walkSec}s — cars brake at the stop lines. Cross on the zebra!` }
  },
  prompt(S, M, role) {
    if (role === 'saboteur') return M.state === 'flow' && M.hardened <= 0 ? `Override signal — RUSH HOUR (${M.cfg.cost}⚡)` : 'Controller unavailable'
    return M.state === 'walk' ? 'WALK phase live — cross now!' : M.runCd > 0 ? 'WALK button recharging…' : 'Press WALK — halt the traffic'
  },
  pub(M) {
    return { lanes: M.cfg.lanes, walkRecharge: Math.ceil(M.runCd || 0) }
  }
}

function setTrafficMode(gm, S, M, mode, dur, silent) {
  M.state = mode
  M.timer = dur
  const t = S.tSec
  const speed = mode === 'rush' ? 11 : 6.5
  for (const h of S.hazards) {
    if (h.kind !== 'car') continue
    const x = motionPos(h.motion, t)
    const approaching = x * h.dir < 0
    if (mode === 'walk' && approaching && Math.abs(x) > 12.5) h.motion = { k: 'fix', x }
    else h.motion = { k: 'lin', x0: x, v: h.dir * speed, t0: t }
  }
  if (!silent && mode === 'flow') pushEvent(gm, S, 'info', 'Signal controller back to normal traffic flow.', M, { noLesson: true })
}

// ── CRANE (swinging load; SIGNATURE for level 3) ─────────────
TYPES.crane = {
  init(S, M) {
    const c = M.cfg
    M.state = 'sweep'
    M.hazard = {
      id: 'crane_load',
      kind: 'load',
      z: c.z0,
      len: CRANE_LOAD,
      wid: CRANE_LOAD,
      tint: 0,
      motion: { k: 'sin', c: c.cx, a: c.amp, p0: 0, w: (Math.PI * 2) / c.period, t0: 0 }
    }
    S.hazards.push(M.hazard)
  },
  tick(gm, S, M) {
    const c = M.cfg
    const t = S.tSec
    if (M.state === 'warning') {
      M.timer -= 1
      if (M.timer <= 0) {
        M.state = 'overload'
        M.timer = c.wildSec
        swingFrom(M, t, c.ampWild, c.periodWild)
      }
    } else if (M.state === 'overload') {
      M.timer -= 1
      if (M.timer <= 0) {
        M.state = 'sweep'
        swingFrom(M, t, c.amp, c.period)
        pushEvent(gm, S, 'info', 'Crane brakes engaged — the load returns to its normal arc.', M, { noLesson: true })
      }
    } else if (M.state === 'parking') {
      M.timer -= 1
      if (M.timer <= 0) {
        M.state = 'parked'
        M.timer = c.parkSec
        M.hazard.motion = { k: 'fix', x: c.parkX }
      }
    } else if (M.state === 'parked') {
      M.timer -= 1
      if (M.timer <= 0) {
        M.state = 'resuming'
        M.timer = 4
        M.hazard.motion = { k: 'lerp', from: c.parkX, to: c.cx, t0: t, dur: 4 }
      }
    } else if (M.state === 'resuming') {
      M.timer -= 1
      if (M.timer <= 0) {
        M.state = 'sweep'
        M.hazard.motion = { k: 'sin', c: c.cx, a: c.amp, p0: 0, w: (Math.PI * 2) / c.period, t0: t }
        pushEvent(gm, S, 'info', 'Crane back in service — the load is swinging again.', M, { noLesson: true })
      }
    }
  },
  sabotage(gm, S, M, ctx) {
    const cfg = M.cfg
    if (S.chaos.lock) return fail('The crane is already out of control.')
    if (M.state !== 'sweep') return fail(`The crane is ${M.state} — it cannot be overloaded right now.`)
    const blocked = sabotageGate(gm, S, M, cfg)
    if (blocked) return blocked
    M.state = 'warning'
    M.timer = cfg.warnSec
    const seen = sabotageCommit(gm, S, M, ctx, cfg, 9, 'Crane overload alarm! The load is about to swing wide and fast.', 14)
    return { success: true, message: seen ? 'Overload triggered — a camera caught you at the controls.' : `Overload in ${cfg.warnSec}s for ${cfg.wildSec}s.` }
  },
  counter(gm, S, M, ctx) {
    const cfg = M.cfg
    if (S.chaos.lock) return fail('Brake failure! Wait for the safety officer to hit the E-STOP.')
    if (M.state === 'parking' || M.state === 'parked') return fail('The crane is already parked safely.')
    if (M.state === 'resuming') return fail('Crane is restarting — wait for it to finish.')
    const t = S.tSec
    const x = motionPos(M.hazard.motion, t)
    M.state = 'parking'
    M.timer = 3
    M.hazard.motion = { k: 'lerp', from: x, to: cfg.parkX, t0: t, dur: 3 }
    M.hardened = cfg.parkSec + cfg.harden
    counterCommit(gm, S, M, ctx, 8, `Crane parked at the E-STOP station for ${cfg.parkSec}s — the walkway is clear.`)
    return { success: true, message: `E-STOP! Load parked clear of the walkway for ${cfg.parkSec}s.` }
  },
  prompt(S, M, role) {
    if (role === 'saboteur') return M.state === 'sweep' && M.hardened <= 0 ? `Overload the crane (${M.cfg.cost}⚡)` : 'Crane unavailable'
    return M.state === 'parked' || M.state === 'parking' ? 'Crane parked safely' : 'E-STOP — park the crane load'
  },
  pub(M) {
    return { z0: M.cfg.z0, cx: M.cfg.cx }
  }
}

function swingFrom(M, t, amp, period) {
  // continue from the load's current x without a visible jump
  const x = motionPos(M.hazard.motion, t)
  const c = M.cfg.cx
  const p0 = Math.asin(clamp((x - c) / amp, -1, 1))
  M.hazard.motion = { k: 'sin', c, a: amp, p0, w: (Math.PI * 2) / period, t0: t }
}

// ─────────────────────────────────────────────────────────────
// CHAOS EVENT (one per level, server-timed, visible to both players)
// ─────────────────────────────────────────────────────────────
function ofType(S, type) {
  return S.order.map((id) => S.mechs[id]).filter((m) => m.type === type)
}

function chaosShock(gm, S) {
  const id = S.spec.chaos.id
  S.chaos.lock = true
  gm.sabotageEnergy = Math.min(gm.maxEnergy, gm.sabotageEnergy + 25)
  if (id === 'l1_gridlock') {
    const tr = ofType(S, 'traffic')[0]
    setTrafficMode(gm, S, tr, 'rush', S.spec.chaos.responseAt - S.spec.chaos.shockAt, true)
    tr.hardened = 0
    for (const cam of ofType(S, 'camera')) {
      cam.state = 'jammed'
      cam.timer = S.spec.chaos.responseAt - S.spec.chaos.shockAt
    }
  } else if (id === 'l2_flashover') {
    S.fireRate = 2
    for (const f of ofType(S, 'fire')) {
      f.intensity = Math.min(3, f.intensity + 1)
      f.grow = 0
      f.state = FIRE_LABEL[f.intensity]
    }
    for (const l of ofType(S, 'lights')) {
      l.state = 'dark'
      l.timer = S.spec.chaos.responseAt - S.spec.chaos.shockAt
      l.hardened = 0
    }
  } else if (id === 'l3_brake_failure') {
    const cr = ofType(S, 'crane')[0]
    cr.state = 'overload'
    cr.timer = S.spec.chaos.responseAt - S.spec.chaos.shockAt
    cr.hardened = 0
    swingFrom(cr, S.tSec, cr.cfg.ampWild, cr.cfg.periodWild)
    for (const l of ofType(S, 'lights')) {
      l.state = 'dark'
      l.timer = S.spec.chaos.responseAt - S.spec.chaos.shockAt
      l.hardened = 0
    }
  }
  pushEvent(gm, S, 'chaos', `${S.spec.chaos.name}: ${S.spec.chaos.shockText}`, null, { icon: S.spec.chaos.icon, lesson: 'Chaos events shift the balance. The Saboteur gets extra energy now — but every shock is followed by a response window for the Runner.' })
}

function chaosResponse(gm, S) {
  const id = S.spec.chaos.id
  S.chaos.lock = false
  S.fireRate = 1
  // The response crews release every sabotage and give the Runner a protected window.
  for (const mid of S.order) {
    const M = S.mechs[mid]
    if (M.type === 'door' && (M.state === 'closing' || M.state === 'locked')) {
      M.state = 'open'
      M.timer = 0
    }
    if (M.type === 'camera' && (M.state === 'jammed' || M.state === 'rebooting')) {
      M.state = 'rebooting'
      M.timer = 3
    }
    if (M.type === 'lights' && (M.state === 'dark' || M.state === 'flicker')) {
      M.state = 'restoring'
      M.timer = 3
    }
    if (M.type === 'noise' && M.state === 'blaring') {
      stopAttract(gm, S, M.id)
      M.state = 'idle'
      M.timer = 0
    }
    if (M.type === 'plate' && M.state === 'armed') {
      M.state = 'idle'
      M.timer = 0
    }
    if (M.type !== 'fire' && M.type !== 'traffic' && M.type !== 'crane') M.hardened = Math.max(M.hardened, 15)
  }
  if (id === 'l1_gridlock') {
    const tr = ofType(S, 'traffic')[0]
    setTrafficMode(gm, S, tr, 'walk', 16, true)
    tr.hardened = 26
    tr.runCd = 0
  } else if (id === 'l2_flashover') {
    for (const f of ofType(S, 'fire')) {
      f.intensity = Math.max(0, f.intensity - 1)
      f.grow = 0
      f.inferno = 0
      f.state = FIRE_LABEL[f.intensity]
    }
    const valve = ofType(S, 'valve')[0]
    const panel = gm.objects.obj_electrical_panel
    if (valve && (!panel || panel.state === 'tripped')) {
      valve.state = 'open'
      valve.timer = 25
      valve.crank = 0
    }
  } else if (id === 'l3_brake_failure') {
    const cr = ofType(S, 'crane')[0]
    const t = S.tSec
    const x = motionPos(cr.hazard.motion, t)
    cr.state = 'parking'
    cr.timer = 3
    cr.hazard.motion = { k: 'lerp', from: x, to: cr.cfg.parkX, t0: t, dur: 3 }
    cr.hardened = 30
  }
  pushEvent(gm, S, 'chaos', `${S.spec.chaos.name} — RESPONSE: ${S.spec.chaos.responseText}`, null, { icon: '🚑', noLesson: true })
}

function tickChaos(gm, S) {
  const c = S.spec.chaos
  const t = S.tSec
  let phase = 'idle'
  if (t >= c.endAt) phase = 'ended'
  else if (t >= c.responseAt) phase = 'response'
  else if (t >= c.shockAt) phase = 'shock'
  else if (t >= c.warnAt) phase = 'warning'
  if (phase === 'warning' && S.chaos.phase !== 'warning') {
    pushEvent(gm, S, 'chaos', `${c.name} incoming: ${c.warnText}`, null, { icon: c.icon, noLesson: true })
  }
  if ((phase === 'shock' || phase === 'response' || phase === 'ended') && !S.chaos.applied.shock) {
    S.chaos.applied.shock = true
    chaosShock(gm, S)
  }
  if ((phase === 'response' || phase === 'ended') && !S.chaos.applied.response) {
    S.chaos.applied.response = true
    chaosResponse(gm, S)
  }
  if (phase === 'ended' && S.chaos.phase !== 'ended') {
    pushEvent(gm, S, 'chaos', `${c.name} is over. The board is reset — finish your objectives!`, null, { icon: '✅', noLesson: true })
  }
  S.chaos.phase = phase
}

// ─────────────────────────────────────────────────────────────
// PER-SECOND TICK
// ─────────────────────────────────────────────────────────────
function tickMechanics(gm) {
  const S = gm.mech
  if (!S) return
  S.tSec += 1
  S.lastTickWall = Date.now()

  for (const id of S.order) {
    const M = S.mechs[id]
    if (M.hardened > 0) M.hardened = Math.max(0, M.hardened - 1)
    if (M.sabCd > 0) M.sabCd = Math.max(0, M.sabCd - 1)
    if (M.runCd > 0) M.runCd = Math.max(0, M.runCd - 1)
    TYPES[M.type].tick(gm, S, M)
  }

  // crowd sources that are not tied to a mechanism state machine (trap plates)
  for (const src of S.attract.slice()) {
    if (S.tSec >= src.until) stopAttract(gm, S, src.key)
    else assertAttract(gm, S, src)
  }

  tickChaos(gm, S)

  // All fires out → Runner bonus (once per round)
  const fires = ofType(S, 'fire')
  if (fires.length && !S.fireOutAwarded && fires.every((f) => f.intensity === 0)) {
    S.fireOutAwarded = true
    const rid = playerIdByRole(gm, 'runner')
    gm.awardScore(rid, 'runner', 'MECH_FIRE_CONTAINED', 10, 'Contained every fire cell in the bazaar')
    pushEvent(gm, S, 'repair', 'All fire cells are out — the bazaar is safe!', fires[0], { noLesson: true })
  }

  // Trap plates also fire if somebody is simply standing on them
  for (const pid in S.pos) {
    for (const plate of ofType(S, 'plate')) {
      if (plate.state === 'armed' && inRect(plate.rect, S.pos[pid].x, S.pos[pid].z, 0.2)) firePlate(gm, S, plate, pid)
    }
  }

  syncAnchors(gm, S)
}

// ─────────────────────────────────────────────────────────────
// ACTION ROUTER
// ─────────────────────────────────────────────────────────────
function handleMechAction(gm, objId, role) {
  const S = gm.mech
  const M = S && S.mechs[objId]
  if (!M) return fail('Mechanism not found')
  if (gm.phase !== 'ROUND_ACTIVE' || gm.isPaused) return fail('The round is not active.')
  const actorId = playerIdByRole(gm, role)
  const ctx = { role, actorId, pos: actorId ? S.pos[actorId] || null : null }
  const T = TYPES[M.type]
  const res = role === 'saboteur' ? T.sabotage(gm, S, M, ctx) : T.counter(gm, S, M, ctx)
  syncAnchors(gm, S)
  if (res.success) res.objState = gm.objects[M.id]
  return res
}

function gateCheck(gm, objId) {
  const S = gm.mech
  if (!S) return null
  for (const id of S.order) {
    const M = S.mechs[id]
    if (M.type === 'door' && M.cfg.gates === objId && M.state === 'locked') {
      return `The ${M.cfg.verb} is shut — override it at its control post first (${Math.ceil(M.timer)}s until auto-reset).`
    }
  }
  return null
}

// ─────────────────────────────────────────────────────────────
// SNAPSHOT (public — role only selects the prompt text)
// ─────────────────────────────────────────────────────────────
function buildSnapshot(gm, role) {
  const S = gm.mech
  if (!S) return null
  const items = S.order.map((id) => {
    const M = S.mechs[id]
    const T = TYPES[M.type]
    return {
      id: M.id,
      type: M.type,
      name: M.name,
      icon: M.icon,
      x: M.x,
      z: M.z,
      radius: M.radius,
      state: M.state,
      timer: Math.ceil(M.timer || 0),
      hardened: Math.ceil(M.hardened || 0),
      prompt: role === 'runner' || role === 'saboteur' ? T.prompt(S, M, role) : null,
      ...T.pub(M)
    }
  })
  const c = S.spec.chaos
  const t = S.tSec
  const phase = S.chaos.phase
  const nextAt = phase === 'idle' || phase === 'warning' ? c.shockAt : phase === 'shock' ? c.responseAt : phase === 'response' ? c.endAt : 0
  return {
    v: MECH_VERSION,
    level: S.level,
    epoch: S.epoch,
    t,
    running: isRunning(gm),
    signature: S.spec.signature,
    items,
    hazards: S.hazards.map((h) => ({ id: h.id, kind: h.kind, z: h.z, len: h.len, wid: h.wid, tint: h.tint, dir: h.dir || 0, motion: h.motion })),
    events: S.events.slice(-8),
    chaos: {
      id: c.id,
      name: c.name,
      icon: c.icon,
      phase,
      inSec: Math.max(0, nextAt - t),
      warnText: c.warnText,
      shockText: c.shockText,
      responseText: c.responseText,
      lock: !!S.chaos.lock
    }
  }
}

// ─────────────────────────────────────────────────────────────
// PUBLIC ATTACH
// ─────────────────────────────────────────────────────────────
export function attachMechanics(GameManager) {
  const proto = GameManager.prototype
  if (proto.__mechanicsAttached) return
  proto.__mechanicsAttached = true

  const origInitObjects = proto.initObjects
  proto.initObjects = function () {
    origInitObjects.apply(this, arguments)
    this.mech = createState(this)
    registerAnchors(this, this.mech)
  }

  const origTick = proto.tick
  proto.tick = function () {
    const wasActive = this.phase === 'ROUND_ACTIVE' && !this.isPaused
    const out = origTick.apply(this, arguments)
    if (wasActive && this.phase === 'ROUND_ACTIVE' && !this.isPaused) {
      try {
        tickMechanics(this)
      } catch (err) {
        console.error('[mechanics] tick error', err)
      }
    }
    return out
  }

  const origHandleObjectAction = proto.handleObjectAction
  proto.handleObjectAction = function (objId, actionType, playerRole) {
    if (typeof objId === 'string' && objId.startsWith('mech_')) {
      return handleMechAction(this, objId, playerRole)
    }
    if (this.mech && this.phase === 'ROUND_ACTIVE') {
      const gate = gateCheck(this, objId)
      if (gate) return { success: false, message: gate }
      // Darkness: you cannot work controls you cannot see — unless you stand in the emergency light.
      const obj = this.objects[objId]
      const actorId = playerIdByRole(this, playerRole)
      const p = actorId ? this.mech.pos[actorId] : null
      if (obj && p && isDarkAt(this.mech, p.x, p.z) && dist2(p.x, p.z, obj.position.x, obj.position.z) > 2.8) {
        return {
          success: false,
          message: `It is too dark to work the ${obj.name} from here. Step closer (within 2.8m) or restore the lights.`
        }
      }
    }
    return origHandleObjectAction.apply(this, arguments)
  }

  const origTelemetry = proto.getTelemetry
  proto.getTelemetry = function () {
    const t = origTelemetry.apply(this, arguments)
    t.mechanisms = buildSnapshot(this, null)
    return t
  }

  const origTelemetryFor = proto.getTelemetryForPlayer
  proto.getTelemetryForPlayer = function (playerId, role) {
    const t = origTelemetryFor.apply(this, arguments)
    t.mechanisms = buildSnapshot(this, role)
    return t
  }

  const origDebrief = proto.generateCivicDebrief
  proto.generateCivicDebrief = function () {
    const d = origDebrief.apply(this, arguments)
    try {
      const S = this.mech
      if (d && S) {
        const right = Object.values(S.stats.fixed)
        const wrong = Object.entries(S.stats.sabotaged)
          .filter(([, v]) => !v.countered)
          .map(([, v]) => v)
        d.whatYouDidRight = (d.whatYouDidRight || []).concat(
          right.slice(0, 3).map((r) => `Countered tampering at the ${r.text} — spotting and repairing sabotage keeps people safe.`)
        )
        d.whatToImprove = (d.whatToImprove || []).concat(
          wrong.slice(0, 3).map((w) => `The ${w.text} sabotage went unanswered. ${w.lesson}`)
        )
        const lessons = Array.from(new Set(Object.values(S.stats.fixed).map((r) => r.lesson))).slice(0, 2)
        if (lessons.length) d.mechanismLessons = lessons
      }
    } catch (err) {
      console.error('[mechanics] debrief error', err)
    }
    return d
  }

  proto.getMechanismSnapshot = function (role) {
    return buildSnapshot(this, role || null)
  }

  /** Dynamic colliders at the current instant (for server-authoritative movement). */
  proto.getDynamicObstacles = function () {
    const S = this.mech
    if (!S) return []
    const t = mechTime(this)
    const out = []
    for (const id of S.order) {
      const M = S.mechs[id]
      if (M.type === 'door' && M.state === 'locked') out.push({ id: M.id, name: M.name, ...M.cfg.rect })
      if (M.type === 'fire' && M.intensity >= 3) out.push({ id: M.id, name: M.name, ...M.rect })
    }
    for (const h of S.hazards) {
      const x = motionPos(h.motion, t)
      out.push({ id: h.id, name: h.kind === 'car' ? 'Moving Vehicle' : 'Swinging Crane Load', ...rectC(x, h.z, h.len / 2, h.wid / 2) })
    }
    return out
  }

  proto.onPlayerMoved = function (playerId, x, z) {
    const S = this.mech
    if (!S || !playerId) return
    S.pos[playerId] = { x, z }
    if (this.phase !== 'ROUND_ACTIVE' || this.isPaused) return
    for (const id of S.order) {
      const M = S.mechs[id]
      if (M.type === 'plate' && M.state === 'armed' && inRect(M.rect, x, z, 0.2)) {
        firePlate(this, S, M, playerId)
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────
// TEST SUPPORT
// ─────────────────────────────────────────────────────────────
/** Worst-case simultaneous colliders (all gates locked, all fires inferno, full hazard sweep bands). */
export function worstCaseObstacles(level) {
  const spec = levelSpec(level)
  const out = []
  for (const s of spec.mechs) {
    // Gated doors seal an interior for <= lockSec and are instantly overridable by the Runner (tested separately).
    if (s.type === 'door' && !s.gates) out.push({ id: s.id, ...s.rect })
    if (s.type === 'fire') out.push({ id: s.id, ...rectC(s.x, s.z, s.half, s.half) })
    if (s.type === 'crane') {
      const reach = s.ampWild + CRANE_LOAD / 2
      out.push({ id: `${s.id}_band`, minX: s.cx - reach, maxX: s.cx + reach, minZ: s.z0 - CRANE_LOAD / 2, maxZ: s.z0 + CRANE_LOAD / 2 })
    }
  }
  return out
}

export function mechanismSpecs(level) {
  return levelSpec(level)
}
