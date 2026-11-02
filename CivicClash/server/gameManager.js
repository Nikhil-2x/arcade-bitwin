/**
 * Authoritative Server-Side Milestone 5 Game Manager
 * Complete 6-round match lifecycle (3 levels x 2 rounds), role switching,
 * competitive scoring engine with duplicate prevention, centralized round resets,
 * pause on disconnect / reconnection, autonomous NPC waypoints with obstacle collision checking,
 * dialogue anti-exploit engine with semantic reward grouping & natural repeat responses,
 * and complete 3-level civic content.
 */

import { isPositionBlocked } from './spatialCollision.js'

export const LEVEL_DEFINITIONS = [
  {
    level: 1,
    title: 'Hit & Run: Emergency Response & Good Samaritan Protection',
    location: 'Sector 4 Urban Evening Intersection',
    civicTopic: 'Motor Vehicles (Amendment) Act 2019 (s.134A Good Samaritan Law) & 112 Emergency Dispatch',
    briefing: 'A speeding car has struck pedestrian Arjun at an evening urban intersection and fled. As a responsible citizen, your objective is to act decisively during the Golden Hour: provide first-aid, summon 112 emergency response, persuade fearful shopkeeper Ramesh to share CCTV footage under Good Samaritan protection, interview eyewitness Priya, and file an official report with Officer Sharma before the Saboteur covers up the crime.',
    keyTakeaways: [
      'Golden Hour: The first 60 minutes following severe trauma are vital for saving lives.',
      'Section 134A of the Motor Vehicles Act guarantees complete Good Samaritan protection: helpers cannot be harassed, detained by police, or forced to become witnesses.',
      'Emergency number 112 provides single-point unified emergency response across police, fire, and ambulance services in India.'
    ]
  },
  {
    level: 2,
    title: 'Public Safety: Marketplace Electrical Fire Hazard',
    location: 'Old City Cloth Bazaar & Commercial District',
    civicTopic: 'National Building Code Fire Safety, Disaster Management Act 2005 & Emergency Exit Access Rights',
    briefing: 'A severe electrical fire has broken out near crowded stalls in the old cloth bazaar. Dense toxic smoke threatens lives in narrow congested lanes. Disconnect the main electrical panel to halt circuit fires, trigger the manual fire alarm siren, guide panic-stricken market visitors to safety, unlock emergency exit shutters with Guard Rajesh, and deploy fire extinguishers alongside Fire Officer Verma.',
    keyTakeaways: [
      'Never use water on electrical fires! Water conducts electricity and risks lethal electrocution. Use Class C CO2 or dry powder extinguishers.',
      'Blocking, locking, or obstructing fire escape exits in public buildings is a serious punishable offence under the National Building Code and Disaster Management Act.',
      'Evacuate immediately in a low posture to avoid inhaling toxic combustion gases.'
    ]
  },
  {
    level: 3,
    title: 'Workplace Safety & The Cover-up: Construction Site Disaster',
    location: 'Metropolitan High-Rise Construction Zone',
    civicTopic: 'Building and Other Construction Workers (BOCW) Act 1996 & Whistleblower Protection',
    briefing: 'Defective scaffolding has collapsed at a high-rise construction site, severely injuring worker Laxman. Site supervisor Bose is attempting an illegal cover-up to hide OSHA and safety violations. Secure emergency trauma aid for Laxman, protect safety compliance logbooks, submit a digital incident report, convince night watchman Kishore to disclose duty records, and hand over evidence to Labor Union Rep Anita and Inspector Gupta.',
    keyTakeaways: [
      'The Building and Other Construction Workers (BOCW) Act 1996 mandates strict employer liability for worker safety and health.',
      'Workplace accidents causing severe injury must be reported to the Inspector of Factories / Labor Department within 24 hours under Section 38.',
      'Whistleblower protection shields workers and citizens reporting illegal safety compromises from employer retaliation.'
    ]
  }
]

export class GameManager {
  constructor(roomCode) {
    this.roomCode = roomCode

    // Milestone 4 & 5: Match Lifecycle State
    this.phase = 'ROUND_ACTIVE' // 'MENU' | 'LOBBY' | 'READY_CHECK' | 'LEVEL_INTRO' | 'ROUND_ACTIVE' | 'ROUND_ENDING' | 'ROUND_RESULTS' | 'ROLE_SWITCH' | 'LEVEL_RESULTS' | 'FINAL_RESULTS' | 'REMATCH' | 'PAUSED'
    this.currentLevel = 1
    this.currentRound = 1
    this.totalLevels = 3
    this.roundsPerLevel = 2
    this.totalRounds = 6
    this.roundDuration = 240 // 4 minutes per round
    this.timeRemainingSec = this.roundDuration
    this.isPaused = false
    this.pauseRemainingSec = 0
    this.pauseReason = ''

    // Players & Scores
    this.players = {} // id -> PlayerMatchStats
    this.playerRoles = {} // id -> 'runner' | 'saboteur'
    this.roundResults = []
    this.levelSummaries = []
    this.finalResult = null
    this.readyStatus = {}
    this.rematchVotes = {}
    this.scoreEvents = []
    this.awardedEventKeys = new Set()

    // Milestone 5: Authoritative Dialogue Action & Reward Group Tracking
    this.dialogueActionRecords = []
    this.rewardedDialogueOptions = new Set()
    this.rewardedSemanticGroups = new Set()

    // Milestone 6: Secret Objectives, Social Deduction & Sealed Accusation
    this.runnerTasks = []
    this.saboteurTasks = []
    this.environmentalState = {
      streetlights: 'ON',
      cctvOperational: true,
      cctvDisabledTimer: 0,
      noiseDistractionActive: false,
      alarmActive: false,
      crowdManaged: false,
      exitShuttersUnlocked: false,
      breakerTripped: false
    }
    this.sealedVerdicts = {}
    this.latestVerdictReveal = null
    this.latestCivicDebrief = null
    this.accusationTimeRemainingSec = 45

    // Round Resources & State
    this.sabotageEnergy = 100
    this.maxEnergy = 100
    this.communityCooperation = 45
    this.inventory = []
    this.suspicionLevel = 10
    this.escapeProgress = {
      isEscaping: false,
      progressSec: 0,
      maxSec: 5,
      saboteurId: null,
      isCompleted: false
    }
    this.eventFeed = []

    this.initNPCs()
    this.initNPCWaypoints()
    this.initObjects()
    this.initInformationLog()
    this.initObjectives()
    this.initSaboteurAbilities()
    this.initTasks()
  }

  // ─────────────────────────────────────────────────────────────
  // MATCH INITIALIZATION
  // ─────────────────────────────────────────────────────────────
  initMatch(hostPlayer, guestPlayer, startingLevel = 1) {
    this.players = {
      [hostPlayer.id]: {
        playerId: hostPlayer.id,
        playerName: hostPlayer.name || 'Runner',
        totalScore: 0,
        runnerScore: 0,
        saboteurScore: 0,
        objectivesCompleted: 0,
        sabotageActionsExecuted: 0,
        civicAchievements: [],
        ready: false
      },
      [guestPlayer.id]: {
        playerId: guestPlayer.id,
        playerName: guestPlayer.name || 'Saboteur',
        totalScore: 0,
        runnerScore: 0,
        saboteurScore: 0,
        objectivesCompleted: 0,
        sabotageActionsExecuted: 0,
        civicAchievements: [],
        ready: false
      }
    }

    this.playerRoles = {
      [hostPlayer.id]: 'runner',
      [guestPlayer.id]: 'saboteur'
    }

    const isHostBot = String(hostPlayer.id).startsWith('bot_')
    const isGuestBot = String(guestPlayer.id).startsWith('bot_')
    this.readyStatus = {
      [hostPlayer.id]: isHostBot,
      [guestPlayer.id]: isGuestBot
    }

    this.rematchVotes = {
      [hostPlayer.id]: isHostBot,
      [guestPlayer.id]: isGuestBot
    }

    this.currentLevel = Math.max(1, Math.min(this.totalLevels, parseInt(startingLevel, 10) || 1))
    this.currentRound = 1
    this.phase = 'LEVEL_INTRO'
    this.timeRemainingSec = this.roundDuration

    // Re-initialize level-specific assets if custom starting level selected
    this.initNPCs()
    this.initNPCWaypoints()
    this.initObjects()
    this.initInformationLog()
    this.initObjectives()
    this.initSaboteurAbilities()
    this.initTasks()
  }

  // ─────────────────────────────────────────────────────────────
  // COMPETITIVE SCORING SYSTEM WITH DUPLICATE PREVENTION
  // ─────────────────────────────────────────────────────────────
  awardScore(playerId, role, eventType, points, description) {
    if (!playerId) {
      for (const pid in this.playerRoles) {
        if (this.playerRoles[pid] === role) {
          playerId = pid
          break
        }
      }
    }
    if (!playerId) return null

    // Prevent duplicate scoring for this level/round/player/event
    const scoreKey = `${this.currentLevel}_${this.currentRound}_${playerId}_${eventType}`
    if (this.awardedEventKeys.has(scoreKey)) {
      return null
    }
    this.awardedEventKeys.add(scoreKey)

    const player = this.players[playerId]
    if (!player) return null

    player.totalScore += points
    if (role === 'runner') {
      player.runnerScore += points
      player.objectivesCompleted += 1
    } else {
      player.saboteurScore += points
      player.sabotageActionsExecuted += 1
    }

    const scoreEvt = {
      id: 'sc_' + Math.random().toString(36).substring(2, 9),
      playerId,
      playerName: player.playerName,
      role,
      eventType,
      description,
      points,
      level: this.currentLevel,
      round: this.currentRound,
      timestamp: Date.now()
    }

    this.scoreEvents.push(scoreEvt)
    this.addEventFeedItem(`🏆 ${player.playerName} (${role.toUpperCase()}): +${points} pts — ${description}`, role === 'runner' ? 'emergency' : 'sabotage')
    return scoreEvt
  }

  // ─────────────────────────────────────────────────────────────
  // WORLD ENTITY INITIALIZERS (LEVEL AWARE)
  // ─────────────────────────────────────────────────────────────
  initNPCs() {
    if (this.currentLevel === 1) {
      this.npcs = {
        npc_arjun: {
          id: 'npc_arjun',
          name: 'Arjun',
          roleTitle: 'Injured Crash Victim',
          zone: 'Accident Zone',
          position: { x: 0, y: 0, z: 2.2 },
          facingYaw: 0,
          trust: 50,
          fear: 60,
          cooperation: 30,
          state: 'HESITANT',
          belief: 'Bleeding heavily from leg, in shock and unable to move.',
          knowledge: ['Hit from behind by speeding dark sedan that did not stop.'],
          manipulated: false,
          interactedWithRunner: false,
          interactedWithSaboteur: false,
          currentSpeakerId: null,
          lastInteractionAt: null,
          isStabilized: false,
          currentReaction: 'clutch_chest',
          reactionDurationSec: 9999,
          isMoving: false
        },
        npc_ramesh: {
          id: 'npc_ramesh',
          name: 'Ramesh',
          roleTitle: 'Kirana & Dhaba Shopkeeper',
          zone: 'Shop Zone',
          position: { x: -11.5, y: 0, z: -8.0 },
          facingYaw: 0.8,
          trust: 50,
          fear: 20,
          cooperation: 40,
          state: 'IDLE',
          belief: 'I saw the crash, but police inquiries will bring me unnecessary trouble.',
          knowledge: [
            'High-resolution CCTV camera on shop roof recorded the crash.',
            'Dark-coloured sedan speeding through intersection.'
          ],
          manipulated: false,
          interactedWithRunner: false,
          interactedWithSaboteur: false,
          currentSpeakerId: null,
          lastInteractionAt: null,
          currentReaction: 'idle',
          reactionDurationSec: 0,
          isMoving: false
        },
        npc_priya: {
          id: 'npc_priya',
          name: 'Priya',
          roleTitle: 'College Student (Eyewitness)',
          zone: 'Bus Stop Zone',
          position: { x: 12.0, y: 0, z: -11.0 },
          facingYaw: -1.2,
          trust: 45,
          fear: 30,
          cooperation: 35,
          state: 'OBSERVING',
          belief: 'I was waiting for my bus and saw the whole thing happen.',
          knowledge: [
            'Vehicle sped off north toward the highway.',
            'License plate started with DL-04-C.'
          ],
          manipulated: false,
          interactedWithRunner: false,
          interactedWithSaboteur: false,
          currentSpeakerId: null,
          lastInteractionAt: null,
          currentReaction: 'idle',
          reactionDurationSec: 0,
          isMoving: false
        },
        npc_amit: {
          id: 'npc_amit',
          name: 'Amit',
          roleTitle: 'Bystander Pedestrian',
          zone: 'Accident Zone',
          position: { x: 3.5, y: 0, z: 3.5 },
          facingYaw: -2.4,
          trust: 60,
          fear: 40,
          cooperation: 50,
          state: 'IDLE',
          belief: 'I saw him fall, but I don’t know medical first aid.',
          knowledge: [
            'Ready to call 112 emergency services if someone tells me what to say.',
            'Can help divert pedestrians away from the injured person.'
          ],
          manipulated: false,
          interactedWithRunner: false,
          interactedWithSaboteur: false,
          currentSpeakerId: null,
          lastInteractionAt: null,
          currentReaction: 'idle',
          reactionDurationSec: 0,
          isMoving: false
        },
        npc_sharma: {
          id: 'npc_sharma',
          name: 'Officer Sharma',
          roleTitle: 'Traffic Police Officer',
          zone: 'Traffic Zone',
          position: { x: 12.0, y: 0, z: 12.0 },
          facingYaw: -0.7,
          trust: 70,
          fear: 10,
          cooperation: 60,
          state: 'IDLE',
          belief: 'Managing traffic. Need verifiable witness statements and evidence to log an official report.',
          knowledge: [
            'Can broadcast alert to highway patrol once registration or CCTV is verified.',
            'Authorized to secure the scene.'
          ],
          manipulated: false,
          interactedWithRunner: false,
          interactedWithSaboteur: false,
          currentSpeakerId: null,
          lastInteractionAt: null,
          currentReaction: 'direct_traffic',
          reactionDurationSec: 4.0,
          isMoving: false
        }
      }
    } else if (this.currentLevel === 2) {
      // Level 2: Public Safety / Marketplace Fire Incident
      this.npcs = {
        npc_sunil: {
          id: 'npc_sunil',
          name: 'Sunil Pali',
          roleTitle: 'Tea Vendor & Shop Owner',
          zone: 'Shop Zone',
          position: { x: -11.5, y: 0, z: -8.0 },
          facingYaw: 0.8,
          trust: 50,
          fear: 40,
          cooperation: 45,
          state: 'IDLE',
          belief: 'The main electrical box next to my stall began sparking before the flames erupted.',
          knowledge: ['The main electrical shutoff breaker is located behind the shop counter.'],
          manipulated: false,
          interactedWithRunner: false,
          interactedWithSaboteur: false,
          currentSpeakerId: null,
          lastInteractionAt: null,
          currentReaction: 'idle',
          reactionDurationSec: 0,
          isMoving: false
        },
        npc_deepak: {
          id: 'npc_deepak',
          name: 'Deepak',
          roleTitle: 'Panic-Stricken Market Visitor',
          zone: 'Accident Zone',
          position: { x: 0, y: 0, z: 2.2 },
          facingYaw: 0,
          trust: 40,
          fear: 75,
          cooperation: 30,
          state: 'HESITANT',
          belief: 'Smoke is blinding! I can\'t find the exit and everyone is pushing!',
          knowledge: ['Needs calm, low-posture evacuation guidance to prevent smoke inhalation.'],
          manipulated: false,
          interactedWithRunner: false,
          interactedWithSaboteur: false,
          currentSpeakerId: null,
          lastInteractionAt: null,
          currentReaction: 'coughing',
          reactionDurationSec: 9999,
          isMoving: false
        },
        npc_meera: {
          id: 'npc_meera',
          name: 'Meera',
          roleTitle: 'Cloth Market Vendor',
          zone: 'Bus Stop Zone',
          position: { x: 12.0, y: 0, z: -11.0 },
          facingYaw: -1.2,
          trust: 50,
          fear: 35,
          cooperation: 50,
          state: 'OBSERVING',
          belief: 'I am clearing my stall bolts and mannequins to open an unobstructed evacuation corridor.',
          knowledge: ['Emergency exit shutter at the east corner is blocked by lock and chain.'],
          manipulated: false,
          interactedWithRunner: false,
          interactedWithSaboteur: false,
          currentSpeakerId: null,
          lastInteractionAt: null,
          currentReaction: 'idle',
          reactionDurationSec: 0,
          isMoving: false
        },
        npc_rajesh: {
          id: 'npc_rajesh',
          name: 'Rajesh',
          roleTitle: 'Market Security Guard',
          zone: 'Traffic Zone',
          position: { x: 12.0, y: 0, z: 12.0 },
          facingYaw: -0.7,
          trust: 60,
          fear: 20,
          cooperation: 55,
          state: 'IDLE',
          belief: 'I have master keys to the emergency exit roll-up shutters, but was told to keep them locked after hours.',
          knowledge: ['National Building Code fire safety regulations mandate all exit doors stay unlocked during occupancy.'],
          manipulated: false,
          interactedWithRunner: false,
          interactedWithSaboteur: false,
          currentSpeakerId: null,
          lastInteractionAt: null,
          currentReaction: 'direct_traffic',
          reactionDurationSec: 4.0,
          isMoving: false
        },
        npc_verma: {
          id: 'npc_verma',
          name: 'Officer Verma',
          roleTitle: 'Fire & Rescue Incident Commander',
          zone: 'Accident Zone',
          position: { x: 3.5, y: 0, z: 3.5 },
          facingYaw: -2.4,
          trust: 75,
          fear: 10,
          cooperation: 70,
          state: 'IDLE',
          belief: 'Fire engine has arrived. I require immediate confirmation that the electrical main is cut before charging water hoses.',
          knowledge: ['Spraying water on live high-voltage electrical equipment causes lethal electrocution.'],
          manipulated: false,
          interactedWithRunner: false,
          interactedWithSaboteur: false,
          currentSpeakerId: null,
          lastInteractionAt: null,
          currentReaction: 'idle',
          reactionDurationSec: 0,
          isMoving: false
        }
      }
    } else {
      // Level 3: The Cover-up / Construction Site Accident
      this.npcs = {
        npc_laxman: {
          id: 'npc_laxman',
          name: 'Laxman',
          roleTitle: 'Injured Construction Laborer',
          zone: 'Accident Zone',
          position: { x: 0, y: 0, z: 2.2 },
          facingYaw: 0,
          trust: 50,
          fear: 65,
          cooperation: 40,
          state: 'HESITANT',
          belief: 'Scaffold collapsed under me. Supervisor told me to keep quiet or I will lose my daily wages.',
          knowledge: ['Contractor used rusted, uncertified clamp pins on scaffolding levels 4 and 5.'],
          manipulated: false,
          interactedWithRunner: false,
          interactedWithSaboteur: false,
          currentSpeakerId: null,
          lastInteractionAt: null,
          isStabilized: false,
          currentReaction: 'clutch_chest',
          reactionDurationSec: 9999,
          isMoving: false
        },
        npc_bose: {
          id: 'npc_bose',
          name: 'Bose',
          roleTitle: 'Site Supervisor & Contractor',
          zone: 'Shop Zone',
          position: { x: -11.5, y: 0, z: -8.0 },
          facingYaw: 0.8,
          trust: 30,
          fear: 45,
          cooperation: 25,
          state: 'IDLE',
          belief: 'If labor safety inspectors see the collapsed scaffold, the entire high-rise project will be halted.',
          knowledge: ['Daily site logbook records three ignored safety warnings from last week.'],
          manipulated: false,
          interactedWithRunner: false,
          interactedWithSaboteur: false,
          currentSpeakerId: null,
          lastInteractionAt: null,
          currentReaction: 'idle',
          reactionDurationSec: 0,
          isMoving: false
        },
        npc_gupta: {
          id: 'npc_gupta',
          name: 'Inspector Gupta',
          roleTitle: 'Building Safety Compliance Inspector',
          zone: 'Traffic Zone',
          position: { x: 12.0, y: 0, z: 12.0 },
          facingYaw: -0.7,
          trust: 70,
          fear: 10,
          cooperation: 65,
          state: 'IDLE',
          belief: 'Need authentic supervisor safety logs and digital incident submission to seal the dangerous site.',
          knowledge: ['Section 38 of BOCW Act mandates immediate 24-hour reporting of disabling site accidents.'],
          manipulated: false,
          interactedWithRunner: false,
          interactedWithSaboteur: false,
          currentSpeakerId: null,
          lastInteractionAt: null,
          currentReaction: 'direct_traffic',
          reactionDurationSec: 4.0,
          isMoving: false
        },
        npc_kishore: {
          id: 'npc_kishore',
          name: 'Kishore',
          roleTitle: 'Night Watchman',
          zone: 'Bus Stop Zone',
          position: { x: 12.0, y: 0, z: -11.0 },
          facingYaw: -1.2,
          trust: 45,
          fear: 50,
          cooperation: 40,
          state: 'OBSERVING',
          belief: 'I hold the signed daily gate and material inspection register in the portacabin desk.',
          knowledge: ['Whistleblower protection shields workers who expose criminal labor safety negligence.'],
          manipulated: false,
          interactedWithRunner: false,
          interactedWithSaboteur: false,
          currentSpeakerId: null,
          lastInteractionAt: null,
          currentReaction: 'idle',
          reactionDurationSec: 0,
          isMoving: false
        },
        npc_anita: {
          id: 'npc_anita',
          name: 'Anita',
          roleTitle: 'Labor Union Representative & Legal Advocate',
          zone: 'Accident Zone',
          position: { x: 3.5, y: 0, z: 3.5 },
          facingYaw: -2.4,
          trust: 80,
          fear: 10,
          cooperation: 75,
          state: 'IDLE',
          belief: 'Preparing an urgent statutory injunction under the BOCW Act 1996 for injured worker relief and criminal liability.',
          knowledge: ['Workers cannot waive statutory safety rights under Indian labor law.'],
          manipulated: false,
          interactedWithRunner: false,
          interactedWithSaboteur: false,
          currentSpeakerId: null,
          lastInteractionAt: null,
          currentReaction: 'idle',
          reactionDurationSec: 0,
          isMoving: false
        }
      }
    }
  }

