import type { Evidence, Hint, Placement, ScoreLine, Verdict } from '../types.ts'

export const sum = (lines: ScoreLine[]) => lines.reduce((t, l) => t + l.points, 0)

export function countMistakes(evidences: Evidence[], collected: string[], verdicts: Record<string, Verdict>): number {
  return evidences.filter((e) => {
    // An item never found, or never sorted, counts as a miss.
    if (!collected.includes(e.id)) return true
    const v = verdicts[e.id]
    return v === undefined || (v === 'relevant') !== e.relevant
  }).length
}

interface DetectiveInput {
  evidences: Evidence[]
  collected: string[]
  verdicts: Record<string, Verdict>
  accusedCorrectly: boolean
  searchLimit: number
  searchUsed: number
  sortLimit: number
  sortUsed: number
}

export function scoreDetective(i: DetectiveInput): ScoreLine[] {
  const lines: ScoreLine[] = []
  const found = i.collected.length
  lines.push({ label: 'Evidence found', points: found * 40, note: `${found} of ${i.evidences.length}` })

  const mistakes = countMistakes(i.evidences, i.collected, i.verdicts)
  const right = i.evidences.length - mistakes
  lines.push({ label: 'Sorted correctly', points: right * 100, note: `${right} of ${i.evidences.length}` })
  if (mistakes) lines.push({ label: 'Sorting mistakes', points: -30 * mistakes, note: `${mistakes} wrong or missing` })

  lines.push({
    label: i.accusedCorrectly ? 'Culprit caught' : 'Wrong person accused',
    points: i.accusedCorrectly ? 300 : 0,
  })

  if (found === i.evidences.length) {
    lines.push({ label: 'Search speed', points: Math.round(Math.max(0, i.searchLimit - i.searchUsed) * 1.5) })
  }
  lines.push({ label: 'Sorting speed', points: Math.round(Math.max(0, i.sortLimit - i.sortUsed) * 0.8) })
  return lines
}

interface CriminalInput {
  evidences: Evidence[]
  placements: Placement[]
  alibi: ScoreLine[]
  hideLimit: number
  hideUsed: number
  accusedCorrectly: boolean
  mistakes: number
  hint: Hint
}

export function scoreCriminal(i: CriminalInput): ScoreLine[] {
  const lines: ScoreLine[] = []
  const byId = new Map(i.placements.map((p) => [p.evidenceId, p]))
  let hidden = 0
  for (const e of i.evidences) {
    const c = byId.get(e.id)?.concealment ?? 0
    hidden += Math.round(c * (e.relevant ? 60 : 20))
  }
  lines.push({ label: 'Hiding', points: hidden, note: 'how well each item is out of sight' })

  const alibi = sum(i.alibi)
  lines.push({ label: 'Alibi', points: alibi })

  if (!i.accusedCorrectly) lines.push({ label: 'Detective fooled', points: 200 })
  if (i.mistakes) lines.push({ label: 'Detective misjudged clues', points: 40 * i.mistakes, note: `${i.mistakes} sorting mistakes` })
  if (i.hint.misleading) lines.push({ label: 'Hint steered away', points: 60, note: 'the culprit was marked least likely' })

  // Finishing early only pays if every item was actually moved.
  const moved = i.placements.filter((p) => p.moved).length / i.evidences.length
  lines.push({ label: 'Speed', points: Math.max(0, Math.round((i.hideLimit - i.hideUsed) * moved)) })
  return lines
}
