import type { 
  LevelConfig, 
  WitnessNPC, 
  PlayerState
} from '../types.ts'
import { distance } from './physics.ts'
import { MYTH_CARDS } from '../data/myths.ts'

export interface BotAction {
  type: 'move' | 'whisper' | 'distract' | 'shift' | 'talk' | 'place_cone' | 'call_112'
  targetX?: number
  targetY?: number
  targetWitnessId?: string
  mythCardId?: string
  factCardId?: string
  shoutText?: string
}

export type BotDifficulty = 'easy' | 'normal' | 'hard'

/**
 * Difficulty profiles. The numeric knobs mirror server/balance.js -> bots
 * (reactionSec, errorRate, heatCaution, wasteRate) so the offline bot and the
 * authoritative server bot feel the same at each level. Keep them in sync.
 *
 * - actEverySec:  minimum gap between "special" actions (whisper / distract / shift)
 * - moveSkip:     chance to hesitate on a movement tick (slower, less precise bot)
 * - errorRate:    chance to pick a poor target / do something pointless
 * - heatCaution:  the bot lays low when its own `exposure` reaches this value
 * - fleeRadius:   how close the Rescuer can get before the Saboteur bolts
 */
export const BOT_DIFFICULTY: Record<BotDifficulty, {
  actEverySec: number
  moveSkip: number
  errorRate: number
  heatCaution: number
  fleeRadius: number
  smartTargeting: boolean
  rescuerSkill: number
}> = {
  easy:   { actEverySec: 12, moveSkip: 0.35, errorRate: 0.30, heatCaution: 78, fleeRadius: 80,  smartTargeting: false, rescuerSkill: 0.55 },
  normal: { actEverySec: 9,  moveSkip: 0.12, errorRate: 0.14, heatCaution: 77, fleeRadius: 95,  smartTargeting: true,  rescuerSkill: 0.8 },
  hard:   { actEverySec: 8,  moveSkip: 0.0,  errorRate: 0.04, heatCaution: 75, fleeRadius: 120, smartTargeting: true,  rescuerSkill: 1.0 }
}

// Light per-round memory (the store calls the bot once per second).
const memory = { lastSpecialAt: Infinity, lastTime: Infinity }

function newRoundCheck(timeRemainingSec: number) {
  // Clock counts down; a larger value than last time means a new round started.
  if (timeRemainingSec > memory.lastTime) memory.lastSpecialAt = Infinity
  memory.lastTime = timeRemainingSec
}

function specialReady(timeRemainingSec: number, cfg: { actEverySec: number }): boolean {
  return memory.lastSpecialAt === Infinity || memory.lastSpecialAt - timeRemainingSec >= cfg.actEverySec
}

function markSpecial(timeRemainingSec: number) {
  memory.lastSpecialAt = timeRemainingSec
}

/**
 * Saboteur Bot AI (easy / normal / hard):
 * - Watches its own exposure (heat) and lays low when it climbs past the level's caution line
 * - Throttles whisper / distract / shift so it cannot spam abilities
 * - Hunts high-value witnesses (smart targeting) or wanders to a random one (easy)
 * - Flees the Rescuer, and slips away when time is nearly up and exposure is manageable
 */
