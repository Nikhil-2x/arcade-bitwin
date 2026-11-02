import type { PlayerRole } from './networkTypes.ts'

export type NPCBehaviourState = 
  | 'IDLE' 
  | 'OBSERVING' 
  | 'APPROACHED' 
  | 'IN_CONVERSATION' 
  | 'HESITANT' 
  | 'COOPERATIVE' 
  | 'MISINFORMED' 
  | 'LEAVING'

export type NPCPhysicalReaction =
  | 'idle'
  | 'nod'
  | 'shake_head'
  | 'point_cctv'
  | 'point_road'
  | 'step_back'
  | 'call_phone'
  | 'walk_to_cctv'
  | 'clutch_chest'
  | 'pain_relieved'
  | 'direct_traffic'

export interface NPCState {
  id: string
  name: string
  roleTitle: string
  zone: string
  position: { x: number; y: number; z: number }
  facingYaw: number

  trust: number       // 0 - 100
  fear: number        // 0 - 100
  cooperation: number // 0 - 100

  state: NPCBehaviourState
  belief: string
  knowledge: string[]

  manipulated: boolean
  interactedWithRunner: boolean
  interactedWithSaboteur: boolean
  currentSpeakerId: string | null
  lastInteractionAt: number | null

  // Milestone 3 additions
  currentReaction?: NPCPhysicalReaction
  reactionDurationSec?: number
  isMoving?: boolean
  targetWaypoint?: { x: number; y: number; z: number }
}

export interface InteractiveObjectState {
  id: string
  name: string
  zone: string
  position: { x: number; y: number; z: number }
  radius: number
  state: string // 'ready' | 'active' | 'disabled' | 'collected' | 'used'
  disabledTimer?: number
  collectedBy?: string
}

export interface InformationEntry {
  id: string
  title: string
  description: string
  source: string
  reliability: 'LOW' | 'MEDIUM' | 'HIGH'
  verified: boolean
  timestamp: number
}

export interface DialogueOption {
  id: string
  text: string
  role: PlayerRole
  sabotageEnergyCost?: number
  requiredCooperation?: number
  consequenceHint?: string
}

export interface DialogueSession {
  npcId: string
  npcName: string
  npcRole: string
  promptText: string
  options: DialogueOption[]
  history: { speaker: string; text: string }[]
  trust: number
  fear: number
  cooperation: number
  statusMessage?: string
}

export interface ObjectiveItem {
  id: string
  title: string
  description: string
  completed: boolean
}

export interface SaboteurAbility {
  id: string
  name: string
  energyCost: number
  cooldownSec: number
  currentCooldownSec: number
  range: number
  icon: string
  description: string
}

export interface EscapeProgress {
  isEscaping: boolean
  progressSec: number
  maxSec: number
  saboteurId: string | null
  isCompleted?: boolean
}

export interface EventFeedItem {
  id: string
  text: string
  type: 'emergency' | 'sabotage' | 'cooperation' | 'evidence' | 'traffic'
  timestamp: number
}

export interface GameTelemetryM2 {
  timeRemainingSec: number
  runnerObjectives: ObjectiveItem[]
  saboteurObjectives: ObjectiveItem[]
  sabotageEnergy: number
  communityCooperation: number
  inventory: string[]
  suspicionLevel: number // 0 - 100
  escapeProgress?: EscapeProgress
  eventFeed?: EventFeedItem[]
  saboteurAbilities?: SaboteurAbility[]
  tasks?: any[]
  accusationTimeRemainingSec?: number
  availableEvidence?: any[]
  availableDefenseNarratives?: any[]
  environmentalState?: any
  assignedRole?: PlayerRole
}