  initNPCWaypoints() {
    if (this.currentLevel === 1) {
      this.npcRoutines = {
        npc_ramesh: {
          waypoints: [
            { x: -11.5, z: -8.0 },
            { x: -9.5, z: -8.5 },
            { x: -11.5, z: -7.5 },
            { x: -13.0, z: -8.5 }
          ],
          currentIndex: 0,
          pauseTicks: 0,
          specialTarget: null
        },
        npc_priya: {
          waypoints: [
            { x: 12.0, z: -11.0 },
            { x: 9.8, z: -10.0 },
            { x: 11.2, z: -12.5 },
            { x: 12.5, z: -10.5 }
          ],
          currentIndex: 0,
          pauseTicks: 0,
          specialTarget: null
        },
        npc_amit: {
          waypoints: [
            { x: 3.5, z: 3.5 },
            { x: 5.2, z: 2.2 },
            { x: 2.5, z: 4.5 },
            { x: 4.2, z: 5.0 }
          ],
          currentIndex: 0,
          pauseTicks: 0,
          specialTarget: null
        },
        npc_sharma: {
          waypoints: [
            { x: 12.0, z: 12.0 },
            { x: 9.5, z: 11.0 },
            { x: 11.0, z: 9.2 },
            { x: 12.5, z: 10.5 }
          ],
          currentIndex: 0,
          pauseTicks: 0,
          specialTarget: null
        }
      }
    } else if (this.currentLevel === 2) {
      this.npcRoutines = {
        npc_sunil: {
          waypoints: [
            { x: -11.5, z: -8.0 },
            { x: -9.5, z: -8.5 },
            { x: -12.5, z: -7.5 }
          ],
          currentIndex: 0,
          pauseTicks: 0,
          specialTarget: null
        },
        npc_meera: {
          waypoints: [
            { x: 12.0, z: -11.0 },
            { x: 10.0, z: -9.5 },
            { x: 12.5, z: -12.0 }
          ],
          currentIndex: 0,
          pauseTicks: 0,
          specialTarget: null
        },
        npc_rajesh: {
          waypoints: [
            { x: 12.0, z: 12.0 },
            { x: 9.5, z: 11.0 },
            { x: 11.0, z: 9.0 }
          ],
          currentIndex: 0,
          pauseTicks: 0,
          specialTarget: null
        },
        npc_verma: {
          waypoints: [
            { x: 3.5, z: 3.5 },
            { x: 5.0, z: 2.5 },
            { x: 2.5, z: 4.5 }
          ],
          currentIndex: 0,
          pauseTicks: 0,
          specialTarget: null
        }
      }
    } else {
      this.npcRoutines = {
        npc_bose: {
          waypoints: [
            { x: -11.5, z: -8.0 },
            { x: -9.5, z: -8.5 },
            { x: -12.0, z: -7.5 }
          ],
          currentIndex: 0,
          pauseTicks: 0,
          specialTarget: null
        },
        npc_kishore: {
          waypoints: [
            { x: 12.0, z: -11.0 },
            { x: 10.0, z: -10.0 },
            { x: 12.5, z: -12.0 }
          ],
          currentIndex: 0,
          pauseTicks: 0,
          specialTarget: null
        },
        npc_gupta: {
          waypoints: [
            { x: 12.0, z: 12.0 },
            { x: 9.5, z: 11.0 },
            { x: 11.0, z: 9.5 }
          ],
          currentIndex: 0,
          pauseTicks: 0,
          specialTarget: null
        },
        npc_anita: {
          waypoints: [
            { x: 3.5, z: 3.5 },
            { x: 5.0, z: 2.5 },
            { x: 2.5, z: 4.5 }
          ],
          currentIndex: 0,
          pauseTicks: 0,
          specialTarget: null
        }
      }
    }
  }

  initObjects() {
    if (this.currentLevel === 1) {
      this.objects = {
        obj_phone: {
          id: 'obj_phone',
          name: 'Emergency Call Pillar (112)',
          zone: 'Accident Zone',
          position: { x: -4.5, y: 0, z: 4.5 },
          radius: 3.0,
          state: 'ready'
        },
        obj_cctv: {
          id: 'obj_cctv',
          name: 'Dhaba CCTV DVR Console',
          zone: 'Shop Zone',
          position: { x: -14.5, y: 0, z: -14.0 },
          radius: 3.0,
          state: 'locked',
          disabledTimer: 0
        },
        obj_signal: {
          id: 'obj_signal',
          name: 'Pedestrian Signal Box',
          zone: 'Traffic Zone',
          position: { x: 6.5, y: 0, z: 6.5 },
          radius: 2.8,
          state: 'red'
        },
        obj_firstaid: {
          id: 'obj_firstaid',
          name: 'First-Aid Medical Box',
          zone: 'Shop Zone',
          position: { x: -10.0, y: 0, z: -8.5 },
          radius: 2.6,
          state: 'ready'
        },
        obj_infoboard: {
          id: 'obj_infoboard',
          name: 'Incident Notice Board',
          zone: 'Accident Zone',
          position: { x: -2.5, y: 0, z: -4.5 },
          radius: 2.8,
          state: 'ready'
        },
        obj_light_switch: {
          id: 'obj_light_switch',
          name: 'Junction Streetlight Breaker Box',
          zone: 'Traffic Zone',
          position: { x: 7.5, y: 0, z: 6.8 },
          radius: 2.8,
          state: 'on'
        },
        obj_escape: {
          id: 'obj_escape',
          name: 'Highway Perimeter Escape Zone',
          zone: 'Escape Zone',
          position: { x: 18.0, y: 0, z: 18.0 },
          radius: 3.5,
          state: 'ready'
        }
      }
    } else if (this.currentLevel === 2) {
      // Level 2: Marketplace Fire Incident Objects
      this.objects = {
        obj_electrical_panel: {
          id: 'obj_electrical_panel',
          name: 'Main Electrical Breaker Panel',
          zone: 'Shop Zone',
          position: { x: -14.5, y: 0, z: -14.0 },
          radius: 3.0,
          state: 'live',
          disabledTimer: 0
        },
        obj_fire_alarm: {
          id: 'obj_fire_alarm',
          name: 'Manual Fire Alarm Pull Siren',
          zone: 'Accident Zone',
          position: { x: -4.5, y: 0, z: 4.5 },
          radius: 3.0,
          state: 'ready'
        },
        obj_extinguisher: {
          id: 'obj_extinguisher',
          name: 'CO2 Fire Extinguisher Station',
          zone: 'Shop Zone',
          position: { x: -10.0, y: 0, z: -8.5 },
          radius: 2.6,
          state: 'ready'
        },
        obj_exit_shutter: {
          id: 'obj_exit_shutter',
          name: 'Emergency Exit Roll-up Shutter',
          zone: 'Traffic Zone',
          position: { x: 6.5, y: 0, z: 6.5 },
          radius: 2.8,
          state: 'locked'
        },
        obj_water_source: {
          id: 'obj_water_source',
          name: 'Municipal Water Supply Hydrant',
          zone: 'Accident Zone',
          position: { x: -2.5, y: 0, z: -4.5 },
          radius: 2.8,
          state: 'open'
        },
        obj_market_escape: {
          id: 'obj_market_escape',
          name: 'Rear Market Service Route',
          zone: 'Escape Zone',
          position: { x: 18.0, y: 0, z: 18.0 },
          radius: 3.5,
          state: 'ready'
        }
      }
    } else {
      // Level 3: Construction Site Accident Objects
      this.objects = {
        obj_first_aid_station: {
          id: 'obj_first_aid_station',
          name: 'Heavy Duty Site Trauma Medical Kit',
          zone: 'Shop Zone',
          position: { x: -10.0, y: 0, z: -8.5 },
          radius: 2.6,
          state: 'ready'
        },
        obj_safety_records: {
          id: 'obj_safety_records',
          name: 'Safety Compliance Logbook Desk',
          zone: 'Shop Zone',
          position: { x: -14.5, y: 0, z: -14.0 },
          radius: 3.0,
          state: 'ready',
          disabledTimer: 0
        },
        obj_report_terminal: {
          id: 'obj_report_terminal',
          name: 'Digital Incident Reporting Terminal',
          zone: 'Traffic Zone',
          position: { x: 6.5, y: 0, z: 6.5 },
          radius: 2.8,
          state: 'ready'
        },
        obj_emergency_alarm: {
          id: 'obj_emergency_alarm',
          name: 'Construction Site Emergency Siren',
          zone: 'Accident Zone',
          position: { x: -4.5, y: 0, z: 4.5 },
          radius: 3.0,
          state: 'ready'
        },
        obj_cctv_tower: {
          id: 'obj_cctv_tower',
          name: 'High-Mast Site Surveillance Camera',
          zone: 'Accident Zone',
          position: { x: -2.5, y: 0, z: -4.5 },
          radius: 2.8,
          state: 'ready'
        },
        obj_site_escape: {
          id: 'obj_site_escape',
          name: 'Construction Site Rear Service Gate',
          zone: 'Escape Zone',
          position: { x: 18.0, y: 0, z: 18.0 },
          radius: 3.5,
          state: 'ready'
        }
      }
    }
  }

  initInformationLog() {
    if (this.currentLevel === 1) {
      this.informationLog = [
        {
          id: 'info_dispatch',
          title: 'Emergency Crash Reported',
          description: 'Pedestrian struck by motor vehicle at Sector 4 Junction. Driver fled.',
          source: 'Initial Emergency Call',
          reliability: 'HIGH',
          verified: true,
          timestamp: Date.now()
        }
      ]
    } else if (this.currentLevel === 2) {
      this.informationLog = [
        {
          id: 'info_fire_origin',
          title: 'Marketplace Fire Hazard',
          description: 'Dense smoke detected from electrical distribution breaker in cloth market.',
          source: 'Initial Market Alert',
          reliability: 'HIGH',
          verified: true,
          timestamp: Date.now()
        }
      ]
    } else {
      this.informationLog = [
        {
          id: 'info_site_collapse',
          title: 'Construction Scaffold Failure',
          description: 'Worker injured due to structural scaffold failure at high-rise site.',
          source: 'Site Incident Alert',
          reliability: 'HIGH',
          verified: true,
          timestamp: Date.now()
        }
      ]
    }
  }

  initObjectives() {
    if (this.currentLevel === 1) {
      this.runnerObjectives = [
        { id: 'ro_1', title: 'Assess & Stabilize Arjun', description: 'Inspect Arjun and use First-Aid Kit to control bleeding.', completed: false },
        { id: 'ro_2', title: 'Summon 112 Dispatch', description: 'Use Emergency Phone or task Amit to call 112 emergency response.', completed: false },
        { id: 'ro_3', title: 'Gain Ramesh’s Cooperation', description: 'Persuade Ramesh to unlock the CCTV footage of the collision.', completed: false },
        { id: 'ro_4', title: 'Interview Eyewitness Priya', description: 'Collect vehicle fleeing direction & license plate clue from Priya.', completed: false },
        { id: 'ro_5', title: 'File Report with Officer Sharma', description: 'Submit verified vehicle clues to Officer Sharma to trigger highway intercept.', completed: false }
      ]

      this.saboteurObjectives = [
        { id: 'so_1', title: 'Mislead Eyewitness Priya', description: 'Convince Priya she did not see the license plate clearly.', completed: false },
        { id: 'so_2', title: 'Interfere with Shop CCTV', description: 'Discourage Ramesh or spend energy to temporarily disable CCTV console.', completed: false },
        { id: 'so_3', title: 'Disperse Bystanders', description: 'Spread fear or stage distraction so bystanders refuse to assist.', completed: false },
        { id: 'so_4', title: 'Slip Away Unaccountable', description: 'Prevent verified incident report until the clock runs out or escape highway.', completed: false }
      ]
    } else if (this.currentLevel === 2) {
      this.runnerObjectives = [
        { id: 'ro_2_1', title: 'Disconnect Main Electrical Panel', description: 'Shut off the main electrical breaker inside the tea stall to prevent fires spreading.', completed: false },
        { id: 'ro_2_2', title: 'Activate Manual Fire Alarm', description: 'Trigger the manual fire alarm call point siren to alert the crowded bazaar.', completed: false },
        { id: 'ro_2_3', title: 'Calm Deepak & Clear Exit Route', description: 'Guide panic-stricken Deepak with low-posture instructions and coordinate corridor with Meera.', completed: false },
        { id: 'ro_2_4', title: 'Unlock Emergency Exit Shutter', description: 'Remind Guard Rajesh of National Building Code exit rights to unlock roll-up exit shutters.', completed: false },
        { id: 'ro_2_5', title: 'Deploy Extinguisher & Coordinate Verma', description: 'Acquire CO2 fire extinguisher and brief Fire Officer Verma that electricity is isolated.', completed: false }
      ]

      this.saboteurObjectives = [
        { id: 'so_2_1', title: 'Jam Emergency Exit Shutter', description: 'Tamper with the roll-up shutter to trap crowd in congested corridors.', completed: false },
        { id: 'so_2_2', title: 'Spread Panic Rumors', description: 'Instigate wild rumors among market visitors to cause stampede chaos.', completed: false },
        { id: 'so_2_3', title: 'Shut Off Water Hydrant Valve', description: 'Cut off municipal water flow to hinder fire suppression efforts.', completed: false },
        { id: 'so_2_4', title: 'Delay Emergency Services Dispatch', description: 'Cut fire alarm communication wiring to delay brigade response.', completed: false },
        { id: 'so_2_5', title: 'Escape through Rear Market Alley', description: 'Slip through the rear market service route before police cordon is sealed.', completed: false }
      ]
    } else {
      this.runnerObjectives = [
        { id: 'ro_3_1', title: 'Apply Trauma Aid to Laxman', description: 'Acquire site medical kit and stabilize injured worker Laxman.', completed: false },
        { id: 'ro_3_2', title: 'Secure Safety Records from Desk', description: 'Retrieve the safety compliance inspection logbook before contractor Bose hides it.', completed: false },
        { id: 'ro_3_3', title: 'Submit Digital Incident Report', description: 'File official electronic incident report at the site compliance terminal under BOCW Act.', completed: false },
        { id: 'ro_3_4', title: 'Convince Watchman Kishore to Testify', description: 'Reassure Kishore with whistleblower protection to disclose the night safety registers.', completed: false },
        { id: 'ro_3_5', title: 'Expose Cover-up to Inspector Gupta & Anita', description: 'Present evidence of defective scaffolding to Union Rep Anita and Compliance Inspector Gupta.', completed: false }
      ]

      this.saboteurObjectives = [
        { id: 'so_3_1', title: 'Intimidate Worker Laxman', description: 'Force Laxman to sign a false disclaimer claiming personal negligence.', completed: false },
        { id: 'so_3_2', title: 'Tamper with Safety Records Desk', description: 'Shred or corrupt the safety inspection records before they can be audited.', completed: false },
        { id: 'so_3_3', title: 'Cut CCTV Tower Power Cable', description: 'Disable site surveillance camera tower to erase footage of the scaffold collapse.', completed: false },
        { id: 'so_3_4', title: 'Lock Site Incident Terminal', description: 'Sabotage the digital reporting kiosk to prevent the statutory 24-hour accident alert.', completed: false },
        { id: 'so_3_5', title: 'Escape through Rear Construction Gate', description: 'Slip away through the rear gate before labor enforcement authorities arrive.', completed: false }
      ]
    }
  }

  initSaboteurAbilities() {
    if (this.currentLevel === 1) {
      this.saboteurAbilities = [
        {
          id: 'sab_mislead',
          name: 'Mislead Witness',
          energyCost: 15,
          cooldownSec: 10,
          currentCooldownSec: 0,
          range: 4.5,
          icon: '🗣️',
          description: 'Plant doubt in eyewitness memory'
        },
        {
          id: 'sab_distract',
          name: 'Stage Distraction',
          energyCost: 20,
          cooldownSec: 12,
          currentCooldownSec: 0,
          range: 6.0,
          icon: '💥',
          description: 'Divert bystanders away from victim'
        },
        {
          id: 'sab_discourage',
          name: 'Discourage Ramesh',
          energyCost: 20,
          cooldownSec: 12,
          currentCooldownSec: 0,
          range: 4.5,
          icon: '🤫',
          description: 'Intimidate shopkeeper regarding DVR seizure'
        },
        {
          id: 'sab_cctv',
          name: 'Disable CCTV',
          energyCost: 30,
          cooldownSec: 20,
          currentCooldownSec: 0,
          range: 4.5,
          icon: '📹',
          description: 'Corrupt CCTV storage feed for 25s'
        },
        {
          id: 'sab_false_lead',
          name: 'Plant False Lead',
          energyCost: 20,
          cooldownSec: 15,
          currentCooldownSec: 0,
          range: 4.5,
          icon: '📌',
          description: 'Pin rumor about green auto on notice board'
        },
        {
          id: 'sab_escape',
          name: 'Escape Junction',
          energyCost: 0,
          cooldownSec: 5,
          currentCooldownSec: 0,
          range: 3.5,
          icon: '🏃‍♂️',
          description: 'Hold channel at North-East highway border'
        }
      ]
    } else if (this.currentLevel === 2) {
      this.saboteurAbilities = [
        {
          id: 'sab_panic_crowd',
          name: 'Spread Panic Rumor',
          energyCost: 20,
          cooldownSec: 10,
          currentCooldownSec: 0,
          range: 5.0,
          icon: '📢',
          description: 'Incite panic in market visitors'
        },
        {
          id: 'sab_jam_shutter',
          name: 'Jam Exit Shutter',
          energyCost: 25,
          cooldownSec: 18,
          currentCooldownSec: 0,
          range: 4.0,
          icon: '🔒',
          description: 'Jam the roll-up emergency shutter'
        },
        {
          id: 'sab_cut_hydrant',
          name: 'Cut Hydrant Valve',
          energyCost: 20,
          cooldownSec: 15,
          currentCooldownSec: 0,
          range: 4.0,
          icon: '🚰',
          description: 'Close municipal water valve'
        },
        {
          id: 'sab_tamper_alarm',
          name: 'Cut Alarm Circuit',
          energyCost: 25,
          cooldownSec: 20,
          currentCooldownSec: 0,
          range: 4.0,
          icon: '⚡',
          description: 'Disable fire alarm siren for 25s'
        },
        {
          id: 'sab_escape',
          name: 'Escape Bazaar',
          energyCost: 0,
          cooldownSec: 5,
          currentCooldownSec: 0,
          range: 3.5,
          icon: '🏃‍♂️',
          description: 'Escape through rear market alley'
        }
      ]
    } else {
      this.saboteurAbilities = [
        {
          id: 'sab_tamper_desk',
          name: 'Tamper Safety Logs',
          energyCost: 25,
          cooldownSec: 15,
          currentCooldownSec: 0,
          range: 4.0,
          icon: '📁',
          description: 'Corrupt safety records desk for 25s'
        },
        {
          id: 'sab_cut_camera',
          name: 'Cut CCTV Tower Feed',
          energyCost: 25,
          cooldownSec: 18,
          currentCooldownSec: 0,
          range: 4.0,
          icon: '📹',
          description: 'Disable high-mast surveillance camera'
        },
        {
          id: 'sab_intimidate_laxman',
          name: 'Intimidate Laxman',
          energyCost: 20,
          cooldownSec: 12,
          currentCooldownSec: 0,
          range: 4.0,
          icon: '🤫',
          description: 'Threaten worker regarding wage loss'
        },
        {
          id: 'sab_lock_kiosk',
          name: 'Lock Report Kiosk',
          energyCost: 25,
          cooldownSec: 20,
          currentCooldownSec: 0,
          range: 4.0,
          icon: '💻',
          description: 'Lock digital reporting kiosk for 25s'
        },
        {
          id: 'sab_escape',
          name: 'Escape Site',
          energyCost: 0,
          cooldownSec: 5,
          currentCooldownSec: 0,
          range: 3.5,
          icon: '🏃‍♂️',
          description: 'Escape through rear construction gate'
        }
      ]
    }
  }

