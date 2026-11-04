import { useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useLawGame } from '../../store/useLawGame.ts'
import type { Speech } from '../../ui/useSpeech.ts'
import { isEngaged } from '../engaged.ts'
import type { RoomQueries } from '../RoomQueries.ts'
import { BankCrowd } from './BankCrowd.tsx'
import { TOKEN_LESSONS } from './bankCrowdData.ts'
import { SECURITY_DESK, TOKEN_BOARD, TOKEN_KIOSK, zoneOf } from './bankLayout.ts'
import type { BankQueries } from './BankQueries.ts'
import { BankSounds, type BankChime } from './BankSounds.tsx'
import { makeTokenBoard } from './bankTextures.ts'

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** How long it takes to come down from the high view. The clock runs from the click, so it is kept short. */
const LANDING_S = 2.4

function IntroShot({ q }: { q: BankQueries }) {
  useEffect(() => {
    if (reducedMotion()) {
      q.skipIntro()
      return
    }
    let tween: gsap.core.Tween | null = null
    const land = () => {
      if (tween || !isEngaged()) return
      tween = gsap.to(q.intro, { blend: 0, duration: LANDING_S, ease: 'power2.inOut' })
    }
    document.addEventListener('pointerlockchange', land)
    return () => {
      document.removeEventListener('pointerlockchange', land)
      tween?.kill()
    }
  }, [q])
  useFrame((_, dt) => {
    if (q.intro.blend > 0) q.driftIntro(Math.min(dt, 0.1))
  })
  return null
}

const DOOR_REACH_PLAYER = 3.1
const DOOR_REACH_CROWD = 2.3
const DOOR_RATE = 5
const SLIDE_SHARE = 0.92
const SWING_ANGLE = 1.75

interface DoorPanel {
  mesh: THREE.Mesh
  /** Where the model put it. */
  rest: THREE.Matrix4
  /** A slide: how far, and which way. */
  slide: THREE.Vector3 | null
  /** A swing: where its hinge is, and which way it turns. */
  hinge: THREE.Vector3 | null
  turn: number
}

interface Door {
  x: number
  z: number
  open: number
  panels: DoorPanel[]
}

const box = new THREE.Box3()
const offset = new THREE.Matrix4()
const toHinge = new THREE.Matrix4()
const fromHinge = new THREE.Matrix4()

/** Pairs each door's meshes up by name, and works out from their shape how each one moves. */
function findDoors(root: THREE.Object3D): Door[] {
  root.updateWorldMatrix(true, true)
  const groups = new Map<string, { mesh: THREE.Mesh; box: THREE.Box3 }[]>()
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return
    const match = /^(SlideDoor[A-Z]|BronzeDoor\d)/.exec(o.name)
    if (!match) return
    const list = groups.get(match[1]) ?? []
    list.push({ mesh: o, box: new THREE.Box3().setFromObject(o) })
    groups.set(match[1], list)
  })
  const doors: Door[] = []
  for (const [name, parts] of groups) {
    box.makeEmpty()
    for (const part of parts) box.union(part.box)
    const centre = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const alongX = size.x >= size.z
    const swings = name.startsWith('BronzeDoor')
    const panels = parts.map(({ mesh, box: own }): DoorPanel => {
      const panelCentre = own.getCenter(new THREE.Vector3())
      const panelSize = own.getSize(new THREE.Vector3())
      const width = alongX ? panelSize.x : panelSize.z
      const away = (alongX ? panelCentre.x - centre.x : panelCentre.z - centre.z) >= 0 ? 1 : -1
      return {
        mesh,
        rest: mesh.matrix.clone(),
        slide: swings ? null : new THREE.Vector3(alongX ? away * width * SLIDE_SHARE : 0, 0, alongX ? 0 : away * width * SLIDE_SHARE),
        hinge: swings ? (alongX ? new THREE.Vector3(box.min.x, 0, centre.z) : new THREE.Vector3(centre.x, 0, box.min.z)) : null,
        turn: centre.x < -2.25 ? 1 : -1,
      }
    })
    doors.push({ x: centre.x, z: centre.z, open: 0, panels })
  }
  return doors
}

function poseDoor(door: Door) {
  const eased = door.open * door.open * (3 - 2 * door.open)
  for (const panel of door.panels) {
    if (panel.slide) {
      offset.makeTranslation(panel.slide.x * eased, 0, panel.slide.z * eased)
    } else if (panel.hinge) {
      toHinge.makeTranslation(panel.hinge.x, 0, panel.hinge.z)
      fromHinge.makeTranslation(-panel.hinge.x, 0, -panel.hinge.z)
      offset.makeRotationY(eased * SWING_ANGLE * panel.turn)
      offset.premultiply(toHinge).multiply(fromHinge)
    }
    panel.mesh.matrix.multiplyMatrices(offset, panel.rest)
    panel.mesh.matrixWorldNeedsUpdate = true
  }
}

