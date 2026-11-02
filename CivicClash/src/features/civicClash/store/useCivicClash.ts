import { useState, useEffect, useCallback, useRef } from 'react'
import type { 
  GamePhase, 
  GameMode, 
  Role, 
  Language, 
  LevelConfig, 
  PlayerState, 
  WitnessNPC, 
  EnvironmentalElement, 
  ProofToken, 
  RescueChainStep, 
  RoundScoreBreakdown,
  NPCTaskType
} from '../types.ts'
import { LEVELS, getLevelById } from '../data/levels.ts'
import { FACT_CARDS, getFactById } from '../data/facts.ts'
import { MYTH_CARDS, getMythById } from '../data/myths.ts'
import { distance, resolveMovement, hasLineOfSight } from '../engine/physics.ts'
import { sound } from '../engine/audio.ts'
import { updateSaboteurBot, updateRescuerBot } from '../engine/bot.ts'

export interface CivicClashStore {
  // Config & match state
  phase: GamePhase
  mode: GameMode
  currentLevelId: number
  roundNumber: 1 | 2 // Round A (1) or Round B (2)
  p1Role: Role
  language: Language
  timeRemainingSec: number // 270s (4:30)
  level: LevelConfig

  // Entity states
  rescuer: PlayerState
  saboteur: PlayerState
  witnesses: WitnessNPC[]
  environment: EnvironmentalElement[]
  proofTokens: ProofToken[]
  rescueChain: RescueChainStep[]

  // Scoring
  p1Score: number
  p2Score: number
  rescuerScoreBreakdown: RoundScoreBreakdown
  saboteurScoreBreakdown: RoundScoreBreakdown
  knowledgePoints: number

  // Active dialogue / interaction state
  activeWitnessId?: string
  activeEnvId?: string
  dialogueFeedback?: {
    isSuccess: boolean
    message: string
    sourceTitle?: string
    sourceCode?: string
  }
  isCalling112: boolean
  call112Progress: number // 0-100%

  // Live game alerts & Saboteur shouts
  saboteurShout?: { text: string; timer: number }
  liveAlert?: { text: string; type: 'info' | 'warning' | 'success'; timer: number }
  currentObjective: {
    stepNumber: number
    title: string
    titleHi: string
    instruction: string
    instructionHi: string
    targetX: number
    targetY: number
  }

  // Cooldowns
  raiseVoiceCooldown: number
  readRoomCooldown: number
  saboteurWhisperCooldown: number
  saboteurDistractCooldown: number
  saboteurShiftCooldown: number

  // Actions
  setLanguage: (lang: Language) => void
  startMatch: (mode: GameMode, levelId?: number) => void
  setPhase: (phase: GamePhase) => void
  movePlayer: (role: Role, dx: number, dy: number, isHurrying?: boolean) => void
  rescuerTalk: (witnessId: string) => void
  rescuerCloseDialogue: () => void
  rescuerAnswerConcern: (witnessId: string, factId?: string, tone?: 'empathy' | 'pressure') => void
  rescuerAssignTask: (witnessId: string, task: NPCTaskType) => void
  rescuerRaiseVoice: () => void
  rescuerReadRoom: () => void
  rescuerPlaceCone: () => void
  rescuerCall112Directly: () => void
  rescuerInteractEnvironment: (envId: string) => void
  rescuerAssessVictim: () => void
  complete112Dispatch: () => void
  confrontSaboteur: () => void
  saboteurWhisper: (witnessId: string, mythId: string) => void
  saboteurDistract: () => void
  saboteurShiftBarrier: (envId: string) => void
  saboteurCoverUp: (tokenId: string) => void
  saboteurBlendIn: () => void
  saboteurSlipAway: () => void
  nextRoundOrLevel: () => void
}

function createInitialPlayerState(role: Role, level: LevelConfig): PlayerState {
  const isRescuer = role === 'rescuer'
  const pos = isRescuer ? level.rescuerStartPos : level.saboteurStartPos

  return {
    x: pos.x,
    y: pos.y,
    facing: 'down',
    isMoving: false,
    isHurrying: false,

    // Rescuer
    composure: 100,
    conesRemaining: 3,
    placedCones: [],
    collectedFactIds: [...level.discoverableFactCardIds.slice(0, 3)], // start with initial facts
    readRoomActiveTimer: 0,

    // Saboteur
    influence: 60,
    exposure: 10,
    whispersRemaining: 10,
    distractionsRemaining: 3,
    shiftsRemaining: 4,
    coverUpsRemaining: 3,
    blendInActiveTimer: 0,
    isCalledOut: false,
    calledOutTimer: 0,
    rumorTokens: 0,
    hasEscaped: false
  }
}