  // ─────────────────────────────────────────────────────────────
  // MILESTONE 6: PRIVATE TASK SYSTEM & DEPENDENCY ENGINE
  // ─────────────────────────────────────────────────────────────
  initTasks() {
    if (this.currentLevel === 1) {
      this.runnerTasks = [
        {
          id: 't_r_safety',
          title: 'Check Scene Safety',
          description: 'Approach accident perimeter and verify traffic is halted before entering roadway.',
          category: 'CIVIC_MAIN',
          status: 'AVAILABLE',
          dependencies: [],
          hint: 'Approach the road junction safely.',
          rewardPoints: 10,
          progress: 0,
          targetEntityId: 'npc_arjun'
        },
        {
          id: 't_r_triage',
          title: 'Assess Injured Person (Arjun)',
          description: 'Speak gently with victim Arjun. Do not move him or cause spinal aggravation.',
          category: 'CIVIC_MAIN',
          status: 'LOCKED',
          dependencies: ['t_r_safety'],
          hint: 'Speak to Arjun in the Accident Zone.',
          rewardPoints: 15,
          progress: 0,
          targetEntityId: 'npc_arjun'
        },
        {
          id: 't_r_call112',
          title: 'Dial 112 Central Emergency Dispatch',
          description: 'Use roadside emergency call pillar to summon medical & traffic assistance.',
          category: 'CIVIC_MAIN',
          status: 'LOCKED',
          dependencies: ['t_r_triage'],
          hint: 'Emergency Call Pillar is near the road crossing.',
          rewardPoints: 20,
          progress: 0,
          targetEntityId: 'obj_phone'
        },
        {
          id: 't_r_firstaid',
          title: 'Retrieve First-Aid Kit & Stabilize',
          description: 'Collect medical first aid kit near Dhaba and apply sterile compression dressing.',
          category: 'CIVIC_MAIN',
          status: 'LOCKED',
          dependencies: ['t_r_triage'],
          hint: 'First-Aid box is mounted near Dhaba entrance.',
          rewardPoints: 20,
          progress: 0,
          targetEntityId: 'obj_firstaid'
        },
        {
          id: 't_r_crowd',
          title: 'Request Bystander Crowd Support',
          description: 'Instruct pedestrian Amit to keep bystanders back so Arjun has fresh air.',
          category: 'CIVIC_SECONDARY',
          status: 'AVAILABLE',
          dependencies: [],
          hint: 'Amit is standing near the accident intersection.',
          rewardPoints: 10,
          progress: 0,
          targetEntityId: 'npc_amit'
        },
        {
          id: 't_r_priya',
          title: 'Interview Eyewitness Priya',
          description: 'Obtain vehicle registration prefix details under Good Samaritan protection.',
          category: 'CIVIC_SECONDARY',
          status: 'AVAILABLE',
          dependencies: [],
          hint: 'Priya is waiting at the Bus Stop.',
          rewardPoints: 15,
          progress: 0,
          targetEntityId: 'npc_priya'
        },
        {
          id: 't_r_cctv',
          title: 'Preserve Dhaba CCTV Footage',
          description: 'Gain Ramesh\'s trust to access camera console and secure video evidence.',
          category: 'CIVIC_SECONDARY',
          status: 'LOCKED',
          dependencies: ['t_r_safety'],
          hint: 'Speak with shopkeeper Ramesh inside Dhaba.',
          rewardPoints: 15,
          progress: 0,
          targetEntityId: 'obj_cctv'
        },
        {
          id: 't_r_crosscheck',
          title: 'Cross-Check Conflicting Clues',
          description: 'Examine incident notice board to detect and discard false vehicle rumors.',
          category: 'CIVIC_BONUS',
          status: 'AVAILABLE',
          dependencies: [],
          hint: 'Inspect the notice board across the crossing.',
          rewardPoints: 15,
          progress: 0,
          targetEntityId: 'obj_infoboard'
        },
        {
          id: 't_r_report',
          title: 'File Official Report With Officer Sharma',
          description: 'Present verified CCTV and eyewitness evidence to Traffic Police.',
          category: 'CIVIC_MAIN',
          status: 'LOCKED',
          dependencies: ['t_r_call112', 't_r_priya'],
          hint: 'Officer Sharma is stationed in the Traffic Zone.',
          rewardPoints: 25,
          progress: 0,
          targetEntityId: 'npc_sharma'
        },
        {
          id: 't_r_accusation',
          title: 'Submit Sealed Final Accusation',
          description: 'Participate in sealed final verdict with at least one verified evidence item.',
          category: 'CIVIC_MAIN',
          status: 'LOCKED',
          dependencies: ['t_r_report'],
          hint: 'Unlocked during sealed verdict review.',
          rewardPoints: 30,
          progress: 0
        }
      ]

      this.saboteurTasks = [
        {
          id: 't_s_cover_firstaid',
          title: 'Alibi: Locate First-Aid Kit',
          description: 'Help fetch or locate first-aid medical kit to establish a helpful alibi.',
          category: 'COVER',
          status: 'AVAILABLE',
          dependencies: [],
          hint: 'Helpful actions establish credibility with bystanders.',
          rewardPoints: 15,
          progress: 0,
          targetEntityId: 'obj_firstaid'
        },
        {
          id: 't_s_cover_phone',
          title: 'Alibi: Suggest Calling 112',
          description: 'Approach emergency phone pillar or suggest calling ambulance.',
          category: 'COVER',
          status: 'AVAILABLE',
          dependencies: [],
          hint: 'Appear proactive to divert suspicion.',
          rewardPoints: 10,
          progress: 0,
          targetEntityId: 'obj_phone'
        },
        {
          id: 't_s_cover_reassure',
          title: 'Alibi: Reassure Eyewitness',
          description: 'Speak calmly with Priya or Amit to create a supportive impression.',
          category: 'COVER',
          status: 'AVAILABLE',
          dependencies: [],
          hint: 'Witnesses will remember you as cooperative and calm.',
          rewardPoints: 15,
          progress: 0,
          targetEntityId: 'npc_priya'
        },
        {
          id: 't_s_light_cut',
          title: 'Sabotage: Switch Off Streetlights',
          description: 'Tamper with junction breaker box to dim intersection lighting.',
          category: 'COVERT',
          status: 'AVAILABLE',
          dependencies: [],
          hint: 'Costs 15 energy. Junction pole switch.',
          rewardPoints: 15,
          progress: 0,
          targetEntityId: 'obj_light_switch'
        },
        {
          id: 't_s_noise_distract',
          title: 'Sabotage: Stage Noise Distraction',
          description: 'Create sudden noise near tea stall to divert pedestrian Amit.',
          category: 'COVERT',
          status: 'AVAILABLE',
          dependencies: [],
          hint: 'Costs 10 energy. Diverts Amit towards tea stall.',
          rewardPoints: 15,
          progress: 0
        },
        {
          id: 't_s_cctv_tamper',
          title: 'Sabotage: Corrupt Dhaba CCTV',
          description: 'Temporarily interrupt CCTV recording for 25s before evidence review.',
          category: 'COVERT',
          status: 'AVAILABLE',
          dependencies: [],
          hint: 'Costs 25 energy. Dhaba CCTV console.',
          rewardPoints: 20,
          progress: 0,
          targetEntityId: 'obj_cctv'
        },
        {
          id: 't_s_plant_rumor',
          title: 'Sabotage: Post Misleading Rumor',
          description: 'Pin false note about green auto-rickshaw onto notice board.',
          category: 'COVERT',
          status: 'AVAILABLE',
          dependencies: [],
          hint: 'Costs 20 energy. Pins contradictory lead.',
          rewardPoints: 20,
          progress: 0,
          targetEntityId: 'obj_infoboard'
        },
        {
          id: 't_s_shopkeeper_alibi',
          title: 'Deception: Establish Dhaba Alibi',
          description: 'Converse with Ramesh inside Dhaba to confirm you were seen inside.',
          category: 'DECEPTION',
          status: 'AVAILABLE',
          dependencies: [],
          hint: 'Ramesh will recall your presence inside away from the road.',
          rewardPoints: 15,
          progress: 0,
          targetEntityId: 'npc_ramesh'
        },
        {
          id: 't_s_counter_defense',
          title: 'Deception: Mount Counter-Verdict',
          description: 'Submit a credible defense explanation during sealed accusation.',
          category: 'DECEPTION',
          status: 'LOCKED',
          dependencies: [],
          hint: 'Unlocked during sealed verdict phase.',
          rewardPoints: 30,
          progress: 0
        }
      ]
    } else if (this.currentLevel === 2) {
      this.runnerTasks = [
        {
          id: 't_r_2_alarm',
          title: 'Sound Manual Fire Siren',
          description: 'Trigger the manual fire alarm call point siren to alert crowded bazaar.',
          category: 'CIVIC_MAIN',
          status: 'AVAILABLE',
          dependencies: [],
          rewardPoints: 15,
          progress: 0,
          targetEntityId: 'obj_fire_alarm'
        },
        {
          id: 't_r_2_breaker',
          title: 'Isolate Electrical Power Breaker',
          description: 'Shut off the main electrical breaker to prevent secondary electrical fires.',
          category: 'CIVIC_MAIN',
          status: 'AVAILABLE',
          dependencies: [],
          rewardPoints: 15,
          progress: 0,
          targetEntityId: 'obj_electrical_panel'
        },
        {
          id: 't_r_2_deepak',
          title: 'Guide Panic-Stricken Deepak',
          description: 'Instruct Deepak to stay low beneath toxic smoke and crawl toward exit.',
          category: 'CIVIC_SECONDARY',
          status: 'AVAILABLE',
          dependencies: [],
          rewardPoints: 15,
          progress: 0,
          targetEntityId: 'npc_deepak'
        },
        {
          id: 't_r_2_shutter',
          title: 'Unlock Emergency Exit Shutter',
          description: 'Remind Guard Rajesh of National Building Code to unlock exit shutters.',
          category: 'CIVIC_MAIN',
          status: 'LOCKED',
          dependencies: ['t_r_2_alarm'],
          rewardPoints: 20,
          progress: 0,
          targetEntityId: 'npc_rajesh'
        },
        {
          id: 't_r_2_extinguisher',
          title: 'Deploy CO2 Extinguisher',
          description: 'Retrieve extinguisher and isolate perimeter spark safely.',
          category: 'CIVIC_SECONDARY',
          status: 'AVAILABLE',
          dependencies: [],
          rewardPoints: 15,
          progress: 0,
          targetEntityId: 'obj_extinguisher'
        },
        {
          id: 't_r_2_verma',
          title: 'Brief Fire Commander Verma',
          description: 'Confirm electrical main is cut so water hoses can be safely charged.',
          category: 'CIVIC_MAIN',
          status: 'LOCKED',
          dependencies: ['t_r_2_breaker', 't_r_2_shutter'],
          rewardPoints: 25,
          progress: 0,
          targetEntityId: 'npc_verma'
        },
        {
          id: 't_r_2_accusation',
          title: 'Submit Sealed Fire Hazard Accusation',
          description: 'Identify source of negligence and submit evidence at verdict phase.',
          category: 'CIVIC_MAIN',
          status: 'LOCKED',
          dependencies: ['t_r_2_verma'],
          rewardPoints: 30,
          progress: 0
        }
      ]

      this.saboteurTasks = [
        {
          id: 't_s_2_cover_deepak',
          title: 'Alibi: Assist Deepak Evacuation',
          description: 'Point Deepak towards main exit aisle to appear helpful.',
          category: 'COVER',
          status: 'AVAILABLE',
          dependencies: [],
          rewardPoints: 15,
          progress: 0,
          targetEntityId: 'npc_deepak'
        },
        {
          id: 't_s_2_cover_alarm',
          title: 'Alibi: Verify Alarm Call Point',
          description: 'Stand near fire alarm station to show proactive concern.',
          category: 'COVER',
          status: 'AVAILABLE',
          dependencies: [],
          rewardPoints: 10,
          progress: 0,
          targetEntityId: 'obj_fire_alarm'
        },
        {
          id: 't_s_2_jam_shutter',
          title: 'Sabotage: Jam Shutter Latch',
          description: 'Jam the roll-up exit shutter latch to delay corridor evacuation.',
          category: 'COVERT',
          status: 'AVAILABLE',
          dependencies: [],
          rewardPoints: 20,
          progress: 0,
          targetEntityId: 'obj_exit_shutter'
        },
        {
          id: 't_s_2_spread_panic',
          title: 'Sabotage: Spread Panic Rumors',
          description: 'Incite panic rumors among bazaar shoppers regarding explosions.',
          category: 'COVERT',
          status: 'AVAILABLE',
          dependencies: [],
          rewardPoints: 20,
          progress: 0
        },
        {
          id: 't_s_2_counter_defense',
          title: 'Deception: Mount Counter-Verdict',
          description: 'Submit credible commercial wiring narrative during sealed accusation.',
          category: 'DECEPTION',
          status: 'LOCKED',
          dependencies: [],
          rewardPoints: 30,
          progress: 0
        }
      ]
    } else {
      // Level 3 Tasks
      this.runnerTasks = [
        {
          id: 't_r_3_triage',
          title: 'Apply Trauma Splint to Laxman',
          description: 'Retrieve site trauma kit and stabilize worker Laxman without moving him.',
          category: 'CIVIC_MAIN',
          status: 'AVAILABLE',
          dependencies: [],
          rewardPoints: 20,
          progress: 0,
          targetEntityId: 'npc_laxman'
        },
        {
          id: 't_r_3_siren',
          title: 'Sound Site Emergency Siren',
          description: 'Trigger emergency siren to halt overhead crane and hoist operations.',
          category: 'CIVIC_MAIN',
          status: 'AVAILABLE',
          dependencies: [],
          rewardPoints: 15,
          progress: 0,
          targetEntityId: 'obj_emergency_alarm'
        },
        {
          id: 't_r_3_records',
          title: 'Secure Daily Inspection Logbook',
          description: 'Retrieve safety compliance logbook from office desk before it is altered.',
          category: 'CIVIC_SECONDARY',
          status: 'AVAILABLE',
          dependencies: [],
          rewardPoints: 20,
          progress: 0,
          targetEntityId: 'obj_safety_records'
        },
        {
          id: 't_r_3_kishore',
          title: 'Interview Watchman Kishore',
          description: 'Assure Kishore of whistleblower protection to obtain uncertified clamp testimony.',
          category: 'CIVIC_SECONDARY',
          status: 'AVAILABLE',
          dependencies: [],
          rewardPoints: 15,
          progress: 0,
          targetEntityId: 'npc_kishore'
        },
        {
          id: 't_r_3_terminal',
          title: 'File Statutory BOCW Incident Report',
          description: 'Transmit electronic accident report to labor enforcement portal within 24 hours.',
          category: 'CIVIC_MAIN',
          status: 'LOCKED',
          dependencies: ['t_r_3_triage', 't_r_3_records'],
          rewardPoints: 25,
          progress: 0,
          targetEntityId: 'obj_report_terminal'
        },
        {
          id: 't_r_3_accusation',
          title: 'Submit Sealed Contractor Violation Accusation',
          description: 'Accuse responsible party with verified scaffolding defect logs.',
          category: 'CIVIC_MAIN',
          status: 'LOCKED',
          dependencies: ['t_r_3_terminal'],
          rewardPoints: 30,
          progress: 0
        }
      ]

      this.saboteurTasks = [
        {
          id: 't_s_3_cover_laxman',
          title: 'Alibi: Provide First-Aid Bandage',
          description: 'Help fetch medical dressings for Laxman to establish a helpful alibi.',
          category: 'COVER',
          status: 'AVAILABLE',
          dependencies: [],
          rewardPoints: 15,
          progress: 0,
          targetEntityId: 'npc_laxman'
        },
        {
          id: 't_s_3_shred_logs',
          title: 'Sabotage: Misplace Logbook Carbon',
          description: 'Corrupt or misplace the scaffolding safety inspection duplicate records.',
          category: 'COVERT',
          status: 'AVAILABLE',
          dependencies: [],
          rewardPoints: 20,
          progress: 0,
          targetEntityId: 'obj_safety_records'
        },
        {
          id: 't_s_3_cut_cctv',
          title: 'Sabotage: Disable Crane Surveillance Tower',
          description: 'Cut power cable to mast camera to erase footage of collapse.',
          category: 'COVERT',
          status: 'AVAILABLE',
          dependencies: [],
          rewardPoints: 20,
          progress: 0,
          targetEntityId: 'obj_cctv_tower'
        },
        {
          id: 't_s_3_counter_defense',
          title: 'Deception: Mount Counter-Verdict',
          description: 'Submit equipment manufacturer defect narrative during sealed accusation.',
          category: 'DECEPTION',
          status: 'LOCKED',
          dependencies: [],
          rewardPoints: 30,
          progress: 0
        }
      ]
    }
  }

  completeTask(taskId, role) {
    const tasks = role === 'runner' ? this.runnerTasks : this.saboteurTasks
    const task = tasks.find((t) => t.id === taskId)
    if (!task || task.status === 'COMPLETED') return

    task.status = 'COMPLETED'
    task.progress = 100

    // Unlock dependent tasks whose prerequisites are now all met
    for (const t of tasks) {
      if (t.status === 'LOCKED' && t.dependencies.includes(taskId)) {
        const allMet = t.dependencies.every((depId) => {
          const dep = tasks.find((x) => x.id === depId)
          return dep && dep.status === 'COMPLETED'
        })
        if (allMet) {
          t.status = 'AVAILABLE'
        }
      }
    }
  }

  updateTaskProgress(taskId, role, progress) {
    const tasks = role === 'runner' ? this.runnerTasks : this.saboteurTasks
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return
    task.progress = Math.min(100, Math.max(0, progress))
    if (task.progress >= 100) {
      this.completeTask(taskId, role)
    } else if (task.status === 'AVAILABLE' && task.progress > 0) {
      task.status = 'IN_PROGRESS'
    }
  }

  getEvidenceCardsForPlayer(role) {
    const cards = []
    for (const info of this.informationLog) {
      cards.push({
        id: info.id,
        title: info.title,
        description: info.description,
        source: info.source,
        reliability: info.reliability || 'HIGH',
        verified: !!info.verified,
        isContradiction: info.id === 'info_false_lead'
      })
    }
    if (this.environmentalState.streetlights === 'OFF' || this.awardedEventKeys.has(`${this.currentLevel}_${this.currentRound}_LIGHTS_CUT`)) {
      cards.push({
        id: 'ev_streetlights',
        title: 'Tampered Streetlight Breaker',
        description: 'Breaker box was deliberately switched off during active response.',
        source: 'Junction Pole Inspection',
        reliability: 'HIGH',
        verified: true
      })
    }
    if (this.objects.obj_cctv?.state === 'disabled' || this.awardedEventKeys.has(`${this.currentLevel}_${this.currentRound}_CCTV_DELAY`)) {
      cards.push({
        id: 'ev_cctv_tamper',
        title: 'CCTV Storage Interruption',
        description: 'Dhaba security console was temporarily disabled by unauthorized tampering.',
        source: 'DVR Error Logs',
        reliability: 'HIGH',
        verified: true
      })
    }
    return cards
  }

