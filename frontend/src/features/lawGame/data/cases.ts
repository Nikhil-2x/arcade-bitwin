import type { LawCase } from '../types.ts'
import { CASE_1 } from './case1.ts'
import { CASE_2 } from './case2.ts'

/** One case per level. Add later levels here; the game reads whichever is passed in. */
export const LAW_CASES: readonly LawCase[] = [CASE_1, CASE_2]
export const getCase = (level: number): LawCase => LAW_CASES.find((c) => c.level === level) ?? CASE_1