/** Sliding glass doors part for whoever walks up, and the teller gates swing. The colliders have openings there already. */
function Doors({ q, chimeRef }: { q: BankQueries; chimeRef: React.RefObject<BankChime | null> }) {
  const { camera } = useThree()
  // The doors are scene objects the frame loop moves, so they live in a ref rather than in React state.
  const doorsRef = useRef<Door[]>([])

  useEffect(() => {
    const doors = findDoors(q.root)
    doorsRef.current = doors
    for (const door of doors) for (const panel of door.panels) panel.mesh.matrixAutoUpdate = false
    return () => {
      doorsRef.current = []
      // Back as the model had them: the same meshes are used by the next screen.
      for (const door of doors) {
        for (const panel of door.panels) {
          panel.mesh.matrix.copy(panel.rest)
          panel.mesh.matrixAutoUpdate = true
          panel.mesh.matrixWorldNeedsUpdate = true
        }
      }
    }
  }, [q])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    for (const door of doorsRef.current) stepDoor(door, q, camera.position, dt, chimeRef.current)
  })
  return null
}

/** Opens a door towards whoever is near it, or closes it again, at a steady pace. */
function stepDoor(door: Door, q: BankQueries, player: THREE.Vector3, dt: number, chime: BankChime | null) {
  const playerDistance = Math.hypot(player.x - door.x, player.z - door.z)
  const want = playerDistance < DOOR_REACH_PLAYER || q.anyoneWithin(door.x, door.z, DOOR_REACH_CROWD) ? 1 : 0
  const before = door.open
  door.open += Math.sign(want - door.open) * Math.min(Math.abs(want - door.open), dt * (DOOR_RATE / 3))
  if (door.open === before) return
  if (before === 0 || before === 1) chime?.door(playerDistance)
  poseDoor(door)
}

const BOARD_FIRST_TOKEN = 42
const BOARD_EVERY_S = 11
const COUNTERS = [2, 4, 8, 11, 1, 5]
/** Printed this many ahead of the board, so the player's number comes up after a short wait. */
const TOKEN_LEAD = 1
const STATION_REACH = 1.9
const CCTV_COOLDOWN_S = 40

/** The board calls the next number, and the player's own when it comes up. */
function useTokens(chimeRef: React.RefObject<BankChime | null>, onSpeech: ((speech: Speech) => void) | undefined) {
  const [board] = useState(makeTokenBoard)
  const boardRef = useRef(board)
  useEffect(() => () => boardRef.current.texture.dispose(), [])

  const say = useRef(onSpeech)
  useEffect(() => {
    say.current = onSpeech
  })

  const state = useRef({ token: BOARD_FIRST_TOKEN, mine: null as number | null, lesson: 0, nextCall: BOARD_EVERY_S })

  useEffect(() => {
    boardRef.current.draw(BOARD_FIRST_TOKEN, COUNTERS[0])
  }, [])

  useFrame((_, dt) => {
    const s = state.current
    s.nextCall -= Math.min(dt, 0.1)
    if (s.nextCall > 0) return
    s.nextCall = BOARD_EVERY_S
    s.token += 1
    const counter = COUNTERS[s.token % COUNTERS.length]
    boardRef.current.draw(s.token, counter)
    chimeRef.current?.ding()
    if (s.mine !== null && s.token >= s.mine) {
      s.mine = null
      const lesson = TOKEN_LESSONS[s.lesson++ % TOKEN_LESSONS.length]
      say.current?.({ name: `${lesson.name}, counter ${counter}`, text: lesson.line, law: lesson.law })
    } else if (s.mine !== null) {
      say.current?.({ name: 'Token board', text: `Now serving ${s.token} at counter ${counter}. You hold ${s.mine}.`, announcement: true })
    }
  })

  const take = () => {
    const s = state.current
    if (s.mine !== null) {
      say.current?.({ name: 'Token machine', text: `You already hold token ${s.mine}. Now serving ${s.token}.` })
      return
    }
    s.mine = s.token + TOKEN_LEAD
    chimeRef.current?.print()
    say.current?.({ name: 'Token machine', text: `Token ${s.mine}. Your number will be called shortly: wait, and a teller has something for you.` })
  }

  return { board, take }
}

