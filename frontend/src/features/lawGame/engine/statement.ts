import type { LawCase, ScoreLine } from '../types.ts'

const TIME_WORDS = /\b(\d{1,2}(:\d{2})?\s*(am|pm)?|am|pm|o'clock|evening|afternoon|morning|night|until|till|before|after)\b/i
const WITNESS_WORDS = /\b(saw|seen|witness|friend|teacher|librarian|guard|watchman|principal|camera|cctv|register|log|with)\b/i

const words = (s: string) => s.toLowerCase().match(/[a-z0-9']+/g) ?? []

/** Word-overlap similarity, 0..1: catches an alibi that just parrots an NPC's. */
function similarity(a: string, b: string): number {
  const A = new Set(words(a))
  const B = new Set(words(b))
  if (!A.size || !B.size) return 0
  let shared = 0
  for (const w of A) if (B.has(w)) shared++
  return shared / Math.min(A.size, B.size)
}

export const MIN_STATEMENT_WORDS = 8

/** How believable the obstructor's typed alibi is, as score lines out of 100. */
export function gradeStatement(text: string, theCase: LawCase, npcStatements: string[]): ScoreLine[] {
  const n = words(text).length
  const lower = text.toLowerCase()
  const copied = npcStatements.some((s) => similarity(text, s) > 0.7)
  if (copied) return [{ label: 'Alibi', points: 0, note: 'Too close to another suspect’s story' }]

  const length = n >= 12 && n <= 50 ? 40 : n >= MIN_STATEMENT_WORDS ? 25 : 0
  const place = theCase.placeWords.some((w) => lower.includes(w)) ? 20 : 0
  const time = TIME_WORDS.test(text) && /\d/.test(text) ? 20 : TIME_WORDS.test(text) ? 10 : 0
  const witness = WITNESS_WORDS.test(text) ? 20 : 0
  return [
    { label: 'Alibi detail', points: length, note: `${n} words` },
    { label: 'Names a place', points: place },
    { label: 'Gives a time', points: time },
    { label: 'Backed by a witness', points: witness },
  ]
}
