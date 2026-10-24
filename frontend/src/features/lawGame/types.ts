export type PlayerIndex = 0 | 1

export type EvidenceKind = 'envelope' | 'phone' | 'key' | 'printout' | 'bottle' | 'receipt'

export interface LawRef {
  act: string
  section: string
  title: string
  summary: string
}

export interface Evidence {
  id: string
  name: string
  kind: EvidenceKind
  /** Ground truth: does this item tie back to the crime? */
  relevant: boolean
  description: string
  /** What a member of the public should do (and not do) if they come across it at a scene. */
  precautions: string[]
  laws: LawRef[]
  /** How the item may (or may not) connect to the case: the detective's nudge. */
  connection: string
  /** Where it lies on the table before the obstructor moves it, as an offset from the desk centre. */
  deskOffset: [number, number]
}

export interface Suspect {
  id: string
  name: string
  role: string
  age: number
  skin: string
  hair: string
  shirt: string
  hairStyle: 0 | 1 | 2 | 3
  profile: string
  /** What this character says when an NPC. */
  statement: string
}

export type Mood = 'day' | 'dusk' | 'night' | 'alarm'

export interface StoryBeat {
  kicker: string
  title: string
  text: string
  mood: Mood
  /** Show the lineup of suspects under this beat. */
  lineup?: boolean
  /** Law note shown under the beat, when one fits. */
  law?: LawRef
}

export interface LawCase {
  level: number
  title: string
  place: string
  tagline: string
  beats: StoryBeat[]
  suspects: Suspect[]
  evidences: Evidence[]
  /** The legal framework the case teaches, shown in the recap. */
  charges: LawRef[]
  /** Seconds. */
  timing: { hide: number; statement: number; search: number; bifurcate: number }
  /** Words that make an alibi believable for this case, used to grade typed statements. */
  placeWords: string[]
}

export interface Placement {
  evidenceId: string
  position: [number, number, number]
  /** False when the item was left where it lay on the table. */
  moved: boolean
  /** 0 = in plain sight, 1 = unseen from everywhere in the room. */
  concealment: number
}

export type Verdict = 'relevant' | 'irrelevant'

export interface ScoreLine {
  label: string
  points: number
  note?: string
}

export interface RoundResult {
  round: 0 | 1
  criminal: PlayerIndex
  detective: PlayerIndex
  criminalLines: ScoreLine[]
  detectiveLines: ScoreLine[]
  criminalScore: number
  detectiveScore: number
  correctAccusation: boolean
  mistakes: number
  hintWasMisleading: boolean
  mislead: number
}

export interface Hint {
  suspectId: string
  /** True when the highlighted suspect is actually the culprit (the player is being misled). */
  misleading: boolean
  /** Chance, 0..1, that this hint would mislead, given the detective's mistakes. */
  chance: number
}
