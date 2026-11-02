import type { 
  LevelConfig, 
  WitnessNPC, 
  PlayerState, 
  Role 
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

/**
 * Highly Active Saboteur Bot AI:
 * - Aggressively tracks down wavering witnesses
 * - Visibly whispers misconceptions with speech bubbles
 * - Stumbles cones and creates loud distractions
 * - Runs away if Rescuer approaches
 */
export function updateSaboteurBot(
  saboteur: PlayerState,
  rescuer: PlayerState,
  witnesses: WitnessNPC[],
  level: LevelConfig,
  timeRemainingSec: number,
  placedConesCount: number
): BotAction | null {
  if (saboteur.isCalledOut) {
    return null // currently stunned
  }

  // 1. If Rescuer is very close (< 90px), PANIC & FLEE away from rescuer to avoid exposure!
  const distToRescuer = distance(saboteur.x, saboteur.y, rescuer.x, rescuer.y)
  if (distToRescuer < 95 && !saboteur.hasEscaped) {
    const fleeX = saboteur.x + (saboteur.x - rescuer.x) * 1.5
    const fleeY = saboteur.y + (saboteur.y - rescuer.y) * 1.5
    return {
      type: 'move',
      targetX: Math.max(60, Math.min(level.mapWidth - 60, fleeX)),
      targetY: Math.max(60, Math.min(level.mapHeight - 60, fleeY)),
      shoutText: 'Stay back!'
    }
  }

  // 2. If under 60 seconds left, head towards exit to Slip Away
  if (timeRemainingSec < 60 && !saboteur.hasEscaped) {
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

  // 3. If there are placed traffic cones and Saboteur has energy, go kick/shift a cone!
  if (placedConesCount > 0 && Math.random() < 0.25 && saboteur.influence >= 15) {
    return {
      type: 'shift',
      targetX: 840,
      targetY: 480,
      shoutText: 'Out of my way!'
    }
  }

  // 4. If Rescuer is talking to someone nearby and Saboteur has distractions, drop a distraction!
  if (distToRescuer < 180 && saboteur.distractionsRemaining > 0 && saboteur.influence >= 25 && Math.random() < 0.3) {
    return {
      type: 'distract',
      shoutText: '*DROPS NOISY CRATE!*'
    }
  }

  // 5. Hunt down witnesses to whisper myths
  // Priority: Tasked NPCs > Willing NPCs > Wavering NPCs
  let bestTarget: WitnessNPC | null = null
  let bestScore = -999

  for (const w of witnesses) {
    if (w.resoluteTimer && w.resoluteTimer > 0) continue // protected by law facts
    if (w.status === 'silent') continue // already convinced to stay silent

    let score = 0
    if (w.status === 'tasked') score += 100 // High priority: break their active mission!
    if (w.status === 'willing') score += 70
    if (w.status === 'wavering') score += 40

    // Distance penalty
    const dist = distance(saboteur.x, saboteur.y, w.x, w.y)
    score -= dist * 0.15

    if (score > bestScore) {
      bestScore = score
      bestTarget = w
    }
  }

  if (bestTarget) {
    const distToTarget = distance(saboteur.x, saboteur.y, bestTarget.x, bestTarget.y)
    
    // Within whispering range!
    if (distToTarget <= 75 && saboteur.influence >= 20 && saboteur.whispersRemaining > 0) {
      const activeConcern = bestTarget.concerns[bestTarget.activeConcernIndex]
      const matchingMyth = MYTH_CARDS.find(
        (m) => m.level === level.id && m.matchingConcern === activeConcern
      ) || MYTH_CARDS.find((m) => m.level === level.id)

      if (matchingMyth) {
        return {
          type: 'whisper',
          targetWitnessId: bestTarget.id,
          mythCardId: matchingMyth.id,
          shoutText: matchingMyth.whisperText.slice(0, 36) + '...'
        }
      }
    } else {
      // Walk towards the target aggressively
      return {
        type: 'move',
        targetX: bestTarget.x + (Math.random() * 20 - 10),
        targetY: bestTarget.y + (Math.random() * 20 - 10)
      }
    }
  }

  // Roam near center
  return {
    type: 'move',
    targetX: level.mapWidth / 2 + Math.sin(Date.now() * 0.002) * 200,
    targetY: level.mapHeight / 2 + Math.cos(Date.now() * 0.002) * 120
  }
}

/**
 * Intelligent Rescuer Bot AI (for solo Saboteur mode)
 */
export function updateRescuerBot(
  rescuer: PlayerState,
  witnesses: WitnessNPC[],
  level: LevelConfig
): BotAction | null {
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
  const unpersuaded = witnesses.find((w) => w.hesitation > 30 && (!w.annoyedTimer || w.annoyedTimer <= 0))
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
