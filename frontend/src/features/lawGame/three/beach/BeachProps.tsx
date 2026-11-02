import type { ThreeElements } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { BeachGround } from './beachGround.ts'
import { BeachScan } from './BeachScan.tsx'
import { useBeachScan } from './useBeachScan.ts'
import { barSign, flagSign, hatcherySign, lostPropertySign, shadowTexture, tapeTexture } from './beachTextures.ts'
import { BAR, CLUTTER_MATERIAL, COURT, DANCE_FLOOR, FLAGS, HATCHERY, KAYAKS, LOUNGERS, PARASOLS, PICNIC, SURF_RACK, TABLE, TABLE_TOP_MATERIAL, TOWER, type Spot } from './beachLayout.ts'

const WOOD = '#a97c50'
const WOOD_DARK = '#6e4a2c'
const POST = '#8a6a44'
const WHITE = '#f2efe6'
const RED = '#d8452e'

type Box = readonly [position: [number, number, number], size: [number, number, number], color: string]

function Boxes({ items }: { items: readonly Box[] }) {
  return items.map(([position, size, color], i) => (
    <mesh key={i} position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  ))
}

/** Something flat that the player walks over rather than into. */
function Flat({ size, color, ...rest }: ThreeElements['mesh'] & { size: [number, number]; color: string }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} {...rest}>
      <planeGeometry args={size} />
      <meshStandardMaterial name={CLUTTER_MATERIAL} color={color} roughness={0.95} side={THREE.DoubleSide} />
    </mesh>
  )
}

/** Soft contact shadow. Never in the way of anything: it is part of the clutter. */
function Blob({ size, ...rest }: ThreeElements['mesh'] & { size: [number, number] }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} raycast={() => null} {...rest}>
      <planeGeometry args={size} />
      <meshBasicMaterial name={CLUTTER_MATERIAL} map={shadowTexture()} transparent depthWrite={false} />
    </mesh>
  )
}

/** Sits a prop on the ground at its spot. */
function Placed({ at, yaw = 0, children }: { at: Spot; yaw?: number; children: React.ReactNode }) {
  const { ground } = useBeachScan()
  return (
    <group position={[at[0], ground.heightAt(at[0], at[1]), at[1]]} rotation={[0, yaw, 0]}>
      {children}
    </group>
  )
}

const COLOURS = ['#2f8fb0', '#e8a33a', '#d8574a', '#3f9c7a', '#f2efe6', '#7a6cc0']

const PARASOL_COLOURS = ['#e8573f', '#2f8fb0', '#e8a33a', '#3f9c7a']
const PARASOL_WEDGES = 10
const PARASOL_RADIUS = 1.85
const PARASOL_RISE = 0.85

function paint(geometry: THREE.BufferGeometry, colour: string) {
  const c = new THREE.Color(colour)
  const count = geometry.attributes.position.count
  const colours = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) c.toArray(colours, i * 3)
  geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3))
  return geometry
}

/**
 * In the scan, a parasol is a shapeless lump hanging in the air: a drone never sees the pole.
 * Each one gets a pole and a striped canopy over the lump. All of them share one draw call.
 */
function buildParasols(ground: BeachGround) {
  const parts: THREE.BufferGeometry[] = []
  PARASOLS.forEach(([x, z], n) => {
    const top = ground.surfaceAt(x, z) + 0.12
    const base = ground.heightAt(x, z)
    const colour = PARASOL_COLOURS[n % PARASOL_COLOURS.length]
    for (let i = 0; i < PARASOL_WEDGES; i++) {
      const wedge = new THREE.ConeGeometry(PARASOL_RADIUS, PARASOL_RISE, 3, 1, true, (i / PARASOL_WEDGES) * Math.PI * 2, (Math.PI * 2) / PARASOL_WEDGES)
      wedge.translate(x, top - PARASOL_RISE / 2, z)
      parts.push(paint(wedge, i % 2 ? '#f6f1e4' : colour))
    }
    const pole = new THREE.CylinderGeometry(0.035, 0.045, top - base, 8)
    pole.translate(x, (top + base) / 2, z)
    parts.push(paint(pole, '#d9d3c4'))
  })
  const merged = mergeGeometries(parts)
  parts.forEach((g) => g.dispose())
  return merged
}

function Parasols() {
  const { ground } = useBeachScan()
  const geometry = useMemo(() => buildParasols(ground), [ground])
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial name={CLUTTER_MATERIAL} vertexColors side={THREE.DoubleSide} roughness={0.8} />
    </mesh>
  )
}

