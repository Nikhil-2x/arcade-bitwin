/** Where things are in the hall, in metres. The floor is y = 0, x runs east, z runs south to the street doors. */
export type Spot = readonly [x: number, z: number]

/** The middle of the hall, east to west. */
export const AXIS_X = -2.25

/** Colliders from the model, drawn by nothing. Keep in step with scripts/optimize-bank.mjs. */
export const COLLIDER_MATERIAL = 'BankCollider'
export const GLASS_COLLIDER_MATERIAL = 'BankGlassCollider'
/** Flat things the player walks over. */
export const CLUTTER_MATERIAL = 'BankClutter'
/** The surface the evidence starts on. */
export const TABLE_TOP_MATERIAL = 'AuditTableTop'

/** In the glass lobby, the auditors' table ahead and the north hall beyond it. */
export const SPAWN: Spot = [AXIS_X, 9.7]
export const TABLE: Spot = [AXIS_X, 7]

/** Where the player can get a token, and the board that calls it. */
export const TOKEN_KIOSK: Spot = [-6.7, 9.8]
export const TOKEN_BOARD: Spot = [2.4, 9.8]
/** The desk with the camera feeds: far from the table, so a look at it costs the clock. */
export const SECURITY_DESK: Spot = [-18.2, 21.6]

/** Beyond this, in front of the stairs, is staff only. The rope hangs here. */
export const ROPE_Z = -31.6
export const ROPE_WEST = -11.4
export const ROPE_EAST = 6.9

/** The model has a gap here where its lower stairs would go. A floor closes it, and steel doors fill the openings at the far end. */
export const STRONGROOM = { west: -7.1, east: 2.6, north: -40.2, south: -32.9, doorZ: -39.55, doorXs: [-5.45, -2.25, 0.95], doorWidth: 2.45, doorHeight: 1.95 } as const

/** The name over the street doors, facing into the hall. */
export const BANK_SIGN = { x: -2.2, y: 8.25, z: 41.4, width: 9.4, height: 1.2 } as const

/** The model's blank notice boards in the aisles. Each has a notice on both faces. */
export const NOTICE_BOARDS: readonly Spot[] = [
  [8.75, 6.3],
  [8.8, -11.5],
  [-13.4, 6.31],
  [-13.4, -11.4],
]
/** The two tall blank panels in the corners by the stairs: position, then which way each faces. */
export const WALL_PANELS: readonly (readonly [x: number, z: number, yaw: number])[] = [
  [-18, -38, Math.PI / 4],
  [13.15, -38.05, -Math.PI / 4],
]

interface HallZone {
  name: string
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

/** The camera feeds describe a spot by these. First match wins, so the small ones come first. */
const ZONES: readonly HallZone[] = [
  { name: 'the glass lobby', minX: -8.7, maxX: 4.3, minZ: -6.8, maxZ: 12.6 },
  { name: 'the south teller counters', minX: -8.7, maxX: 4.3, minZ: 12.6, maxZ: 21.6 },
  { name: 'the north teller counters', minX: -8.7, maxX: 4.3, minZ: -15.8, maxZ: -6.8 },
  { name: 'the west lounge', minX: -15.8, maxX: -10.2, minZ: -27.2, maxZ: -19.8 },
  { name: 'the east lounge', minX: 5.6, maxX: 11.2, minZ: -27.2, maxZ: -19.8 },
  { name: 'the west wing', minX: -26, maxX: -20.4, minZ: 17, maxZ: 35 },
  { name: 'the east wing', minX: 15.8, maxX: 22, minZ: 17, maxZ: 35 },
  { name: 'the waiting benches', minX: -15, maxX: 11, minZ: 26, maxZ: 36 },
  { name: 'the street doors', minX: -14, maxX: 10, minZ: 36, maxZ: 45 },
  { name: 'the foot of the strongroom stairs', minX: -20, maxX: 16, minZ: -46, maxZ: -27 },
]

export function zoneOf(x: number, z: number): string {
  const zone = ZONES.find((c) => x >= c.minX && x <= c.maxX && z >= c.minZ && z <= c.maxZ)
  if (zone) return zone.name
  const side = x < AXIS_X ? 'west' : 'east'
  return z > 6 ? `the south end of the ${side} aisle` : `the north end of the ${side} aisle`
}
