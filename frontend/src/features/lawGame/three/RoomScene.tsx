import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { Suspense, use, useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import * as THREE from 'three'
import { EYE_HEIGHT, RUN_SPEED, WALK_SPEED } from '../config.ts'
import type { Evidence, SceneId } from '../types.ts'
import { ENVIRONMENTS, loadEnvironment, type SpawnPoint } from './environments.ts'
import { EvidenceProp } from './EvidenceProp.tsx'
import type { Speech } from '../ui/useSpeech.ts'
import { RoomQueries } from './RoomQueries.ts'

export type Vec3 = [number, number, number]

export interface RoomSceneProps {
  mode: 'hide' | 'search'
  /** Which world to load. */
  scene: SceneId
  /** The player walked up to a boundary that has a legal reason behind it. */
  onEdge?: () => void
  /** Someone in the scene said something the player should read. */
  onSpeech?: (speech: Speech) => void
  evidences: Evidence[]
  /** Hide: where each item starts (null = on the desk). Search: where the obstructor left them. */
  placed?: Record<string, Vec3>
  /** Hide mode: reports every change to item positions, and which item is in hand. */
  onItems?: (positions: Record<string, Vec3>, carried: string | null) => void
  /** Search mode: items already picked up are not drawn. */
  collected?: string[]
  onCollect?: (id: string) => void
  /** What pressing E would do right now; null when nothing is in reach. */
  onPrompt: (text: string | null) => void
  onReady: (q: RoomQueries) => void
  onLockChange: (locked: boolean) => void
  /** Stops movement and input, e.g. while a menu is up. */
  paused: boolean
}

/** Mouse-look, walking and sliding collision. Click the canvas to capture the mouse. */
function Rig({ q, spawn, paused, onLockChange }: { q: RoomQueries; spawn: SpawnPoint; paused: boolean; onLockChange: (l: boolean) => void }) {
  const { camera, gl } = useThree()
  const yaw = useRef(spawn.yaw)
  const pitch = useRef(0)
  const keys = useRef(new Set<string>())
  // Held in a ref so a new callback each render never re-runs the listener effect (its cleanup drops the pointer lock).
  const lockCb = useRef(onLockChange)
  useEffect(() => {
    lockCb.current = onLockChange
  })
  // Keyed on the numbers, not the object: the parent re-renders with the HUD and must not move the player.
  const pos = useMemo(() => new THREE.Vector3(spawn.x, EYE_HEIGHT, spawn.z), [spawn.x, spawn.z])

  useEffect(() => {
    const el = gl.domElement
    const onKey = (e: KeyboardEvent, down: boolean) => {
      if (down) keys.current.add(e.code)
      else keys.current.delete(e.code)
    }
    const kd = (e: KeyboardEvent) => onKey(e, true)
    const ku = (e: KeyboardEvent) => onKey(e, false)
    const move = (e: MouseEvent) => {
      if (document.pointerLockElement !== el) return
      yaw.current -= e.movementX * 0.0022
      pitch.current = THREE.MathUtils.clamp(pitch.current - e.movementY * 0.0022, -1.35, 1.35)
    }
    const click = () => {
      if (document.pointerLockElement !== el) el.requestPointerLock?.()
    }
    const lock = () => lockCb.current(document.pointerLockElement === el)
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    document.addEventListener('mousemove', move)
    document.addEventListener('pointerlockchange', lock)
    el.addEventListener('click', click)
    return () => {
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
      document.removeEventListener('mousemove', move)
      document.removeEventListener('pointerlockchange', lock)
      el.removeEventListener('click', click)
      if (document.pointerLockElement === el) document.exitPointerLock()
    }
  }, [gl])

  useEffect(() => {
    if (paused && document.pointerLockElement === gl.domElement) document.exitPointerLock()
  }, [paused, gl])

  useFrame((_, dt) => {
    const k = keys.current
    let walked = 0
    if (!paused) {
      const f = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0)
      const r = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0)
      if (f || r) {
        const speed = (k.has('ShiftLeft') || k.has('ShiftRight') ? RUN_SPEED : WALK_SPEED) * Math.min(dt, 0.05)
        const len = Math.hypot(f, r)
        const sin = Math.sin(yaw.current)
        const cos = Math.cos(yaw.current)
        // yaw 0 faces -z; forward = (-sin, -cos), right = (cos, -sin)
        const dx = ((-sin * f + cos * r) / len) * speed
        const dz = ((-cos * f - sin * r) / len) * speed
        const fromX = pos.x
        const fromZ = pos.z
        q.move(pos, dx, dz)
        walked = Math.hypot(pos.x - fromX, pos.z - fromZ)
      }
    }
    camera.position.copy(pos)
    camera.position.setY(pos.y + q.floorAt(pos.x, pos.z) + q.headBob(walked))
    camera.rotation.set(pitch.current, yaw.current, 0, 'YXZ')
  })
  return null
}

