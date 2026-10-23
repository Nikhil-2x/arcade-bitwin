import { LEVELS } from '../game/data/levels/index.ts'
import type { SceneKey } from '../game/sceneBridge.ts'
import { GameState } from '../game/state/GameState.ts'
import type { LevelId } from '../game/types.ts'

export const PATHS = {
  intro: '/',
  menu: '/menu',
  levels: '/levels',
  play: '/play/:levelId',
  ending: '/ending',
  results: '/results',
} as const

export const playPath = (level: LevelId) => `/play/${level}`

/** One play of a level, from the prologue to its result screen, lives under /play/:levelId. */
export const PLAY_SCENES: readonly SceneKey[] = ['Prologue', 'Brief', 'Level', 'RoundEnd', 'LevelResult']

export function parseLevelId(param: string | undefined): LevelId | null {
  const n = Number(param)
  return n in LEVELS ? (n as LevelId) : null
}

/** Where the URL should be while a scene is on screen. Boot has no page of its own. */
export function pathForScene(key: SceneKey): string | null {
  if (PLAY_SCENES.includes(key)) {
    const level = GameState.steps[0]?.level
    return level ? playPath(level) : null
  }
  switch (key) {
    case 'Trailer':
      return PATHS.intro
    case 'Menu':
      return PATHS.menu
    case 'LevelSelect':
      return PATHS.levels
    case 'Ending':
      return PATHS.ending
    case 'Results':
      return PATHS.results
    default:
      return null
  }
}
