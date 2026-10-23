import type { GameMode, LevelId, PlayerIdx } from '../types.ts'

/** Carry-over flags from the story bible (section 3). One set per Priya. */
export interface Story {
  checkedIn: boolean
  reportedLight: boolean
  tookShortcut: number
  helpedKavya: boolean
  fellForScam: boolean
  batteryCarry: number
  wrongCalls: number
  correctCalls: number
  networkScore: number
  chargedLast: boolean
  lostLast: boolean
  codePhrase: string
  won: Partial<Record<LevelId, boolean>>
}

export interface PlayerRecord {
  story: Story
  runnerScore: number
  barrierScore: number
  callsMade: number
  callsCorrect: number
  missedHelplines: { text: string; answer: string }[]
  exploits: { lights: number; gates: number; decoys: number; other: number }
  faults: number
  allies: number
  bystander: 'ignore' | 'checkIn' | 'alert' | 'call' | null
  l3Correct: number
  l3Wrong: number
  l3Allies: number
}

export interface Step {
  level: LevelId
  runner: PlayerIdx
  barrier: PlayerIdx
  /** 0 = first round of the level, 1 = swapped round. */
  round: 0 | 1
}

export interface RoundOutcome {
  step: Step
  win: boolean
  reason: 'home' | 'isolated' | 'time' | 'calls'
  runnerScore: number
  barrierScore: number
  timeLeft: number
  battery: number
  allies: number
  correct: number
  wrong: number
  faults: number
  charged: boolean
}

const freshStory = (): Story => ({
  checkedIn: false,
  reportedLight: false,
  tookShortcut: 0,
  helpedKavya: false,
  fellForScam: false,
  batteryCarry: 100,
  wrongCalls: 0,
  correctCalls: 0,
  networkScore: 0,
  chargedLast: false,
  lostLast: false,
  codePhrase: '',
  won: {},
})

const freshPlayer = (): PlayerRecord => ({
  story: freshStory(),
  runnerScore: 0,
  barrierScore: 0,
  callsMade: 0,
  callsCorrect: 0,
  missedHelplines: [],
  exploits: { lights: 0, gates: 0, decoys: 0, other: 0 },
  faults: 0,
  allies: 0,
  bystander: null,
  l3Correct: 0,
  l3Wrong: 0,
  l3Allies: 0,
})

/** Global game state shared by every scene (story bible, section 12). */
class GameStateImpl {
  mode: GameMode = 'solo'
  players: [PlayerRecord, PlayerRecord] = [freshPlayer(), freshPlayer()]
  steps: Step[] = []
  stepIndex = 0
  lastOutcome: RoundOutcome | null = null
  /** Bystander decision from the previous Level 3 round, becomes a surprise ally. */
  surpriseAlly = false

  newGame(mode: GameMode) {
    this.mode = mode
    this.players = [freshPlayer(), freshPlayer()]
    this.stepIndex = 0
    this.lastOutcome = null
    this.surpriseAlly = false
    this.steps = []
    for (const level of [1, 2, 3] as LevelId[]) {
      this.steps.push({ level, runner: 0, barrier: 1, round: 0 })
      if (mode === 'duo') this.steps.push({ level, runner: 1, barrier: 0, round: 1 })
    }
  }

  get step(): Step {
    return this.steps[this.stepIndex]
  }

  get done() {
    return this.stepIndex >= this.steps.length
  }

  runner(): PlayerRecord {
    return this.players[this.step.runner]
  }

  barrier(): PlayerRecord {
    return this.players[this.step.barrier]
  }

  /** The barrier is an AI whenever only one human is playing. */
  get aiBarrier() {
    return this.mode === 'solo'
  }

  /** Is the next step the first round of a new level? */
  get levelJustFinished(): boolean {
    const next = this.steps[this.stepIndex + 1]
    return !next || next.level !== this.step.level
  }
}

export const GameState = new GameStateImpl()
