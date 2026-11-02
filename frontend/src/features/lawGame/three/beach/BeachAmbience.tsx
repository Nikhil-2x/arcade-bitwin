import { useFrame } from '@react-three/fiber'
import gsap from 'gsap'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { Speech } from '../../ui/useSpeech.ts'
import type { RoomQueries } from '../RoomQueries.ts'
import { BeachCrowd } from './BeachCrowd.tsx'
import type { BeachQueries } from './BeachQueries.ts'
import { BeachSounds } from './BeachSounds.tsx'
import { skyTexture, sunTexture } from './beachTextures.ts'
import { BAR, FLAGS, SUN_DIRECTION } from './beachLayout.ts'
import { Water } from './Water.tsx'

gsap.registerPlugin(MotionPathPlugin)

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** How long the drone takes to bring the player down to the sand. The clock runs from the click, so it is kept short. */
const LANDING_S = 2.6

function Sky() {
  return (
    <>
      <mesh renderOrder={-2}>
        <sphereGeometry args={[1300, 32, 16]} />
        <meshBasicMaterial map={skyTexture()} side={THREE.BackSide} fog={false} toneMapped={false} depthWrite={false} />
      </mesh>
      <sprite position={[SUN_DIRECTION[0] * 1100, SUN_DIRECTION[1] * 1100, SUN_DIRECTION[2] * 1100]} scale={420} renderOrder={-1}>
        <spriteMaterial map={sunTexture()} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} fog={false} />
      </sprite>
    </>
  )
}

/** A drone circles the bay until the player clicks in, then eases them down onto the sand. */
function DroneShot({ q }: { q: BeachQueries }) {
  useEffect(() => {
    if (reducedMotion()) {
      q.skipDrone()
      return
    }
    let tween: gsap.core.Tween | null = null
    const land = () => {
      if (tween || !document.pointerLockElement) return
      tween = gsap.to(q.drone, { blend: 0, duration: LANDING_S, ease: 'power2.inOut' })
    }
    document.addEventListener('pointerlockchange', land)
    return () => {
      document.removeEventListener('pointerlockchange', land)
      tween?.kill()
    }
  }, [q])
  useFrame((_, dt) => {
    if (q.drone.blend > 0) q.turnDrone(Math.min(dt, 0.1))
  })
  return null
}

/** Drives a group along a smooth closed path on the water, always facing the way it is going. */
function useSailing(path: ReadonlyArray<readonly [number, number]>, seconds: number, delay = 0) {
  const group = useRef<THREE.Group>(null)
  useEffect(() => {
    const g = group.current
    if (!g) return
    if (reducedMotion()) {
      g.position.set(path[0][0], g.position.y, path[0][1])
      return
    }
    const place = { x: path[0][0], y: path[0][1] }
    const previous = { x: place.x, y: place.y }
    const tween = gsap.to(place, {
      duration: seconds,
      delay,
      repeat: -1,
      ease: 'none',
      motionPath: { path: path.map(([x, z]) => ({ x, y: z })), curviness: 1.4 },
      onUpdate: () => {
        const dx = place.x - previous.x
        const dz = place.y - previous.y
        if (dx * dx + dz * dz > 1e-6) {
          g.rotation.y = Math.atan2(dx, dz)
          previous.x = place.x
          previous.y = place.y
        }
        g.position.x = place.x
        g.position.z = place.y
      },
    })
    return () => {
      tween.kill()
    }
  }, [path, seconds, delay])
  return group
}

const KAYAK_LOOP: ReadonlyArray<readonly [number, number]> = [[-6, -8], [4, -10], [8, -2], [-2, 4], [-14, -1], [-6, -8]]

function PaddledKayak() {
  const group = useSailing(KAYAK_LOOP, 70)
  const paddle = useRef<THREE.Group>(null)
  useEffect(() => {
    if (!paddle.current || reducedMotion()) return
    const tween = gsap.fromTo(paddle.current.rotation, { z: -0.5 }, { z: 0.5, duration: 0.9, ease: 'sine.inOut', repeat: -1, yoyo: true })
    return () => {
      tween.kill()
    }
  }, [])
  return (
    <group ref={group} position={[KAYAK_LOOP[0][0], 0.06, KAYAK_LOOP[0][1]]}>
      <mesh scale={[0.34, 0.17, 1.6]}>
        <sphereGeometry args={[1, 16, 10]} />
        <meshStandardMaterial color="#f4c04e" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.34, 0]} scale={[0.19, 0.3, 0.14]}>
        <capsuleGeometry args={[1, 1, 4, 10]} />
        <meshStandardMaterial color="#3fa7c9" />
      </mesh>
      <mesh position={[0, 0.88, 0]}>
        <sphereGeometry args={[0.13, 12, 10]} />
        <meshStandardMaterial color="#b57a54" />
      </mesh>
      <group ref={paddle} position={[0, 0.5, 0.25]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.02, 0.02, 2, 8]} />
          <meshStandardMaterial color="#22262c" />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s, 0, 0]}>
            <boxGeometry args={[0.28, 0.02, 0.16]} />
            <meshStandardMaterial color="#d8452e" />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/** A jet ski out past the breakwater: well away from the swimmers, as the law expects. */
