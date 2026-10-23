import type { LevelId } from '../../types.ts'
import type { LevelDef } from './types.ts'
import { level1 } from './level1.ts'
import { level2 } from './level2.ts'
import { level3 } from './level3.ts'

export type { LevelDef }
export const LEVELS: Record<LevelId, LevelDef> = { 1: level1, 2: level2, 3: level3 }
