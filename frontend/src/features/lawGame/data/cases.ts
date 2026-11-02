import type { LawCase } from '../types.ts'
import { CASE_1 } from './case1.ts'
import { CASE_2 } from './case2.ts'
import { CASE_3 } from './case3.ts'
import { CASE_4 } from './case4.ts'

/** One case per level. Add later levels here; the game reads whichever is passed in. */
export const LAW_CASES: readonly LawCase[] = [CASE_1, CASE_2, CASE_3, CASE_4]
export const getCase = (level: number): LawCase => LAW_CASES.find((c) => c.level === level) ?? CASE_1