function Lounger({ colour }: { colour: string }) {
  return (
    <group>
      <Blob size={[1.1, 2.3]} position={[-0.1, 0.03, 0]} />
      <mesh position={[0, 0.33, 0.2]}>
        <boxGeometry args={[0.66, 0.05, 1.4]} />
        <meshStandardMaterial color={colour} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.48, -0.66]} rotation={[0.55, 0, 0]}>
        <boxGeometry args={[0.66, 0.05, 0.66]} />
        <meshStandardMaterial color={colour} roughness={0.8} />
      </mesh>
      <Boxes
        items={[
          [[-0.28, 0.16, 0.75], [0.05, 0.32, 0.05], WOOD_DARK],
          [[0.28, 0.16, 0.75], [0.05, 0.32, 0.05], WOOD_DARK],
          [[-0.28, 0.16, -0.5], [0.05, 0.32, 0.05], WOOD_DARK],
          [[0.28, 0.16, -0.5], [0.05, 0.32, 0.05], WOOD_DARK],
        ]}
      />
    </group>
  )
}

/** Where the evidence starts: the beach's lost-property table, like the classroom's teacher's desk. */
function LostPropertyTable() {
  return (
    <group>
      <Blob size={[2.2, 1.4]} position={[-0.1, 0.03, 0]} />
      <mesh position={[0, 0.74, 0]}>
        <boxGeometry args={[1.6, 0.06, 0.86]} />
        <meshStandardMaterial name={TABLE_TOP_MATERIAL} color="#c79c6a" roughness={0.85} />
      </mesh>
      <Boxes
        items={[
          [[-0.72, 0.36, -0.36], [0.06, 0.72, 0.06], WOOD_DARK],
          [[0.72, 0.36, -0.36], [0.06, 0.72, 0.06], WOOD_DARK],
          [[-0.72, 0.36, 0.36], [0.06, 0.72, 0.06], WOOD_DARK],
          [[0.72, 0.36, 0.36], [0.06, 0.72, 0.06], WOOD_DARK],
          [[-0.72, 1.1, -0.4], [0.05, 0.7, 0.05], WOOD_DARK],
          [[0.72, 1.1, -0.4], [0.05, 0.7, 0.05], WOOD_DARK],
        ]}
      />
      <mesh position={[0, 1.32, -0.4]}>
        <planeGeometry args={[1.5, 0.56]} />
        <meshBasicMaterial map={lostPropertySign()} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function LifeguardTower() {
  const legs: Box[] = [
    [[-0.85, 1, -0.85], [0.12, 2, 0.12], WHITE],
    [[0.85, 1, -0.85], [0.12, 2, 0.12], WHITE],
    [[-0.85, 1, 0.85], [0.12, 2, 0.12], WHITE],
    [[0.85, 1, 0.85], [0.12, 2, 0.12], WHITE],
  ]
  const rungs: Box[] = [0.4, 0.8, 1.2, 1.6].map((y) => [[0, y, 1.35 - y * 0.26], [0.7, 0.05, 0.14], WOOD_DARK] as Box)
  return (
    <group>
      <Blob size={[3.6, 3.6]} position={[-0.3, 0.03, 0]} />
      <Boxes items={[...legs, ...rungs]} />
      <Boxes
        items={[
          [[0, 2.04, 0], [2.1, 0.1, 2.1], WOOD],
          [[0, 2.45, -1.0], [2.1, 0.75, 0.06], RED],
          [[-1.02, 2.45, 0], [0.06, 0.75, 2.05], WHITE],
          [[1.02, 2.45, 0], [0.06, 0.75, 2.05], WHITE],
          [[-0.98, 3.1, 0.98], [0.07, 1.3, 0.07], WHITE],
          [[0.98, 3.1, 0.98], [0.07, 1.3, 0.07], WHITE],
          [[-0.98, 3.1, -0.98], [0.07, 1.3, 0.07], WHITE],
          [[0.98, 3.1, -0.98], [0.07, 1.3, 0.07], WHITE],
          [[0, 2.4, 0.2], [0.8, 0.5, 0.5], WOOD_DARK],
        ]}
      />
      <mesh position={[0, 3.95, 0]}>
        <cylinderGeometry args={[0.2, 1.95, 0.65, 4, 1, false, Math.PI / 4]} />
        <meshStandardMaterial color={RED} roughness={0.7} />
      </mesh>
    </group>
  )
}

const FENCE_HALF_X = 2.6
const FENCE_HALF_Z = 1.9

function fenceSide(from: [number, number], to: [number, number], skip?: number): Box[] {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1])
  const steps = Math.round(length / 0.8)
  const out: Box[] = []
  for (let i = 0; i <= steps; i++) {
    if (i === skip) continue
    const t = i / steps
    out.push([[from[0] + (to[0] - from[0]) * t, 0.55, from[1] + (to[1] - from[1]) * t], [0.07, 1.1, 0.07], POST])
  }
  return out
}

