import { ABILITIES } from '../data/abilities.ts'
import { BALANCE } from '../config/constants.ts'
import type { AbilityId } from '../types.ts'

/** Energy, cooldowns, per-round caps and locks for the Barrier. No effects live here. */
export class BarrierSystem {
  energy: number
  private cooldownUntil = new Map<AbilityId, number>()
  private lockedUntil = new Map<AbilityId, number>()
  private uses = new Map<AbilityId, number>()
  private permaLocked = new Set<AbilityId>()

  readonly available: AbilityId[]

  constructor(available: AbilityId[], startEnergy: number) {
    this.available = available
    this.energy = startEnergy
  }

  update(dt: number) {
    this.energy = Math.min(BALANCE.barrierEnergyMax, this.energy + BALANCE.barrierEnergyRegen * dt)
  }

  addEnergy(n: number) {
    this.energy = Math.min(BALANCE.barrierEnergyMax, this.energy + n)
  }

  lock(id: AbilityId, until: number) {
    this.lockedUntil.set(id, Math.max(until, this.lockedUntil.get(id) ?? 0))
  }

  lockForever(id: AbilityId) {
    this.permaLocked.add(id)
  }

  /** Lock the most expensive ability that is currently usable (an ally blocks one ability). */
  lockStrongest(now: number, seconds: number): AbilityId | null {
    const pick = this.available
      .filter((id) => !ABILITIES[id].free && !this.isLocked(id, now))
      .sort((a, b) => ABILITIES[b].cost - ABILITIES[a].cost)[0]
    if (pick) this.lock(pick, now + seconds)
    return pick ?? null
  }

  isLocked(id: AbilityId, now: number) {
    return this.permaLocked.has(id) || (this.lockedUntil.get(id) ?? 0) > now
  }

  usesLeft(id: AbilityId) {
    return id === 'flicker' ? 1 - (this.uses.get(id) ?? 0) : BALANCE.maxUsesPerAbility - (this.uses.get(id) ?? 0)
  }

  cooldownLeft(id: AbilityId, now: number) {
    return Math.max(0, (this.cooldownUntil.get(id) ?? 0) - now)
  }

  /** Reason the ability cannot be used right now, or null if it is ready. */
  blockedReason(id: AbilityId, now: number): string | null {
    const def = ABILITIES[id]
    if (!this.available.includes(id)) return 'Not available this level'
    if (this.isLocked(id, now)) return 'Locked by an ally'
    if (this.usesLeft(id) <= 0) return 'No uses left'
    if (this.cooldownLeft(id, now) > 0) return 'Cooling down'
    if (this.energy < def.cost) return 'Not enough energy'
    return null
  }

  spend(id: AbilityId, now: number) {
    const def = ABILITIES[id]
    this.energy -= def.cost
    this.uses.set(id, (this.uses.get(id) ?? 0) + 1)
    this.cooldownUntil.set(id, now + def.cooldown)
  }
}