const JET_LOOP: ReadonlyArray<readonly [number, number]> = [[-70, 60], [-20, 90], [40, 80], [70, 45], [10, 55], [-40, 40], [-70, 60]]

function JetSki() {
  const group = useSailing(JET_LOOP, 42, 3)
  return (
    <group ref={group} position={[JET_LOOP[0][0], 0.2, JET_LOOP[0][1]]}>
      <mesh scale={[0.4, 0.22, 1.25]}>
        <sphereGeometry args={[1, 14, 10]} />
        <meshStandardMaterial color="#ec3a4c" roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.6, -0.2]} scale={[0.17, 0.26, 0.13]}>
        <capsuleGeometry args={[1, 1, 4, 10]} />
        <meshStandardMaterial color="#f4c04e" />
      </mesh>
      <mesh position={[0, 1.05, -0.2]}>
        <sphereGeometry args={[0.12, 12, 10]} />
        <meshStandardMaterial color="#a86f4c" />
      </mesh>
      {/* The wake: a long pale V on the water. */}
      <mesh position={[0, -0.16, -5.5]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <planeGeometry args={[2.6, 10]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.34} depthWrite={false} />
      </mesh>
    </group>
  )
}

function SailBoat({ start, end, seconds, colour, scale = 1 }: { start: readonly [number, number]; end: readonly [number, number]; seconds: number; colour: string; scale?: number }) {
  const group = useRef<THREE.Group>(null)
  useEffect(() => {
    if (!group.current || reducedMotion()) return
    const g = group.current
    const tween = gsap.to(g.position, { x: end[0], z: end[1], duration: seconds, ease: 'sine.inOut', repeat: -1, yoyo: true })
    const list = gsap.fromTo(g.rotation, { x: -0.03 }, { x: 0.04, duration: 2.4, ease: 'sine.inOut', repeat: -1, yoyo: true })
    return () => {
      tween.kill()
      list.kill()
    }
  }, [end, seconds])
  return (
    <group ref={group} position={[start[0], 0.3, start[1]]} rotation={[0, 0.9, 0]} scale={scale}>
      <mesh scale={[0.7, 0.4, 2.6]}>
        <sphereGeometry args={[1, 14, 10]} />
        <meshStandardMaterial color="#f2efe6" />
      </mesh>
      <mesh position={[0, 4, 0]}>
        <cylinderGeometry args={[0.04, 0.05, 8, 6]} />
        <meshStandardMaterial color="#6e4a2c" />
      </mesh>
      <mesh position={[0.02, 4, -0.9]} rotation={[0, Math.PI / 2, 0]}>
        <shapeGeometry args={[sailShape]} />
        <meshStandardMaterial color={colour} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

const sailShape = (() => {
  const s = new THREE.Shape()
  s.moveTo(-1.6, -3)
  s.lineTo(1.6, -3)
  s.lineTo(0.9, 3.7)
  s.closePath()
  return s
})()

function Gull({ radius, height, seconds, phase }: { radius: number; height: number; seconds: number; phase: number }) {
  const orbit = useRef<THREE.Group>(null)
  const left = useRef<THREE.Mesh>(null)
  const right = useRef<THREE.Mesh>(null)
  useEffect(() => {
    if (reducedMotion() || !orbit.current || !left.current || !right.current) return
    const tweens = [
      gsap.to(orbit.current.rotation, { y: phase + Math.PI * 2, duration: seconds, ease: 'none', repeat: -1 }),
      gsap.fromTo(left.current.rotation, { z: -0.25 }, { z: 0.55, duration: 0.42, ease: 'sine.inOut', repeat: -1, yoyo: true }),
      gsap.fromTo(right.current.rotation, { z: 0.25 }, { z: -0.55, duration: 0.42, ease: 'sine.inOut', repeat: -1, yoyo: true }),
    ]
    return () => tweens.forEach((t) => t.kill())
  }, [seconds, phase])
  return (
    <group ref={orbit} rotation={[0, phase, 0]}>
      <group position={[radius, height, 0]}>
        <mesh scale={[0.1, 0.09, 0.3]}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshStandardMaterial color="#f7f7f2" />
        </mesh>
        <mesh ref={left} position={[-0.05, 0, 0]}>
          <boxGeometry args={[0.55, 0.012, 0.16]} />
          <meshStandardMaterial color="#d9dcdf" />
        </mesh>
        <mesh ref={right} position={[0.05, 0, 0]}>
          <boxGeometry args={[0.55, 0.012, 0.16]} />
          <meshStandardMaterial color="#d9dcdf" />
        </mesh>
      </group>
    </group>
  )
}

const GULLS = [
  { radius: 22, height: 13, seconds: 34, phase: 0.4 },
  { radius: 27, height: 15, seconds: 40, phase: 2.3 },
  { radius: 16, height: 11, seconds: 28, phase: 3.9 },
  { radius: 34, height: 18, seconds: 52, phase: 5.2 },
  { radius: 12, height: 9, seconds: 25, phase: 1.5 },
]

function RedFlag({ x, z, y }: { x: number; z: number; y: number }) {
  const cloth = useRef<THREE.Mesh>(null)
  useEffect(() => {
    if (!cloth.current || reducedMotion()) return
    const tween = gsap.fromTo(cloth.current.rotation, { y: -0.55 }, { y: 0.45, duration: 0.8 + Math.abs(x) * 0.02, ease: 'sine.inOut', repeat: -1, yoyo: true })
    return () => {
      tween.kill()
    }
  }, [x])
  return (
    <group position={[x + 0.3, y, z]}>
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.025, 0.03, 3, 8]} />
        <meshStandardMaterial color="#e6e3da" />
      </mesh>
      <group ref={cloth} position={[0, 2.72, 0]}>
        <mesh position={[0.4, 0, 0]}>
          <planeGeometry args={[0.8, 0.5]} />
          <meshStandardMaterial color="#d8291e" side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  )
}

