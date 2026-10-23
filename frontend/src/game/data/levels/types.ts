import type { AbilityId, LevelId, MapData, ScriptEvent, StartAlly, Theme } from '../../types.ts'
import type { Story } from '../../state/GameState.ts'

export interface LevelDef {
  id: LevelId
  title: string
  place: string
  story: string
  tone: string
  time: number
  theme: Theme
  persona: { name: string; text: string }
  abilities: AbilityId[]
  cardTimer: number
  hints: boolean
  energyStart: number
  /** Multiplier on the isolation fill rate. */
  isolationScale: number
  script: ScriptEvent[]
  afterRound: string
  startAllies: (story: Story, lostPrev: boolean) => StartAlly[]
  map: (story: Story) => MapData
}
