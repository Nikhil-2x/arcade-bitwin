/** Where things are on the scan, in metres from the middle of the bay. x runs east, z runs south. */
export type Spot = readonly [x: number, z: number]

/** The parasols the scan already has, from west to east along the sand deck. */
export const PARASOLS: readonly Spot[] = [
  [-21.3, 7.5],
  [-17, 9.8],
  [-13.4, 12.4],
  [-9.2, 14.4],
  [-5, 16.8],
  [-1.4, 18.9],
  [3.2, 20.4],
  [7.4, 21.4],
  [11, 21.7],
]

/** Along the deck at a parasol, pointing east, and across it, pointing at the lagoon. */
function deckAxes(i: number) {
  const a = PARASOLS[Math.max(0, i - 1)]
  const b = PARASOLS[Math.min(PARASOLS.length - 1, i + 1)]
  const length = Math.hypot(b[0] - a[0], b[1] - a[1])
  const along: Spot = [(b[0] - a[0]) / length, (b[1] - a[1]) / length]
  const across: Spot = [along[1], -along[0]]
  return { along, across }
}

export interface Lounger {
  x: number
  z: number
  /** Facing the lagoon, feet first. */
  yaw: number
}

const LOUNGER_OFFSET = 1.8
/** The lounger's head end sits a little behind its parasol. */
const LOUNGER_BACK = 0.3

export const LOUNGERS: readonly Lounger[] = PARASOLS.flatMap((p, i) => {
  const { along, across } = deckAxes(i)
  const yaw = Math.atan2(across[0], across[1])
  const sides = i % 2 ? [1, -1] : [1]
  return sides.map((side) => ({
    x: p[0] + along[0] * LOUNGER_OFFSET * side - across[0] * LOUNGER_BACK,
    z: p[1] + along[1] * LOUNGER_OFFSET * side - across[1] * LOUNGER_BACK,
    yaw,
  }))
})

/** A walking lane parallel to the deck: positive offsets are on the lagoon side of the parasols. */
export const deckLane = (offset: number): Spot[] =>
  PARASOLS.map((p, i) => {
    const { across } = deckAxes(i)
    return [p[0] + across[0] * offset, p[1] + across[1] * offset] as const
  })

/** Where the player arrives, the lost-property table in front of them and the bay beyond. */
export const SPAWN: Spot = [16, 22.4]
export const TABLE: Spot = [16, 19.6]

export const TOWER: Spot = [-18.5, 5.4]
export const HATCHERY: Spot = [-29, 5.2]
export const COURT: Spot = [7, 26]
export const KICK_AREA: Spot = [-14, 17.4]
export const BAR: Spot = [29, 12]
export const DANCE_FLOOR: Spot = [26, 6]
export const PICNIC: Spot = [31, -24]
export const SURF_RACK: Spot = [13.5, -12]
export const KAYAKS: Spot = [8, -18.5]

/** Red flags along the edges where the water is not safe. */
export const FLAGS: readonly Spot[] = [
  [-13, 9.6],
  [1, 17],
  [-23, 3.8],
  [17, -1],
]

/** Towards the morning sun, matching the shadows baked into the scan's photo. */
export const SUN_DIRECTION: readonly [number, number, number] = [0.5, 0.74, -0.22]
export const HAZE = '#cfe9f3'

/** Material the collision code walks through: flat things lying on the sand. */
export const CLUTTER_MATERIAL = 'BeachClutter'
/** The name the collision code knows the scan by, from the model itself: it is walked over rather than into. */
export const SCAN_MATERIAL = 'islu'
/** The surface the evidence starts on. */
export const TABLE_TOP_MATERIAL = 'LostPropertyTable'