  getDefenseNarratives() {
    if (this.currentLevel === 1) {
      return [
        {
          id: 'narrative_external_driver',
          title: 'External Hit & Run Driver on Highway',
          description: 'The driver sped away towards the expressway immediately after impact. Neither of us arrived in that car.',
          credibility: 'HIGH'
        },
        {
          id: 'narrative_witness_mistake',
          title: 'Eyewitness Glare & Distance Confusion',
          description: 'Dusk lighting and headlight glare caused Priya to misremember license digits.',
          credibility: 'PLAUSIBLE'
        },
        {
          id: 'narrative_grid_blackout',
          title: 'Accidental Municipal Grid Surge',
          description: 'The streetlights tripped due to local grid fluctuations, not deliberate tampering.',
          credibility: 'PLAUSIBLE'
        },
        {
          id: 'narrative_opponent_suspicious',
          title: 'Other Citizen Was Near CCTV',
          description: 'The other citizen spent significant time near the Dhaba backroom console before reporting.',
          credibility: 'FLIMSY'
        }
      ]
    } else if (this.currentLevel === 2) {
      return [
        {
          id: 'narrative_electrical_wear',
          title: 'Overloaded Commercial Wiring',
          description: 'Aging fabric market wiring overheated under generator strain.',
          credibility: 'HIGH'
        },
        {
          id: 'narrative_accidental_panic',
          title: 'Panic-Induced Crowd Stampede',
          description: 'Bystander panic caused exit congestion before anyone could reach keys.',
          credibility: 'PLAUSIBLE'
        }
      ]
    } else {
      return [
        {
          id: 'narrative_equipment_defect',
          title: 'Manufacturer Clamp Flaw',
          description: 'The scaffolding pins had hidden metallurgical hairline fractures.',
          credibility: 'HIGH'
        },
        {
          id: 'narrative_unauthorized_shift',
          title: 'Subcontractor Night Shift Shifted Braces',
          description: 'Third-party laborers removed cross-braces without supervisor knowledge.',
          credibility: 'PLAUSIBLE'
        }
      ]
    }
  }

  startAccusationPhase(reason = 'NORMAL') {
    if (this.phase === 'ACCUSATION_PHASE' || this.phase === 'VERDICT_REVEAL' || this.phase === 'ROUND_RESULTS') return
    this.phase = 'ACCUSATION_PHASE'
    this.roundEndReason = reason
    this.sealedVerdicts = {}
    this.accusationTimeRemainingSec = 45

    for (const t of this.runnerTasks) {
      if (t.id === 't_r_accusation') t.status = 'AVAILABLE'
    }
    for (const t of this.saboteurTasks) {
      if (t.id === 't_s_counter_defense') t.status = 'AVAILABLE'
    }

    this.addEventFeedItem('⚖️ ACTIVE RESPONSE CONCLUDED. Commencing Sealed Final Accusation phase!', 'emergency')
  }

  submitVerdict(playerId, role, { suspectId, selectedEvidenceIds, counterNarrativeId }) {
    if (this.phase !== 'ACCUSATION_PHASE') return { success: false, message: 'Not in accusation phase' }

    // Validate evidence IDs: only allow IDs that exist in the authoritative information log
    const validEvidenceIds = this.informationLog.map((e) => e.id)
    const sanitizedEvidenceIds = (selectedEvidenceIds || [])
      .filter((id) => validEvidenceIds.includes(id))
      .slice(0, 2) // Spec §11.3: up to 2 items

    this.sealedVerdicts[playerId] = {
      playerId,
      role,
      suspectId: suspectId || 'insufficient_evidence',
      selectedEvidenceIds: sanitizedEvidenceIds,
      counterNarrativeId: counterNarrativeId || null,
      submittedAt: Date.now()
    }

    let playerPids = Object.keys(this.playerRoles)
    if (playerPids.length === 0) playerPids = Object.keys(this.players)
    const allSubmitted = playerPids.length >= 2 && playerPids.every((pid) => !!this.sealedVerdicts[pid])

    return { success: true, allSubmitted }
  }

  evaluateAccusationAndReveal() {
    this.phase = 'VERDICT_REVEAL'

    let runnerPid = null
    let saboteurPid = null
    for (const pid in this.playerRoles) {
      if (this.playerRoles[pid] === 'runner') runnerPid = pid
      if (this.playerRoles[pid] === 'saboteur') saboteurPid = pid
    }

    const runnerSubmission = runnerPid ? this.sealedVerdicts[runnerPid] : null
    const saboteurSubmission = saboteurPid ? this.sealedVerdicts[saboteurPid] : null

    let isCorrect = false
    if (runnerSubmission && saboteurPid) {
      const suspect = runnerSubmission.suspectId
      if (suspect === saboteurPid || suspect === 'saboteur') {
        isCorrect = true
      }
    }

    const selectedEvIds = runnerSubmission?.selectedEvidenceIds || []
    const availableCards = this.getEvidenceCardsForPlayer('runner')
    let verifiedEvidenceCount = 0
    for (const evId of selectedEvIds) {
      const card = availableCards.find((c) => c.id === evId)
      if (card && card.verified && !card.isContradiction) {
        verifiedEvidenceCount++
      }
    }

    let runnerScoreAwarded = 0
    if (isCorrect) {
      if (verifiedEvidenceCount >= 2) {
        runnerScoreAwarded = 35
        this.awardScore(runnerPid, 'runner', 'VERDICT_ACCUSATION', 35, 'Correctly identified culprit backed by 2 verified pieces of evidence')
      } else if (verifiedEvidenceCount === 1) {
        runnerScoreAwarded = 20
        this.awardScore(runnerPid, 'runner', 'VERDICT_ACCUSATION', 20, 'Correctly identified culprit backed by 1 verified evidence item')
      } else {
        runnerScoreAwarded = 10
        this.awardScore(runnerPid, 'runner', 'VERDICT_ACCUSATION', 10, 'Correctly identified culprit but lacked supporting verified evidence')
      }
      this.completeTask('t_r_accusation', 'runner')
    }

    let saboteurScoreAwarded = 0
    if (!isCorrect) {
      saboteurScoreAwarded += 30
      this.awardScore(saboteurPid, 'saboteur', 'DECEPTION_SUCCESS', 30, 'Successfully maintained cover and avoided culprit identification')
    }
    const completedCoverTasks = this.saboteurTasks.filter((t) => t.category === 'COVER' && t.status === 'COMPLETED').length
    if (completedCoverTasks > 0) {
      saboteurScoreAwarded += 15
      this.awardScore(saboteurPid, 'saboteur', 'HELPFUL_ALIBI', 15, `Completed ${completedCoverTasks} genuine helpful cover tasks to establish an alibi`)
    }
    this.completeTask('t_s_counter_defense', 'saboteur')

    const allNarratives = this.getDefenseNarratives()
    const chosenNarrative = allNarratives.find((n) => n.id === saboteurSubmission?.counterNarrativeId) || allNarratives[0]

    const outcomeSummary = isCorrect
      ? `The Responsible Citizen correctly deduced the culprit with ${verifiedEvidenceCount} verified evidence item(s)! Justice is served.`
      : `The Criminal Manipulator successfully deflected suspicion using a convincing cover narrative (${chosenNarrative.title}).`

    const runnerEvidenceCards = availableCards.filter((c) => selectedEvIds.includes(c.id))

    this.latestVerdictReveal = {
      runnerSuspectId: runnerSubmission?.suspectId || 'none',
      runnerAccusedRole: isCorrect ? 'saboteur' : 'runner',
      runnerEvidence: runnerEvidenceCards,
      saboteurNarrative: chosenNarrative,
      actualRoles: { ...this.playerRoles },
      actualSaboteurId: saboteurPid || 'unknown',
      isAccusationCorrect: isCorrect,
      evidenceScoreAwarded: runnerScoreAwarded,
      saboteurDeceptionAwarded: saboteurScoreAwarded,
      outcomeSummary
    }

    this.latestCivicDebrief = this.generateCivicDebrief()
    const roundResult = this.evaluateRound('ACCUSATION_VERDICT')
    this.roundResults.push(roundResult)
    return this.latestVerdictReveal
  }

  generateCivicDebrief() {
    if (this.currentLevel === 1) {
      return {
        level: 1,
        levelTitle: 'Hit & Run — First Response & Good Samaritan Protection',
        whatYouDidRight: [
          'Assessed crash victim condition gently without moving neck or spinal axis.',
          'Dispatched Central Emergency Services (112) for ambulance and traffic assistance.',
          'Preserved CCTV video evidence before storage corruption occurred.'
        ],
        whatToImprove: [
          'Manage bystander perimeter promptly to provide adequate ventilation to victim.',
          'Cross-reference contradictory rumors against eyewitness statements.'
        ],
        realWorldTakeaway: 'Section 134A of the Motor Vehicles Act (Good Samaritan Amendment) protects any citizen rendering emergency medical care from civil/criminal liability, police harassment, and detention.',
        officialGuidanceRef: 'Supreme Court of India (WP No. 235/2012) & Ministry of Road Transport and Highways (MoRTH).'
      }
    } else if (this.currentLevel === 2) {
      return {
        level: 2,
        levelTitle: 'Public Safety — Marketplace Fire & Smoke Evacuation',
        whatYouDidRight: [
          'Sounded manual fire alarm siren to warn public market occupants.',
          'Isolated main electrical breaker before water deployment.',
          'Advised low-posture crawling beneath toxic rising smoke.'
        ],
        whatToImprove: [
          'Verify emergency roll-up shutters remain unlocked at all times during operating hours.',
          'Never re-enter a burning structure to retrieve personal goods.'
        ],
        realWorldTakeaway: 'National Building Code of India (Part 4 — Fire Safety) mandates that all exit doors remain unlocked and unobstructed during occupancy. Toxic smoke inhalation causes 70%+ of fire casualties.',
        officialGuidanceRef: 'Bureau of Indian Standards (BIS) NBC 2016 Part 4 & National Disaster Management Authority (NDMA).'
      }
    } else {
      return {
        level: 3,
        levelTitle: 'Workplace Safety — Construction Accident & Mandatory Reporting',
        whatYouDidRight: [
          'Stabilized injured worker with sterile trauma compression dressing.',
          'Triggered site emergency siren to halt overhead crane operations.',
          'Filed electronic compliance incident report under statutory regulations.'
        ],
        whatToImprove: [
          'Verify safety logbook registers and scaffolding clamp certifications weekly.',
          'Report near-misses and safety concerns before structural failure occurs.'
        ],
        realWorldTakeaway: 'The Building and Other Construction Workers (BOCW) Act, 1996 mandates employer reporting of serious accidents within 24 hours and guarantees free emergency medical treatment and statutory compensation under Section 357A CrPC.',
        officialGuidanceRef: 'Directorate General Factory Advice Service and Labour Institutes (DGFASLI), Ministry of Labour.'
      }
    }
  }

