import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { AISLE_NORTH, AISLE_SOUTH, COACH_CEILING, COACH_EAST, COACH_FLOOR, COACH_WEST, COACH_Z, DOORS, GROUND_MATERIAL } from './RailwayQueries.ts'

const TRAIN_EAST = 46
const TRAIN_WEST = -24
const ROW_SPACING = 1.02
/** Partitions between coaches, on the model's own joints. */
const JOINTS = [-20.05, -12.38, -4.66, 3.1]
const WALL_NORTH = 2.3
const WALL_SOUTH = 4.14

/** [centre y, height] of the wall panels, leaving the window band clear. */
const LINING_BANDS: ReadonlyArray<readonly [number, number]> = [
  [0.88, 0.28],
  [2.24, 0.48],
]

type Box = readonly [x: number, y: number, z: number, sx: number, sy: number, sz: number]

function merged(boxes: Box[]) {
  const parts = boxes.map(([x, y, z, sx, sy, sz]) => {
    const g = new THREE.BoxGeometry(sx, sy, sz)
    g.translate(x, y, z)
    return g
  })
  const geometry = mergeGeometries(parts)
  parts.forEach((g) => g.dispose())
  return geometry
}

/** Is there a door opening beside this spot on the platform side? Seats keep clear of it. */
const byDoor = (x: number) => DOORS.some((d) => Math.abs(x - d) < 0.72)

function seatBoxes(fromX: number, toX: number) {
  const cushions: Box[] = []
  const frames: Box[] = []
  const floor = COACH_FLOOR
  let row = 0
  for (let x = fromX; x < toX; x += ROW_SPACING, row++) {
    // Pairs of rows face each other across a bay, as in a real coach.
    const facing = row % 2 === 0 ? 1 : -1
    const sides: Array<[number, number]> = [[(WALL_NORTH + AISLE_NORTH) / 2, AISLE_NORTH - WALL_NORTH - 0.04]]
    if (!byDoor(x)) sides.push([(AISLE_SOUTH + WALL_SOUTH) / 2, WALL_SOUTH - AISLE_SOUTH - 0.04])
    for (const [z, width] of sides) {
      cushions.push([x, floor + 0.42, z, 0.44, 0.09, width])
      cushions.push([x + facing * 0.24, floor + 0.74, z, 0.08, 0.56, width])
      frames.push([x, floor + 0.19, z, 0.34, 0.38, 0.06])
    }
  }
  return { cushions, frames }
}

/** Built once: the same coach serves both rounds and all of its boxes share a draw call. */
let built: ReturnType<typeof buildGeometry> | null = null

function buildGeometry() {
  const near = seatBoxes(COACH_WEST + 0.2, COACH_EAST)
  const far = seatBoxes(COACH_EAST + 1, TRAIN_EAST)
  const west = seatBoxes(TRAIN_WEST, COACH_WEST - 0.6)

  const rails: Box[] = []
  for (const z of [WALL_NORTH + 0.17, WALL_SOUTH - 0.17]) rails.push([(COACH_WEST + COACH_EAST) / 2, COACH_CEILING - 0.42, z, COACH_EAST - COACH_WEST, 0.04, 0.3])

  const walls: Box[] = []
  // The partitions: one each side of the aisle, and a lintel over it. The gap is the gangway.
  for (const x of JOINTS) {
    walls.push([x, (COACH_FLOOR + COACH_CEILING) / 2, (WALL_NORTH + AISLE_NORTH) / 2 - 0.02, 0.1, COACH_CEILING - COACH_FLOOR, AISLE_NORTH - WALL_NORTH])
    walls.push([x, (COACH_FLOOR + COACH_CEILING) / 2, (AISLE_SOUTH + WALL_SOUTH) / 2 + 0.02, 0.1, COACH_CEILING - COACH_FLOOR, WALL_SOUTH - AISLE_SOUTH])
    walls.push([x, COACH_CEILING - 0.14, COACH_Z, 0.1, 0.28, AISLE_SOUTH - AISLE_NORTH])
  }

  return {
    cushions: merged(near.cushions),
    frames: merged([...near.frames, ...rails]),
    walls: merged(walls),
    farCushions: merged([...far.cushions, ...west.cushions]),
    farFrames: merged([...far.frames, ...west.frames]),
  }
}

const coach = () => (built ??= buildGeometry())

const CUSHION = '#2c5d94'
const FRAME = '#8d9299'
const WALL = '#c4c7b6'

/** Everything aboard that can block a step or hide evidence. */
export function CoachInterior() {
  const g = coach()
  return (
    <group dispose={null}>
      <mesh geometry={g.cushions}>
        <meshStandardMaterial color={CUSHION} roughness={0.8} />
      </mesh>
      <mesh geometry={g.frames}>
        <meshStandardMaterial color={FRAME} roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh geometry={g.walls}>
        <meshStandardMaterial color={WALL} roughness={0.8} />
      </mesh>
      {/* The floor covering, warm as if lit. Items come to rest on this, so it lives with the solid scenery. */}
      <mesh position={[(TRAIN_EAST + TRAIN_WEST) / 2, COACH_FLOOR + 0.01, COACH_Z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[TRAIN_EAST - TRAIN_WEST, WALL_SOUTH - WALL_NORTH]} />
        <meshStandardMaterial name={GROUND_MATERIAL} color="#6e6658" emissive="#3a3226" roughness={0.9} />
      </mesh>
    </group>
  )
}

/** Seen only through windows, so it needs neither collision nor shading. */
function FarSeats() {
  const g = coach()
  return (
    <group dispose={null}>
      <mesh geometry={g.farCushions}>
        <meshBasicMaterial color="#35659c" />
      </mesh>
      <mesh geometry={g.farFrames}>
        <meshBasicMaterial color="#7d8288" />
      </mesh>
    </group>
  )
}

/** Light strips, an inner lining so the shell's bare backfaces never show, and tinted glass. */
export function CoachGlass() {
  const length = TRAIN_EAST - TRAIN_WEST
  const middle = (TRAIN_EAST + TRAIN_WEST) / 2
  return (
    <>
      <FarSeats />
      <mesh position={[middle, COACH_CEILING - 0.05, COACH_Z]}>
        <boxGeometry args={[length, 0.03, 0.2]} />
        <meshBasicMaterial color="#fff1cf" toneMapped={false} />
      </mesh>
      {[WALL_NORTH + 0.05, WALL_SOUTH - 0.05].flatMap((z) =>
        LINING_BANDS.map(([y, height]) => (
          <mesh key={`${z}${y}`} position={[middle, y, z]} rotation={[0, z < COACH_Z ? 0 : Math.PI, 0]}>
            <planeGeometry args={[length, height]} />
            <meshStandardMaterial color="#d8d3bd" roughness={0.85} side={THREE.DoubleSide} />
          </mesh>
        )),
      )}
      {[WALL_NORTH + 0.06, WALL_SOUTH - 0.03].map((z) => (
        <mesh key={z} position={[middle, 1.46, z]}>
          <planeGeometry args={[length, 0.92]} />
          <meshBasicMaterial color="#9fc4e8" transparent opacity={0.13} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
    </>
  )
}