export function useCivicClash(): CivicClashStore {
  const [phase, setPhase] = useState<GamePhase>('lobby')
  const [mode, setMode] = useState<GameMode>('solo_rescuer')
  const [currentLevelId, setCurrentLevelId] = useState<number>(1)
  const [roundNumber, setRoundNumber] = useState<1 | 2>(1)
  const [p1Role, setP1Role] = useState<Role>('rescuer')
  const [language, setLanguage] = useState<Language>('en')
  const [timeRemainingSec, setTimeRemainingSec] = useState<number>(270) // 4:30 compressed Golden Hour

  const level = getLevelById(currentLevelId)

  const [rescuer, setRescuer] = useState<PlayerState>(() => createInitialPlayerState('rescuer', level))
  const [saboteur, setSaboteur] = useState<PlayerState>(() => createInitialPlayerState('saboteur', level))
  const [witnesses, setWitnesses] = useState<WitnessNPC[]>(() => JSON.parse(JSON.stringify(level.witnesses)))
  const [environment, setEnvironment] = useState<EnvironmentalElement[]>(() => JSON.parse(JSON.stringify(level.environment)))
  const [rescueChain, setRescueChain] = useState<RescueChainStep[]>(() => JSON.parse(JSON.stringify(level.rescueChain)))

  const [proofTokens, setProofTokens] = useState<ProofToken[]>([
    { id: 'token_car_color', title: 'Car Make & Color', titleHi: 'कार का रंग व मॉडल', description: 'Dark sedan with front dent', descriptionHi: 'सामने से क्षतिग्रस्त गहरे रंग की सेडान कार', secured: false },
    { id: 'token_number_plate', title: 'Partial License Plate', titleHi: 'आंशिक नंबर प्लेट', description: 'Priya photographed DL-04-C***', descriptionHi: 'प्रिया के फोन में DL-04-C*** का फोटो', secured: false },
    { id: 'token_cctv_footage', title: 'High-Res CCTV Footage', titleHi: 'ढाबा एचडी सीसीटीवी रिकॉर्डिंग', description: 'Clear timestamped video of the crash', descriptionHi: 'टक्कर का समयबद्ध स्पष्ट वीडियो फुटेज', secured: false },
    { id: 'token_fake_qr_peeled', title: 'Peeled Fraudulent QR', titleHi: 'हटाया गया फर्जी क्यूआर कोड', description: 'Fake beneficiary VPA identified', descriptionHi: 'फर्जी बैंक खाते की यूपीआई आईडी', secured: false },
    { id: 'token_scam_phone_sms', title: 'Phishing SMS & Call Logs', titleHi: 'साइबर ठगी के एसएमएस व कॉल रिकॉर्ड', description: 'Urgent KYC threat message', descriptionHi: 'बिजली काटने की धमकी वाला फर्जी संदेश', secured: false },
    { id: 'token_snatcher_bike_clue', title: 'Snatcher Bike Details', titleHi: 'झपटमारों की बाइक का विवरण', description: 'Black pulsator without rear mirror', descriptionHi: 'बिना शीशे वाली काली पल्सर बाइक', secured: false }
  ])

  // Scores
  const [p1Score, setP1Score] = useState<number>(0)
  const [p2Score, setP2Score] = useState<number>(0)
  const [knowledgePoints, setKnowledgePoints] = useState<number>(0)
  const [rescuerScoreBreakdown, setRescuerScoreBreakdown] = useState<RoundScoreBreakdown>({
    rescueChainPoints: 0,
    witnessMobilisedPoints: 0,
    mythsCounteredPoints: 0,
    proofTokensPoints: 0,
    accountabilityPoints: 0,
    timeBonusPoints: 0,
    safeWalkerBonus: 30,
    rightsRespectedBonus: 0,
    whispersLandedPoints: 0,
    tasksCancelledPoints: 0,
    silenceTimePoints: 0,
    evidenceNeutralisedPoints: 0,
    escapePoints: 0,
    rumorStandoffPoints: 0,
    efficiencyPoints: 0,
    totalScore: 0
  })
  const [saboteurScoreBreakdown, setSaboteurScoreBreakdown] = useState<RoundScoreBreakdown>({
    rescueChainPoints: 0,
    witnessMobilisedPoints: 0,
    mythsCounteredPoints: 0,
    proofTokensPoints: 0,
    accountabilityPoints: 0,
    timeBonusPoints: 0,
    safeWalkerBonus: 0,
    rightsRespectedBonus: 0,
    whispersLandedPoints: 0,
    tasksCancelledPoints: 0,
    silenceTimePoints: 0,
    evidenceNeutralisedPoints: 0,
    escapePoints: 0,
    rumorStandoffPoints: 0,
    efficiencyPoints: 0,
    totalScore: 0
  })

  // Dialogue & UI state
  const [activeWitnessId, setActiveWitnessId] = useState<string | undefined>()
  const [activeEnvId, setActiveEnvId] = useState<string | undefined>()
  const [dialogueFeedback, setDialogueFeedback] = useState<{
    isSuccess: boolean
    message: string
    sourceTitle?: string
    sourceCode?: string
  } | undefined>()
  const [isCalling112, setIsCalling112] = useState<boolean>(false)
  const [call112Progress, setCall112Progress] = useState<number>(0)

  // Live game alerts & Saboteur shouts
  const [saboteurShout, setSaboteurShout] = useState<{ text: string; timer: number } | undefined>()
  const [liveAlert, setLiveAlert] = useState<{ text: string; type: 'info' | 'warning' | 'success'; timer: number } | undefined>()

  // Cooldowns
  const [raiseVoiceCooldown, setRaiseVoiceCooldown] = useState<number>(0)
  const [readRoomCooldown, setReadRoomCooldown] = useState<number>(0)
  const [saboteurWhisperCooldown, setSaboteurWhisperCooldown] = useState<number>(0)
  const [saboteurDistractCooldown, setSaboteurDistractCooldown] = useState<number>(0)
  const [saboteurShiftCooldown, setSaboteurShiftCooldown] = useState<number>(0)

  // Start match helper
  const startMatch = useCallback((chosenMode: GameMode, levelId: number = 1) => {
    sound.playClick()
    setMode(chosenMode)
    setCurrentLevelId(levelId)
    setRoundNumber(1)
    setP1Role(chosenMode === 'solo_saboteur' ? 'saboteur' : 'rescuer')
    const freshLevel = getLevelById(levelId)
    setTimeRemainingSec(270)
    setRescuer(createInitialPlayerState('rescuer', freshLevel))
    setSaboteur(createInitialPlayerState('saboteur', freshLevel))
    setWitnesses(JSON.parse(JSON.stringify(freshLevel.witnesses)))
    setEnvironment(JSON.parse(JSON.stringify(freshLevel.environment)))
    setRescueChain(JSON.parse(JSON.stringify(freshLevel.rescueChain)))
    setPhase('playing')
  }, [])

  // Advance to next round or next level
  const nextRoundOrLevel = useCallback(() => {
    sound.playPaperFold()
    if (roundNumber === 1) {
      // Roles swap for Round B
      setRoundNumber(2)
      setP1Role((prev) => (prev === 'rescuer' ? 'saboteur' : 'rescuer'))
      setTimeRemainingSec(270)
      const freshLevel = getLevelById(currentLevelId)
      // Scenario remix: shuffle witness concerns
      const remixedWitnesses: WitnessNPC[] = JSON.parse(JSON.stringify(freshLevel.witnesses))
      remixedWitnesses.forEach((w) => {
        w.hesitation = Math.floor(Math.random() * 35) + 40
        w.status = w.hesitation >= 70 ? 'silent' : 'wavering'
      })
      setWitnesses(remixedWitnesses)
      setRescuer(createInitialPlayerState('rescuer', freshLevel))
      setSaboteur(createInitialPlayerState('saboteur', freshLevel))
      setRescueChain(JSON.parse(JSON.stringify(freshLevel.rescueChain)))
      setEnvironment(JSON.parse(JSON.stringify(freshLevel.environment)))
      setPhase('playing')
    } else {
      // Advance to next level or final
      if (currentLevelId < 3) {
        startMatch(mode, currentLevelId + 1)
      } else {
        setPhase('final')
      }
    }
  }, [roundNumber, currentLevelId, mode, startMatch])

  // Move player with collision
  const movePlayer = useCallback((role: Role, dx: number, dy: number, isHurrying: boolean = false) => {
    const isRescuer = role === 'rescuer'
    const setter = isRescuer ? setRescuer : setSaboteur

    setter((prev) => {
      if (isHurrying && isRescuer && prev.composure <= 5) {
        isHurrying = false // out of composure
      }

      const speed = isHurrying ? 6.5 : 4.5
      const deltaX = dx * speed
      const deltaY = dy * speed

      let facing = prev.facing
      if (Math.abs(dx) > Math.abs(dy)) {
        facing = dx > 0 ? 'right' : 'left'
      } else if (Math.abs(dy) > 0.01) {
        facing = dy > 0 ? 'down' : 'up'
      }

      // Obstacle boxes - ONLY solid buildings, or active roadblock barriers (never open lanes)
      const obstacles = environment
        .filter((e) => ['dhaba_cctv', 'atm_bank', 'counter_shutter'].includes(e.type) || (e.tamperedBySaboteur && e.type === 'ambulance_lane'))
        .map((e) => ({
          x: e.x,
          y: e.y,
          width: e.width,
          height: e.height
        }))

      const nextPos = resolveMovement(
        prev.x,
        prev.y,
        deltaX,
        deltaY,
        14, // radius
        level.mapWidth,
        level.mapHeight,
        obstacles
      )

      return {
        ...prev,
        x: nextPos.x,
        y: nextPos.y,
        facing,
        isMoving: Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1,
        isHurrying,
        composure: isHurrying && isRescuer ? Math.max(0, prev.composure - 0.4) : prev.composure
      }
    })
  }, [environment, level.mapWidth, level.mapHeight])

  // Rescuer Inspects Victim
  const rescuerAssessVictim = useCallback(() => {
    sound.playSuccess()
    setRescueChain((prev) =>
      prev.map((step) =>
        step.stepNumber === 1 ? { ...step, completed: true, completedAt: 270 - timeRemainingSec } : step
      )
    )
    setRescuer((prev) => ({
      ...prev,
      composure: Math.min(100, prev.composure + 15),
      collectedFactIds: Array.from(new Set([...prev.collectedFactIds, 'L1-FA1', 'L1-FA2']))
    }))
    setRescuerScoreBreakdown((prev) => ({
      ...prev,
      rescueChainPoints: prev.rescueChainPoints + 40,
      totalScore: prev.totalScore + 40
    }))
  }, [timeRemainingSec])

  // Rescuer Talks to NPC
  const rescuerTalk = useCallback((witnessId: string) => {
    sound.playPaperFold()
    setActiveWitnessId(witnessId)
    setDialogueFeedback(undefined)
  }, [])

  const rescuerCloseDialogue = useCallback(() => {
    setActiveWitnessId(undefined)
    setDialogueFeedback(undefined)
  }, [])

  // Rescuer Answers Concern with Fact Card or Tone
  const rescuerAnswerConcern = useCallback((witnessId: string, factId?: string, tone?: 'empathy' | 'pressure') => {
    const witness = witnesses.find((w) => w.id === witnessId)
    if (!witness) return

    const activeConcern = witness.concerns[witness.activeConcernIndex]

    if (factId) {
      const fact = getFactById(factId)
      // Check if fact counters concern
      const isCorrect = (
        (activeConcern === 'fears_police' && (factId === 'L1-F2' || factId === 'L1-F3' || factId === 'L2-F2' || factId === 'L3-F1')) ||
        (activeConcern === 'fears_blame' && factId === 'L1-F1') ||
        (activeConcern === 'fears_bill' && (factId === 'L1-F4' || factId === 'L3-F2')) ||
        (activeConcern === 'assumes_others_called' && factId === 'L1-F8') ||
        (activeConcern === 'wants_to_film' && factId === 'L1-F8') ||
        (activeConcern === 'unsure_of_law' && (factId === 'L1-F9' || factId === 'L2-F3' || factId === 'L3-F1')) ||
        (activeConcern === 'fears_court' && factId === 'L2-F4') ||
        (activeConcern === 'intimidation' && factId === 'L3-F3') ||
        (activeConcern === 'busy' && factId === 'L2-F1')
      )

      if (isCorrect) {
        sound.playSuccess()
        setWitnesses((prev) =>
          prev.map((w) => {
            if (w.id !== witnessId) return w
            const nextHesitation = Math.max(0, w.hesitation - 40)
            const nextStatus = nextHesitation <= 30 ? 'willing' : 'wavering'
            return {
              ...w,
              hesitation: nextHesitation,
              status: nextStatus,
              resoluteTimer: 25 // 25s whisper immunity!
            }
          })
        )
        setKnowledgePoints((kp) => kp + 25)
        setRescuerScoreBreakdown((prev) => ({
          ...prev,
          mythsCounteredPoints: prev.mythsCounteredPoints + 25,
          totalScore: prev.totalScore + 25
        }))
        setDialogueFeedback({
          isSuccess: true,
          message: fact ? (language === 'hi' ? fact.plainHi : fact.plain) : 'Concern resolved!',
          sourceTitle: fact?.source.title,
          sourceCode: fact?.source.code
        })
      } else {
        sound.playError()
        setWitnesses((prev) =>
          prev.map((w) =>
            w.id === witnessId
              ? { ...w, hesitation: Math.min(100, w.hesitation + 15), status: 'annoyed', annoyedTimer: 15 }
              : w
          )
        )
        setDialogueFeedback({
          isSuccess: false,
          message: language === 'hi' 
            ? 'यह कानून इस डर को दूर नहीं करता। साक्षी असहज हो गया है।' 
            : 'That legal fact does not address this specific fear. The witness is annoyed!'
        })
      }
    } else if (tone === 'empathy') {
      sound.playWhisper()
      setWitnesses((prev) =>
        prev.map((w) =>
          w.id === witnessId
            ? { ...w, hesitation: Math.max(0, w.hesitation - 10) }
            : w
        )
      )
      setDialogueFeedback({
        isSuccess: true,
        message: language === 'hi'
          ? 'सहानुभूति से साक्षी थोड़ा शांत हुआ (-10% संकोच)। अब ठोस कानूनी तथ्य दिखाएं।'
          : 'Empathy calmed them slightly (-10% hesitation). Now show the solid legal fact!'
      })
    } else if (tone === 'pressure') {
      sound.playError()
      setWitnesses((prev) =>
        prev.map((w) =>
          w.id === witnessId
            ? { ...w, hesitation: Math.min(100, w.hesitation + 15), status: 'annoyed', annoyedTimer: 15 }
            : w
        )
      )
      setDialogueFeedback({
        isSuccess: false,
        message: language === 'hi'
          ? 'दबाव डालने से लोग पीछे हट जाते हैं (+15% संकोच)। ज्ञान से समझाइए, गुस्से से नहीं।'
          : 'Pressuring scared bystanders backfires (+15% hesitation). Persuade with laws, not force!'
      })
    }
  }, [witnesses, language])

  // Rescuer Assigns Task to Willing Witness
  const rescuerAssignTask = useCallback((witnessId: string, task: NPCTaskType) => {
    sound.playSuccess()
    setWitnesses((prev) =>
      prev.map((w) =>
        w.id === witnessId
          ? {
              ...w,
              status: 'tasked',
              assignedTask: task,
              taskProgress: 0,
              taskDurationSec: 12,
              taskTimeRemaining: 12
            }
          : w
      )
    )
    setActiveWitnessId(undefined)
  }, [])

  // Rescuer: Raise Voice (Q hotkey)
  const rescuerRaiseVoice = useCallback(() => {
    if (raiseVoiceCooldown > 0 || rescuer.composure < 25) return
    sound.playRaiseVoice()
    setRescuer((prev) => ({ ...prev, composure: prev.composure - 25 }))
    setRaiseVoiceCooldown(20)

    // Drops hesitation by 15 for all NPCs within 180px with no conflicting concern
    setWitnesses((prev) =>
      prev.map((w) => {
        const dist = distance(rescuer.x, rescuer.y, w.x, w.y)
        if (dist <= 180) {
          const nextH = Math.max(0, w.hesitation - 15)
          return {
            ...w,
            hesitation: nextH,
            status: nextH <= 30 ? 'willing' : w.status
          }
        }
        return w
      })
    )
  }, [raiseVoiceCooldown, rescuer.composure, rescuer.x, rescuer.y])

  // Rescuer: Read the Room (R hotkey)
  const rescuerReadRoom = useCallback(() => {
    if (readRoomCooldown > 0 || rescuer.composure < 15) return
    sound.playClick()
    setRescuer((prev) => ({
      ...prev,
      composure: prev.composure - 15,
      readRoomActiveTimer: 4
    }))
    setReadRoomCooldown(15)
  }, [readRoomCooldown, rescuer.composure])

  // Rescuer: Place Traffic Cone (C hotkey)
  const rescuerPlaceCone = useCallback(() => {
    if (rescuer.conesRemaining <= 0) return
    sound.playPaperFold()
    const conePos = { x: rescuer.x, y: rescuer.y + 10 }
    setRescuer((prev) => ({
      ...prev,
      conesRemaining: prev.conesRemaining - 1,
      placedCones: [...prev.placedCones, conePos]
    }))

    // If placed in emergency lane in level 1, complete chain step 3
    if (level.id === 1) {
      setRescueChain((prev) =>
        prev.map((s) => (s.stepNumber === 3 ? { ...s, completed: true } : s))
      )
      setEnvironment((prev) =>
        prev.map((e) => (e.id === 'env_ambulance_lane' ? { ...e, state: 'open', tamperedBySaboteur: false } : e))
      )
      setRescuerScoreBreakdown((prev) => ({
        ...prev,
        rescueChainPoints: prev.rescueChainPoints + 80,
        totalScore: prev.totalScore + 80
      }))
    }
  }, [rescuer.conesRemaining, rescuer.x, rescuer.y, level.id])

  // Rescuer: Direct Call to 112
  const rescuerCall112Directly = useCallback(() => {
    sound.playSiren()
    setIsCalling112(true)
    setCall112Progress(0)
  }, [])

  // Rescuer: Environment interaction
  const rescuerInteractEnvironment = useCallback((envId: string) => {
    sound.playClick()
    const target = environment.find((e) => e.id === envId)
    if (!target) return

    // If target was tampered by saboteur (roadblock / obstruction)
    if (target.tamperedBySaboteur) {
      sound.playSuccess()
      setEnvironment((prev) =>
        prev.map((e) => (e.id === envId ? { ...e, tamperedBySaboteur: false, state: 'open' } : e))
      )
      setLiveAlert({ text: '✅ Cleared Saboteur Roadblock! Road is clear (+30 pts)', type: 'success', timer: 3 })
      setRescuerScoreBreakdown((prev) => ({
        ...prev,
        rescueChainPoints: prev.rescueChainPoints + 30,
        totalScore: prev.totalScore + 30
      }))
      return
    }

    if (target.type === 'traffic_signal') {
      setEnvironment((prev) =>
        prev.map((e) =>
          e.id === envId ? { ...e, state: e.state === 'red' ? 'green' : 'red' } : e
        )
      )
    } else if (target.type === 'dhaba_cctv') {
      // Secure CCTV proof token
      sound.playSuccess()
      setProofTokens((prev) =>
        prev.map((t) => (t.id === 'token_cctv_footage' ? { ...t, secured: true, securedBy: 'rescuer' } : t))
      )
      setRescuerScoreBreakdown((prev) => ({
        ...prev,
        proofTokensPoints: prev.proofTokensPoints + 30,
        totalScore: prev.totalScore + 30
      }))
    } else if (target.type === 'qr_stand') {
      sound.playSuccess()
      setEnvironment((prev) =>
        prev.map((e) => (e.id === envId ? { ...e, state: 'verified' } : e))
      )
      setProofTokens((prev) =>
        prev.map((t) => (t.id === 'token_fake_qr_peeled' ? { ...t, secured: true, securedBy: 'rescuer' } : t))
      )
    } else if (target.type === 'token_machine') {
      sound.playSuccess()
      setRescueChain((prev) =>
        prev.map((s) => (s.stepNumber === 1 ? { ...s, completed: true } : s))
      )
    }
  }, [environment])

  // Saboteur: Whisper Myth
  const saboteurWhisper = useCallback((witnessId: string, mythId: string) => {
    if (saboteurWhisperCooldown > 0 || saboteur.influence < 20 || saboteur.whispersRemaining <= 0) return
    const myth = getMythById(mythId)
    if (!myth) return

    sound.playWhisper()
    setSaboteurWhisperCooldown(4)
    setSaboteur((prev) => {
      // Check exposure risk: seen if Rescuer within 120px and line of sight
      const isSeen = distance(prev.x, prev.y, rescuer.x, rescuer.y) < 130
      const nextExposure = isSeen ? Math.min(100, prev.exposure + 20) : Math.max(0, prev.exposure - 2)
      const isCalledOut = nextExposure >= 100

      if (isCalledOut) {
        sound.playError()
      }

      return {
        ...prev,
        influence: prev.influence - 20,
        whispersRemaining: prev.whispersRemaining - 1,
        exposure: nextExposure,
        isCalledOut,
        calledOutTimer: isCalledOut ? 5 : 0,
        rumorTokens: Math.min(3, prev.rumorTokens + 1)
      }
    })

    // Update witness
    setWitnesses((prev) =>
      prev.map((w) => {
        if (w.id !== witnessId) return w
        if (w.resoluteTimer && w.resoluteTimer > 0) return w // immune!

        const matches = w.concerns.includes(myth.matchingConcern)
        const hesDelta = matches ? 50 : 25
        const nextH = Math.min(100, w.hesitation + hesDelta)
        const nextStatus = nextH >= 70 ? 'silent' : 'wavering'

        return {
          ...w,
          hesitation: nextH,
          status: nextStatus
        }
      })
    )

    setSaboteurScoreBreakdown((prev) => ({
      ...prev,
      whispersLandedPoints: prev.whispersLandedPoints + 40,
      totalScore: prev.totalScore + 40
    }))
  }, [saboteurWhisperCooldown, saboteur.influence, saboteur.whispersRemaining, rescuer.x, rescuer.y])

  // Saboteur: Distraction (F hotkey)
  const saboteurDistract = useCallback(() => {
    if (saboteurDistractCooldown > 0 || saboteur.influence < 25 || saboteur.distractionsRemaining <= 0) return
    sound.playError()
    setSaboteurDistractCooldown(12)
    setSaboteur((prev) => ({
      ...prev,
      influence: prev.influence - 25,
      distractionsRemaining: prev.distractionsRemaining - 1
    }))

    // Halts task progress of NPCs in 160px radius for 5s
    setWitnesses((prev) =>
      prev.map((w) => {
        if (distance(saboteur.x, saboteur.y, w.x, w.y) <= 160 && w.status === 'tasked') {
          return {
            ...w,
            status: 'wavering',
            assignedTask: undefined,
            taskProgress: 0
          }
        }
        return w
      })
    )

    setSaboteurScoreBreakdown((prev) => ({
      ...prev,
      tasksCancelledPoints: prev.tasksCancelledPoints + 50,
      totalScore: prev.totalScore + 50
    }))
  }, [saboteurDistractCooldown, saboteur.influence, saboteur.distractionsRemaining, saboteur.x, saboteur.y])

  // Saboteur: Shift Barrier (G hotkey)
  const saboteurShiftBarrier = useCallback((envId: string) => {
    if (saboteurShiftCooldown > 0 || saboteur.influence < 15 || saboteur.shiftsRemaining <= 0) return
    sound.playPaperFold()
    setSaboteurShiftCooldown(6)
    setSaboteur((prev) => ({
      ...prev,
      influence: prev.influence - 15,
      shiftsRemaining: prev.shiftsRemaining - 1
    }))

    setEnvironment((prev) =>
      prev.map((e) =>
        e.id === envId
          ? {
              ...e,
              state: e.state === 'open' ? 'blocked' : 'open',
              tamperedBySaboteur: true
            }
          : e
      )
    )
  }, [saboteurShiftCooldown, saboteur.influence, saboteur.shiftsRemaining])

  // Saboteur: Cover Up Evidence (X hotkey)
  const saboteurCoverUp = useCallback((tokenId: string) => {
    if (saboteur.coverUpsRemaining <= 0 || saboteur.influence < 15) return
    sound.playPaperFold()
    setSaboteur((prev) => ({
      ...prev,
      influence: prev.influence - 15,
      coverUpsRemaining: prev.coverUpsRemaining - 1,
      exposure: Math.min(100, prev.exposure + 10)
    }))

    setProofTokens((prev) =>
      prev.map((t) => (t.id === tokenId ? { ...t, tamperedUntil: Date.now() + 20000 } : t))
    )

    setSaboteurScoreBreakdown((prev) => ({
      ...prev,
      evidenceNeutralisedPoints: prev.evidenceNeutralisedPoints + 40,
      totalScore: prev.totalScore + 40
    }))
  }, [saboteur.coverUpsRemaining, saboteur.influence])

  // Saboteur: Blend In (V hotkey)
  const saboteurBlendIn = useCallback(() => {
    if (saboteur.blendInActiveTimer > 0) return
    sound.playWhisper()
    setSaboteur((prev) => ({
      ...prev,
      blendInActiveTimer: 6,
      exposure: Math.max(0, prev.exposure - 25)
    }))
  }, [saboteur.blendInActiveTimer])

  // Complete 112 Dispatch
  const complete112Dispatch = useCallback(() => {
    sound.playSuccess()
    setRescueChain((prev) =>
      prev.map((s) => (s.stepNumber === 2 ? { ...s, completed: true } : s))
    )
    setRescuerScoreBreakdown((prev) => ({
      ...prev,
      rescueChainPoints: prev.rescueChainPoints + 100,
      totalScore: prev.totalScore + 100
    }))
    setRescuer((prev) => ({
      ...prev,
      collectedFactIds: Array.from(new Set([...prev.collectedFactIds, 'L1-F2', 'L1-F3']))
    }))
    setIsCalling112(false)
  }, [])

  // Confront & Expose Saboteur
  const confrontSaboteur = useCallback(() => {
    sound.playSiren()
    setSaboteur((prev) => ({
      ...prev,
      isCalledOut: true,
      calledOutTimer: 8,
      exposure: 100
    }))
    // Drop bystander fear across all witnesses by 30%
    setWitnesses((prev) =>
      prev.map((w) => {
        const nextH = Math.max(0, w.hesitation - 30)
        return {
          ...w,
          hesitation: nextH,
          status: nextH <= 30 ? 'willing' : 'wavering',
          resoluteTimer: 15
        }
      })
    )
    setLiveAlert({
      text: '📸 Confronted Saboteur! Saboteur stunned & bystander fears dropped! (+50 pts)',
      type: 'success',
      timer: 4
    })
    setRescuerScoreBreakdown((prev) => ({
      ...prev,
      accountabilityPoints: prev.accountabilityPoints + 50,
      totalScore: prev.totalScore + 50
    }))
  }, [])

  // Saboteur: Slip Away (B hotkey at exit)
  const saboteurSlipAway = useCallback(() => {
    const distToExit = distance(saboteur.x, saboteur.y, level.exitPos.x, level.exitPos.y)
    if (distToExit > 90 || saboteur.isCalledOut) return

    sound.playSuccess()
    setSaboteur((prev) => ({
      ...prev,
      hasEscaped: true
    }))

    const exposureBonus = saboteur.exposure < 50 ? 50 : 0
    setSaboteurScoreBreakdown((prev) => ({
      ...prev,
      escapePoints: 300 + exposureBonus,
      totalScore: prev.totalScore + 300 + exposureBonus
    }))
  }, [saboteur.x, saboteur.y, saboteur.exposure, saboteur.isCalledOut, level.exitPos.x, level.exitPos.y])

  // ─────────────────────────────────────────────────────────────
  // GAME SIMULATION LOOP (1 Hz main clock & contagion tick)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return

    const timer = setInterval(() => {
      // 1. Countdown Golden Hour clock
      setTimeRemainingSec((prev) => {
        if (prev <= 1) {
          // Time expired -> trigger verdict!
          setPhase('verdict')
          return 0
        }
        return prev - 1
      })

      // 2. Cooldown decrements
      setRaiseVoiceCooldown((c) => Math.max(0, c - 1))
      setReadRoomCooldown((c) => Math.max(0, c - 1))
      setSaboteurWhisperCooldown((c) => Math.max(0, c - 1))
      setSaboteurDistractCooldown((c) => Math.max(0, c - 1))
      setSaboteurShiftCooldown((c) => Math.max(0, c - 1))

      // 3. Player status updates & resource regen
      setRescuer((r) => ({
        ...r,
        composure: Math.min(100, r.composure + 3),
        readRoomActiveTimer: Math.max(0, r.readRoomActiveTimer - 1)
      }))

      setSaboteur((s) => ({
        ...s,
        influence: Math.min(100, s.influence + 3),
        exposure: Math.max(0, s.exposure - 1.5),
        blendInActiveTimer: Math.max(0, s.blendInActiveTimer - 1),
        isCalledOut: s.calledOutTimer > 1,
        calledOutTimer: Math.max(0, s.calledOutTimer - 1)
      }))

      // 4. Social contagion on NPC minds
      setWitnesses((prevWitnesses) => {
        return prevWitnesses.map((w, idx) => {
          let h = w.hesitation
          const resolute = Math.max(0, (w.resoluteTimer || 0) - 1)
          const annoyed = Math.max(0, (w.annoyedTimer || 0) - 1)

          // Contagion from neighbours (<= 160px)
          let silentCount = 0
          let willingCount = 0

          prevWitnesses.forEach((other, oIdx) => {
            if (idx === oIdx) return
            const d = distance(w.x, w.y, other.x, other.y)
            if (d <= 160) {
              if (other.status === 'silent') silentCount++
              if (other.status === 'willing' || other.status === 'tasked') willingCount++
            }
          })

          h += silentCount * 1.5
          h -= willingCount * 1.0

          // Crowd Fog (>= 4 unaddressed wavering bystanders add hesitation)
          if (prevWitnesses.filter((x) => x.hesitation > 30 && x.status !== 'tasked').length >= 4) {
            h += 0.5
          }

          h = Math.max(0, Math.min(100, h))

          let nextStatus = w.status
          if (w.status !== 'tasked') {
            if (annoyed > 0) {
              nextStatus = 'annoyed'
            } else if (h <= 30) {
              nextStatus = 'willing'
            } else if (h >= 70) {
              nextStatus = 'silent'
            } else {
              nextStatus = 'wavering'
            }
          }

          // Advance tasked progress
          let taskProgress = w.taskProgress
          let taskRemaining = w.taskTimeRemaining
          if (w.status === 'tasked' && taskRemaining !== undefined && taskRemaining > 0) {
            taskRemaining -= 1
            const duration = w.taskDurationSec || 12
            taskProgress = Math.round(((duration - taskRemaining) / duration) * 100)

            if (taskRemaining <= 0) {
              // Task completed!
              sound.playSuccess()
              if (w.assignedTask === 'call_112') {
                setRescueChain((rc) =>
                  rc.map((s) => (s.stepNumber === 2 ? { ...s, completed: true } : s))
                )
                setRescuerScoreBreakdown((sc) => ({
                  ...sc,
                  rescueChainPoints: sc.rescueChainPoints + 100,
                  totalScore: sc.totalScore + 100
                }))
              } else if (w.assignedTask === 'drive_victim' || w.assignedTask === 'guide_ambulance') {
                setRescueChain((rc) =>
                  rc.map((s) => (s.stepNumber === 4 ? { ...s, completed: true } : s))
                )
                setRescuerScoreBreakdown((sc) => ({
                  ...sc,
                  rescueChainPoints: sc.rescueChainPoints + 120,
                  totalScore: sc.totalScore + 120
                }))
              }
            }
          }

          return {
            ...w,
            hesitation: h,
            status: nextStatus,
            resoluteTimer: resolute,
            annoyedTimer: annoyed,
            taskProgress,
            taskTimeRemaining: taskRemaining
          }
        })
      })

      // 5. Update shout & alert timers
      setSaboteurShout((prev) => (prev && prev.timer > 1 ? { ...prev, timer: prev.timer - 1 } : undefined))
      setLiveAlert((prev) => (prev && prev.timer > 1 ? { ...prev, timer: prev.timer - 1 } : undefined))

      // 6. Bot execution in Solo Mode
      if (mode === 'solo_rescuer') {
        const botAction = updateSaboteurBot(saboteur, rescuer, witnesses, level, timeRemainingSec, rescuer.placedCones.length)
        if (botAction) {
          if (botAction.shoutText) {
            setSaboteurShout({ text: botAction.shoutText, timer: 4 })
          }
          if (botAction.type === 'move' && botAction.targetX !== undefined && botAction.targetY !== undefined) {
            const dx = botAction.targetX - saboteur.x
            const dy = botAction.targetY - saboteur.y
            const len = Math.sqrt(dx * dx + dy * dy) || 1
            movePlayer('saboteur', dx / len, dy / len)
          } else if (botAction.type === 'whisper' && botAction.targetWitnessId && botAction.mythCardId) {
            saboteurWhisper(botAction.targetWitnessId, botAction.mythCardId)
            const targetW = witnesses.find((w) => w.id === botAction.targetWitnessId)
            setLiveAlert({ text: `⚠️ Saboteur whispered misinformation to ${targetW?.name || 'a witness'}!`, type: 'warning', timer: 3 })
          } else if (botAction.type === 'shift') {
            if (rescuer.placedCones.length > 0) {
              setRescuer((prev) => ({
                ...prev,
                conesRemaining: Math.min(3, prev.conesRemaining + 1),
                placedCones: prev.placedCones.slice(0, -1)
              }))
              setLiveAlert({ text: '💥 Saboteur kicked down a traffic cone! Replace it with [C]!', type: 'warning', timer: 4 })
            } else {
              saboteurShiftBarrier('env_ambulance_lane')
              setLiveAlert({ text: '🚧 Saboteur shifted a roadblock into the ambulance corridor! [Clear It]', type: 'warning', timer: 4 })
            }
          } else if (botAction.type === 'distract') {
            saboteurDistract()
            setLiveAlert({ text: '⚠️ Saboteur staged a loud distraction! Bystanders halted!', type: 'warning', timer: 3 })
          }
        }
      } else if (mode === 'solo_saboteur') {
        const botAction = updateRescuerBot(rescuer, witnesses, level)
        if (botAction) {
          if (botAction.type === 'move' && botAction.targetX !== undefined && botAction.targetY !== undefined) {
            const dx = botAction.targetX - rescuer.x
            const dy = botAction.targetY - rescuer.y
            const len = Math.sqrt(dx * dx + dy * dy) || 1
            movePlayer('rescuer', dx / len, dy / len)
          }
        }
      }

      // Check if Core Mission step (Step 5) is completed -> Trigger Reception Standoff or Victory
      const step5 = rescueChain.find((s) => s.stepNumber === 5)
      if (step5?.completed) {
        setPhase('verdict')
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [
    phase,
    mode,
    saboteur,
    rescuer,
    witnesses,
    level,
    timeRemainingSec,
    rescueChain,
    movePlayer,
    saboteurWhisper
  ])

  const pendingStep = rescueChain.find((s) => !s.completed) || rescueChain[rescueChain.length - 1]
  let objTargetX = level.victimPos.x
  let objTargetY = level.victimPos.y
  if (pendingStep.stepNumber === 2) {
    const sharma = witnesses.find((w) => w.id === 'w1')
    objTargetX = sharma ? sharma.x : 280
    objTargetY = sharma ? sharma.y : 320
  } else if (pendingStep.stepNumber === 3) {
    objTargetX = 800
    objTargetY = 480
  } else if (pendingStep.stepNumber === 4) {
    objTargetX = 360
    objTargetY = 540
  } else if (pendingStep.stepNumber === 5) {
    objTargetX = level.exitPos.x
    objTargetY = level.exitPos.y
  }

  const currentObjective = {
    stepNumber: pendingStep.stepNumber,
    title: pendingStep.title,
    titleHi: pendingStep.titleHi,
    instruction: pendingStep.instruction,
    instructionHi: pendingStep.instructionHi,
    targetX: objTargetX,
    targetY: objTargetY
  }

  return {
    phase,
    mode,
    currentLevelId,
    roundNumber,
    p1Role,
    language,
    timeRemainingSec,
    level,
    rescuer,
    saboteur,
    witnesses,
    environment,
    proofTokens,
    rescueChain,
    p1Score,
    p2Score,
    rescuerScoreBreakdown,
    saboteurScoreBreakdown,
    knowledgePoints,
    activeWitnessId,
    activeEnvId,
    dialogueFeedback,
    isCalling112,
    call112Progress,
    saboteurShout,
    liveAlert,
    currentObjective,
    raiseVoiceCooldown,
    readRoomCooldown,
    saboteurWhisperCooldown,
    saboteurDistractCooldown,
    saboteurShiftCooldown,
    setLanguage,
    startMatch,
    setPhase,
    movePlayer,
    rescuerTalk,
    rescuerCloseDialogue,
    rescuerAnswerConcern,
    rescuerAssignTask,
    rescuerRaiseVoice,
    rescuerReadRoom,
    rescuerPlaceCone,
    rescuerCall112Directly,
    rescuerInteractEnvironment,
    rescuerAssessVictim,
    complete112Dispatch,
    confrontSaboteur,
    saboteurWhisper,
    saboteurDistract,
    saboteurShiftBarrier,
    saboteurCoverUp,
    saboteurBlendIn,
    saboteurSlipAway,
    nextRoundOrLevel
  }
}
