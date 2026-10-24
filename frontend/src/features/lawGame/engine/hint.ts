import type { Hint, Suspect } from '../types.ts'

const CHANCE_PER_MISTAKE = 0.35
const MAX_CHANCE = 0.9

/** Chance the hint lies, from the detective's sorting mistakes. Zero mistakes means a truthful hint. */
export const misleadChance = (mistakes: number) => Math.min(MAX_CHANCE, mistakes * CHANCE_PER_MISTAKE)

/**
 * Highlights the suspect who looks LEAST likely to be the culprit.
 * With a clean sort it always lands on an innocent. Each mistake raises the odds that it
 * lands on the real culprit instead, steering the detective away from them.
 */
export function pickHint(suspects: Suspect[], culpritId: string, mistakes: number, rng: () => number = Math.random): Hint {
  const chance = misleadChance(mistakes)
  const innocents = suspects.filter((s) => s.id !== culpritId)
  const misleading = rng() < chance
  const suspectId = misleading ? culpritId : innocents[Math.floor(rng() * innocents.length)].id
  return { suspectId, misleading, chance }
}
