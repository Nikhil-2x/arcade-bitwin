import type { ThreeElements } from '@react-three/fiber'
import { BankHall } from './BankHall.tsx'
import { BANK_SIGN, NOTICE_BOARDS, ROPE_EAST, ROPE_WEST, ROPE_Z, SECURITY_DESK, STRONGROOM, TABLE, TABLE_TOP_MATERIAL, TOKEN_BOARD, TOKEN_KIOSK, WALL_PANELS } from './bankLayout.ts'
import { auditSign, bankSign, cctvScreen, kioskScreen, noticeTexture, securitySign, strongroomDoor, wallPanelTexture } from './bankTextures.ts'

const WALNUT = '#4a2f1d'
const WALNUT_DARK = '#2f1d12'
const BRASS = '#c9a24a'
const IRON = '#262a31'
const FELT = '#16503f'

type Box = readonly [position: [number, number, number], size: [number, number, number], color: string]

function Boxes({ items }: { items: readonly Box[] }) {
  return items.map(([position, size, color], i) => (
    <mesh key={i} position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.7} metalness={color === BRASS ? 0.85 : 0} />
    </mesh>
  ))
}

/** Where the evidence starts: the auditors' table, in the middle of the glass lobby. */
function AuditTable(props: ThreeElements['group']) {
  return (
    <group {...props}>
      <mesh position={[0, 0.795, 0]}>
        <boxGeometry args={[1.7, 0.03, 0.9]} />
        <meshStandardMaterial name={TABLE_TOP_MATERIAL} color={FELT} roughness={0.95} />
      </mesh>
      <Boxes
        items={[
          [[0, 0.765, 0], [1.8, 0.05, 1], WALNUT],
          [[-0.78, 0.37, -0.38], [0.08, 0.74, 0.08], WALNUT_DARK],
          [[0.78, 0.37, -0.38], [0.08, 0.74, 0.08], WALNUT_DARK],
          [[-0.78, 0.37, 0.38], [0.08, 0.74, 0.08], WALNUT_DARK],
          [[0.78, 0.37, 0.38], [0.08, 0.74, 0.08], WALNUT_DARK],
          [[0, 0.62, -0.42], [1.5, 0.14, 0.04], WALNUT_DARK],
          // The sign's stand, at the far side so that it never gets in the way of the items.
          [[0, 0.9, -0.47], [0.05, 0.2, 0.03], BRASS],
        ]}
      />
      <mesh position={[0, 1.08, -0.47]} raycast={() => null}>
        <planeGeometry args={[0.72, 0.18]} />
        <meshStandardMaterial map={auditSign()} roughness={0.6} side={2} />
      </mesh>
    </group>
  )
}

function TokenKiosk(props: ThreeElements['group']) {
  return (
    <group {...props}>
      <Boxes
        items={[
          [[0, 0.04, 0], [0.62, 0.08, 0.5], IRON],
          [[0, 0.72, 0], [0.48, 1.32, 0.3], '#1d3f63'],
          [[0, 1.42, 0.02], [0.52, 0.08, 0.34], BRASS],
        ]}
      />
      <mesh position={[0, 1.02, 0.156]} raycast={() => null}>
        <planeGeometry args={[0.38, 0.5]} />
        <meshBasicMaterial map={kioskScreen()} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.58, 0.156]} raycast={() => null}>
        <planeGeometry args={[0.2, 0.05]} />
        <meshStandardMaterial color="#080a10" />
      </mesh>
    </group>
  )
}

/** Stand for the "now serving" board. The screen on it is drawn by the ambience, which knows the numbers. */
function BoardStand(props: ThreeElements['group']) {
  return (
    <group {...props}>
      <Boxes
        items={[
          [[0, 0.03, 0], [0.7, 0.06, 0.42], IRON],
          [[0, 1.1, -0.02], [0.07, 2.14, 0.07], IRON],
          [[0, 2.16, -0.03], [1.5, 0.82, 0.08], '#11141c'],
        ]}
      />
    </group>
  )
}