/** The scene of the crime: a fenced nest, the gate hanging open, the sand dug out, tape around it. */
function Hatchery() {
  const X = FENCE_HALF_X
  const Z = FENCE_HALF_Z
  const posts = [
    ...fenceSide([-X, -Z], [X, -Z]),
    ...fenceSide([-X, Z], [X, Z], 3),
    ...fenceSide([-X, -Z], [-X, Z]),
    ...fenceSide([X, -Z], [X, Z]),
  ]
  // Mesh is too fine to model: a pale panel per side reads as wire at this distance.
  const panel = (position: [number, number, number], width: number, yaw = 0) => (
    <mesh position={position} rotation={[0, yaw, 0]}>
      <planeGeometry args={[width, 0.95]} />
      <meshStandardMaterial color="#cdbf9a" transparent opacity={0.28} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  )
  return (
    <group>
      <Flat size={[X * 2, Z * 2]} color="#d8c594" position={[0, 0.03, 0]} />
      <Boxes items={posts} />
      {panel([0, 0.58, -Z], X * 2)}
      {panel([-X, 0.58, 0], Z * 2, Math.PI / 2)}
      {panel([X, 0.58, 0], Z * 2, Math.PI / 2)}
      {panel([-X / 2 - 0.3, 0.58, Z], X - 0.6)}
      {panel([X / 2 + 0.3, 0.58, Z], X - 0.6)}
      {/* The gate, forced and swung out. */}
      <group position={[-0.45, 0, Z]} rotation={[0, 1.15, 0]}>
        <Boxes items={[[[0.45, 0.1, 0], [0.9, 0.05, 0.04], POST], [[0.45, 1.02, 0], [0.9, 0.05, 0.04], POST], [[0.88, 0.55, 0], [0.05, 0.98, 0.05], POST]]} />
      </group>
      {/* The dug-out nest, spoil thrown to one side. */}
      <mesh position={[0.7, 0.04, -0.3]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.42, 20]} />
        <meshStandardMaterial name={CLUTTER_MATERIAL} color="#4a3b26" roughness={1} />
      </mesh>
      <mesh position={[1.3, 0.06, -0.15]} scale={[1, 0.3, 0.8]}>
        <sphereGeometry args={[0.42, 12, 8]} />
        <meshStandardMaterial name={CLUTTER_MATERIAL} color="#b19a6b" roughness={1} />
      </mesh>
      {/* Nest markers that were not touched: small numbered stakes. */}
      {[[-1.4, -0.9], [-1.5, 0.6], [-0.3, 0.9]].map(([x, z]) => (
        <mesh key={x} position={[x, 0.22, z]}>
          <boxGeometry args={[0.05, 0.44, 0.05]} />
          <meshStandardMaterial color="#3f7d5a" />
        </mesh>
      ))}
      <group position={[-X - 0.1, 0, Z + 0.55]}>
        <Boxes items={[[[-0.55, 0.65, 0], [0.06, 1.3, 0.06], WOOD_DARK], [[0.55, 0.65, 0], [0.06, 1.3, 0.06], WOOD_DARK]]} />
        <mesh position={[0, 1.2, 0.04]}>
          <planeGeometry args={[1.25, 0.78]} />
          <meshBasicMaterial map={hatcherySign()} side={THREE.DoubleSide} />
        </mesh>
      </group>
      {/* Forest department tape at waist height, a little wider than the fence. */}
      {([[0, Z + 1.05, X * 2 + 2, 0], [0, -Z - 1.05, X * 2 + 2, 0], [X + 1, 0, Z * 2 + 2.1, Math.PI / 2], [-X - 1, 0, Z * 2 + 2.1, Math.PI / 2]] as const).map(([x, z, width, yaw]) => (
        <mesh key={`${x}${z}`} position={[x, 0.92, z]} rotation={[0, yaw, 0]} raycast={() => null}>
          <planeGeometry args={[width, 0.1]} />
          <meshStandardMaterial map={tapeTexture()} side={THREE.DoubleSide} roughness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

function VolleyballNet() {
  const width = 7
  return (
    <group>
      <Boxes items={[[[-width / 2, 1.2, 0], [0.09, 2.4, 0.09], WHITE], [[width / 2, 1.2, 0], [0.09, 2.4, 0.09], WHITE]]} />
      <mesh position={[0, 2.28, 0]} raycast={() => null}>
        <boxGeometry args={[width, 0.05, 0.02]} />
        <meshStandardMaterial color="#f7f4ea" />
      </mesh>
      <mesh position={[0, 1.88, 0]} raycast={() => null}>
        <planeGeometry args={[width, 0.8, 28, 4]} />
        <meshBasicMaterial color="#20262c" wireframe />
      </mesh>
      {/* Court lines on the sand. */}
      {([[0, 2.6, 10, 0.05], [0, -2.6, 10, 0.05], [5, 0, 0.05, 5.2], [-5, 0, 0.05, 5.2]] as const).map(([x, z, sx, sz]) => (
        <Flat key={`${x}${z}`} size={[sx, sz]} color="#2f6f9e" position={[x, 0.04, z]} raycast={() => null} />
      ))}
    </group>
  )
}

function Bar() {
  return (
    <group>
      <Blob size={[7, 3.6]} position={[-0.4, 0.03, 0]} />
      <Boxes
        items={[
          [[0, 0.55, 0], [4.6, 1.1, 0.7], WOOD],
          [[0, 1.13, 0.1], [4.9, 0.07, 0.98], WOOD_DARK],
          [[-2.2, 1.55, -0.7], [0.12, 3.1, 0.12], WOOD_DARK],
          [[2.2, 1.55, -0.7], [0.12, 3.1, 0.12], WOOD_DARK],
          [[-2.2, 1.55, 0.9], [0.12, 3.1, 0.12], WOOD_DARK],
          [[2.2, 1.55, 0.9], [0.12, 3.1, 0.12], WOOD_DARK],
          [[0, 0.75, -1.4], [4, 1.5, 0.55], '#7a5636'],
        ]}
      />
      <mesh position={[0, 3.24, 0.1]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[5.5, 0.14, 2.9]} />
        <meshStandardMaterial color="#c9a763" roughness={1} />
      </mesh>
      <mesh position={[0, 2.86, 1.08]}>
        <planeGeometry args={[1.4, 0.72]} />
        <meshBasicMaterial map={barSign()} />
      </mesh>
      {/* Bottles along the back counter, stools along the front. */}
      {[-1.4, -0.9, -0.4, 0.1, 0.6, 1.2].map((x, i) => (
        <mesh key={x} position={[x, 1.65, -1.4]}>
          <cylinderGeometry args={[0.05, 0.06, 0.3, 8]} />
          <meshStandardMaterial color={COLOURS[i % COLOURS.length]} roughness={0.25} />
        </mesh>
      ))}
      {[-1.6, -0.5, 0.6, 1.7].map((x) => (
        <mesh key={x} position={[x, 0.38, 1]}>
          <cylinderGeometry args={[0.17, 0.11, 0.76, 10]} />
          <meshStandardMaterial color={WOOD_DARK} />
        </mesh>
      ))}
    </group>
  )
}

function Speaker() {
  return (
    <group>
      <Boxes items={[[[0, 0.55, 0], [0.5, 1.1, 0.42], '#1c1e24']]} />
      {[0.36, 0.8].map((y) => (
        <mesh key={y} position={[0, y, 0.22]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 0.02, 16]} />
          <meshStandardMaterial color="#555a66" />
        </mesh>
      ))}
    </group>
  )
}

function Cooler({ colour = '#2f8fb0' }: { colour?: string }) {
  return (
    <group>
      <Blob size={[1, 0.8]} position={[-0.08, 0.03, 0]} />
      <Boxes items={[[[0, 0.2, 0], [0.62, 0.4, 0.4], colour], [[0, 0.43, 0], [0.66, 0.07, 0.44], WHITE]]} />
    </group>
  )
}

function SurfRack() {
  return (
    <group>
      <Blob size={[3.4, 1.6]} position={[-0.2, 0.03, 0]} />
      <Boxes items={[[[-1.3, 0.75, 0], [0.09, 1.5, 0.09], WOOD_DARK], [[1.3, 0.75, 0], [0.09, 1.5, 0.09], WOOD_DARK], [[0, 1.46, 0], [2.7, 0.08, 0.08], WOOD_DARK], [[0, 0.4, 0], [2.7, 0.08, 0.08], WOOD_DARK]]} />
      {[-0.9, -0.3, 0.3, 0.9].map((x, i) => (
        <mesh key={x} position={[x, 1.06, 0.1]} rotation={[-0.14, 0, 0]} scale={[0.26, 1.04, 0.035]}>
          <sphereGeometry args={[1, 16, 10]} />
          <meshStandardMaterial color={COLOURS[i]} roughness={0.35} />
        </mesh>
      ))}
    </group>
  )
}

function Kayak({ colour }: { colour: string }) {
  return (
    <group>
      <Blob size={[1.1, 3.4]} position={[-0.1, 0.03, 0]} />
      <mesh position={[0, 0.17, 0]} scale={[0.34, 0.17, 1.55]}>
        <sphereGeometry args={[1, 16, 10]} />
        <meshStandardMaterial color={colour} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.3, 0]} scale={[0.2, 0.05, 0.4]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshStandardMaterial color="#20262c" />
      </mesh>
    </group>
  )
}

function Towel({ colour, yaw = 0, at }: { colour: string; yaw?: number; at: Spot }) {
  return (
    <Placed at={at} yaw={yaw}>
      <Flat size={[0.9, 1.8]} color={colour} position={[0, 0.04, 0]} raycast={() => null} />
    </Placed>
  )
}

function TrashBin() {
  return (
    <group>
      <Blob size={[0.9, 0.9]} position={[-0.06, 0.03, 0]} />
      <mesh position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.28, 0.24, 0.84, 14]} />
        <meshStandardMaterial color="#3f7d5a" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.86, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.06, 14]} />
        <meshStandardMaterial color="#2c5a40" />
      </mesh>
    </group>
  )
}