const BUNTING_COLOURS = ['#ec6a5c', '#f4c04e', '#3fa7c9', '#5fb88c', '#f08fb0']

/** A string of flags from the bar to the speaker post, swaying on one sine. */
function Bunting({ q }: { q: BeachQueries }) {
  const string = useRef<THREE.Group>(null)
  const flags = useMemo(() => {
    const from = [BAR[0] - 2.6, BAR[1] - 1]
    const to = [BAR[0] - 8.6, BAR[1] - 4.8]
    const count = 15
    const yFrom = q.ground.heightAt(from[0], from[1]) + 3.2
    return Array.from({ length: count }, (_, i) => {
      const t = i / (count - 1)
      return { x: from[0] + (to[0] - from[0]) * t, y: yFrom - Math.sin(t * Math.PI) * 0.45, z: from[1] + (to[1] - from[1]) * t, colour: BUNTING_COLOURS[i % BUNTING_COLOURS.length] }
    })
  }, [q])
  useEffect(() => {
    if (!string.current || reducedMotion()) return
    const children = string.current.children.map((c) => c.rotation)
    const tween = gsap.fromTo(children, { x: Math.PI - 0.3 }, { x: Math.PI + 0.3, duration: 1.1, ease: 'sine.inOut', repeat: -1, yoyo: true, stagger: { each: 0.09, from: 'start' } })
    return () => {
      tween.kill()
    }
  }, [])
  return (
    <group ref={string}>
      {flags.map((f, i) => (
        <mesh key={i} position={[f.x, f.y, f.z]} rotation={[Math.PI, 1, 0]}>
          <coneGeometry args={[0.13, 0.28, 3]} />
          <meshStandardMaterial color={f.colour} />
        </mesh>
      ))}
    </group>
  )
}

export function BeachAmbience({ q, onSpeech }: { q: RoomQueries; onSpeech?: (speech: Speech) => void }) {
  const beach = q as BeachQueries
  return (
    <>
      <Sky />
      <Water />
      <DroneShot q={beach} />
      <BeachCrowd q={beach} onSpeech={onSpeech} />
      <BeachSounds q={beach} onSpeech={onSpeech} />
      <PaddledKayak />
      <JetSki />
      <SailBoat start={[-180, -160]} end={[-40, -240]} seconds={220} colour="#f2efe6" scale={1.8} />
      <SailBoat start={[170, -220]} end={[60, -310]} seconds={260} colour="#ec6a5c" scale={2.2} />
      <SailBoat start={[-260, 150]} end={[-140, 240]} seconds={240} colour="#3fa7c9" scale={2} />
      {GULLS.map((g) => (
        <Gull key={g.phase} {...g} />
      ))}
      {FLAGS.map(([x, z], i) => (
        <RedFlag key={i} x={x} z={z} y={beach.ground.heightAt(x, z)} />
      ))}
      <Bunting q={beach} />
    </>
  )
}