function SecurityDesk(props: ThreeElements['group']) {
  return (
    <group {...props}>
      <Boxes
        items={[
          [[0, 0.4, 0], [1.9, 0.8, 0.72], WALNUT],
          [[0, 0.82, 0], [2.02, 0.05, 0.82], WALNUT_DARK],
          [[0, 1.82, -0.34], [2.1, 0.32, 0.05], '#16202c'],
          [[-0.98, 1.3, -0.34], [0.05, 1.05, 0.05], IRON],
          [[0.98, 1.3, -0.34], [0.05, 1.05, 0.05], IRON],
        ]}
      />
      <mesh position={[0, 1.82, -0.31]} raycast={() => null}>
        <planeGeometry args={[1.8, 0.28]} />
        <meshBasicMaterial map={securitySign()} toneMapped={false} />
      </mesh>
      {[-0.56, 0.56].map((x) => (
        <group key={x} position={[x, 0.85, -0.1]} rotation={[0, x > 0 ? -0.14 : 0.14, 0]}>
          <Boxes
            items={[
              [[0, 0.02, 0], [0.26, 0.03, 0.18], IRON],
              [[0, 0.14, -0.02], [0.05, 0.22, 0.05], IRON],
              [[0, 0.38, 0], [0.76, 0.46, 0.05], '#0b0d12'],
            ]}
          />
          <mesh position={[0, 0.38, 0.027]} raycast={() => null}>
            <planeGeometry args={[0.7, 0.4]} />
            <meshBasicMaterial map={cctvScreen()} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

const POSTS = 6

/** The rope across the foot of the stairs. The reason for it lies in the law, and BankQueries enforces it. */
function StrongroomRope() {
  const span = (ROPE_EAST - ROPE_WEST) / (POSTS - 1)
  return (
    <group position={[ROPE_WEST, 0, ROPE_Z]}>
      {Array.from({ length: POSTS }, (_, i) => (
        <group key={i} position={[i * span, 0, 0]}>
          <mesh position={[0, 0.03, 0]}>
            <cylinderGeometry args={[0.17, 0.19, 0.06, 18]} />
            <meshStandardMaterial color={BRASS} metalness={0.9} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.028, 0.034, 0.94, 12]} />
            <meshStandardMaterial color={BRASS} metalness={0.9} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.99, 0]}>
            <sphereGeometry args={[0.05, 14, 10]} />
            <meshStandardMaterial color={BRASS} metalness={0.9} roughness={0.3} />
          </mesh>
        </group>
      ))}
      {Array.from({ length: POSTS - 1 }, (_, i) => (
        <mesh key={i} position={[(i + 0.5) * span, 0.86, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.024, 0.024, span, 8]} />
          <meshStandardMaterial color="#7a1d28" roughness={0.75} />
        </mesh>
      ))}
    </group>
  )
}

/** Beyond the rope. Nobody can reach it, so none of it needs to stop anyone. */
function Strongroom() {
  const { west, east, north, south, doorZ, doorXs, doorWidth, doorHeight } = STRONGROOM
  return (
    <>
      <mesh position={[(west + east) / 2, -0.012, (north + south) / 2]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <planeGeometry args={[east - west, south - north]} />
        <meshStandardMaterial color="#39352f" roughness={0.42} metalness={0.15} />
      </mesh>
      {doorXs.map((x) => (
        <mesh key={x} position={[x, doorHeight / 2, doorZ]} raycast={() => null}>
          <planeGeometry args={[doorWidth, doorHeight]} />
          <meshStandardMaterial map={strongroomDoor()} metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
    </>
  )
}

const NOTICE_WIDTH = 1.2
const NOTICE_HEIGHT = 1.97
const NOTICE_Y = 1.36
const NOTICE_OFF_BOARD = 0.045
const WALL_PANEL_WIDTH = 3.9
const WALL_PANEL_HEIGHT = 7
const WALL_PANEL_Y = 4.2

/** Paper on the model's blank boards: the hall teaches the law, even to someone just passing. */
function Notices() {
  return (
    <>
      {NOTICE_BOARDS.map(([x, z], board) =>
        [1, -1].map((face) => (
          <mesh key={`${board}${face}`} position={[x, NOTICE_Y, z + face * NOTICE_OFF_BOARD]} rotation={[0, face > 0 ? 0 : Math.PI, 0]} raycast={() => null}>
            <planeGeometry args={[NOTICE_WIDTH, NOTICE_HEIGHT]} />
            <meshStandardMaterial map={noticeTexture(board * 2 + (face > 0 ? 0 : 1))} roughness={0.85} />
          </mesh>
        )),
      )}
      {WALL_PANELS.map(([x, z, yaw]) => (
        <mesh key={x} position={[x, WALL_PANEL_Y, z]} rotation={[0, yaw, 0]} raycast={() => null}>
          <planeGeometry args={[WALL_PANEL_WIDTH, WALL_PANEL_HEIGHT]} />
          <meshStandardMaterial map={wallPanelTexture()} roughness={0.8} />
        </mesh>
      ))}
    </>
  )
}

/** The model, and the handful of things the game adds to it. */
export function BankScenery() {
  return (
    <>
      <BankHall />
      <AuditTable position={[TABLE[0], 0, TABLE[1]]} />
      <TokenKiosk position={[TOKEN_KIOSK[0], 0, TOKEN_KIOSK[1]]} rotation={[0, Math.PI / 2, 0]} />
      <BoardStand position={[TOKEN_BOARD[0], 0, TOKEN_BOARD[1]]} rotation={[0, -0.25, 0]} />
      <SecurityDesk position={[SECURITY_DESK[0], 0, SECURITY_DESK[1]]} rotation={[0, Math.PI / 2, 0]} />
      <StrongroomRope />
      <Strongroom />
      <Notices />
      {/* Over the model's own name plate. */}
      <mesh position={[BANK_SIGN.x, BANK_SIGN.y, BANK_SIGN.z]} rotation={[0, Math.PI, 0]} raycast={() => null}>
        <planeGeometry args={[BANK_SIGN.width, BANK_SIGN.height]} />
        <meshStandardMaterial map={bankSign()} metalness={0.35} roughness={0.45} />
      </mesh>
    </>
  )
}
