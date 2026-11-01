import type { ThreeElements } from '@react-three/fiber'
import { CART_TOP_MATERIAL, GROUND_MATERIAL, PLATFORM_TOP } from './RailwayQueries.ts'
import { CoachInterior } from './CoachInterior.tsx'
import { RailwayStation } from './RailwayStation.tsx'
import { gravelTexture, stationSignTexture } from './textures.ts'

/** The model's concourse sits at this depth; lifting it puts the floor at y = 0, as the player code expects. */
const FLOOR_LIFT = 0.852

const WOOD = '#6e4a2c'
const WOOD_DARK = '#4b3320'
const IRON = '#30343b'

type Box = readonly [position: [number, number, number], size: [number, number, number], color: string]

function Boxes({ items }: { items: readonly Box[] }) {
  return items.map(([position, size, color], i) => (
    <mesh key={i} position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  ))
}

/** Where the evidence starts: a parcel trolley left on the concourse, like the classroom's teacher's desk. */
function ParcelCart(props: ThreeElements['group']) {
  return (
    <group {...props}>
      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[1.5, 0.08, 0.84]} />
        <meshStandardMaterial name={CART_TOP_MATERIAL} color="#8a6a44" roughness={0.9} />
      </mesh>
      <Boxes
        items={[
          [[0, 0.56, -0.38], [1.4, 0.2, 0.05], WOOD_DARK],
          [[0, 0.56, 0.38], [1.4, 0.2, 0.05], WOOD_DARK],
          [[-0.68, 0.3, -0.34], [0.07, 0.6, 0.07], IRON],
          [[-0.68, 0.3, 0.34], [0.07, 0.6, 0.07], IRON],
          [[0.68, 0.3, -0.34], [0.07, 0.6, 0.07], IRON],
          [[0.68, 0.3, 0.34], [0.07, 0.6, 0.07], IRON],
          [[0.8, 0.86, -0.28], [0.04, 0.34, 0.04], IRON],
          [[0.8, 0.86, 0.28], [0.04, 0.34, 0.04], IRON],
          [[0.8, 1.03, 0], [0.04, 0.04, 0.6], IRON],
        ]}
      />
      {[-0.5, 0.5].flatMap((x) =>
        [-0.42, 0.42].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 0.17, z]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.17, 0.17, 0.07, 14]} />
            <meshStandardMaterial color={IRON} roughness={0.6} metalness={0.4} />
          </mesh>
        )),
      )}
    </group>
  )
}

function CrateStack(props: ThreeElements['group']) {
  return (
    <group {...props}>
      <Boxes
        items={[
          [[0, 0.32, 0], [0.8, 0.64, 0.8], WOOD],
          [[0.86, 0.26, 0.1], [0.7, 0.52, 0.7], WOOD_DARK],
          [[0.15, 0.86, 0.05], [0.58, 0.44, 0.58], '#8a6a44'],
        ]}
      />
    </group>
  )
}

function OilDrums(props: ThreeElements['group']) {
  return (
    <group {...props}>
      {([[0, 0, '#28517d'], [0.62, 0.18, '#7d2b28'], [0.16, 0.62, '#37584a']] as const).map(([x, z, color]) => (
        <mesh key={color} position={[x, 0.45, z]}>
          <cylinderGeometry args={[0.29, 0.29, 0.9, 14]} />
          <meshStandardMaterial color={color} roughness={0.5} metalness={0.5} />
        </mesh>
      ))}
    </group>
  )
}

