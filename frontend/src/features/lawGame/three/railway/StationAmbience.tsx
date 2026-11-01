import { useFrame, useThree } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { RoomQueries } from '../RoomQueries.ts'
import {
  CONCOURSE_NORTH,
  CROSSING_EAST,
  CROSSING_WEST,
  EAST,
  PLATFORM_NORTH,
  PLATFORM_SOUTH,
  PLATFORM_TOP,
  PLAZA_SOUTH,
  WEST,
  type RailwayQueries,
} from './RailwayQueries.ts'
import { coachTexture, departureBoardTexture, glowTexture, skyTexture, tapeTexture } from './textures.ts'

const WARM = '#ffcf8a'
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function Sky() {
  return (
    <mesh renderOrder={-1}>
      <sphereGeometry args={[200, 32, 16]} />
      <meshBasicMaterial map={skyTexture()} side={THREE.BackSide} fog={false} toneMapped={false} depthWrite={false} />
    </mesh>
  )
}

function Glow({ position, color = WARM, size = 2.2, opacity = 0.85 }: { position: [number, number, number]; color?: string; size?: number; opacity?: number }) {
  return (
    <sprite position={position} scale={size}>
      <spriteMaterial map={glowTexture()} color={color} blending={THREE.AdditiveBlending} transparent opacity={opacity} depthWrite={false} toneMapped={false} fog={false} />
    </sprite>
  )
}

/** The model's own lamp posts, lit. One has a failing tube, as there always is. */
const LAMPS: ReadonlyArray<[number, number, number]> = [
  [-14.5, 5.42, 10.9],
  [-2.5, 5.42, 10.9],
  [11.1, 5.42, 10.9],
]

function Lamps() {
  const flicker = useRef<THREE.SpriteMaterial>(null)
  const time = useRef(0)
  const still = useMemo(() => reducedMotion(), [])
  useFrame((_, dt) => {
    if (still || !flicker.current) return
    time.current += dt
    const t = time.current
    // Mostly steady, with a stutter every few seconds.
    flicker.current.opacity = Math.sin(t * 0.9) > 0.92 && Math.sin(t * 43) > 0 ? 0.2 : 0.85
  })
  return (
    <>
      {LAMPS.map((p, i) => (
        <sprite key={i} position={p} scale={2.4}>
          <spriteMaterial ref={i === 1 ? flicker : undefined} map={glowTexture()} color={WARM} blending={THREE.AdditiveBlending} transparent opacity={0.85} depthWrite={false} toneMapped={false} fog={false} />
        </sprite>
      ))}
    </>
  )
}