function PicnicMat() {
  return (
    <group>
      <Flat size={[2.8, 2.2]} color="#c9503f" position={[0, 0.04, 0]} raycast={() => null} />
      <Cooler colour="#e8a33a" />
    </group>
  )
}

function DangerSign() {
  return (
    <group>
      <Boxes items={[[[0, 0.75, 0], [0.07, 1.5, 0.07], WOOD_DARK]]} />
      <mesh position={[0, 1.42, 0.05]}>
        <planeGeometry args={[0.9, 0.56]} />
        <meshBasicMaterial map={flagSign()} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

/** The deck is set out for a Sunday morning. Everything here can block a step or hide evidence. */
export function BeachScenery() {
  return (
    <>
      <BeachScan />
      <Parasols />
      {LOUNGERS.map((l, i) => (
        <Placed key={i} at={[l.x, l.z]} yaw={l.yaw}>
          <Lounger colour={COLOURS[i % COLOURS.length]} />
        </Placed>
      ))}
      <Placed at={TABLE}>
        <LostPropertyTable />
      </Placed>
      <Placed at={TOWER} yaw={0.55}>
        <LifeguardTower />
      </Placed>
      <Placed at={HATCHERY} yaw={0.45}>
        <Hatchery />
      </Placed>
      <Placed at={COURT} yaw={0.1}>
        <VolleyballNet />
      </Placed>
      <Placed at={BAR} yaw={-2.5}>
        <Bar />
      </Placed>
      <Placed at={[DANCE_FLOOR[0] - 3, DANCE_FLOOR[1] - 2]} yaw={0.8}>
        <Speaker />
      </Placed>
      <Placed at={[DANCE_FLOOR[0] + 3, DANCE_FLOOR[1] + 2.2]} yaw={-2.4}>
        <Speaker />
      </Placed>
      <Placed at={SURF_RACK} yaw={0.9}>
        <SurfRack />
      </Placed>
      <Placed at={KAYAKS} yaw={0.6}>
        <Kayak colour="#e8a33a" />
      </Placed>
      <Placed at={[KAYAKS[0] + 1.3, KAYAKS[1] + 0.5]} yaw={0.7}>
        <Kayak colour="#d8574a" />
      </Placed>
      <Placed at={[KAYAKS[0] - 1.3, KAYAKS[1] - 0.6]} yaw={0.5}>
        <Kayak colour="#3f9c7a" />
      </Placed>
      <Placed at={PICNIC}>
        <PicnicMat />
      </Placed>
      <Placed at={[-8.5, 20]}>
        <Cooler />
      </Placed>
      <Placed at={[1, 22.5]}>
        <Cooler colour="#d8574a" />
      </Placed>
      <Placed at={[19, 21]}>
        <TrashBin />
      </Placed>
      <Placed at={[-9, 11.8]}>
        <TrashBin />
      </Placed>
      <Placed at={[21, 9]}>
        <TrashBin />
      </Placed>
      <Towel at={[-18, 13.5]} colour="#e8a33a" yaw={0.5} />
      <Towel at={[-16.3, 14.6]} colour="#7a6cc0" yaw={0.5} />
      <Towel at={[-5.6, 21]} colour="#d8574a" yaw={0.2} />
      {FLAGS.map((f, i) => (
        <Placed key={i} at={f}>
          <DangerSign />
        </Placed>
      ))}
    </>
  )
}
