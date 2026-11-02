// ============================================================================
// CIVIC CLASH — MILESTONE 6 TYPES
// Secret Objectives, Social Deduction, Civic Response & Sealed Accusation
// ============================================================================

import type { PlayerRole } from './networkTypes.ts'

export type TaskStatus = 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
export type TaskCategory =
  | 'CIVIC_MAIN'
  | 'CIVIC_SECONDARY'
  | 'CIVIC_BONUS'
  | 'COVER'
  | 'COVERT'
  | 'DECEPTION'

export interface GameTask {
  id: string
  title: string
  description: string
  category: TaskCategory
  status: TaskStatus
  dependencies: string[]
  hint?: string
  rewardPoints: number
  progress: number // 0 - 100
  targetEntityId?: string
}

export interface EnvironmentalState {
  streetlights: 'ON' | 'OFF'
  cctvOperational: boolean
  cctvDisabledTimer: number
  noiseDistractionActive: boolean
  alarmActive: boolean
  crowdManaged: boolean
  exitShuttersUnlocked?: boolean
  breakerTripped?: boolean
}

export interface EvidenceCard {
  id: string
  title: string
  description: string
  source: string
  reliability: 'HIGH' | 'MEDIUM' | 'LOW'
  verified: boolean
  isContradiction?: boolean
}

export interface DefenseNarrativeCard {
  id: string
  title: string
  description: string
  credibility: 'HIGH' | 'PLAUSIBLE' | 'FLIMSY'
}

export interface PlayerVerdictSubmission {
  playerId: string
  role: PlayerRole
  suspectId?: string // 'host' | 'guest' | 'insufficient_evidence'
  selectedEvidenceIds: string[]
  counterNarrativeId?: string
  submittedAt: number
}

export interface VerdictRevealData {
  runnerSuspectId: string
  runnerAccusedRole: string
  runnerEvidence: EvidenceCard[]
  saboteurNarrative?: DefenseNarrativeCard
  actualRoles: Record<string, PlayerRole>
  actualSaboteurId: string
  isAccusationCorrect: boolean
  evidenceScoreAwarded: number
  saboteurDeceptionAwarded: number
  outcomeSummary: string
}

export interface CivicDebriefData {
  level: number
  levelTitle: string
  whatYouDidRight: string[]
  whatToImprove: string[]
  realWorldTakeaway: string
  officialGuidanceRef: string
}

export interface PrivatePlayerTelemetry {
  timeRemainingSec: number
  assignedRole: PlayerRole
  tasks: GameTask[]
  sabotageEnergy?: number
  saboteurAbilities?: any[]
  environmentalState: EnvironmentalState
  availableEvidence: EvidenceCard[]
  availableDefenseNarratives?: DefenseNarrativeCard[]
  communityCooperation: number
  inventory: string[]
  eventFeed: any[]
}