/** Tube lights hung from the platform canopy. One instanced mesh, however many there are. */
function CanopyLights() {
  const positions = useMemo(() => {
    const list: [number, number, number][] = []
    for (let x = -3; x <= EAST; x += 7) list.push([x, 3.5, (PLATFORM_NORTH + PLATFORM_SOUTH) / 2])
    return list
  }, [])
  const setRef = (mesh: THREE.InstancedMesh | null) => {
    if (!mesh) return
    const place = new THREE.Object3D()
    positions.forEach((p, i) => {
      place.position.set(...p)
      place.updateMatrix()
      mesh.setMatrixAt(i, place.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }
  return (
    <>
      <instancedMesh ref={setRef} args={[undefined, undefined, positions.length]}>
        <boxGeometry args={[1.5, 0.07, 0.14]} />
        <meshBasicMaterial color="#fff3d6" toneMapped={false} />
      </instancedMesh>
      {positions.map((p, i) => (
        <Glow key={i} position={p} size={2.6} opacity={0.5} />
      ))}
    </>
  )
}

const SPARK_COUNT = 18
// Shared rather than per-mount: only one canvas is ever open, and this allocates nothing while running.
const sparkVelocity = new Float32Array(SPARK_COUNT * 3)
const sparkPositions = new Float32Array(SPARK_COUNT * 3)

/** The dead signal over the cabinet: its lamp stutters and the cut cable throws sparks. */
function DeadSignal() {
  const lens = useRef<THREE.MeshBasicMaterial>(null)
  const glow = useRef<THREE.SpriteMaterial>(null)
  const points = useRef<THREE.Points>(null)
  const time = useRef(0)
  const nextBurst = useRef(1.5)
  const still = useMemo(() => reducedMotion(), [])

  useFrame((_, dt) => {
    if (still) return
    time.current += dt
    const t = time.current
    const on = Math.sin(t * 2.2) > 0.75 && Math.sin(t * 31) > -0.4
    if (lens.current) lens.current.color.set(on ? '#ff3a2c' : '#3a0d0a')
    if (glow.current) glow.current.opacity = on ? 0.95 : 0.05

    const p = points.current
    if (!p) return
    if (t > nextBurst.current) {
      nextBurst.current = t + 2 + (Math.sin(t * 7.3) + 1) * 1.5
      for (let i = 0; i < SPARK_COUNT; i++) {
        sparkPositions[i * 3] = sparkPositions[i * 3 + 1] = sparkPositions[i * 3 + 2] = 0
        sparkVelocity[i * 3] = Math.sin(i * 12.9) * 1.1
        sparkVelocity[i * 3 + 1] = 0.9 + Math.abs(Math.sin(i * 78.2)) * 1.5
        sparkVelocity[i * 3 + 2] = Math.cos(i * 37.7) * 1.1
      }
      p.visible = true
    }
    if (!p.visible) return
    for (let i = 0; i < SPARK_COUNT; i++) {
      sparkVelocity[i * 3 + 1] -= 5.5 * dt
      sparkPositions[i * 3] += sparkVelocity[i * 3] * dt
      sparkPositions[i * 3 + 1] += sparkVelocity[i * 3 + 1] * dt
      sparkPositions[i * 3 + 2] += sparkVelocity[i * 3 + 2] * dt
    }
    p.geometry.attributes.position.needsUpdate = true
    if (t > nextBurst.current - 1.2) p.visible = false
  })

  const x = -25.6
  const z = 6.68
  return (
    <group position={[x, PLATFORM_TOP, z]}>
      <mesh position={[0, 2, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 4, 8]} />
        <meshStandardMaterial color="#2a2d33" />
      </mesh>
      <mesh position={[0, 3.95, 0.02]}>
        <boxGeometry args={[0.36, 0.8, 0.14]} />
        <meshStandardMaterial color="#0c0d11" />
      </mesh>
      <mesh position={[0, 4.12, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.03, 16]} />
        <meshBasicMaterial ref={lens} color="#ff3a2c" toneMapped={false} />
      </mesh>
      <mesh position={[0, 3.78, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.03, 16]} />
        <meshBasicMaterial color="#10261a" />
      </mesh>
      <sprite position={[0, 4.12, 0.14]} scale={1.5}>
        <spriteMaterial ref={glow} map={glowTexture()} color="#ff3a2c" blending={THREE.AdditiveBlending} transparent depthWrite={false} toneMapped={false} fog={false} />
      </sprite>
      <points ref={points} position={[0, 0.5, -0.98]} visible={false} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[sparkPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#ffd27a" size={0.05} blending={THREE.AdditiveBlending} transparent depthWrite={false} toneMapped={false} />
      </points>
    </group>
  )
}

/** Laid over the model's blank notice board. */
function DepartureBoard() {
  return (
    <mesh position={[-15.75, 1.78, 13.04]} rotation={[0, Math.PI, 0]}>
      <planeGeometry args={[1.42, 1.78]} />
      <meshBasicMaterial map={departureBoardTexture()} toneMapped={false} />
    </mesh>
  )
}

/** Painted warning lines along every edge that drops to the track. */
function SafetyLines() {
  const lines: ReadonlyArray<[number, number, number]> = [
    [(WEST + EAST) / 2, PLATFORM_TOP + 0.006, PLATFORM_NORTH - 0.08],
    [(WEST + EAST) / 2, PLATFORM_TOP + 0.006, PLATFORM_SOUTH + 0.08],
    [(WEST + EAST) / 2, 0.006, CONCOURSE_NORTH - 0.08],
  ]
  return (
    <>
      {lines.map((position, i) => (
        <mesh key={i} position={position} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[EAST - WEST + 2, 0.1]} />
          <meshStandardMaterial color="#ffcf3a" emissive="#6a4d05" roughness={0.8} />
        </mesh>
      ))}
    </>
  )
}

function Tape({ from, to }: { from: [number, number]; to: [number, number] }) {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1])
  const texture = useMemo(() => {
    const t = tapeTexture().clone()
    t.repeat.set(Math.max(1, Math.round(length / 3.2)), 1)
    t.needsUpdate = true
    return t
  }, [length])
  const mid: [number, number, number] = [(from[0] + to[0]) / 2, 0.98, (from[1] + to[1]) / 2]
  const angle = Math.atan2(from[1] - to[1], to[0] - from[0])
  return (
    <>
      <mesh position={mid} rotation={[0, angle, 0]}>
        <planeGeometry args={[length, 0.13]} />
        <meshStandardMaterial map={texture} side={THREE.DoubleSide} emissive="#3d2f06" roughness={0.7} />
      </mesh>
      {[from, to].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.55, z]}>
          <cylinderGeometry args={[0.03, 0.05, 1.1, 8]} />
          <meshStandardMaterial color="#e8562a" />
        </mesh>
      ))}
    </>
  )
}

