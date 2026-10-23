export const W = 1280
export const H = 720
export const TILE = 40
export const COLS = 32
export const ROWS = 18
/** Rows 0-1 are the top HUD, row 17 is the Barrier ability bar. */
export const HUD_H = 80
export const BAR_Y = 680

export const FONT = '"Varela Round", system-ui, sans-serif'

export const COLORS = {
  bg: 0x05060f,
  panel: 0x10142e,
  panelEdge: 0x2b3470,
  cyan: 0x9eecff,
  red: 0xff4a4a,
  green: 0x3ddc84,
  yellow: 0xf5e663,
  purple: 0x8a5cff,
  white: 0xffffff,
} as const

/** Starting balance values from the story bible (section 11). */
export const BALANCE = {
  batteryDrain: 0.1, // % per second
  flashlightDrain: 0.2, // extra % per second while the phone light is on
  wrongCallBattery: 15,
  wrongCallEnergy: 15,
  correctCallBattery: 10,
  helperAllyTime: 20,
  abilityLockTime: 10,
  barrierEnergyMax: 100,
  barrierEnergyRegen: 3,
  maxUsesPerAbility: 3,
  isolationAlone: 2,
  isolationOneAlly: 0.5,
  isolationDecay: 1.5,
  chargeRate: 4, // % per second inside a safe zone (5s => +20%)
  chargeCap: 20,
  playerSpeed: 100,
  shareLocationCost: 5,
  shareLocationUses: 2,
  reportTime: 2,
  maxWrongCalls: 3,
  callAllyCost: 30, // awareness points
  maxAllies: 3,
} as const
