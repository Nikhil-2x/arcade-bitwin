import type { PlayerRole } from './networkTypes.ts'

export type MatchPhase =
  | 'MENU'
  | 'LOBBY'
  | 'READY_CHECK'
  | 'LEVEL_INTRO'
  | 'ROUND_ACTIVE'
  | 'ROUND_ENDING'
  | 'ACCUSATION_PHASE'
  | 'VERDICT_REVEAL'
  | 'ROUND_RESULTS'
  | 'ROLE_SWITCH'
  | 'LEVEL_RESULTS'
  | 'FINAL_RESULTS'
  | 'REMATCH'
  | 'PAUSED'
  | 'CANCELLED'

export interface ScoreEvent {
  id: string
  playerId: string
  playerName: string
  role: PlayerRole
  eventType: string
  description: string
  points: number
  level: number
  round: number
  timestamp: number
}

export interface PlayerMatchStats {
  playerId: string
  playerName: string
  totalScore: number
  runnerScore: number
  saboteurScore: number
  objectivesCompleted: number
  sabotageActionsExecuted: number
  civicAchievements: string[]
  ready: boolean
}

export interface RoundResult {
  level: number
  round: number
  roundId: string
  runnerId: string
  runnerName: string
  saboteurId: string
  saboteurName: string
  runnerScore: number
  saboteurScore: number
  runnerOutcome: 'EXCELLENT_RESPONSE' | 'SUCCESSFUL_RESPONSE' | 'PARTIAL_RESPONSE' | 'INCOMPLETE_RESPONSE'
  saboteurOutcome: 'SUCCESSFUL_ESCAPE' | 'PARTIAL_DISRUPTION' | 'DETECTED_AND_CONTAINED' | 'FAILED_ESCAPE'
  runnerScoreEvents: ScoreEvent[]
  saboteurScoreEvents: ScoreEvent[]
  summaryText: string
  durationSec: number
}

export interface LevelSummary {
  level: number
  title: string
  location: string
  civicTopic: string
  playerAScore: number
  playerBScore: number
  playerAName: string
  playerBName: string
  playerARunnerScore?: number
  playerASaboteurScore?: number
  playerBRunnerScore?: number
  playerBSaboteurScore?: number
  winnerId?: string | null
  winnerName?: string | null
  isDraw?: boolean
  margin?: number
  winnerText?: string
  keyTakeaways: string[]
}

export interface FinalMatchResult {
  winnerId: string | null
  winnerName: string | null
  isDraw: boolean
  playerA: PlayerMatchStats
  playerB: PlayerMatchStats
  roundHistory: RoundResult[]
  totalRoundsPlayed: number
}

export interface MatchState {
  roomId: string
  phase: MatchPhase
  currentLevel: number
  currentRound: number
  totalLevels: number
  roundsPerLevel: number
  totalRounds: number
  roundDuration: number
  roundStartedAt: number | null
  roundEndsAt: number | null
  timeRemainingSec: number
  pausedRemainingSec?: number
  isPaused: boolean
  pauseReason?: string
  players: Record<string, PlayerMatchStats>
  playerRoles: Record<string, PlayerRole> // playerId -> 'runner' | 'saboteur'
  roundResults: RoundResult[]
  levelSummaries: LevelSummary[]
  finalResult: FinalMatchResult | null
  readyStatus: Record<string, boolean> // playerId -> ready for next phase
  rematchVotes: Record<string, boolean> // playerId -> voted for rematch
  accusationTimeRemainingSec?: number
  environmentalState?: any
  latestVerdictReveal?: any
  latestCivicDebrief?: any
}