function Tapes() {
  const pad = 0.35
  return (
    <>
      <Tape from={[EAST + pad, 8.85]} to={[EAST + pad, 14.6]} />
      <Tape from={[EAST + pad, 4.45]} to={[EAST + pad, 6.75]} />
      <Tape from={[WEST - pad, 4.45]} to={[WEST - pad, 6.75]} />
      <Tape from={[WEST - pad, 8.85]} to={[WEST - pad, PLAZA_SOUTH + pad]} />
      <Tape from={[WEST - pad, PLAZA_SOUTH + pad]} to={[-12.6, PLAZA_SOUTH + pad]} />
    </>
  )
}

const TRAIN_LENGTH = 112
const TRAIN_SPEED = 30
const TRAIN_START = -170
const TRAIN_END = 190 + TRAIN_LENGTH
const TRACK_Z = 7.72
const FIRST_TRAIN_S = 24
const TRAIN_EVERY_S = 52

/** A short two-tone horn, drawn in the browser. Stays silent if the page has no audio permission yet. */
function soundHorn() {
  try {
    const audio = new AudioContext()
    const gain = audio.createGain()
    gain.gain.setValueAtTime(0, audio.currentTime)
    gain.gain.linearRampToValueAtTime(0.045, audio.currentTime + 0.08)
    gain.gain.setValueAtTime(0.045, audio.currentTime + 1.1)
    gain.gain.linearRampToValueAtTime(0, audio.currentTime + 1.5)
    gain.connect(audio.destination)
    for (const frequency of [311, 370]) {
      const osc = audio.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.value = frequency
      osc.connect(gain)
      osc.start()
      osc.stop(audio.currentTime + 1.55)
    }
    window.setTimeout(() => void audio.close(), 1800)
  } catch {
    // No audio is fine: the crossing lights still warn the player.
  }
}