/** Finds what the crosshair is on, and handles the E key for the current mode. */
function Interaction(props: RoomSceneProps & {
  q: RoomQueries
  itemsRef: RefObject<THREE.Group | null>
  positions: Record<string, Vec3>
  setPositions: (p: Record<string, Vec3>) => void
  carried: string | null
  setCarried: (id: string | null) => void
  ghostRef: RefObject<THREE.Group | null>
}) {
  const { camera } = useThree()
  const { q, mode, paused, evidences, positions, setPositions, carried, setCarried, itemsRef, ghostRef } = props
  const { reach, placeExtra } = ENVIRONMENTS[props.scene]
  const focus = useRef<string | null>(null)
  const aimPoint = useRef<{ point: THREE.Vector3; normal: THREE.Vector3 } | null>(null)
  const lastPrompt = useRef<string | null | undefined>(undefined)
  const tick = useRef(0)
  /** Where an item aimed at (point, normal) comes to rest: on the surface, or dropped below if it is a wall. */
  const restPoint = useCallback(
    (a: { point: THREE.Vector3; normal: THREE.Vector3 }): THREE.Vector3 => {
      if (a.normal.y >= 0.6) return a.point.clone().addScaledVector(a.normal, 0.005)
      const p = a.point.clone().addScaledVector(a.normal, 0.15)
      p.y = (q.surfaceY(p.x, p.z, p.y + 0.1) ?? 0) + 0.005
      return p
    },
    [q],
  )
  const names = useMemo(() => new Map(evidences.map((e) => [e.id, e.name])), [evidences])

  const say = useCallback(
    (t: string | null) => {
      if (lastPrompt.current === t) return
      lastPrompt.current = t
      props.onPrompt(t)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.onPrompt],
  )

  useFrame(() => {
    if (paused || document.pointerLockElement === null) {
      say(null)
      if (ghostRef.current) ghostRef.current.visible = false
      return
    }
    if (mode === 'hide' && carried) {
      const a = q.aim(camera, reach + placeExtra)
      aimPoint.current = a
      const g = ghostRef.current
      if (g) {
        g.visible = !!a
        if (a) g.position.copy(restPoint(a))
      }
      say(a ? `E  Place ${names.get(carried)} here` : `Look at a surface to place ${names.get(carried)}`)
      return
    }
    if (++tick.current % 2) return
    const items = itemsRef.current
    const hit = items ? q.pick(camera, reach, items.children) : null
    let id: string | null = null
    for (let o: THREE.Object3D | null = hit?.object ?? null; o; o = o.parent) {
      if (o.userData.evidenceId) {
        id = o.userData.evidenceId as string
        break
      }
    }
    focus.current = id
    if (!id) say(q.contextPrompt())
    else say(mode === 'hide' ? `E  Pick up ${names.get(id)}` : 'E  Collect evidence')
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyE' || e.repeat || paused || document.pointerLockElement === null) return
      if (mode === 'hide') {
        if (carried) {
          const a = aimPoint.current
          if (!a) return
          const p = restPoint(a)
          setPositions({ ...positions, [carried]: [p.x, p.y, p.z] })
          setCarried(null)
        } else if (focus.current) {
          setCarried(focus.current)
        } else {
          q.contextAct()
        }
      } else if (focus.current) {
        props.onCollect?.(focus.current)
        focus.current = null
      } else {
        q.contextAct()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, paused, carried, positions, setPositions, setCarried, restPoint, props, q])

  return null
}

function World({ props }: { props: RoomSceneProps }) {
  const { mode, evidences, collected = [] } = props
  const env = use(loadEnvironment(props.scene))
  const [q, setQ] = useState<RoomQueries | null>(null)
  const rootRef = useRef<THREE.Group>(null)
  const itemsRef = useRef<THREE.Group>(null)
  const ghostRef = useRef<THREE.Group>(null)
  const [positions, setPositions] = useState<Record<string, Vec3> | null>(null)
  const [carried, setCarried] = useState<string | null>(null)
  const { onItems, onReady } = props

  // The model is in place once the group has children: build the queries and lay out the desk.
  const setRoot = useCallback(
    (g: THREE.Group | null) => {
      rootRef.current = g
      if (!g || q) return
      const queries = env.createQueries(g)
      setQ(queries)
      onReady(queries)
      if (props.placed) {
        setPositions(props.placed)
        return
      }
      const desk = queries.box(env.itemsRestOn)
      const c = desk ? desk.getCenter(new THREE.Vector3()) : new THREE.Vector3(0, 0.77, 1.6)
      const next: Record<string, Vec3> = {}
      for (const e of evidences) {
        const x = c.x + e.deskOffset[0]
        const z = c.z + e.deskOffset[1]
        next[e.id] = [x, (queries.surfaceY(x, z) ?? desk?.max.y ?? 0.77) + 0.002, z]
      }
      setPositions(next)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q],
  )

  useEffect(() => {
    if (mode === 'hide' && positions) onItems?.(positions, carried)
  }, [mode, positions, carried, onItems])

  const onEdge = props.onEdge
  useEffect(() => {
    if (!q) return
    q.setEdgeListener(onEdge ?? null)
    return () => q.setEdgeListener(null)
  }, [q, onEdge])

  const byId = useMemo(() => new Map(evidences.map((e) => [e.id, e])), [evidences])

  return (
    <>
      <env.Lights />
      <group ref={setRoot} scale={env.scale}>
        <env.Scenery />
      </group>
      {q && env.Ambience && <env.Ambience q={q} onSpeech={props.onSpeech} />}
      {q && positions && (
        <>
          <Rig q={q} spawn={env.spawn(q)} paused={props.paused} onLockChange={props.onLockChange} />
          <group ref={itemsRef}>
            {evidences.map((e) => {
              const p = positions[e.id]
              if (!p) return null
              if (mode === 'hide' && carried === e.id) return null
              if (mode === 'search' && collected.includes(e.id)) return null
              return <EvidenceProp key={e.id} evidenceId={e.id} kind={e.kind} position={p} rotation={[0, (e.deskOffset[0] * 7) % 3, 0]} />
            })}
          </group>
          {carried && (
            <group ref={ghostRef} visible={false}>
              <EvidenceProp evidenceId={carried} kind={byId.get(carried)!.kind} ghost />
            </group>
          )}
          <Interaction
            {...props}
            q={q}
            itemsRef={itemsRef}
            ghostRef={ghostRef}
            positions={positions}
            setPositions={setPositions}
            carried={carried}
            setCarried={setCarried}
          />
        </>
      )}
    </>
  )
}

export function RoomScene(props: RoomSceneProps) {
  const meta = ENVIRONMENTS[props.scene]
  // Heavier worlds give up resolution before they give up frame rate.
  const [dpr, setDpr] = useState<number | [number, number]>(meta.dpr)
  return (
    <Canvas
      camera={{ fov: 72, near: 0.05, far: meta.far, position: [0, EYE_HEIGHT, 0] }}
      dpr={dpr}
      gl={{ antialias: true }}
      onCreated={({ scene }) => {
        scene.background = new THREE.Color(meta.background)
      }}
    >
      {meta.adaptive && <PerformanceMonitor onDecline={() => setDpr(1)} />}
      <Suspense fallback={null}>
        <World props={props} />
      </Suspense>
    </Canvas>
  )
}