/**
 * The security desk. It is worth the walk for the detective: each look narrows down where one
 * item went. It costs search time to get there, and the feed only gives a place, not a location.
 * For the obstructor it is a warning, because they cannot wipe a camera.
 */
function useCameras(onSpeech: ((speech: Speech) => void) | undefined, chimeRef: React.RefObject<BankChime | null>) {
  const phase = useLawGame((s) => s.phase)
  const placements = useLawGame((s) => s.world?.placements)
  const names = useLawGame((s) => s.theCase.evidences)
  const next = useRef(0)
  const quietUntil = useRef(0)
  const say = useRef(onSpeech)
  useEffect(() => {
    say.current = onSpeech
  })

  return () => {
    const now = performance.now()
    chimeRef.current?.ding()
    if (phase !== 'search') {
      say.current?.({
        name: 'Security guard',
        text: 'These cameras record everything, and wiping a recording to protect someone is an offence on its own. Hide what you like: the detective can come and look here too.',
        law: { act: 'Bharatiya Nyaya Sanhita, 2023', section: 'Section 238', title: 'Causing disappearance of evidence', summary: '' },
      })
      return
    }
    if (now < quietUntil.current) {
      const seconds = Math.ceil((quietUntil.current - now) / 1000)
      say.current?.({ name: 'Security guard', text: `Still rewinding the next camera. Give me ${seconds} more seconds.` })
      return
    }
    const moved = (placements ?? []).filter((p) => p.moved)
    if (!moved.length) {
      say.current?.({ name: 'Security guard', text: 'Nothing on any feed: nobody moved a thing from the auditors’ table.' })
      quietUntil.current = now + CCTV_COOLDOWN_S * 1000
      return
    }
    const seen = moved[next.current++ % moved.length]
    const item = names.find((e) => e.id === seen.evidenceId)
    quietUntil.current = now + CCTV_COOLDOWN_S * 1000
    say.current?.({
      name: 'Security guard',
      text: `Camera ${(next.current % 4) + 1}: someone was carrying the ${item?.name.toLowerCase() ?? 'item'} near ${zoneOf(seen.position[0], seen.position[2])}. The picture is too grainy to say who, or exactly where.`,
    })
  }
}

const TOKEN_POINT = new THREE.Vector2(TOKEN_KIOSK[0], TOKEN_KIOSK[1])
const DESK_POINT = new THREE.Vector2(SECURITY_DESK[0], SECURITY_DESK[1])
const here = new THREE.Vector2()

/** The token machine and the security desk: what E does when nobody is in front of the player. */
function Stations({ q, chimeRef, onSpeech }: { q: BankQueries; chimeRef: React.RefObject<BankChime | null>; onSpeech?: (speech: Speech) => void }) {
  const { camera } = useThree()
  const { board, take } = useTokens(chimeRef, onSpeech)
  const review = useCameras(onSpeech, chimeRef)
  const near = useRef<'token' | 'desk' | null>(null)
  const actions = useRef({ take, review })
  useEffect(() => {
    actions.current = { take, review }
  })

  useEffect(() => () => q.setStation(null, null), [q])

  useFrame(() => {
    here.set(camera.position.x, camera.position.z)
    const now = here.distanceTo(TOKEN_POINT) < STATION_REACH ? 'token' : here.distanceTo(DESK_POINT) < STATION_REACH ? 'desk' : null
    if (now === near.current) return
    near.current = now
    if (now === 'token') q.setStation('E  Take a token', () => actions.current.take())
    else if (now === 'desk') q.setStation('E  Check the camera feeds', () => actions.current.review())
    else q.setStation(null, null)
  })

  return (
    <mesh position={[TOKEN_BOARD[0], 2.16, TOKEN_BOARD[1] + 0.016]} rotation={[0, -0.25, 0]} raycast={() => null}>
      <planeGeometry args={[1.42, 0.74]} />
      <meshBasicMaterial map={board.texture} toneMapped={false} />
    </mesh>
  )
}

/** Everything alive in the hall: the people, the doors, the machines and the sound. */
export function BankAmbience({ q, onSpeech }: { q: RoomQueries; onSpeech?: (speech: Speech) => void }) {
  const bank = q as BankQueries
  const chimeRef = useRef<BankChime | null>(null)
  return (
    <>
      <IntroShot q={bank} />
      <BankCrowd q={bank} onSpeech={onSpeech} />
      <Doors q={bank} chimeRef={chimeRef} />
      <Stations q={bank} chimeRef={chimeRef} onSpeech={onSpeech} />
      <BankSounds q={bank} onSpeech={onSpeech} chimeRef={chimeRef} />
    </>
  )
}
