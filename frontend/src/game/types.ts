export type PlayerIdx = 0 | 1
export type LevelId = 1 | 2 | 3
export type GameMode = 'solo' | 'duo'

export type AbilityId =
  | 'lightsOut'
  | 'closeWay'
  | 'decoy'
  | 'crowd'
  | 'fakeMsg'
  | 'drain'
  | 'flicker'
  | 'isolate'

export interface AbilityDef {
  id: AbilityId
  name: string
  cost: number
  cooldown: number
  desc: string
  counter: string
  color: number
  free?: boolean
}

/** One option-based question shown by the Prompt overlay. */
export interface HelplineCard {
  id: string
  level: LevelId
  text: string
  options: string[]
  correct: number[]
  best?: number
  hint: string
  reason: string
}

export type LampState = 'on' | 'off' | 'broken' | 'fixed' | 'out'

export interface LampDef {
  c: number
  r: number
  state: 'on' | 'off' | 'broken'
  /** Lit by the community if the previous level's light was reported. */
  community?: boolean
}

export interface GateDef {
  id: string
  tiles: [number, number][]
  /** Shortcut gates count towards `tookShortcut` when walked through. */
  shortcut?: boolean
}

export type InteractKind = 'ally' | 'kavya' | 'sign' | 'cab' | 'trust'

export interface InteractDef {
  id: string
  kind: InteractKind
  c: number
  r: number
  label: string
  color?: number
  /** Auto-trigger when Priya walks close (no Space needed). */
  auto?: boolean
  /** For signs. */
  dir?: number
  fakeDir?: number
  fake?: boolean
}

export type ScriptEvent =
  | { at: number; p: number; kind: 'card'; id: string }
  | { at: number; p: number; kind: 'scam' }
  | { at: number; p: number; kind: 'code' }

export interface StartAlly {
  id: string
  color: string
  label: string
}

export interface MapData {
  grid: string[]
  lamps: LampDef[]
  gates: GateDef[]
  interacts: InteractDef[]
  spawn: [number, number]
  /** Goal rectangle in tiles: c, r, w, h. */
  goal: [number, number, number, number]
  /** Safe zone rectangles in tiles: c, r, w, h. */
  zones: [number, number, number, number][]
  /** Dark-and-lonely tunnel rectangles, isolation fills faster there. */
  dangerZones?: [number, number, number, number][]
  crowd?: number
  decor?: DecorDef[]
}

export type Theme = 'lane' | 'market' | 'underpass'

export interface DecorDef {
  type: 'stall' | 'hospital' | 'cab' | 'npc' | 'barricade' | 'house' | 'bus_stop' | 'scooter'
  c: number
  r: number
  label?: string
  color?: string
  small?: boolean
}