  addEventFeedItem(text, type = 'emergency') {
    const item = {
      id: 'evt_' + Math.random().toString(36).substring(2, 9),
      text,
      type,
      timestamp: Date.now()
    }
    this.eventFeed.unshift(item)
    if (this.eventFeed.length > 8) {
      this.eventFeed.pop()
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 1-SECOND AUTHORITATIVE TICK LOOP
  // ─────────────────────────────────────────────────────────────
  tick() {
    if (this.isPaused) {
      if (this.pauseRemainingSec > 0) {
        this.pauseRemainingSec -= 1
        if (this.pauseRemainingSec <= 0) {
          // Disconnect timeout: forfeit match!
          this.handleForfeitOnDisconnect()
        }
      }
      return
    }

    if (this.phase === 'ACCUSATION_PHASE') {
      if (this.accusationTimeRemainingSec > 0) {
        this.accusationTimeRemainingSec -= 1
      }
      if (this.accusationTimeRemainingSec <= 0) {
        this.evaluateAccusationAndReveal()
      }
      return
    }

    if (this.phase !== 'ROUND_ACTIVE') {
      return
    }

    // Active Round Countdown
    if (this.timeRemainingSec > 0) {
      this.timeRemainingSec -= 1
    }

    // Sabotage energy regeneration (1 per second, up to 100)
    if (this.sabotageEnergy < this.maxEnergy) {
      this.sabotageEnergy = Math.min(this.maxEnergy, this.sabotageEnergy + 1)
    }

    // Decrement ability cooldowns
    for (const ab of this.saboteurAbilities) {
      if (ab.currentCooldownSec > 0) {
        ab.currentCooldownSec -= 1
      }
    }

    // Passive suspicion decay
    if (this.suspicionLevel > 0 && Math.random() < 0.25) {
      this.suspicionLevel = Math.max(0, this.suspicionLevel - 1)
    }

    // CCTV disabled timer countdown
    const cctv = this.objects.obj_cctv
    if (cctv && cctv.state === 'disabled' && cctv.disabledTimer > 0) {
      cctv.disabledTimer -= 1
      if (cctv.disabledTimer <= 0) {
        cctv.state = this.npcs.npc_ramesh.cooperation >= 50 ? 'ready' : 'locked'
        this.addEventFeedItem('📹 Dhaba CCTV console rebooted and restored online.', 'cooperation')
      }
    }

    // Escape channeling progress
    if (this.escapeProgress.isEscaping && !this.escapeProgress.isCompleted) {
      this.escapeProgress.progressSec += 1
      if (this.escapeProgress.progressSec >= this.escapeProgress.maxSec) {
        this.escapeProgress.isCompleted = true
        this.completeSaboteurObjective('so_4')
        this.awardScore(this.escapeProgress.saboteurId, 'saboteur', 'SUCCESSFUL_ESCAPE', 20, 'Successfully escaped through highway perimeter')
        this.addEventFeedItem('🏃‍♂️ Saboteur successfully escaped through North Highway border!', 'sabotage')
        this.endRound('SABOTEUR_ESCAPED')
        return
      }
    }

    // Round timer expired - transition to sealed accusation phase
    if (this.timeRemainingSec <= 0) {
      this.startAccusationPhase('TIME_EXPIRED')
      return
    }

    // Update NPC autonomous waypoint movements
    this.updateNPCAutonomousMovement()
  }

  // ─────────────────────────────────────────────────────────────
  // NPC AUTONOMOUS MOVEMENT & WAYPOINTS
  // ─────────────────────────────────────────────────────────────
  updateNPCAutonomousMovement() {
    for (const id in this.npcRoutines) {
      const npc = this.npcs[id]
      const routine = this.npcRoutines[id]
      if (!npc || !routine) continue

      if (npc.state === 'IN_CONVERSATION') {
        npc.isMoving = false
        continue
      }
      if (npc.reactionDurationSec > 0) {
        npc.reactionDurationSec -= 1
        if (npc.reactionDurationSec <= 0) {
          npc.currentReaction = 'idle'
          npc.reactionDurationSec = 0
        }
      }

      const target = routine.specialTarget || routine.waypoints[routine.currentIndex]
      if (!target) continue

      const dx = target.x - npc.position.x
      const dz = target.z - npc.position.z
      const dist = Math.sqrt(dx * dx + dz * dz)

      if (dist < 0.35) {
        npc.isMoving = false
        if (routine.specialTarget) {
          routine.specialTarget = null
          routine.pauseTicks = 5
        } else {
          routine.pauseTicks = 3 + Math.floor(Math.random() * 4)
          routine.currentIndex = (routine.currentIndex + 1) % routine.waypoints.length
        }
      } else {
        if (routine.pauseTicks > 0) {
          routine.pauseTicks -= 1
          npc.isMoving = false
        } else {
          const speed = 0.55 // meters per second
          const step = Math.min(dist, speed)
          const nextX = npc.position.x + (dx / dist) * step
          const nextZ = npc.position.z + (dz / dist) * step

          // Authoritative Spatial Obstacle Check for NPC Movement
          const check = isPositionBlocked(nextX, nextZ, 0.45)
          if (!check.blocked) {
            npc.position.x = nextX
            npc.position.z = nextZ
            npc.facingYaw = Math.atan2(dx, dz)
            npc.isMoving = true
          } else {
            // Stuck detection: pause and advance to next patrol waypoint
            npc.isMoving = false
            routine.pauseTicks = 3
            if (routine.specialTarget) {
              routine.specialTarget = null
            } else {
              routine.currentIndex = (routine.currentIndex + 1) % routine.waypoints.length
            }
          }
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // DIALOGUE SESSIONS
  // ─────────────────────────────────────────────────────────────
  getDialogueSession(npcId, playerRole, playerId) {
    const npc = this.npcs[npcId]
    if (!npc) return null

    npc.state = 'IN_CONVERSATION'
    npc.currentSpeakerId = playerId
    npc.lastInteractionAt = Date.now()
    if (playerRole === 'runner') npc.interactedWithRunner = true
    if (playerRole === 'saboteur') npc.interactedWithSaboteur = true

    if (playerRole === 'runner') {
      return this.buildRunnerDialogue(npc)
    } else {
      return this.buildSaboteurDialogue(npc)
    }
  }

  buildRunnerDialogue(npc) {
    const hasKit = this.inventory.includes('First-Aid Medical Box') || this.inventory.includes('Heavy Duty Site Trauma Kit')

    // ─────────────────────────────────────────────────────────────
    // LEVEL 1: HIT AND RUN DIALOGUES
    // ─────────────────────────────────────────────────────────────
    if (npc.id === 'npc_arjun') {
      return {
        npcId: npc.id,
        npcName: npc.name,
        npcRole: npc.roleTitle,
        promptText: npc.isStabilized
          ? '"Thank you... the bleeding is controlled. I saw a dark sedan, license plate starting with DL-04..."'
          : '"Please help... my leg is pinned and bleeding badly... do not leave me here!"',
        trust: npc.trust,
        fear: npc.fear,
        cooperation: npc.cooperation,
        history: [],
        options: npc.isStabilized ? [
          { id: 'arjun_ask_car', text: '“Arjun, did you catch any detail of the make or plate before you fell?”', role: 'runner' }
        ] : [
          { id: 'arjun_firstaid', text: hasKit ? 'Apply sterile pressure bandage from First-Aid Kit.' : '“I am checking your breathing. Do not move your neck or spine.”', role: 'runner' },
          { id: 'arjun_ask_car', text: '“Did you catch any details of the vehicle that hit you?”', role: 'runner' }
        ]
      }
    }

    if (npc.id === 'npc_ramesh') {
      return {
        npcId: npc.id,
        npcName: npc.name,
        npcRole: npc.roleTitle,
        promptText: npc.cooperation >= 60
          ? '"Alright, take a look at the console. Section 134A protects us Good Samaritans."'
          : npc.manipulated
          ? '"Look, someone told me I could get sued or harassed if I share anything. I have a business to run."'
          : '"I saw the car hit him, but police inquiries will drag on for months. I don\'t want to get involved."',
        trust: npc.trust,
        fear: npc.fear,
        cooperation: npc.cooperation,
        history: [],
        options: [
          {
            id: 'ramesh_opt_A',
            text: 'A. “Someone is critically injured. Could you please help us preserve the footage?”',
            role: 'runner',
            consequenceHint: 'Appeals to community duty (+Cooperation)'
          },
          {
            id: 'ramesh_opt_B',
            text: 'B. “Under Good Samaritan law (s.134A MVA), helpers have zero liability. Police cannot harass you.”',
            role: 'runner',
            consequenceHint: 'Cites legal protection (+Trust, -Fear)'
          },
          {
            id: 'ramesh_opt_C',
            text: 'C. “You must hand over the footage right now, or you’ll be an accessory!”',
            role: 'runner',
            consequenceHint: 'Threatening approach (-Trust, +Fear)'
          }
        ]
      }
    }

    if (npc.id === 'npc_priya') {
      return {
        npcId: npc.id,
        npcName: npc.name,
        npcRole: npc.roleTitle,
        promptText: npc.manipulated
          ? '"I... I thought I saw the plate, but maybe I misread it in the dusk light. I don\'t want to give wrong info."'
          : '"I saw the car speed away right past my bus stop! It was heading towards the North Highway."',
        trust: npc.trust,
        fear: npc.fear,
        cooperation: npc.cooperation,
        history: [],
        options: [
          { id: 'priya_opt_plate', text: '“Priya, take a breath. Did you catch any letters or numbers on the plate?”', role: 'runner' },
          { id: 'priya_opt_reassure', text: '“You are a crucial eyewitness. The Supreme Court guarantees your privacy and protection.”', role: 'runner' },
          { id: 'priya_opt_confirm_route', text: '“Which street did the car turn into after passing the stop?”', role: 'runner' }
        ]
      }
    }

    if (npc.id === 'npc_amit') {
      return {
        npcId: npc.id,
        npcName: npc.name,
        npcRole: npc.roleTitle,
        promptText: '"I was crossing when I heard the tyre screech! What should we do?!"',
        trust: npc.trust,
        fear: npc.fear,
        cooperation: npc.cooperation,
        history: [],
        options: [
          { id: 'amit_opt_call', text: '“Amit, please run to the Emergency Pillar and dial 112 for an ambulance!”', role: 'runner' },
          { id: 'amit_opt_crowd', text: '“Help me keep bystanders back so Arjun has fresh air and room to breathe.”', role: 'runner' }
        ]
      }
    }

    if (npc.id === 'npc_sharma') {
      return {
        npcId: npc.id,
        npcName: npc.name,
        npcRole: npc.roleTitle,
        promptText: '"Officer Sharma here. State your report clearly. We need actionable evidence."',
        trust: npc.trust,
        fear: npc.fear,
        cooperation: npc.cooperation,
        history: [],
        options: [
          { id: 'sharma_opt_report', text: '“Officer Sharma, filing an official hit-and-run report with our secured evidence.”', role: 'runner' },
          { id: 'sharma_opt_traffic', text: '“Please halt oncoming traffic on the North junction to allow ambulance clearance.”', role: 'runner' }
        ]
      }
    }

    // ─────────────────────────────────────────────────────────────
    // LEVEL 2: MARKETPLACE FIRE INCIDENT DIALOGUES
    // ─────────────────────────────────────────────────────────────
    if (npc.id === 'npc_sunil') {
      return {
        npcId: npc.id,
        npcName: npc.name,
        npcRole: npc.roleTitle,
        promptText: '"The smoke is billowing from behind my tea stall! It smells like burning plastic cables!"',
        trust: npc.trust,
        fear: npc.fear,
        cooperation: npc.cooperation,
        history: [],
        options: [
          { id: 'sunil_opt_source', text: '“Sunil, is the main electrical distribution panel behind your counter? We must disconnect it!”', role: 'runner' },
          { id: 'sunil_opt_guide', text: '“Leave your belongings, Sunil! Cover your nose with a damp cloth and head to the lane exit.”', role: 'runner' }
        ]
      }
    }

    if (npc.id === 'npc_deepak') {
      return {
        npcId: npc.id,
        npcName: npc.name,
        npcRole: npc.roleTitle,
        promptText: '"I can’t see through the black smoke! We are trapped in this lane!"',
        trust: npc.trust,
        fear: npc.fear,
        cooperation: npc.cooperation,
        history: [],
        options: [
          { id: 'deepak_opt_calm', text: '“Deepak, stay low to the ground! Clean air is near the floor. Follow my voice to the exit.”', role: 'runner' },
          { id: 'deepak_opt_guide', text: '“Keep your hands on the wall. The emergency exit shutter is just 20 meters ahead.”', role: 'runner' }
        ]
      }
    }

    if (npc.id === 'npc_meera') {
      return {
        npcId: npc.id,
        npcName: npc.name,
        npcRole: npc.roleTitle,
        promptText: '"My entire fabric inventory will burn! Should I try to haul my textile boxes out?"',
        trust: npc.trust,
        fear: npc.fear,
        cooperation: npc.cooperation,
        history: [],
        options: [
          { id: 'meera_opt_assist', text: '“Goods can be replaced, Meera, human lives cannot! Help me keep the evacuation corridor open!”', role: 'runner' },
          { id: 'meera_opt_shutter', text: '“Can you guide families toward the roll-up shutter while I confirm power cutoff?”', role: 'runner' }
        ]
      }
    }

    if (npc.id === 'npc_rajesh') {
      return {
        npcId: npc.id,
        npcName: npc.name,
        npcRole: npc.roleTitle,
        promptText: '"The bazaar committee told me to keep this exit padlocked after 6 PM to prevent shoplifting!"',
        trust: npc.trust,
        fear: npc.fear,
        cooperation: npc.cooperation,
        history: [],
        options: [
          { id: 'rajesh_opt_keys', text: '“Under the National Building Code Section 4, locking a fire exit during an emergency is a criminal offence! Unlock it now!”', role: 'runner' },
          { id: 'rajesh_opt_shutter', text: '“Rajesh, lives depend on that shutter being wide open! Turn the master key immediately!”', role: 'runner' }
        ]
      }
    }

    if (npc.id === 'npc_verma') {
      return {
        npcId: npc.id,
        npcName: npc.name,
        npcRole: npc.roleTitle,
        promptText: '"Incident Commander Verma here! Is the main electrical feed isolated? We cannot charge high-pressure hoses into live circuits!"',
        trust: npc.trust,
        fear: npc.fear,
        cooperation: npc.cooperation,
        history: [],
        options: [
          { id: 'verma_opt_coord', text: '“Officer Verma, electrical breaker is tripped, exit shutter is clear, and victims are moving to assembly point.”', role: 'runner' },
          { id: 'verma_opt_hydrant', text: '“Municipal water hydrant valve is opened and ready for your pumper crew.”', role: 'runner' }
        ]
      }
    }

    // ─────────────────────────────────────────────────────────────
    // LEVEL 3: THE COVER-UP / CONSTRUCTION SITE DIALOGUES
    // ─────────────────────────────────────────────────────────────
    if (npc.id === 'npc_laxman') {
      return {
        npcId: npc.id,
        npcName: npc.name,
        npcRole: npc.roleTitle,
        promptText: npc.isStabilized
          ? '"The splint stopped the agony... supervisor Bose told me he would blacklist my union card if I spoke."'
          : '"My leg was crushed when the fourth tier collapsed... they never replaced the rusted safety pins!"',
        trust: npc.trust,
        fear: npc.fear,
        cooperation: npc.cooperation,
        history: [],
        options: [
          { id: 'laxman_opt_triage', text: '“Laxman, do not move. Applying emergency trauma splint from the site first-aid kit.”', role: 'runner' },
          { id: 'laxman_opt_reassure', text: '“Under the BOCW Act 1996, medical compensation and strict employer liability are guaranteed by law. You are safe.”', role: 'runner' }
        ]
      }
    }

    if (npc.id === 'npc_bose') {
      return {
        npcId: npc.id,
        npcName: npc.name,
        npcRole: npc.roleTitle,
        promptText: '"What are you snooping around here for? This is a private construction zone! Worker slipped on his own carelessness!"',
        trust: npc.trust,
        fear: npc.fear,
        cooperation: npc.cooperation,
        history: [],
        options: [
          { id: 'bose_opt_whistleblow', text: '“Section 38 of BOCW Act mandates statutory reporting within 24 hours. Concealing a site disaster carries criminal prosecution!”', role: 'runner' },
          { id: 'bose_opt_inspect', text: '“The safety inspection logbook will show the unaddressed structural warnings, Supervisor Bose.”', role: 'runner' }
        ]
      }
    }

    if (npc.id === 'npc_gupta') {
      return {
        npcId: npc.id,
        npcName: npc.name,
        npcRole: npc.roleTitle,
        promptText: '"Compliance Inspector Gupta. I received an anonymous tip regarding unsafe scaffolding. Do you have official site documentation?"',
        trust: npc.trust,
        fear: npc.fear,
        cooperation: npc.cooperation,
        history: [],
        options: [
          { id: 'gupta_opt_audit', text: '“Inspector Gupta, submitting verified electronic incident report along with watchman Kishore’s safety register.”', role: 'runner' },
          { id: 'gupta_opt_evidence', text: '“Scaffolding failed due to rusted substandard pins. We need an immediate stop-work order under municipal law.”', role: 'runner' }
        ]
      }
    }

    if (npc.id === 'npc_kishore') {
      return {
        npcId: npc.id,
        npcName: npc.name,
        npcRole: npc.roleTitle,
        promptText: '"Bose threatened to fire me and seize my PF deposit if I hand over the gate registers."',
        trust: npc.trust,
        fear: npc.fear,
        cooperation: npc.cooperation,
        history: [],
        options: [
          { id: 'kishore_opt_access', text: '“Whistleblower Protection Act shields your employment and identity, Kishore. Give us the logbook so Laxman gets justice.”', role: 'runner' },
          { id: 'kishore_opt_protect', text: '“Inspector Gupta is on site right now. He will formally seal your statement into evidence.”', role: 'runner' }
        ]
      }
    }

    if (npc.id === 'npc_anita') {
      return {
        npcId: npc.id,
        npcName: npc.name,
        npcRole: npc.roleTitle,
        promptText: '"Union legal counsel Anita. We are petitioning the Labor Welfare Board for emergency relief and contractor penalization."',
        trust: npc.trust,
        fear: npc.fear,
        cooperation: npc.cooperation,
        history: [],
        options: [
          { id: 'anita_opt_bocw', text: '“Filing the digital incident evidence into the BOCW statutory registry for expedited judicial relief.”', role: 'runner' },
          { id: 'anita_opt_report', text: '“Laxman is stabilized and watchman Kishore has agreed to produce the inspection logs.”', role: 'runner' }
        ]
      }
    }

    return null
  }

  buildSaboteurDialogue(npc) {
    if (npc.id === 'npc_ramesh') {
      return {
        npcId: npc.id,
        npcName: npc.name,
        npcRole: npc.roleTitle,
        promptText: '"Why are you asking about my CCTV? Do you know something?"',
        trust: npc.trust,
        fear: npc.fear,
        cooperation: npc.cooperation,
        history: [],
        options: [
          {
            id: 'sab_ramesh_A',
            text: 'A. “Why get involved? Police will seize your DVR for forensic analysis for months.”',
            role: 'saboteur',
            sabotageEnergyCost: 20,
            consequenceHint: 'Spreads fear of DVR seizure (+Fear, -Cooperation)'
          },
          {
            id: 'sab_ramesh_B',
            text: 'B. “The camera angle is too blurry anyway. It’s useless to show anyone.”',
            role: 'saboteur',
            sabotageEnergyCost: 15,
            consequenceHint: 'Minimizes evidence value (-Cooperation)'
          },
          {
            id: 'sab_ramesh_C',
            text: 'C. “The driver already surrendered at the station. Don\'t bother checking.”',
            role: 'saboteur',
            sabotageEnergyCost: 25,
            consequenceHint: 'Deceptive claim (-Cooperation, +Manipulated)'
          }
        ]
      }
    }

    if (npc.id === 'npc_priya') {
      return {
        npcId: npc.id,
        npcName: npc.name,
        npcRole: npc.roleTitle,
        promptText: '"Excuse me? Are you asking about the accident?"',
        trust: npc.trust,
        fear: npc.fear,
        cooperation: npc.cooperation,
        history: [],
        options: [
          {
            id: 'sab_priya_A',
            text: 'A. “In that dusk lighting, anyone could mistake a number. You shouldn\'t swear to police.”',
            role: 'saboteur',
            sabotageEnergyCost: 20,
            consequenceHint: 'Plants doubt in eyewitness memory (+Fear, -Trust)'
          },
          {
            id: 'sab_priya_B',
            text: 'B. “Your bus is arriving! You should really catch it and avoid court summons.”',
            role: 'saboteur',
            sabotageEnergyCost: 20,
            consequenceHint: 'Encourages witness to leave (+Fear)'
          }
        ]
      }
    }

    if (npc.id === 'npc_amit') {
      return {
        npcId: npc.id,
        npcName: npc.name,
        npcRole: npc.roleTitle,
        promptText: '"Should I do something?"',
        trust: npc.trust,
        fear: npc.fear,
        cooperation: npc.cooperation,
        history: [],
        options: [
          {
            id: 'sab_amit_A',
            text: '“Hey look over there by the tea stall! Somebody dropped a bag with cash!”',
            role: 'saboteur',
            sabotageEnergyCost: 15,
            consequenceHint: 'Stages false distraction so bystander leaves'
          }
        ]
      }
    }

    if (npc.id === 'npc_sharma') {
      return {
        npcId: npc.id,
        npcName: npc.name,
        npcRole: npc.roleTitle,
        promptText: '"Citizen, unless you have verified information, please keep the road clear."',
        trust: npc.trust,
        fear: npc.fear,
        cooperation: npc.cooperation,
        history: [],
        options: [
          {
            id: 'sab_sharma_A',
            text: '“Officer, I saw an auto-rickshaw speed toward the East bypass. That was probably the one!”',
            role: 'saboteur',
            sabotageEnergyCost: 30,
            consequenceHint: 'Attempts to plant false lead with authorities'
          }
        ]
      }
    }

    // Level 2 & 3 Saboteur Dialogues
    if (npc.id === 'npc_deepak') {
      return {
        npcId: npc.id,
        npcName: npc.name,
        npcRole: npc.roleTitle,
        promptText: '"Is the fire spreading toward the back corridor?!"',
        trust: npc.trust,
        fear: npc.fear,
        cooperation: npc.cooperation,
        history: [],
        options: [
          {
            id: 'sab_deepak_panic',
            text: '“The main exit is completely engulfed! Run in the opposite direction!”',
            role: 'saboteur',
            sabotageEnergyCost: 20,
            consequenceHint: 'Incites blind panic in market visitor'
          }
        ]
      }
    }

    if (npc.id === 'npc_rajesh') {
      return {
        npcId: npc.id,
        npcName: npc.name,
        npcRole: npc.roleTitle,
        promptText: '"What should I do with this exit shutter?"',
        trust: npc.trust,
        fear: npc.fear,
        cooperation: npc.cooperation,
        history: [],
        options: [
          {
            id: 'sab_rajesh_lock',
            text: '“Don\'t touch the lock! Looters are using the smoke as cover to rob the textile shops!”',
            role: 'saboteur',
            sabotageEnergyCost: 25,
            consequenceHint: 'Misleads security guard to keep shutter barred'
          }
        ]
      }
    }

    if (npc.id === 'npc_laxman') {
      return {
        npcId: npc.id,
        npcName: npc.name,
        npcRole: npc.roleTitle,
        promptText: '"I just want my medical bills paid..."',
        trust: npc.trust,
        fear: npc.fear,
        cooperation: npc.cooperation,
        history: [],
        options: [
          {
            id: 'sab_laxman_waiver',
            text: '“Sign this receipt claiming you ignored company safety helmet rules, or contractor will refuse all hospital costs!”',
            role: 'saboteur',
            sabotageEnergyCost: 20,
            consequenceHint: 'Forces worker waiver under duress'
          }
        ]
      }
    }

    if (npc.id === 'npc_kishore') {
      return {
        npcId: npc.id,
        npcName: npc.name,
        npcRole: npc.roleTitle,
        promptText: '"They told me to guard this portacabin desk..."',
        trust: npc.trust,
        fear: npc.fear,
        cooperation: npc.cooperation,
        history: [],
        options: [
          {
            id: 'sab_kishore_threaten',
            text: '“If any page from that logbook goes missing on your shift, you will be arrested for corporate theft!”',
            role: 'saboteur',
            sabotageEnergyCost: 25,
            consequenceHint: 'Intimidates watchman into withholding records'
          }
        ]
      }
    }

    return null
  }

  // ─────────────────────────────────────────────────────────────
  // DIALOGUE ANTI-EXPLOIT: SEMANTIC REWARD GROUPS & REPEAT RESPONSES
  // ─────────────────────────────────────────────────────────────
  getDialogueSemanticGroup(optionId) {
    const semanticGroupMap = {
      // Level 1
      ramesh_opt_A: 'RAMESH_COOPERATION',
      ramesh_opt_B: 'RAMESH_COOPERATION',
      ramesh_opt_C: 'RAMESH_ALIENATE',
      priya_opt_plate: 'PRIYA_WITNESS',
      priya_opt_reassure: 'PRIYA_WITNESS',
      priya_opt_confirm_route: 'PRIYA_ROUTE',
      amit_opt_call: 'AMIT_DISPATCH',
      amit_opt_crowd: 'AMIT_CROWD',
      sharma_opt_report: 'SHARMA_REPORT',
      sharma_opt_traffic: 'SHARMA_TRAFFIC',
      arjun_firstaid: 'ARJUN_STABILIZE',
      arjun_ask_car: 'ARJUN_CLUE',
      sab_ramesh_A: 'SAB_RAMESH_INTIMIDATE',
      sab_ramesh_B: 'SAB_RAMESH_INTIMIDATE',
      sab_ramesh_C: 'SAB_RAMESH_INTIMIDATE',
      sab_priya_A: 'SAB_PRIYA_MISLEAD',
      sab_priya_B: 'SAB_PRIYA_MISLEAD',
      sab_amit_A: 'SAB_AMIT_DISTRACT',
      sab_sharma_A: 'SAB_SHARMA_FALSE_LEAD',

      // Level 2
      sunil_opt_source: 'SUNIL_POWER',
      sunil_opt_guide: 'SUNIL_EVAC',
      deepak_opt_calm: 'DEEPAK_CALM',
      deepak_opt_guide: 'DEEPAK_CALM',
      meera_opt_assist: 'MEERA_EVAC',
      meera_opt_shutter: 'MEERA_EVAC',
      rajesh_opt_keys: 'RAJESH_ACCESS',
      rajesh_opt_shutter: 'RAJESH_ACCESS',
      verma_opt_coord: 'VERMA_RESCUE',
      verma_opt_hydrant: 'VERMA_RESCUE',
      sab_deepak_panic: 'SAB_DEEPAK_PANIC',
      sab_rajesh_lock: 'SAB_RAJESH_LOCK',

      // Level 3
      laxman_opt_triage: 'LAXMAN_AID',
      laxman_opt_reassure: 'LAXMAN_AID',
      bose_opt_whistleblow: 'BOSE_CONFRONT',
      bose_opt_inspect: 'BOSE_CONFRONT',
      gupta_opt_audit: 'GUPTA_INSPECT',
      gupta_opt_evidence: 'GUPTA_INSPECT',
      kishore_opt_access: 'KISHORE_LOGS',
      kishore_opt_protect: 'KISHORE_LOGS',
      anita_opt_bocw: 'ANITA_LEGAL',
      anita_opt_report: 'ANITA_LEGAL',
      sab_laxman_waiver: 'SAB_LAXMAN_WAIVER',
      sab_kishore_threaten: 'SAB_KISHORE_THREATEN'
    }
    return semanticGroupMap[optionId] || null
  }

  getNaturalRepeatResponse(npcId, optionId) {
    const repeatResponses = {
      npc_ramesh: '"I\'ve already agreed to help you with the CCTV footage, beta. Go check the console."',
      npc_priya: '"I told you everything I saw—the dark sedan headed towards the north highway."',
      npc_amit: '"I\'ve already dispatched the ambulance and patrol units; maintain the perimeter."',
      npc_sharma: '"Your report is on the police radio. Focus on stabilizing the victim while units respond."',
      npc_arjun: '"The bandage is holding... thank you for staying with me."',
      npc_sunil: '"The electrical breaker is behind the shop counter! Please shut off the power before sparks spread!"',
      npc_deepak: '"I\'m breathing deeply now. Thank you for keeping me calm."',
      npc_meera: '"The aisle is cleared! Let\'s get everyone safely through the exit shutter!"',
      npc_rajesh: '"The emergency exit shutters are unlocked now! Guide people out!"',
      npc_verma: '"Fire & Rescue team is rolling. Keep the access route clear of obstructions!"',
      npc_laxman: '"The pain is manageable now. Please don\'t let supervisor Bose hide the safety records."',
      npc_bose: '"I told you, this was an unavoidable malfunction. You have no authority here."',
      npc_gupta: '"I\'ve documented the safety violation. We need the official supervisor logs to file charges."',
      npc_kishore: '"I already handed you the night shift logs. Keep them safe from the contractors."',
      npc_anita: '"BOCW Act section 38 provides strict liability. I am filing the expedited labor petition now."'
    }
    return repeatResponses[npcId] || '"We have already discussed this. Let\'s focus on the emergency."'
  }

  // ─────────────────────────────────────────────────────────────
  // PROCESS DIALOGUE CHOICE WITH AUTHORITATIVE ANTI-EXPLOIT
  // ─────────────────────────────────────────────────────────────
  handleDialogueChoice(npcId, optionId, playerRole, playerId = 'unknown') {
    const npc = this.npcs[npcId]
    if (!npc) return { success: false, message: 'NPC not found' }

    const optionKey = `${this.currentLevel}_${this.currentRound}_${optionId}`
    const semanticGroup = this.getDialogueSemanticGroup(optionId)
    const groupKey = semanticGroup ? `${this.currentLevel}_${this.currentRound}_${semanticGroup}` : null

    // Check if this dialogue option or its semantic reward group was ALREADY rewarded
    const alreadyRewarded =
      this.rewardedDialogueOptions.has(optionKey) ||
      (groupKey && this.rewardedSemanticGroups.has(groupKey))

    if (alreadyRewarded) {
      const repeatMsg = this.getNaturalRepeatResponse(npcId, optionId)

      // Authoritative Record: Log repeat attempt with rewardApplied = false
      this.dialogueActionRecords.push({
        actionId: 'da_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        playerId,
        npcId,
        optionId,
        roundId: this.currentRound,
        levelId: this.currentLevel,
        timestamp: Date.now(),
        rewardApplied: false,
        previousTrust: npc.trust,
        newTrust: npc.trust,
        previousFear: npc.fear,
        newFear: npc.fear,
        previousCooperation: npc.cooperation,
        newCooperation: npc.cooperation
      })

      // Clamping safety
      npc.trust = Math.max(0, Math.min(100, npc.trust))
      npc.fear = Math.max(0, Math.min(100, npc.fear))
      npc.cooperation = Math.max(0, Math.min(100, npc.cooperation))

      return {
        success: true,
        npcState: npc,
        physicalReaction: 'idle',
        statusMessage: repeatMsg,
        telemetry: this.getTelemetry()
      }
    }

    // First-time execution: record reward claim
    this.rewardedDialogueOptions.add(optionKey)
    if (groupKey) {
      this.rewardedSemanticGroups.add(groupKey)
    }

    const prevTrust = npc.trust
    const prevFear = npc.fear
    const prevCoop = npc.cooperation

    let statusMsg = ''
    let reaction = 'idle'
    let reactionDuration = 3.5

    if (playerRole === 'runner') {
      // ── Level 1 Choices ──
      if (optionId === 'ramesh_opt_A') {
        npc.cooperation = Math.min(100, npc.cooperation + 25)
        npc.trust = Math.min(100, npc.trust + 10)
        statusMsg = 'Ramesh is touched by your compassion (+25% Coop, +10% Trust).'
        reaction = 'nod'
      } else if (optionId === 'ramesh_opt_B') {
        npc.trust = Math.min(100, npc.trust + 25)
        npc.fear = Math.max(0, npc.fear - 20)
        statusMsg = 'Explaining s.134A relieved Ramesh’s fear (+25% Trust, -20% Fear)!'
        reaction = 'nod'
      } else if (optionId === 'ramesh_opt_C') {
        npc.trust = Math.max(0, npc.trust - 20)
        npc.fear = Math.min(100, npc.fear + 15)
        statusMsg = 'Being forceful alienated Ramesh (-20% Trust).'
        reaction = 'shake_head'
      }

      // If Ramesh cooperation reached 50, unlock CCTV!
      if (npc.id === 'npc_ramesh' && npc.cooperation >= 50) {
        if (this.objects.obj_cctv && this.objects.obj_cctv.state === 'locked') {
          this.objects.obj_cctv.state = 'ready'
          this.completeRunnerObjective('ro_3')
          reaction = 'point_cctv'
          reactionDuration = 4.0
          if (this.npcRoutines.npc_ramesh) {
            this.npcRoutines.npc_ramesh.specialTarget = { x: -16.0, z: -11.6 }
          }
          this.awardScore(null, 'runner', 'CCTV_COOPERATION', 10, 'Persuaded Ramesh to unlock CCTV console')
          this.addEventFeedItem('📹 Ramesh agreed to preserve CCTV footage! DVR console unlocked.', 'cooperation')
        }
      }

      if (optionId === 'priya_opt_plate' || optionId === 'priya_opt_reassure') {
        npc.trust = Math.min(100, npc.trust + 20)
        npc.cooperation = Math.min(100, npc.cooperation + 20)
        npc.manipulated = false
        reaction = 'point_road'
        reactionDuration = 4.0
        this.addInformation({
          id: 'info_priya',
          title: 'Eyewitness License Plate Clue',
          description: 'Priya witnessed vehicle fleeing north. Partial plate: DL-04-C***.',
          source: 'Priya (Bus Stop)',
          reliability: 'MEDIUM',
          verified: true
        })
        this.completeRunnerObjective('ro_4')
        this.awardScore(null, 'runner', 'WITNESS_COOPERATION', 10, 'Secured eyewitness testimony from Priya')
        this.awardScore(null, 'runner', 'VERIFIED_CLUE', 15, 'Secured partial registration plate DL-04-C')
        this.addEventFeedItem('🗣️ Eyewitness Priya reported partial plate (DL-04-C***) fleeing north.', 'evidence')
        statusMsg = 'Priya shared the license plate clue! Added to Information Log.'
      }

      if (optionId === 'arjun_firstaid') {
        if (this.inventory.includes('First-Aid Medical Box')) {
          npc.isStabilized = true
          npc.fear = Math.max(0, npc.fear - 30)
          npc.trust = Math.min(100, npc.trust + 40)
          reaction = 'pain_relieved'
          reactionDuration = 9999
          this.completeRunnerObjective('ro_1')
          this.awardScore(null, 'runner', 'VICTIM_ASSESSMENT', 10, 'Assessed and stabilized victim Arjun with first-aid')
          this.addEventFeedItem('🩹 Runner applied sterile pressure bandage to Arjun. Victim stabilized!', 'emergency')
          statusMsg = 'Applied sterile bandage to Arjun! Bleeding stabilized (+40% Trust).'
        } else {
          statusMsg = 'You assessed Arjun. Find the First-Aid Kit near the shop to stabilize him!'
        }
      }

      if (optionId === 'amit_opt_call') {
        npc.state = 'COOPERATIVE'
        reaction = 'call_phone'
        reactionDuration = 5.0
        if (this.npcRoutines.npc_amit) {
          this.npcRoutines.npc_amit.specialTarget = { x: -4.0, z: 4.5 }
        }
        if (this.objects.obj_phone) {
          this.objects.obj_phone.state = 'dispatched'
        }
        this.completeRunnerObjective('ro_2')
        this.awardScore(null, 'runner', 'BYSTANDER_ASSIST', 10, 'Enlisted bystander Amit in emergency response')
        this.awardScore(null, 'runner', 'EMERGENCY_DISPATCH', 20, 'Dispatched 112 emergency services')
        this.addEventFeedItem('📞 Amit ran to the Emergency Pillar and dialed 112!', 'emergency')
        statusMsg = 'Amit ran to the emergency phone and called 112! Emergency response dispatched.'
      }

      if (optionId === 'sharma_opt_report') {
        reaction = 'direct_traffic'
        const hasCCTV = this.informationLog.some((i) => i.id === 'info_cctv')
        const hasPlate = this.informationLog.some((i) => i.id === 'info_priya')
        if (hasCCTV && hasPlate) {
          this.completeRunnerObjective('ro_5')
          reaction = 'nod'
          this.awardScore(null, 'runner', 'ACCURATE_REPORT', 10, 'Filed verified hit-and-run report with Officer Sharma')
          this.checkAllRunnerObjectivesBonus()
          this.addEventFeedItem('🚨 Officer Sharma logged verified report and alerted highway intercept!', 'emergency')
          statusMsg = 'Officer Sharma logged official report with CCTV & Plate evidence! Mission Success!'
          this.endRound('RUNNER_COMPLETED_REPORT')
        } else {
          statusMsg = 'Officer Sharma: "Need both CCTV and plate evidence before highway intercept."'
        }
      }

      // ── Level 2 Choices ──
      if (optionId === 'sunil_opt_source') {
        npc.trust = Math.min(100, npc.trust + 25)
        npc.cooperation = Math.min(100, npc.cooperation + 20)
        statusMsg = 'Sunil disclosed electrical breaker location! (+25% Trust)'
        reaction = 'point_cctv'
        this.addInformation({
          id: 'info_breaker_loc',
          title: 'Main Breaker Location',
          description: 'Sunil confirmed the breaker is behind shop counter.',
          source: 'Sunil Pali',
          reliability: 'HIGH',
          verified: true
        })
      }

      if (optionId === 'deepak_opt_calm') {
        npc.fear = Math.max(0, npc.fear - 35)
        npc.trust = Math.min(100, npc.trust + 30)
        this.completeRunnerObjective('ro_2_3')
        this.awardScore(null, 'runner', 'CROWD_MANAGEMENT', 15, 'Calmed panic visitor Deepak with low-posture instructions')
        statusMsg = 'Calmed Deepak with smoke safety guidance (-35% Fear)!'
        reaction = 'nod'
      }

      if (optionId === 'meera_opt_assist') {
        npc.cooperation = Math.min(100, npc.cooperation + 30)
        npc.trust = Math.min(100, npc.trust + 20)
        statusMsg = 'Meera cleared textile corridor (+30% Coop)!'
        reaction = 'nod'
      }

      if (optionId === 'rajesh_opt_keys') {
        npc.cooperation = Math.min(100, npc.cooperation + 40)
        if (this.objects.obj_exit_shutter) {
          this.objects.obj_exit_shutter.state = 'unlocked'
        }
        this.completeRunnerObjective('ro_2_4')
        this.awardScore(null, 'runner', 'EXIT_EVACUATION', 20, 'Reminded guard Rajesh of NBC fire exit regulations')
        statusMsg = 'Guard Rajesh unlocked the emergency exit roll-up shutter!'
        reaction = 'nod'
      }

      if (optionId === 'verma_opt_coord') {
        npc.trust = Math.min(100, npc.trust + 30)
        this.completeRunnerObjective('ro_2_5')
        this.awardScore(null, 'runner', 'RESCUE_COORDINATION', 20, 'Briefed Fire Incident Commander Verma')
        statusMsg = 'Briefed Officer Verma! Water hoses deployed safely.'
        reaction = 'direct_traffic'
        this.endRound('RUNNER_COMPLETED_REPORT')
      }

      // ── Level 3 Choices ──
      if (optionId === 'laxman_opt_triage') {
        if (this.inventory.includes('Heavy Duty Site Trauma Kit')) {
          npc.isStabilized = true
          npc.fear = Math.max(0, npc.fear - 35)
          npc.trust = Math.min(100, npc.trust + 40)
          this.completeRunnerObjective('ro_3_1')
          this.awardScore(null, 'runner', 'WORKER_STABILIZATION', 15, 'Stabilized injured laborer Laxman with trauma kit')
          statusMsg = 'Applied trauma splint to Laxman (+40% Trust)!'
          reaction = 'pain_relieved'
        } else {
          statusMsg = 'Find the Site Trauma Medical Kit near the storage hut to stabilize Laxman!'
        }
      }

      if (optionId === 'bose_opt_whistleblow') {
        npc.trust = Math.max(0, npc.trust - 30)
        npc.fear = Math.min(100, npc.fear + 35)
        statusMsg = 'Confronted supervisor Bose with BOCW Act liability (+35% Fear)!'
        reaction = 'shake_head'
      }

      if (optionId === 'kishore_opt_access') {
        npc.cooperation = Math.min(100, npc.cooperation + 35)
        npc.trust = Math.min(100, npc.trust + 25)
        this.completeRunnerObjective('ro_3_4')
        this.awardScore(null, 'runner', 'EVIDENCE_PRESERVATION', 20, 'Convinced watchman Kishore to produce inspection registers')
        statusMsg = 'Kishore handed over safety logbook registers (+35% Coop)!'
        reaction = 'nod'
      }

      if (optionId === 'gupta_opt_audit') {
        npc.trust = Math.min(100, npc.trust + 35)
        this.completeRunnerObjective('ro_3_5')
        this.awardScore(null, 'runner', 'STATUTORY_COMPLIANCE', 20, 'Submitted digital proof to Inspector Gupta')
        statusMsg = 'Inspector Gupta issued site stop-work order under BOCW Act!'
        reaction = 'direct_traffic'
        this.endRound('RUNNER_COMPLETED_REPORT')
      }
    } else {
      // Saboteur choices
      if (optionId === 'sab_ramesh_A' && this.sabotageEnergy >= 20) {
        this.sabotageEnergy = Math.max(0, this.sabotageEnergy - 20)
        npc.fear = Math.min(100, npc.fear + 30)
        npc.cooperation = Math.max(0, npc.cooperation - 25)
        npc.manipulated = true
        reaction = 'step_back'
        this.suspicionLevel = Math.min(100, this.suspicionLevel + 15)
        this.awardScore(null, 'saboteur', 'CCTV_DELAY', 10, 'Intimidated shopkeeper Ramesh regarding DVR seizure')
        this.addEventFeedItem('🤫 Ramesh became intimidated about police seizure of his DVR.', 'sabotage')
        statusMsg = 'Planted fear in Ramesh (+30% Fear, -25% Coop).'
      } else if (optionId === 'sab_ramesh_B' && this.sabotageEnergy >= 15) {
        this.sabotageEnergy = Math.max(0, this.sabotageEnergy - 15)
        npc.cooperation = Math.max(0, npc.cooperation - 20)
        reaction = 'shake_head'
        this.suspicionLevel = Math.min(100, this.suspicionLevel + 10)
        statusMsg = 'Dismissed CCTV value to Ramesh (-20% Coop).'
      } else if (optionId === 'sab_ramesh_C' && this.sabotageEnergy >= 25) {
        this.sabotageEnergy = Math.max(0, this.sabotageEnergy - 25)
        npc.cooperation = Math.max(0, npc.cooperation - 30)
        npc.manipulated = true
        reaction = 'shake_head'
        this.suspicionLevel = Math.min(100, this.suspicionLevel + 18)
        statusMsg = 'Falsely claimed driver surrendered (-30% Coop).'
      }

      if (optionId === 'sab_priya_A' && this.sabotageEnergy >= 20) {
        this.sabotageEnergy = Math.max(0, this.sabotageEnergy - 20)
        npc.manipulated = true
        npc.fear = Math.min(100, npc.fear + 25)
        npc.cooperation = Math.max(0, npc.cooperation - 20)
        reaction = 'shake_head'
        this.suspicionLevel = Math.min(100, this.suspicionLevel + 15)
        this.completeSaboteurObjective('so_1')
        this.awardScore(null, 'saboteur', 'MISLEAD_WITNESS', 10, 'Planted doubt in eyewitness Priya’s recollection')
        this.addEventFeedItem('⚠️ Eyewitness Priya became hesitant about her license plate memory.', 'sabotage')
        statusMsg = 'Planted doubt in Priya’s memory (+25% Fear, Misinformed).'
      }

      if (optionId === 'sab_amit_A' && this.sabotageEnergy >= 15) {
        this.sabotageEnergy = Math.max(0, this.sabotageEnergy - 15)
        npc.state = 'LEAVING'
        reaction = 'step_back'
        if (this.npcRoutines.npc_amit) {
          this.npcRoutines.npc_amit.specialTarget = { x: 7.0, z: 5.0 }
        }
        this.suspicionLevel = Math.min(100, this.suspicionLevel + 12)
        this.completeSaboteurObjective('so_3')
        this.awardScore(null, 'saboteur', 'DISTRACTION', 10, 'Staged distraction to disperse bystanders')
        this.addEventFeedItem('💥 Distraction staged near tea stall! Bystander Amit stepped away.', 'sabotage')
        statusMsg = 'Staged distraction! Amit stepped away to investigate.'
      }

      if (optionId === 'sab_sharma_A' && this.sabotageEnergy >= 30) {
        this.sabotageEnergy = Math.max(0, this.sabotageEnergy - 30)
        this.suspicionLevel = Math.min(100, this.suspicionLevel + 25)
        reaction = 'shake_head'
        this.addInformation({
          id: 'info_false_lead',
          title: 'False Lead: Green Auto-Rickshaw',
          description: 'A bystander claimed a green auto-rickshaw caused the accident.',
          source: 'Anonymous Bystander',
          reliability: 'LOW',
          verified: false
        })
        this.awardScore(null, 'saboteur', 'FALSE_LEAD', 15, 'Planted false rumor with Officer Sharma')
        this.addEventFeedItem('📌 False lead planted: rumors of an auto-rickshaw collision.', 'sabotage')
        statusMsg = 'Planted a false lead with Officer Sharma!'
      }

      if (optionId === 'sab_deepak_panic' && this.sabotageEnergy >= 20) {
        this.sabotageEnergy = Math.max(0, this.sabotageEnergy - 20)
        npc.fear = Math.min(100, npc.fear + 30)
        this.completeSaboteurObjective('so_2_2')
        this.awardScore(null, 'saboteur', 'SPREAD_PANIC', 15, 'Incited crowd panic in bazaar corridor')
        statusMsg = 'Incited panic in Deepak (+30% Fear)!'
        reaction = 'coughing'
      }

      if (optionId === 'sab_rajesh_lock' && this.sabotageEnergy >= 25) {
        this.sabotageEnergy = Math.max(0, this.sabotageEnergy - 25)
        npc.cooperation = Math.max(0, npc.cooperation - 35)
        this.completeSaboteurObjective('so_2_1')
        this.awardScore(null, 'saboteur', 'JAM_EXIT', 15, 'Misled guard Rajesh to keep shutter barred')
        statusMsg = 'Convinced Rajesh to keep shutter locked (-35% Coop)!'
        reaction = 'shake_head'
      }

      if (optionId === 'sab_laxman_waiver' && this.sabotageEnergy >= 20) {
        this.sabotageEnergy = Math.max(0, this.sabotageEnergy - 20)
        npc.fear = Math.min(100, npc.fear + 30)
        this.completeSaboteurObjective('so_3_1')
        this.awardScore(null, 'saboteur', 'INTIMIDATE_WORKER', 15, 'Forced injured worker disclaimer under duress')
        statusMsg = 'Intimidated worker Laxman (+30% Fear)!'
        reaction = 'clutch_chest'
      }

      if (optionId === 'sab_kishore_threaten' && this.sabotageEnergy >= 25) {
        this.sabotageEnergy = Math.max(0, this.sabotageEnergy - 25)
        npc.cooperation = Math.max(0, npc.cooperation - 30)
        this.completeSaboteurObjective('so_3_2')
        this.awardScore(null, 'saboteur', 'WITHHOLD_LOGS', 15, 'Threatened watchman regarding PF seizure')
        statusMsg = 'Intimidated watchman Kishore (-30% Coop)!'
        reaction = 'step_back'
      }
    }

    // Authoritative stat clamping strictly to [0, 100]
    npc.trust = Math.max(0, Math.min(100, npc.trust))
    npc.fear = Math.max(0, Math.min(100, npc.fear))
    npc.cooperation = Math.max(0, Math.min(100, npc.cooperation))

    // Authoritative Record: Log first-time reward
    this.dialogueActionRecords.push({
      actionId: 'da_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      playerId,
      npcId,
      optionId,
      roundId: this.currentRound,
      levelId: this.currentLevel,
      timestamp: Date.now(),
      rewardApplied: true,
      previousTrust: prevTrust,
      newTrust: npc.trust,
      previousFear: prevFear,
      newFear: npc.fear,
      previousCooperation: prevCoop,
      newCooperation: npc.cooperation
    })

    npc.currentReaction = reaction
    npc.reactionDurationSec = reactionDuration

    if (npc.fear >= 60) npc.state = 'HESITANT'
    else if (npc.cooperation >= 60) npc.state = 'COOPERATIVE'
    else if (npc.manipulated) npc.state = 'MISINFORMED'
    else npc.state = 'IDLE'

    npc.currentSpeakerId = null

    return {
      success: true,
      npcState: npc,
      physicalReaction: reaction,
      statusMessage: statusMsg,
      telemetry: this.getTelemetry()
    }
  }

  // ─────────────────────────────────────────────────────────────
  // SABOTEUR SPECIFIC ABILITIES
  // ─────────────────────────────────────────────────────────────
  handleSaboteurAbility(abilityId) {
    const ability = this.saboteurAbilities.find((a) => a.id === abilityId)
    if (!ability) return { success: false, message: 'Ability not found' }

    if (ability.currentCooldownSec > 0) {
      return { success: false, message: `Cooldown: ${ability.currentCooldownSec}s remaining` }
    }

    if (this.sabotageEnergy < ability.energyCost) {
      return { success: false, message: `Insufficient energy (Needs ${ability.energyCost})` }
    }

    this.sabotageEnergy -= ability.energyCost
    ability.currentCooldownSec = ability.cooldownSec

    if (abilityId === 'sab_mislead') {
      const priya = this.npcs.npc_priya
      priya.fear = Math.min(100, priya.fear + 20)
      priya.manipulated = true
      priya.currentReaction = 'shake_head'
      priya.reactionDurationSec = 3.5
      this.suspicionLevel = Math.min(100, this.suspicionLevel + 15)
      this.completeSaboteurObjective('so_1')
      this.awardScore(null, 'saboteur', 'MISLEAD_WITNESS', 10, 'Used Mislead Witness ability on Priya')
      this.addEventFeedItem('🗣️ Eyewitness Priya was misled regarding suspect vehicle details.', 'sabotage')
      return { success: true, message: 'Misled Priya! She is now confused about license details.' }
    }

    if (abilityId === 'sab_distract') {
      const amit = this.npcs.npc_amit
      amit.state = 'LEAVING'
      amit.currentReaction = 'step_back'
      amit.reactionDurationSec = 4.0
      if (this.npcRoutines.npc_amit) {
        this.npcRoutines.npc_amit.specialTarget = { x: 8.0, z: 2.0 }
      }
      this.suspicionLevel = Math.min(100, this.suspicionLevel + 12)
      this.completeSaboteurObjective('so_3')
      this.awardScore(null, 'saboteur', 'DISTRACTION', 10, 'Staged distraction to divert bystanders')
      this.addEventFeedItem('💥 Loud noise staged near tea stall. Bystanders distracted!', 'sabotage')
      return { success: true, message: 'Distraction staged! Amit moved away from the victim.' }
    }

    if (abilityId === 'sab_discourage') {
      const ramesh = this.npcs.npc_ramesh
      ramesh.fear = Math.min(100, ramesh.fear + 25)
      ramesh.cooperation = Math.max(0, ramesh.cooperation - 20)
      ramesh.manipulated = true
      ramesh.currentReaction = 'step_back'
      ramesh.reactionDurationSec = 3.5
      this.suspicionLevel = Math.min(100, this.suspicionLevel + 15)
      this.awardScore(null, 'saboteur', 'CCTV_DELAY', 10, 'Discouraged Ramesh from cooperating')
      this.addEventFeedItem('🤫 Ramesh intimidated regarding legal liability and police summons.', 'sabotage')
      return { success: true, message: 'Intimidated Ramesh! He is hesitant to unlock CCTV.' }
    }

    if (abilityId === 'sab_cctv') {
      const cctv = this.objects.obj_cctv
      cctv.state = 'disabled'
      cctv.disabledTimer = 25
      this.suspicionLevel = Math.min(100, this.suspicionLevel + 25)
      this.completeSaboteurObjective('so_2')
      this.awardScore(null, 'saboteur', 'CCTV_DELAY', 10, 'Corrupted CCTV storage feed for 25s')
      this.addEventFeedItem('📹 CCTV console disabled for 25s due to signal interference.', 'sabotage')
      return { success: true, message: 'CCTV disabled for 25 seconds! Storage feed corrupted.' }
    }

    if (abilityId === 'sab_false_lead') {
      this.suspicionLevel = Math.min(100, this.suspicionLevel + 20)
      this.addInformation({
        id: 'info_false_lead',
        title: 'False Lead: Green Auto-Rickshaw',
        description: 'Rumors claim a green commercial three-wheeler was the fleeing vehicle.',
        source: 'Notice Board Rumor',
        reliability: 'LOW',
        verified: false
      })
      this.completeSaboteurObjective('so_4')
      this.awardScore(null, 'saboteur', 'FALSE_LEAD', 15, 'Planted false lead on notice board')
      this.addEventFeedItem('📌 Notice Board pinned with false rumor regarding green auto-rickshaw.', 'sabotage')
      return { success: true, message: 'Planted false rumor on the notice board!' }
    }

    if (abilityId === 'sab_escape') {
      return { success: true, message: 'Proceed to North-East highway border and hold Channel Escape.' }
    }

    return { success: true, message: 'Ability activated' }
  }

  // ─────────────────────────────────────────────────────────────
  // OBJECT ACTIONS
  // ─────────────────────────────────────────────────────────────
  handleObjectAction(objId, actionType, playerRole) {
    const obj = this.objects[objId]
    if (!obj) return { success: false, message: 'Object not found' }

    if (objId === 'obj_phone') {
      if (playerRole === 'runner') {
        obj.state = 'dispatched'
        this.completeRunnerObjective('ro_2')
        this.awardScore(null, 'runner', 'EMERGENCY_DISPATCH', 20, 'Dispatched 112 emergency services via Call Pillar')
        this.addEventFeedItem('📞 112 Emergency Dispatch called from roadside emergency pillar!', 'emergency')
        return {
          success: true,
          message: 'Connected to 112 Central Emergency Dispatch! Ambulance dispatched to Junction 48.',
          objState: obj
        }
      } else {
        return { success: false, message: 'Saboteur cannot use emergency phone' }
      }
    }

    if (objId === 'obj_cctv') {
      if (playerRole === 'runner') {
        if (obj.state === 'locked') {
          return { success: false, message: 'CCTV Console is locked. Talk to Ramesh to obtain permission.' }
        }
        if (obj.state === 'disabled') {
          return { success: false, message: `CCTV Console is temporarily offline (${obj.disabledTimer}s remaining).` }
        }
        obj.state = 'reviewed'
        this.addInformation({
          id: 'info_cctv',
          title: 'CCTV Collision Footage',
          description: 'High-res rooftop camera recorded black sedan speeding north through red signal.',
          source: 'Dhaba CCTV Console',
          reliability: 'HIGH',
          verified: true
        })
        this.completeRunnerObjective('ro_3')
        this.awardScore(null, 'runner', 'CCTV_ACCESS', 15, 'Unlocked and reviewed Dhaba CCTV collision footage')
        this.addEventFeedItem('📹 Dhaba CCTV reviewed! Black sedan identified speeding north.', 'evidence')
        return {
          success: true,
          message: 'Reviewed CCTV! Confirmed Black Sedan speeding north. Logged to Information binder!',
          objState: obj
        }
      } else if (playerRole === 'saboteur') {
        if (this.sabotageEnergy < 30) {
          return { success: false, message: 'Not enough sabotage energy (needs 30 energy).' }
        }
        this.sabotageEnergy -= 30
        obj.state = 'disabled'
        obj.disabledTimer = 25
        this.suspicionLevel = Math.min(100, this.suspicionLevel + 25)
        this.completeSaboteurObjective('so_2')
        this.awardScore(null, 'saboteur', 'CCTV_DELAY', 10, 'Disabled CCTV console for 25s')
        this.addEventFeedItem('⚠️ Dhaba CCTV camera disabled by storage corruption for 25s.', 'sabotage')
        return {
          success: true,
          message: 'Disabled CCTV camera feed for 25 seconds!',
          objState: obj
        }
      }
    }

    if (objId === 'obj_firstaid') {
      if (playerRole === 'runner') {
        obj.state = 'collected'
        if (!this.inventory.includes('First-Aid Medical Box')) {
          this.inventory.push('First-Aid Medical Box')
        }
        this.awardScore(null, 'runner', 'VICTIM_ASSESSMENT', 10, 'Acquired sterile first-aid kit')
        this.addEventFeedItem('💊 First-Aid Kit acquired from medical box near shop.', 'emergency')
        return {
          success: true,
          message: 'Picked up First-Aid Medical Box! Take it to Arjun at the Accident Zone.',
          objState: obj
        }
      }
    }

    if (objId === 'obj_signal') {
      if (playerRole === 'runner') {
        obj.state = obj.state === 'red' ? 'green' : 'red'
        this.addEventFeedItem(`🚦 Pedestrian crossing signal toggled to ${obj.state.toUpperCase()}.`, 'traffic')
        return {
          success: true,
          message: `Pedestrian crossing signal set to ${obj.state.toUpperCase()}!`,
          objState: obj
        }
      } else if (playerRole === 'saboteur') {
        if (this.sabotageEnergy < 20) {
          return { success: false, message: 'Needs 20 sabotage energy.' }
        }
        this.sabotageEnergy -= 20
        obj.state = 'tampered'
        this.suspicionLevel = Math.min(100, this.suspicionLevel + 15)
        this.addEventFeedItem('🚦 Traffic signal tampered! Yellow caution flasher active.', 'sabotage')
        return {
          success: true,
          message: 'Tampered with signal box! Flashing yellow caution triggered.',
          objState: obj
        }
      }
    }

    if (objId === 'obj_infoboard') {
      if (playerRole === 'saboteur') {
        if (this.sabotageEnergy < 20) {
          return { success: false, message: 'Needs 20 sabotage energy to plant false lead.' }
        }
        this.sabotageEnergy = Math.max(0, this.sabotageEnergy - 20)
        this.suspicionLevel = Math.min(100, this.suspicionLevel + 20)
        this.addInformation({
          id: 'info_false_lead',
          title: 'False Lead: Green Auto-Rickshaw',
          description: 'An anonymous note claims a green auto-rickshaw caused the accident.',
          source: 'Notice Board Rumor',
          reliability: 'LOW',
          verified: false
        })
        this.completeSaboteurObjective('so_4')
        this.awardScore(null, 'saboteur', 'FALSE_LEAD', 15, 'Pinned false rumor on notice board')
        this.addEventFeedItem('📌 Notice Board tampered: false rumor posted regarding green auto-rickshaw.', 'sabotage')
        return {
          success: true,
          message: 'Pinned false lead on the notice board! Rumor added to case files.',
          objState: obj
        }
      } else {
        return {
          success: true,
          message: 'Inspected information notice board.',
          objState: obj
        }
      }
    }

    if (objId === 'obj_light_switch') {
      if (playerRole === 'saboteur') {
        if (this.sabotageEnergy < 15) {
          return { success: false, message: 'Not enough sabotage energy (needs 15 energy).' }
        }
        if (this.environmentalState.streetlights === 'OFF') {
          return { success: false, message: 'Streetlights are already off.' }
        }
        this.sabotageEnergy = Math.max(0, this.sabotageEnergy - 15)
        this.environmentalState.streetlights = 'OFF'
        obj.state = 'off'
        this.suspicionLevel = Math.min(100, this.suspicionLevel + 15)
        this.completeTask('t_s_light_cut', 'saboteur')
        this.awardScore(null, 'saboteur', 'LIGHTS_CUT', 15, 'Cut junction streetlights to plunge intersection into darkness')
        this.addEventFeedItem('💡 Junction streetlights cut! Area plunged into darkness.', 'sabotage')
        return {
          success: true,
          message: 'Switched off junction streetlights! The intersection is dark.',
          objState: obj,
          environmentalState: this.environmentalState
        }
      } else if (playerRole === 'runner') {
        if (this.environmentalState.streetlights === 'ON') {
          return { success: false, message: 'Streetlights are operating normally.' }
        }
        this.environmentalState.streetlights = 'ON'
        obj.state = 'on'
        this.awardScore(null, 'runner', 'LIGHTS_RESTORED', 15, 'Restored power to junction streetlights')
        this.addEventFeedItem('💡 Junction streetlights restored! Visibility returned.', 'emergency')
        return {
          success: true,
          message: 'Flipped breaker switch! Streetlights restored to full brightness.',
          objState: obj,
          environmentalState: this.environmentalState
        }
      }
    }

    // ─────────────────────────────────────────────────────────────
    // LEVEL 2 OBJECT ACTIONS
    // ─────────────────────────────────────────────────────────────
    if (objId === 'obj_electrical_panel') {
      if (playerRole === 'runner') {
        obj.state = 'tripped'
        this.completeRunnerObjective('ro_2_1')
        this.awardScore(null, 'runner', 'POWER_SHUTOFF', 15, 'Isolated main electrical power breaker')
        this.addEventFeedItem('⚡ Main electrical circuit tripped! Power safely isolated.', 'emergency')
        return {
          success: true,
          message: 'Main electrical breaker opened! Power disconnected to burning market stalls.',
          objState: obj
        }
      } else if (playerRole === 'saboteur') {
        if (this.sabotageEnergy < 25) {
          return { success: false, message: 'Needs 25 sabotage energy to tamper with breaker.' }
        }
        this.sabotageEnergy = Math.max(0, this.sabotageEnergy - 25)
        obj.state = 'jammed'
        this.awardScore(null, 'saboteur', 'SAB_BREAKER', 15, 'Jammed electrical panel closed')
        return {
          success: true,
          message: 'Jammed the electrical breaker cabinet!',
          objState: obj
        }
      }
    }

    if (objId === 'obj_fire_alarm') {
      if (playerRole === 'runner') {
        obj.state = 'ringing'
        this.completeRunnerObjective('ro_2_2')
        this.awardScore(null, 'runner', 'ALARM_PULLED', 15, 'Triggered manual fire alarm siren')
        this.addEventFeedItem('🚨 Manual fire alarm siren sounded across cloth bazaar!', 'emergency')
        return {
          success: true,
          message: 'Siren sounded! Market visitors alerted to evacuate.',
          objState: obj
        }
      }
    }

    if (objId === 'obj_extinguisher') {
      if (playerRole === 'runner') {
        obj.state = 'collected'
        if (!this.inventory.includes('CO2 Fire Extinguisher')) {
          this.inventory.push('CO2 Fire Extinguisher')
        }
        this.awardScore(null, 'runner', 'EXTINGUISHER_SECURED', 10, 'Collected Class C CO2 fire extinguisher')
        this.addEventFeedItem('🧯 CO2 Fire Extinguisher picked up from safety station.', 'emergency')
        return {
          success: true,
          message: 'Equipped CO2 Fire Extinguisher! Safe for electrical fires.',
          objState: obj
        }
      }
    }

    if (objId === 'obj_exit_shutter') {
      if (playerRole === 'runner') {
        if (obj.state === 'locked') {
          return { success: false, message: 'Emergency exit shutter is locked! Convince Security Guard Rajesh to use his keys.' }
        }
        obj.state = 'open'
        this.completeRunnerObjective('ro_2_4')
        this.addEventFeedItem('🚪 Emergency exit roll-up shutter rolled open! Evacuation path clear.', 'emergency')
        return {
          success: true,
          message: 'Rolled up the emergency exit shutter! Evacuation path wide open.',
          objState: obj
        }
      }
    }

    if (objId === 'obj_water_source') {
      if (playerRole === 'runner') {
        obj.state = 'open'
        this.addEventFeedItem('🚰 Municipal water supply valve opened for fire crew.', 'emergency')
        return {
          success: true,
          message: 'Opened water supply hydrant for fire brigade pumps.',
          objState: obj
        }
      } else if (playerRole === 'saboteur') {
        if (this.sabotageEnergy < 20) {
          return { success: false, message: 'Needs 20 sabotage energy.' }
        }
        this.sabotageEnergy = Math.max(0, this.sabotageEnergy - 20)
        obj.state = 'closed'
        this.completeSaboteurObjective('so_2_3')
        this.awardScore(null, 'saboteur', 'CUT_WATER', 15, 'Shut off municipal water supply valve')
        this.addEventFeedItem('🚰 Water supply hydrant valve closed by saboteur.', 'sabotage')
        return {
          success: true,
          message: 'Closed the municipal water supply valve!',
          objState: obj
        }
      }
    }

    // ─────────────────────────────────────────────────────────────
    // LEVEL 3 OBJECT ACTIONS
    // ─────────────────────────────────────────────────────────────
    if (objId === 'obj_first_aid_station') {
      if (playerRole === 'runner') {
        obj.state = 'collected'
        if (!this.inventory.includes('Heavy Duty Site Trauma Kit')) {
          this.inventory.push('Heavy Duty Site Trauma Kit')
        }
        this.awardScore(null, 'runner', 'TRAUMA_KIT_SECURED', 10, 'Retrieved heavy duty trauma medical kit')
        this.addEventFeedItem('🩹 Heavy Duty Site Trauma Kit collected from storage.', 'emergency')
        return {
          success: true,
          message: 'Acquired Heavy Duty Site Trauma Kit! Rush to stabilize Laxman.',
          objState: obj
        }
      }
    }

    if (objId === 'obj_safety_records') {
      if (playerRole === 'runner') {
        obj.state = 'secured'
        this.completeRunnerObjective('ro_3_2')
        this.awardScore(null, 'runner', 'SAFETY_RECORDS_SECURED', 15, 'Secured safety compliance inspection logbook')
        this.addEventFeedItem('📁 Safety inspection logbook secured into evidence binder.', 'evidence')
        return {
          success: true,
          message: 'Retrieved safety logbook! Shows 3 ignored scaffold failure warnings.',
          objState: obj
        }
      } else if (playerRole === 'saboteur') {
        if (this.sabotageEnergy < 25) {
          return { success: false, message: 'Needs 25 sabotage energy.' }
        }
        this.sabotageEnergy = Math.max(0, this.sabotageEnergy - 25)
        obj.state = 'corrupted'
        this.completeSaboteurObjective('so_3_2')
        this.awardScore(null, 'saboteur', 'TAMPER_LOGS', 15, 'Corrupted site safety registers')
        this.addEventFeedItem('🔥 Safety logbook desk files tampered and shredded.', 'sabotage')
        return {
          success: true,
          message: 'Shredded safety records on supervisor desk!',
          objState: obj
        }
      }
    }

    if (objId === 'obj_report_terminal') {
      if (playerRole === 'runner') {
        obj.state = 'submitted'
        this.completeRunnerObjective('ro_3_3')
        this.awardScore(null, 'runner', 'DIGITAL_REPORT_FILED', 20, 'Submitted official BOCW accident report electronically')
        this.addEventFeedItem('💻 Official statutory accident report filed to Labor Directorate portal!', 'emergency')
        return {
          success: true,
          message: 'Electronic report filed under Section 38 BOCW Act! Labor Inspector dispatched.',
          objState: obj
        }
      } else if (playerRole === 'saboteur') {
        if (this.sabotageEnergy < 25) {
          return { success: false, message: 'Needs 25 sabotage energy.' }
        }
        this.sabotageEnergy = Math.max(0, this.sabotageEnergy - 25)
        obj.state = 'locked'
        this.completeSaboteurObjective('so_3_4')
        this.awardScore(null, 'saboteur', 'LOCK_TERMINAL', 15, 'Locked incident report terminal')
        return {
          success: true,
          message: 'Locked the digital reporting kiosk!',
          objState: obj
        }
      }
    }

    if (objId === 'obj_emergency_alarm') {
      if (playerRole === 'runner') {
        obj.state = 'ringing'
        this.addEventFeedItem('🚨 Construction site emergency evacuation siren triggered!', 'emergency')
        return {
          success: true,
          message: 'High-rise evacuation siren activated! Workers assembling safely.',
          objState: obj
        }
      }
    }

    if (objId === 'obj_cctv_tower') {
      if (playerRole === 'runner') {
        obj.state = 'reviewed'
        this.addInformation({
          id: 'info_scaffold_cam',
          title: 'Surveillance Tower Footage',
          description: 'High-mast camera recorded rusted scaffold pin breaking under load.',
          source: 'Site CCTV Tower',
          reliability: 'HIGH',
          verified: true
        })
        return {
          success: true,
          message: 'Tower video reviewed! Confirmed uncertified clamp failure.',
          objState: obj
        }
      } else if (playerRole === 'saboteur') {
        if (this.sabotageEnergy < 25) {
          return { success: false, message: 'Needs 25 sabotage energy.' }
        }
        this.sabotageEnergy = Math.max(0, this.sabotageEnergy - 25)
        obj.state = 'disabled'
        this.completeSaboteurObjective('so_3_3')
        this.awardScore(null, 'saboteur', 'CUT_CAMERA', 15, 'Cut surveillance camera tower feed')
        this.addEventFeedItem('📹 Site CCTV tower cable severed! Feed terminated.', 'sabotage')
        return {
          success: true,
          message: 'Severed camera tower connection cables!',
          objState: obj
        }
      }
    }

    return { success: false, message: 'Action not allowed' }
  }

  // ─────────────────────────────────────────────────────────────
  // ESCAPE MECHANIC
  // ─────────────────────────────────────────────────────────────
  startEscapeChannel(saboteurPos, saboteurId) {
    const escapeZonePos = { x: 18, z: 18 }
    const dist = Math.sqrt((saboteurPos.x - escapeZonePos.x) ** 2 + (saboteurPos.z - escapeZonePos.z) ** 2)

    if (dist > 4.5) {
      return { success: false, message: 'Too far from Escape Zone (Go to North-East highway border)' }
    }

    this.escapeProgress.isEscaping = true
    this.escapeProgress.progressSec = 0
    this.escapeProgress.saboteurId = saboteurId
    this.addEventFeedItem('🏃‍♂️ Saboteur is attempting to escape through highway perimeter!', 'sabotage')

    return { success: true, message: 'Channeling escape (Hold position for 5s)...' }
  }

  cancelEscapeChannel(reason = 'Interrupted') {
    if (this.escapeProgress.isEscaping && !this.escapeProgress.isCompleted) {
      this.escapeProgress.isEscaping = false
      this.escapeProgress.progressSec = 0
      this.escapeProgress.saboteurId = null
      this.addEventFeedItem(`🛑 Saboteur escape attempt was ${reason.toLowerCase()}!`, 'emergency')
      return true
    }
    return false
  }

  addInformation(entry) {
    if (!this.informationLog.some((i) => i.id === entry.id)) {
      this.informationLog.push({ ...entry, timestamp: Date.now() })
    }
  }

  completeRunnerObjective(id) {
    const obj = this.runnerObjectives.find((o) => o.id === id)
    if (obj) obj.completed = true
  }

  completeSaboteurObjective(id) {
    const obj = this.saboteurObjectives.find((o) => o.id === id)
    if (obj) obj.completed = true
  }

  checkAllRunnerObjectivesBonus() {
    const allDone = this.runnerObjectives.every((o) => o.completed)
    if (allDone) {
      this.awardScore(null, 'runner', 'CIVIC_DUTY_BONUS', 20, 'Completed all 5 civic duty emergency objectives')
    }
  }

  // ─────────────────────────────────────────────────────────────
  // ROUND ENDING & EVALUATION
  // ─────────────────────────────────────────────────────────────
  endRound(reason = 'NORMAL') {
    if (this.phase === 'ROUND_ENDING' || this.phase === 'ROUND_RESULTS') return
    this.phase = 'ROUND_ENDING'

    // End-of-round score bonuses
    if (this.suspicionLevel < 40) {
      this.awardScore(null, 'saboteur', 'LOW_SUSPICION', 10, 'Maintained low suspicion profile throughout the round')
    }
    this.checkAllRunnerObjectivesBonus()

    const result = this.evaluateRound(reason)
    this.roundResults.push(result)
    this.phase = 'ROUND_RESULTS'

    // Reset ready status for round results screen
    for (const pid in this.readyStatus) {
      this.readyStatus[pid] = String(pid).startsWith('bot_')
    }

    return result
  }

  evaluateRound(reason = 'NORMAL') {
    let runnerId = ''
    let saboteurId = ''
    for (const pid in this.playerRoles) {
      if (this.playerRoles[pid] === 'runner') runnerId = pid
      if (this.playerRoles[pid] === 'saboteur') saboteurId = pid
    }

    const runnerName = this.players[runnerId]?.playerName || 'Runner'
    const saboteurName = this.players[saboteurId]?.playerName || 'Saboteur'

    // Filter score events for this round
    const roundEvts = this.scoreEvents.filter(
      (e) => e.level === this.currentLevel && e.round === this.currentRound
    )
    const runnerScoreEvents = roundEvts.filter((e) => e.role === 'runner')
    const saboteurScoreEvents = roundEvts.filter((e) => e.role === 'saboteur')

    const runnerScore = runnerScoreEvents.reduce((s, e) => s + e.points, 0)
    const saboteurScore = saboteurScoreEvents.reduce((s, e) => s + e.points, 0)

    const runnerDoneCount = this.runnerObjectives.filter((o) => o.completed).length
    let runnerOutcome = 'INCOMPLETE_RESPONSE'
    if (runnerDoneCount === 5) runnerOutcome = 'EXCELLENT_RESPONSE'
    else if (runnerDoneCount >= 3) runnerOutcome = 'SUCCESSFUL_RESPONSE'
    else if (runnerDoneCount >= 1) runnerOutcome = 'PARTIAL_RESPONSE'

    const saboteurDoneCount = this.saboteurObjectives.filter((o) => o.completed).length
    let saboteurOutcome = 'FAILED_ESCAPE'
    if (this.escapeProgress.isCompleted) {
      saboteurOutcome = 'SUCCESSFUL_ESCAPE'
    } else if (this.suspicionLevel >= 80 || runnerOutcome === 'EXCELLENT_RESPONSE') {
      saboteurOutcome = 'DETECTED_AND_CONTAINED'
    } else if (saboteurDoneCount >= 2) {
      saboteurOutcome = 'PARTIAL_DISRUPTION'
    }

    const durationSec = this.roundDuration - this.timeRemainingSec

    return {
      level: this.currentLevel,
      round: this.currentRound,
      roundId: `L${this.currentLevel}_R${this.currentRound}`,
      runnerId,
      runnerName,
      saboteurId,
      saboteurName,
      runnerScore,
      saboteurScore,
      runnerOutcome,
      saboteurOutcome,
      runnerScoreEvents,
      saboteurScoreEvents,
      summaryText: `Round ${this.currentRound} (Level ${this.currentLevel}) finished. Runner: ${runnerScore} pts (${runnerOutcome}) | Saboteur: ${saboteurScore} pts (${saboteurOutcome})`,
      durationSec
    }
  }

  // ─────────────────────────────────────────────────────────────
  // ROLE SWITCHING & LEVEL PROGRESSION
  // ─────────────────────────────────────────────────────────────
  advanceMatchFlow() {
    if (this.phase === 'LEVEL_RESULTS') {
      // Continuing from Level Summary modal into the new level
      this.phase = 'LEVEL_INTRO'
      for (const pid in this.readyStatus) {
        this.readyStatus[pid] = false
      }
      return { type: 'LEVEL_INTRO', currentLevel: this.currentLevel, currentRound: this.currentRound }
    }

    if (this.currentRound === 1) {
      // Role Switch for Round 2 of current level
      this.currentRound = 2
      this.switchRoles()
      this.resetRoundState()
      this.phase = 'ROLE_SWITCH'
      return { type: 'ROLE_SWITCH', currentLevel: this.currentLevel, currentRound: this.currentRound }
    } else if (this.currentRound === 2) {
      // Current level complete! Generate Level Summary
      const summary = this.generateLevelSummary()
      this.levelSummaries.push(summary)

      if (this.currentLevel < this.totalLevels) {
        this.currentLevel += 1
        this.currentRound = 1
        this.switchRoles()
        this.resetRoundState()
        this.phase = 'LEVEL_RESULTS'
        return { type: 'LEVEL_RESULTS', summary, nextLevel: this.currentLevel }
      } else {
        // Complete Match Finished!
        this.finalResult = this.generateFinalMatchResult()
        this.phase = 'FINAL_RESULTS'
        return { type: 'FINAL_RESULTS', finalResult: this.finalResult }
      }
    }
  }

  switchRoles() {
    const playerIds = Object.keys(this.playerRoles)
    if (playerIds.length === 2) {
      const p1 = playerIds[0]
      const p2 = playerIds[1]
      const r1 = this.playerRoles[p1]
      this.playerRoles[p1] = this.playerRoles[p2]
      this.playerRoles[p2] = r1
    }
  }

  // Centralized Round Reset
  resetRoundState() {
    this.timeRemainingSec = this.roundDuration
    this.sabotageEnergy = 100
    this.communityCooperation = 45
    this.inventory = []
    this.suspicionLevel = 10
    this.escapeProgress = {
      isEscaping: false,
      progressSec: 0,
      maxSec: 5,
      saboteurId: null,
      isCompleted: false
    }
    this.eventFeed = []

    // Reset dialogue rewards for the new round
    this.rewardedDialogueOptions = new Set()
    this.rewardedSemanticGroups = new Set()

    this.initNPCs()
    this.initNPCWaypoints()
    this.initObjects()
    this.initInformationLog()
    this.initObjectives()
    this.initSaboteurAbilities()

    for (const pid in this.readyStatus) {
      this.readyStatus[pid] = String(pid).startsWith('bot_')
    }
  }

  generateLevelSummary() {
    const levelDef = LEVEL_DEFINITIONS.find((l) => l.level === this.currentLevel) || {
      level: this.currentLevel,
      title: `Level ${this.currentLevel}`,
      location: 'Urban Zone',
      civicTopic: 'Civic Responsibility & Legal Procedures',
      keyTakeaways: ['Civic duty saves lives.']
    }

    const pids = Object.keys(this.players)
    const pA = pids[0]
    const pB = pids[1]

    const round1 = this.roundResults.find((r) => r.level === this.currentLevel && r.round === 1)
    const round2 = this.roundResults.find((r) => r.level === this.currentLevel && r.round === 2)

    let scoreA = 0
    let scoreB = 0
    let playerARunnerScore = 0
    let playerASaboteurScore = 0
    let playerBRunnerScore = 0
    let playerBSaboteurScore = 0

    if (round1) {
      if (round1.runnerId === pA) {
        scoreA += round1.runnerScore
        playerARunnerScore += round1.runnerScore
      } else {
        scoreB += round1.runnerScore
        playerBRunnerScore += round1.runnerScore
      }
      if (round1.saboteurId === pA) {
        scoreA += round1.saboteurScore
        playerASaboteurScore += round1.saboteurScore
      } else {
        scoreB += round1.saboteurScore
        playerBSaboteurScore += round1.saboteurScore
      }
    }
    if (round2) {
      if (round2.runnerId === pA) {
        scoreA += round2.runnerScore
        playerARunnerScore += round2.runnerScore
      } else {
        scoreB += round2.runnerScore
        playerBRunnerScore += round2.runnerScore
      }
      if (round2.saboteurId === pA) {
        scoreA += round2.saboteurScore
        playerASaboteurScore += round2.saboteurScore
      } else {
        scoreB += round2.saboteurScore
        playerBSaboteurScore += round2.saboteurScore
      }
    }

    let winnerId = null
    let winnerName = null
    let isDraw = false
    const margin = Math.abs(scoreA - scoreB)

    const nameA = this.players[pA]?.playerName || 'Player 1'
    const nameB = this.players[pB]?.playerName || 'Player 2'

    if (scoreA > scoreB) {
      winnerId = pA
      winnerName = nameA
    } else if (scoreB > scoreA) {
      winnerId = pB
      winnerName = nameB
    } else {
      isDraw = true
    }

    const winnerText = isDraw
      ? `Level ${this.currentLevel} finished in a hard-fought DRAW (${scoreA} - ${scoreB})!`
      : `🏆 ${winnerName} is declared the WINNER of Level ${this.currentLevel} by +${margin} points!`

    return {
      level: this.currentLevel,
      title: levelDef.title,
      location: levelDef.location,
      civicTopic: levelDef.civicTopic,
      playerAScore: scoreA,
      playerBScore: scoreB,
      playerAName: nameA,
      playerBName: nameB,
      playerARunnerScore,
      playerASaboteurScore,
      playerBRunnerScore,
      playerBSaboteurScore,
      winnerId,
      winnerName,
      isDraw,
      margin,
      winnerText,
      keyTakeaways: levelDef.keyTakeaways
    }
  }

  generateFinalMatchResult() {
    const pids = Object.keys(this.players)
    const pA = this.players[pids[0]]
    const pB = this.players[pids[1]]

    let winnerId = null
    let winnerName = null
    let isDraw = false

    if (pA.totalScore > pB.totalScore) {
      winnerId = pA.playerId
      winnerName = pA.playerName
    } else if (pB.totalScore > pA.totalScore) {
      winnerId = pB.playerId
      winnerName = pB.playerName
    } else {
      isDraw = true
    }

    return {
      winnerId,
      winnerName,
      isDraw,
      playerA: pA,
      playerB: pB,
      roundHistory: this.roundResults,
      totalRoundsPlayed: this.roundResults.length
    }
  }

  // ─────────────────────────────────────────────────────────────
  // READY STATUS & REMATCH
  // ─────────────────────────────────────────────────────────────
  setPlayerReady(playerId, ready = true) {
    if (this.readyStatus[playerId] !== undefined) {
      this.readyStatus[playerId] = ready
    }
    for (const pid in this.readyStatus) {
      if (String(pid).startsWith('bot_')) {
        this.readyStatus[pid] = true
      }
    }
    const allReady = Object.values(this.readyStatus).every(Boolean)
    return { allReady, readyStatus: this.readyStatus }
  }

  voteRematch(playerId) {
    this.rematchVotes[playerId] = true
    for (const pid in this.rematchVotes) {
      if (String(pid).startsWith('bot_')) {
        this.rematchVotes[pid] = true
      }
    }
    const allVoted = Object.values(this.rematchVotes).every(Boolean)
    if (allVoted) {
      this.resetFullMatch()
      return { rematchTriggered: true }
    }
    return { rematchTriggered: false, rematchVotes: this.rematchVotes }
  }

  resetFullMatch() {
    this.currentLevel = 1
    this.currentRound = 1
    this.roundResults = []
    this.levelSummaries = []
    this.finalResult = null
    this.scoreEvents = []
    this.awardedEventKeys.clear()

    for (const pid in this.players) {
      this.players[pid].totalScore = 0
      this.players[pid].runnerScore = 0
      this.players[pid].saboteurScore = 0
      this.players[pid].objectivesCompleted = 0
      this.players[pid].sabotageActionsExecuted = 0
      this.readyStatus[pid] = false
      this.rematchVotes[pid] = false
    }

    const pids = Object.keys(this.players)
    if (pids.length >= 2) {
      this.playerRoles[pids[0]] = 'runner'
      this.playerRoles[pids[1]] = 'saboteur'
    }

    this.resetRoundState()
    this.phase = 'LEVEL_INTRO'
  }

  // ─────────────────────────────────────────────────────────────
  // DISCONNECTION HANDLING & FORFEIT
  // ─────────────────────────────────────────────────────────────
  handlePlayerDisconnect(socketId) {
    if (this.phase === 'ROUND_ACTIVE') {
      this.isPaused = true
      this.pauseRemainingSec = 45
      this.pauseReason = 'A player disconnected. Waiting 45 seconds for reconnection...'
      this.addEventFeedItem('⚠️ Match paused: Player disconnected. 45s grace period active.', 'emergency')
    }
  }

  handlePlayerReconnect(oldId, newId) {
    if (this.players[oldId]) {
      this.players[newId] = { ...this.players[oldId], playerId: newId }
      delete this.players[oldId]

      this.playerRoles[newId] = this.playerRoles[oldId]
      delete this.playerRoles[oldId]

      this.readyStatus[newId] = this.readyStatus[oldId] || false
      delete this.readyStatus[oldId]

      this.rematchVotes[newId] = this.rematchVotes[oldId] || false
      delete this.rematchVotes[oldId]
    }

    if (this.isPaused) {
      this.isPaused = false
      this.pauseRemainingSec = 0
      this.pauseReason = ''
      this.addEventFeedItem('✅ Player reconnected. Match resumed!', 'cooperation')
    }
  }

  handleForfeitOnDisconnect() {
    this.isPaused = false
    const activePlayerIds = Object.keys(this.players)
    const winner = this.players[activePlayerIds[0]]
    if (winner) {
      winner.totalScore += 50 // Forfeit win bonus
    }
    this.finalResult = this.generateFinalMatchResult()
    this.phase = 'FINAL_RESULTS'
    this.addEventFeedItem('🏆 Disconnect grace period expired. Remaining player declared winner by forfeit.', 'emergency')
  }

  // ─────────────────────────────────────────────────────────────
  // SERIALIZABLE TELEMETRY & MATCH STATE
  // ─────────────────────────────────────────────────────────────
  getMatchState(revealedOverride = false) {
    const isHiddenPhase =
      !revealedOverride &&
      this.phase !== 'VERDICT_REVEAL' &&
      this.phase !== 'ROUND_RESULTS' &&
      this.phase !== 'LEVEL_RESULTS' &&
      this.phase !== 'FINAL_RESULTS'

    return {
      roomId: this.roomCode,
      phase: this.phase,
      currentLevel: this.currentLevel,
      currentRound: this.currentRound,
      totalLevels: this.totalLevels,
      roundsPerLevel: this.roundsPerLevel,
      totalRounds: this.totalRounds,
      roundDuration: this.roundDuration,
      roundStartedAt: null,
      roundEndsAt: null,
      timeRemainingSec: this.timeRemainingSec,
      accusationTimeRemainingSec: this.accusationTimeRemainingSec,
      pausedRemainingSec: this.pauseRemainingSec,
      isPaused: this.isPaused,
      pauseReason: this.pauseReason,
      // Milestone 6: Strip role-specific score data from players during hidden phases
      // to prevent opponents from inferring roles from score breakdowns.
      players: isHiddenPhase
        ? Object.fromEntries(
            Object.entries(this.players).map(([id, p]) => [id, {
              playerId: p.playerId,
              playerName: p.playerName,
              totalScore: p.totalScore,
              objectivesCompleted: p.objectivesCompleted,
              civicAchievements: p.civicAchievements,
              ready: p.ready
              // runnerScore, saboteurScore intentionally omitted during hidden phase
            }])
          )
        : this.players,
      // Milestone 6: Hide player roles during active gameplay and sealed accusation
      playerRoles: isHiddenPhase ? {} : this.playerRoles,
      roundResults: this.roundResults,
      levelSummaries: this.levelSummaries,
      finalResult: this.finalResult,
      readyStatus: this.readyStatus,
      rematchVotes: this.rematchVotes,
      environmentalState: this.environmentalState,
      latestVerdictReveal: this.latestVerdictReveal,
      latestCivicDebrief: this.latestCivicDebrief
    }
  }

  getTelemetryForPlayer(playerId, role) {
    const isRunner = role === 'runner'
    return {
      timeRemainingSec: this.timeRemainingSec,
      accusationTimeRemainingSec: this.accusationTimeRemainingSec,
      assignedRole: role,
      tasks: isRunner ? this.runnerTasks : this.saboteurTasks,
      sabotageEnergy: isRunner ? undefined : this.sabotageEnergy,
      saboteurAbilities: isRunner ? undefined : this.saboteurAbilities,
      environmentalState: this.environmentalState,
      availableEvidence: this.getEvidenceCardsForPlayer(role),
      availableDefenseNarratives: isRunner ? undefined : this.getDefenseNarratives(),
      communityCooperation: (() => {
        const npcCoopValues = Object.values(this.npcs).map((n) => n.cooperation || 50)
        return npcCoopValues.length > 0
          ? Math.round(npcCoopValues.reduce((a, b) => a + b, 0) / npcCoopValues.length)
          : 50
      })(),
      inventory: this.inventory,
      suspicionLevel: isRunner ? undefined : this.suspicionLevel,
      escapeProgress: this.escapeProgress,
      eventFeed: this.eventFeed,
      phase: this.phase,
      currentLevel: this.currentLevel,
      currentRound: this.currentRound,
      // Milestone 2/3 compatibility fields
      runnerObjectives: this.runnerObjectives,
      saboteurObjectives: isRunner ? undefined : this.saboteurObjectives
    }
  }

  getTelemetry() {
    // Public telemetry: MUST NOT contain private saboteur data.
    // Use getTelemetryForPlayer() when a role is known.
    // Only shared/public fields are returned here.
    const npcCoopValues = Object.values(this.npcs).map((n) => n.cooperation || 50)
    const communityCooperation = npcCoopValues.length > 0
      ? Math.round(npcCoopValues.reduce((a, b) => a + b, 0) / npcCoopValues.length)
      : 50

    return {
      timeRemainingSec: this.timeRemainingSec,
      accusationTimeRemainingSec: this.accusationTimeRemainingSec,
      // NOTE: runnerObjectives and saboteurObjectives are intentionally OMITTED
      // from the public telemetry to prevent role information leakage.
      // Use getTelemetryForPlayer(playerId, role) for per-player private data.
      communityCooperation,
      environmentalState: this.environmentalState,
      eventFeed: this.eventFeed,
      phase: this.phase,
      currentLevel: this.currentLevel,
      currentRound: this.currentRound
    }
  }

  destroy() {
    // Cleanup if needed
  }
}
