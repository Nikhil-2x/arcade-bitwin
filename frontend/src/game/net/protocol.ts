import type { PromptConfig, PromptResult } from '../scenes/PromptScene.ts'
import type { SceneKey } from '../sceneBridge.ts'
import type { GameSnapshot } from '../state/GameState.ts'
import type { AbilityId, LampState } from '../types.ts'

/** Who sees a message during a level: everyone, or only the player on that side. */
export type Audience = 'all' | 'runner' | 'barrier'

export type SfxName = 'click' | 'good' | 'bad' | 'phone' | 'ability' | 'pop' | 'win' | 'lose' | 'heartbeat'

/** A prompt card sent to the other computer: the config without its callbacks. */
export type RemotePrompt = Omit<PromptConfig, 'parent' | 'onDone'>

export interface AllySnap {
  uid: number
  /** Index of the map NPC this ally was recruited from, or -1 for someone who appeared. */
  npc: number
  color: string
  label: string
  x: number
  y: number
  mode: string
  joined: boolean
}

/** Everything the second screen draws during a level, sent by the host about 20 times a second. */
export interface LevelSnap {
  now: number
  elapsed: number
  px: number
  py: number
  vx: number
  moving: boolean
  /** Priya can't walk right now (helping someone, on a call, stunned). */
  frozen: boolean
  run: Record<string, unknown>
  energy: number
  /** Per ability, in the level's order: why it is blocked, cooldown left, uses left. */
  abil: [string | null, number, number][]
  lamps: LampState[]
  /** closedUntil, fakeUntil */
  gates: [number, number][]
  /** id, column, row, fake, verified */
  signs: [string, number, number, boolean, boolean][]
  npcs: boolean[]
  allies: AllySnap[]
  crowd: [number, number][]
  hint: string
  /** Hold / busy progress 0..1, or -1 when nothing is in progress. */
  prog: number
  /** What Priya can interact with right now, lit up on the Runner's zoomed view. */
  focus: [number, number] | null
}

export type LevelFx =
  | { f: 'toast'; msg: string; color: number; to: Audience }
  | { f: 'intel'; msg: string }
  | { f: 'puff'; x: number; y: number; tint: number; barrier: boolean }
  | { f: 'sfx'; name: SfxName }
  | { f: 'shake'; ms: number; amt: number }
  | { f: 'end'; win: boolean }
  /** Priya's phone card opened (title) or closed (null), for the side that isn't answering it. */
  | { f: 'call'; title: string | null }

/** Messages between the two browsers (the server just passes them along). */
export type Relay =
  // host -> guest
  | { k: 'scene'; key: SceneKey; state: GameSnapshot | null }
  | { k: 'cue'; scene: string; name: string }
  | { k: 'prompt'; id: number; cfg: RemotePrompt }
  | { k: 'snap'; s: LevelSnap }
  | { k: 'fx'; fx: LevelFx }
  // guest -> host
  | { k: 'act'; scene: string; name: string }
  | { k: 'answer'; id: number; result: PromptResult }
  | { k: 'run'; x: number; y: number; held: string[] }
  | { k: 'tap'; key: string }
  | { k: 'aim'; x: number; y: number }
  | { k: 'ability'; id: AbilityId; x: number; y: number }

export type RelayKind = Relay['k']
export type RelayOf<K extends RelayKind> = Extract<Relay, { k: K }>

/** Server <-> browser envelope. */
export type ServerMsg =
  | { t: 'created'; code: string }
  | { t: 'joined'; code: string }
  | { t: 'peer-joined' }
  | { t: 'peer-left' }
  | { t: 'closed' }
  | { t: 'error'; message: string }
  | { t: 'relay'; data: Relay }