function MailSacks(props: ThreeElements['group']) {
  return (
    <group {...props}>
      {([[0, 0.24, 0, 0.36], [0.58, 0.2, 0.14, 0.3], [0.2, 0.2, 0.56, 0.3], [0.32, 0.56, 0.2, 0.26]] as const).map(([x, y, z, r]) => (
        <mesh key={`${x}${z}`} position={[x, y, z]} scale={[1, 0.72, 1.25]}>
          <icosahedronGeometry args={[r, 1]} />
          <meshStandardMaterial color="#a39a7c" roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  )
}

/** Red sand buckets on a rack: a fixture of every Indian platform. */
function FireBuckets(props: ThreeElements['group']) {
  return (
    <group {...props}>
      <Boxes
        items={[
          [[0, 1.02, 0], [1.3, 0.08, 0.08], '#b3261e'],
          [[-0.6, 0.55, 0], [0.07, 1.1, 0.07], '#b3261e'],
          [[0.6, 0.55, 0], [0.07, 1.1, 0.07], '#b3261e'],
        ]}
      />
      {[-0.4, 0, 0.4].map((x) => (
        <mesh key={x} position={[x, 0.82, 0.02]}>
          <cylinderGeometry args={[0.13, 0.1, 0.24, 12]} />
          <meshStandardMaterial color="#c9281e" roughness={0.5} />
        </mesh>
      ))}
    </group>
  )
}

/** The scene of the crime: a signal cabinet, door hanging open, at the platform's end. */
function SignalCabinet(props: ThreeElements['group']) {
  return (
    <group {...props}>
      <Boxes
        items={[
          [[0, 0.62, 0], [0.8, 1.24, 0.42], '#3e4a3f'],
          [[0, 0.62, 0.215], [0.68, 1.1, 0.02], '#12141a'],
          [[0.62, 0.62, 0.42], [0.04, 1.14, 0.44], '#4d5b4e'],
          [[-0.16, 0.32, 0.26], [0.06, 0.5, 0.05], '#181a1e'],
          [[0.14, 0.2, 0.26], [0.06, 0.26, 0.05], '#181a1e'],
        ]}
      />
    </group>
  )
}

function StationSign(props: ThreeElements['group']) {
  return (
    <group {...props}>
      <mesh position={[0, 2.25, 0]}>
        <boxGeometry args={[3.6, 0.9, 0.05]} />
        <meshBasicMaterial attach="material-0" color="#f5c518" />
        <meshBasicMaterial attach="material-1" color="#f5c518" />
        <meshBasicMaterial attach="material-2" color="#f5c518" />
        <meshBasicMaterial attach="material-3" color="#f5c518" />
        <meshBasicMaterial attach="material-4" map={stationSignTexture()} />
        <meshBasicMaterial attach="material-5" map={stationSignTexture()} />
      </mesh>
      <Boxes
        items={[
          [[-1.6, 0.9, 0], [0.09, 1.8, 0.09], IRON],
          [[1.6, 0.9, 0], [0.09, 1.8, 0.09], IRON],
        ]}
      />
    </group>
  )
}

/**
 * Everything solid in the station. The model has no ground of its own under the tracks, so the
 * sky would show between the sleepers without the ballast here.
 */
export function StationScenery() {
  return (
    <>
      <group position={[0, FLOOR_LIFT, 0]}>
        <RailwayStation />
      </group>
      <mesh position={[20, -0.17, 10]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[420, 180]} />
        <meshStandardMaterial name={GROUND_MATERIAL} map={gravelTexture()} roughness={1} />
      </mesh>
      <CoachInterior />
      <ParcelCart position={[-19, 0, 10.4]} />
      <CrateStack position={[-24.5, 0, 11.3]} rotation={[0, 0.35, 0]} />
      <OilDrums position={[-0.8, 0, 9.9]} />
      <MailSacks position={[7.6, 0, 10.2]} />
      <CrateStack position={[16.5, 0, 12.6]} rotation={[0, -0.5, 0]} />
      <MailSacks position={[-22.5, 0, 16.6]} />
      <OilDrums position={[-16.5, 0, 16.4]} rotation={[0, 1, 0]} />
      <FireBuckets position={[-9, PLATFORM_TOP, 6.5]} />
      <CrateStack position={[3.5, PLATFORM_TOP, 5.05]} rotation={[0, 0.2, 0]} />
      <MailSacks position={[-20.8, PLATFORM_TOP, 5.05]} />
      <FireBuckets position={[11, PLATFORM_TOP, 6.5]} />
      <SignalCabinet position={[-25.6, PLATFORM_TOP, 5.3]} rotation={[0, Math.PI / 2, 0]} />
      <StationSign position={[-3, PLATFORM_TOP, 6.62]} />
    </>
  )
}
