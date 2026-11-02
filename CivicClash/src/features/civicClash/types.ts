export type Role = 'rescuer' | 'saboteur'

export type GameMode = 'solo_rescuer' | 'solo_saboteur' | 'local_2p' | 'online'

export type Language = 'en' | 'hi'

export type GamePhase = 
  | 'lobby'
  | 'briefing'
  | 'playing'
  | 'standoff'
  | 'verdict'
  | 'debrief'
  | 'quiz'
  | 'level_summary'
  | 'final'

export type ConcernTag = 
  | 'fears_police'
  | 'fears_blame'
  | 'fears_bill'
  | 'assumes_others_called'
  | 'wants_to_film'
  | 'busy'
  | 'unsure_of_law'
  | 'fears_court'
  | 'intimidation'

export type NPCStatus = 
  | 'idle'
  | 'watching'
  | 'filming'
  | 'wavering'
  | 'silent'
  | 'willing'
  | 'tasked'
  | 'resolute'
  | 'leaving'
  | 'annoyed'

export type NPCTaskType = 
  | 'call_112'
  | 'clear_lane'
  | 'fetch_kit'
  | 'drive_victim'
  | 'guide_ambulance'
  | 'secure_cctv'
  | 'watch_and_note'
  | 'escort'
  | 'freeze_account'
  | 'warn_market'
  | 'zero_fir_witness'

export interface FactCard {
  id: string
  level: number
  title: string
  titleHi: string
  claim: string
  claimHi: string
  plain: string
  plainHi: string
  why: string
  whyHi: string
  source: {
    title: string
    code: string
    url?: string
  }
  category: 'law' | 'first_aid' | 'consumer' | 'procedure'
  lastVerified: string
  unlockedByDefault?: boolean
}

export interface MythCard {
  id: string
  level: number
  title: string
  titleHi: string
  whisperText: string
  whisperTextHi: string
  matchingConcern: ConcernTag
  counterFactId: string
  influenceCost: number
}

export interface ProofToken {
  id: string
  title: string
  titleHi: string
  description: string
  descriptionHi: string
  secured: boolean
  securedBy?: Role
  timeSecured?: number
  tamperedUntil?: number // if Saboteur covered it up
}

export interface RescueChainStep {
  id: string
  stepNumber: number
  title: string
  titleHi: string
  instruction: string
  instructionHi: string
  completed: boolean
  points: number
  completedAt?: number
}

export interface WitnessNPC {
  id: string
  name: string
  nameHi: string
  roleDescription: string
  roleDescriptionHi: string
  x: number
  y: number
  avatarColor: string
  hesitation: number // 0-100 (<=30: willing, 31-69: wavering, >=70: silent)
  concerns: ConcernTag[]
  activeConcernIndex: number
  status: NPCStatus
  assignedTask?: NPCTaskType
  taskProgress?: number // 0-100%
  taskDurationSec?: number
  taskTimeRemaining?: number
  resoluteTimer?: number // seconds of whisper immunity
  annoyedTimer?: number // seconds won't talk after bad pressure
  holdsProofTokenId?: string
  dialogueHistory?: string[]
}

export interface EnvironmentalElement {
  id: string
  name: string
  nameHi: string
  x: number
  y: number
  width: number
  height: number
  type: 
    | 'traffic_signal'
    | 'ambulance_lane'
    | 'dhaba_cctv'
    | 'auto_rickshaw'
    | 'qr_stand'
    | 'price_board'
    | 'atm_bank'
    | 'pa_mic'
    | 'token_machine'
    | 'direction_sign'
    | 'charter_board'
    | 'counter_shutter'
  state: string // e.g. 'green' | 'red' | 'open' | 'blocked' | 'secured' | 'sabotaged' | 'hijacked'
  tamperedBySaboteur: boolean
  interactionCooldown: number
}

export interface TimelineEvent {
  id: string
  title: string
  titleHi: string
  windowStartSec: number
  windowEndSec: number
  status: 'pending' | 'active' | 'missed' | 'completed'
  description: string
}

export interface LevelConfig {
  id: number
  title: string
  titleHi: string
  subtitle: string
  subtitleHi: string
  scenarioBrief: string
  scenarioBriefHi: string
  palette: {
    bg: string
    ground: string
    road: string
    accent: string
    ink: string
    building: string
    lighting: 'dusk' | 'neon' | 'office'
  }
  mapWidth: number
  mapHeight: number
  victimPos: { x: number; y: number }
  saboteurStartPos: { x: number; y: number }
  rescuerStartPos: { x: number; y: number }
  exitPos: { x: number; y: number }
  rescueChain: RescueChainStep[]
  witnesses: WitnessNPC[]
  environment: EnvironmentalElement[]
  timeline: TimelineEvent[]
  discoverableFactCardIds: string[]
  saboteurMythCardIds: string[]
}

export interface RoundScoreBreakdown {
  rescueChainPoints: number
  witnessMobilisedPoints: number
  mythsCounteredPoints: number
  proofTokensPoints: number
  accountabilityPoints: number
  timeBonusPoints: number
  safeWalkerBonus: number
  rightsRespectedBonus: number

  // Saboteur components
  whispersLandedPoints: number
  tasksCancelledPoints: number
  silenceTimePoints: number
  evidenceNeutralisedPoints: number
  escapePoints: number
  rumorStandoffPoints: number
  efficiencyPoints: number

  totalScore: number
}

export interface PlayerState {
  x: number
  y: number
  facing: 'up' | 'down' | 'left' | 'right'
  isMoving: boolean
  isHurrying: boolean

  // Rescuer resources
  composure: number // 0-100
  conesRemaining: number // start 3
  placedCones: { x: number; y: number }[]
  collectedFactIds: string[]
  readRoomActiveTimer: number // seconds remaining

  // Saboteur resources
  influence: number // 0-100
  exposure: number // 0-100
  whispersRemaining: number // 10 cap
  distractionsRemaining: number // 3 cap
  shiftsRemaining: number // 4 cap
  coverUpsRemaining: number // 3 cap
  blendInActiveTimer: number // seconds remaining
  isCalledOut: boolean
  calledOutTimer: number
  rumorTokens: number // up to 3 for final standoff
  hasEscaped: boolean
}

export interface PopQuizQuestion {
  id: string
  levelId: number
  question: string
  questionHi: string
  options: {
    text: string
    textHi: string
    isCorrect: boolean
  }[]
  explanation: string
  explanationHi: string
  legalCitation: string
}

