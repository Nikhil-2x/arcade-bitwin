import { create } from 'zustand'
import { getCase } from '../data/cases.ts'
import { gradeStatement } from '../engine/statement.ts'
import { pickHint } from '../engine/hint.ts'
import { countMistakes, scoreCriminal, scoreDetective, sum } from '../engine/scoring.ts'
import type { Hint, LawCase, Placement, PlayerIndex, RoundResult, Verdict } from '../types.ts'

export type Phase =
  | 'briefing'
  | 'handoff-hide'
  | 'select'
  | 'hide'
  | 'statement'
  | 'handoff-search'
  | 'search'
  | 'bifurcate'
  | 'round-result'
  | 'final'

/** The room as the obstructor left it. Handed to the detective as-is. */
export interface SavedWorld {
  characterId: string
  placements: Placement[]
  statement: string
  hideUsed: number
}

interface LawGameState {
  phase: Phase
  theCase: LawCase
  round: 0 | 1
  world: SavedWorld | null
  collected: string[]
  searchUsed: number
  verdicts: Record<string, Verdict>
  sortUsed: number
  hint: Hint | null
  results: RoundResult[]

  /** Player 1 hides in round one and hunts in round two. */
  criminal: () => PlayerIndex
  detective: () => PlayerIndex

  start: (level?: number) => void
  finishBriefing: () => void
  confirmHandoff: () => void
  selectCharacter: (id: string) => void
  finishHide: (placements: Placement[], used: number) => void
  finishStatement: (text: string) => void
  finishSearch: (collected: string[], used: number) => void
  submitSort: (verdicts: Record<string, Verdict>, used: number, rng?: () => number) => void
  accuse: (suspectId: string) => void
  nextRound: () => void
}

const fresh = (level?: number) => ({
  phase: 'briefing' as Phase,
  theCase: getCase(level ?? 1),
  round: 0 as const,
  world: null,
  collected: [],
  searchUsed: 0,
  verdicts: {},
  sortUsed: 0,
  hint: null,
  results: [],
})

export const useLawGame = create<LawGameState>((set, get) => ({
  ...fresh(),
  criminal: () => (get().round === 0 ? 0 : 1),
  detective: () => (get().round === 0 ? 1 : 0),

  start: (level) => set(fresh(level)),
  finishBriefing: () => set({ phase: 'handoff-hide' }),

  confirmHandoff: () => {
    const { phase } = get()
    if (phase === 'handoff-hide') set({ phase: 'select' })
    else if (phase === 'handoff-search') set({ phase: 'search' })
  },

  selectCharacter: (id) => set({ world: { characterId: id, placements: [], statement: '', hideUsed: 0 }, phase: 'hide' }),

  finishHide: (placements, used) =>
    set((s) => (s.world ? { world: { ...s.world, placements, hideUsed: used }, phase: 'statement' } : s)),

  finishStatement: (text) =>
    set((s) => (s.world ? { world: { ...s.world, statement: text.trim() }, phase: 'handoff-search' } : s)),

  finishSearch: (collected, used) => set({ collected, searchUsed: used, phase: 'bifurcate' }),

  submitSort: (verdicts, used, rng) => {
    const { theCase, world, collected } = get()
    if (!world) return
    const mistakes = countMistakes(theCase.evidences, collected, verdicts)
    set({ verdicts, sortUsed: used, hint: pickHint(theCase.suspects, world.characterId, mistakes, rng) })
  },

  accuse: (suspectId) => {
    const s = get()
    const { theCase, world, hint } = s
    if (!world || !hint) return
    const accusedCorrectly = suspectId === world.characterId
    const mistakes = countMistakes(theCase.evidences, s.collected, s.verdicts)

    const npcStatements = theCase.suspects.filter((x) => x.id !== world.characterId).map((x) => x.statement)
    const alibi = gradeStatement(world.statement, theCase, npcStatements)

    const detectiveLines = scoreDetective({
      evidences: theCase.evidences,
      collected: s.collected,
      verdicts: s.verdicts,
      accusedCorrectly,
      searchLimit: theCase.timing.search,
      searchUsed: s.searchUsed,
      sortLimit: theCase.timing.bifurcate,
      sortUsed: s.sortUsed,
    })
    const criminalLines = scoreCriminal({
      evidences: theCase.evidences,
      placements: world.placements,
      alibi,
      hideLimit: theCase.timing.hide,
      hideUsed: world.hideUsed,
      accusedCorrectly,
      mistakes,
      hint,
    })
    const result: RoundResult = {
      round: s.round,
      criminal: s.criminal(),
      detective: s.detective(),
      criminalLines,
      detectiveLines,
      criminalScore: sum(criminalLines),
      detectiveScore: sum(detectiveLines),
      correctAccusation: accusedCorrectly,
      mistakes,
      hintWasMisleading: hint.misleading,
      mislead: hint.chance,
    }
    set({ results: [...s.results, result], phase: 'round-result' })
  },

  nextRound: () => {
    const { round } = get()
    if (round === 0) {
      set({ round: 1, world: null, collected: [], searchUsed: 0, verdicts: {}, sortUsed: 0, hint: null, phase: 'handoff-hide' })
    } else {
      set({ phase: 'final' })
    }
  },
}))

/** Total across both rounds for each player. */
export function totalsOf(results: RoundResult[]): [number, number] {
  const t: [number, number] = [0, 0]
  for (const r of results) {
    t[r.criminal] += r.criminalScore
    t[r.detective] += r.detectiveScore
  }
  return t
}