export function updateSaboteurBot(
  saboteur: PlayerState,
  rescuer: PlayerState,
  witnesses: WitnessNPC[],
  level: LevelConfig,
  timeRemainingSec: number,
  placedConesCount: number,
  difficulty: BotDifficulty = 'normal'
): BotAction | null {
  const cfg = BOT_DIFFICULTY[difficulty]
  newRoundCheck(timeRemainingSec)

  if (saboteur.isCalledOut) {
    return null // currently stunned
  }

  // Easy bots sometimes just stand there.
  if (Math.random() < cfg.moveSkip) {
    return null
  }

  const exposure = saboteur.exposure ?? 0
  const distToRescuer = distance(saboteur.x, saboteur.y, rescuer.x, rescuer.y)

  // 1. Rescuer too close: flee to avoid being exposed
  if (distToRescuer < cfg.fleeRadius && !saboteur.hasEscaped) {
    const fleeX = saboteur.x + (saboteur.x - rescuer.x) * 1.5
    const fleeY = saboteur.y + (saboteur.y - rescuer.y) * 1.5
    return {
      type: 'move',
      targetX: Math.max(60, Math.min(level.mapWidth - 60, fleeX)),
      targetY: Math.max(60, Math.min(level.mapHeight - 60, fleeY)),
      shoutText: 'Stay back!'
    }
  }

  // 2. Final minute: slip away. Hard bots go earlier if they are already hot.
  const escapeAt = difficulty === 'hard' && exposure >= cfg.heatCaution ? 90 : 60
  if (timeRemainingSec < escapeAt && !saboteur.hasEscaped) {
    const distToExit = distance(saboteur.x, saboteur.y, level.exitPos.x, level.exitPos.y)
    if (distToExit > 60) {
      return {
        type: 'move',
        targetX: level.exitPos.x,
        targetY: level.exitPos.y,
        shoutText: 'I am getting out of here!'
      }
    }
  }

  // 3. Too hot: lay low near the middle of the map instead of acting.
  const layLow = exposure >= cfg.heatCaution && timeRemainingSec > 40
  if (layLow) {
    return {
      type: 'move',
      targetX: level.mapWidth / 2 + Math.sin(timeRemainingSec * 0.4) * 160,
      targetY: level.mapHeight / 2 + Math.cos(timeRemainingSec * 0.4) * 100
    }
  }

  const canAct = specialReady(timeRemainingSec, cfg)

  // 4. Kick a placed cone (cheap, low-risk disruption)
  if (canAct && placedConesCount > 0 && saboteur.influence >= 15 && Math.random() < 0.35) {
    markSpecial(timeRemainingSec)
    return {
      type: 'shift',
      targetX: 840,
      targetY: 480,
      shoutText: 'Out of my way!'
    }
  }

  // 5. Loud distraction only when the Rescuer is close enough to be hurt by it
  if (canAct && distToRescuer < 180 && saboteur.distractionsRemaining > 0 && saboteur.influence >= 25 && Math.random() < 0.4) {
    markSpecial(timeRemainingSec)
    return {
      type: 'distract',
      shoutText: '*DROPS NOISY CRATE!*'
    }
  }

  // 6. Pick a witness to whisper to
  let bestTarget: WitnessNPC | null = null
  let bestScore = -999
  const pool = witnesses.filter((w) => !(w.resoluteTimer && w.resoluteTimer > 0) && w.status !== 'silent')

  if (Math.random() < cfg.errorRate && pool.length > 0) {
    bestTarget = pool[Math.floor(Math.random() * pool.length)]
  } else {
    for (const w of pool) {
      let score = 0
      if (cfg.smartTargeting) {
        // Prefer breaking an active mission, then willing witnesses, then wavering ones.
        if (w.status === 'tasked') score += 100
        if (w.status === 'willing') score += 70
        if (w.status === 'wavering') score += 40
        // Stay away from the Rescuer: a whisper in her line of sight is risky.
        const rd = distance(rescuer.x, rescuer.y, w.x, w.y)
        if (rd < 120) score -= 45
      } else {
        score = 50
      }
      score -= distance(saboteur.x, saboteur.y, w.x, w.y) * 0.15
      if (score > bestScore) {
        bestScore = score
        bestTarget = w
      }
    }
  }

  if (bestTarget) {
    const distToTarget = distance(saboteur.x, saboteur.y, bestTarget.x, bestTarget.y)

    if (distToTarget <= 75) {
      if (canAct && saboteur.influence >= 20 && saboteur.whispersRemaining > 0) {
        const activeConcern = bestTarget.concerns[bestTarget.activeConcernIndex]
        const matchingMyth = MYTH_CARDS.find(
          (m) => m.level === level.id && m.matchingConcern === activeConcern
        ) || MYTH_CARDS.find((m) => m.level === level.id)

        if (matchingMyth) {
          markSpecial(timeRemainingSec)
          return {
            type: 'whisper',
            targetWitnessId: bestTarget.id,
            mythCardId: matchingMyth.id,
            shoutText: matchingMyth.whisperText.slice(0, 36) + '...'
          }
        }
      }
      // In range but cooling down: loiter nearby instead of spamming.
      return {
        type: 'move',
        targetX: bestTarget.x + 30,
        targetY: bestTarget.y + 20
      }
    }

    // Walk towards the target
    return {
      type: 'move',
      targetX: bestTarget.x + (Math.random() * 20 - 10),
      targetY: bestTarget.y + (Math.random() * 20 - 10)
    }
  }

  // Roam near center
  return {
    type: 'move',
    targetX: level.mapWidth / 2 + Math.sin(timeRemainingSec * 0.4) * 200,
    targetY: level.mapHeight / 2 + Math.cos(timeRemainingSec * 0.4) * 120
  }
}

/**
 * Rescuer Bot AI (for solo Saboteur mode). Skill scales speed and accuracy:
 * easy bots dawdle and sometimes chase the wrong witness; hard bots go
 * straight for the most hesitant witness.
 */
export function updateRescuerBot(
  rescuer: PlayerState,
  witnesses: WitnessNPC[],
  level: LevelConfig,
  difficulty: BotDifficulty = 'normal'
): BotAction | null {
  const cfg = BOT_DIFFICULTY[difficulty]

  // Slower bots hesitate on some ticks.
  if (Math.random() > cfg.rescuerSkill) {
    return null
  }

  // Assess victim
  const chainStep1 = level.rescueChain[0]
  if (!chainStep1.completed) {
    const distToVictim = distance(rescuer.x, rescuer.y, level.victimPos.x, level.victimPos.y)
    if (distToVictim > 60) {
      return {
        type: 'move',
        targetX: level.victimPos.x,
        targetY: level.victimPos.y
      }
    } else {
      return { type: 'talk', targetWitnessId: 'victim' }
    }
  }

  // Find unpersuaded witnesses
  const open = witnesses.filter((w) => w.hesitation > 30 && (!w.annoyedTimer || w.annoyedTimer <= 0))
  let unpersuaded: WitnessNPC | undefined
  if (open.length > 0) {
    if (Math.random() < cfg.errorRate) {
      unpersuaded = open[Math.floor(Math.random() * open.length)]
    } else if (cfg.smartTargeting) {
      unpersuaded = open.slice().sort((a, b) => b.hesitation - a.hesitation)[0]
    } else {
      unpersuaded = open[0]
    }
  }
  if (unpersuaded) {
    const dist = distance(rescuer.x, rescuer.y, unpersuaded.x, unpersuaded.y)
    if (dist > 60) {
      return {
        type: 'move',
        targetX: unpersuaded.x,
        targetY: unpersuaded.y
      }
    } else {
      return {
        type: 'talk',
        targetWitnessId: unpersuaded.id
      }
    }
  }

  // Deploy cones
  if (rescuer.conesRemaining > 0 && level.id === 1) {
    const targetX = 720 + (3 - rescuer.conesRemaining) * 60
    const targetY = 470
    return {
      type: 'move',
      targetX,
      targetY
    }
  }

  return {
    type: 'move',
    targetX: level.victimPos.x + 80,
    targetY: level.victimPos.y + 30
  }
}