/** An express through the near line, every minute or so. The crossing shuts while it passes. */
function PassingTrain({ q }: { q: RailwayQueries }) {
  const { camera } = useThree()
  const train = useRef<THREE.Group>(null)
  const lightL = useRef<THREE.MeshBasicMaterial>(null)
  const lightR = useRef<THREE.MeshBasicMaterial>(null)
  const wait = useRef(FIRST_TRAIN_S)
  const running = useRef(false)
  const blink = useRef(0)
  const closed = useRef(false)
  const still = useMemo(() => reducedMotion(), [])
  const side = useMemo(() => {
    const t = coachTexture().clone()
    t.repeat.set(8, 1)
    t.needsUpdate = true
    return t
  }, [])

  useFrame((_, dt) => {
    if (still || !train.current) return
    const g = train.current
    if (!running.current) {
      wait.current -= dt
      // Never start one with somebody standing on the boards: try again next frame.
      if (wait.current > 0 || q.isOnCrossing(camera.position.x, camera.position.z)) return
      running.current = true
      g.position.x = TRAIN_START
      g.visible = true
      // Shut from the horn on: the train is still seconds away, so nobody is caught on the boards.
      q.setCrossingOpen(false)
      closed.current = true
      soundHorn()
    }
    g.position.x += TRAIN_SPEED * Math.min(dt, 0.1)
    const nose = g.position.x
    if (closed.current && nose - TRAIN_LENGTH > CROSSING_EAST + 3) {
      closed.current = false
      q.setCrossingOpen(true)
    }

    blink.current += dt
    const phase = Math.sin(blink.current * 9) > 0
    lightL.current?.color.set(closed.current && phase ? '#ff3a2c' : '#3a0d0a')
    lightR.current?.color.set(closed.current && !phase ? '#ff3a2c' : '#3a0d0a')

    if (nose > TRAIN_END) {
      running.current = false
      g.visible = false
      wait.current = TRAIN_EVERY_S
    }
  })

  return (
    <>
      <group ref={train} position={[TRAIN_START, 0, TRACK_Z]} visible={false}>
        {/* The group's x is the train's nose. */}
        <mesh position={[-TRAIN_LENGTH / 2, 1.42, -0.72]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[TRAIN_LENGTH, 2]} />
          <meshBasicMaterial map={side} />
        </mesh>
        <mesh position={[-TRAIN_LENGTH / 2, 1.42, 0.72]}>
          <planeGeometry args={[TRAIN_LENGTH, 2]} />
          <meshBasicMaterial map={side} />
        </mesh>
        <mesh position={[-TRAIN_LENGTH / 2, 2.5, 0]}>
          <boxGeometry args={[TRAIN_LENGTH, 0.18, 1.5]} />
          <meshStandardMaterial color="#6f6c78" />
        </mesh>
        <mesh position={[-TRAIN_LENGTH / 2, 0.26, 0]}>
          <boxGeometry args={[TRAIN_LENGTH, 0.36, 1.2]} />
          <meshStandardMaterial color="#17181c" />
        </mesh>
        <mesh position={[0, 1.42, 0]}>
          <boxGeometry args={[0.06, 2, 1.44]} />
          <meshStandardMaterial color="#2f5f9e" />
        </mesh>
        <Glow position={[0.1, 1.9, 0]} color="#fff3d0" size={5} opacity={1} />
      </group>
      {/* Warning lights at the crossing. */}
      {([[CROSSING_WEST - 0.3, lightL], [CROSSING_EAST + 0.3, lightR]] as const).map(([x, ref]) => (
        <group key={x} position={[x, 0, CONCOURSE_NORTH - 0.1]}>
          <mesh position={[0, 0.8, 0]}>
            <cylinderGeometry args={[0.03, 0.04, 1.6, 8]} />
            <meshStandardMaterial color="#2a2d33" />
          </mesh>
          <mesh position={[0, 1.66, 0]}>
            <sphereGeometry args={[0.09, 12, 8]} />
            <meshBasicMaterial ref={ref} color="#3a0d0a" toneMapped={false} />
          </mesh>
        </group>
      ))}
    </>
  )
}

export function StationAmbience({ q }: { q: RoomQueries }) {
  return (
    <>
      <Sky />
      <Lamps />
      <CanopyLights />
      <DeadSignal />
      <DepartureBoard />
      <SafetyLines />
      <Tapes />
      <PassingTrain q={q as RailwayQueries} />
      {/* Dust hanging in the lamplight. */}
      <Sparkles count={90} scale={[48, 4, 12]} position={[-4, 2.4, 9]} size={1.6} speed={0.25} opacity={0.5} color="#ffdca0" />
    </>
  )
}
