import { BAR_Y, HUD_H, TILE, W } from '../config/constants.ts'
import type { LevelScene } from '../scenes/LevelScene.ts'
import type { AbilityId } from '../types.ts'

interface QueuedAction {
  id: AbilityId
  x: number
  y: number
  aimTime: number
  postDelay: number
}

interface AbilityScore {
  id: AbilityId
  x: number
  y: number
  weight: number
  comboFollowUp?: AbilityId
}

const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by)

/**
 * Competitive Human-Like Barrier AI for Solo Play in Circle of Allies.
 *
 * Implements real human-player psychology, micro-actions, and tactical execution:
 *  1. REAL-TIME CURSOR DYNAMICS: Constantly glides, stalks, shadows Priya, feints toward
 *     upcoming gates/lamps, and hovers menacingly around her when isolation is high.
 *  2. TACTICAL COMBOS: Chains complementary abilities with human-like rapid delays (e.g.
 *     Isolate -> Lights Out -> Close Way, or Decoy -> Flicker Bluff, or Crowd -> Drain).
 *  3. A* ROUTE FORECASTING: Pathfinds Priya's exact route to the goal and slams gates shut
 *     ahead of her just before she reaches them.
 *  4. KILL INSTINCT (VULNERABILITY CAPITALIZATION):
 *     - If isolation > 40%, enters Hunter Mode: speeds up reactions to push isolation to 100%.
 *     - If Priya stops to interact (repair lamp, help Kavya, check sign), ambushes her instantly.
 *     - If battery < 30%, ruthlessly siphons remaining battery with Drain to kill her phone.
 *     - If Priya heads into Danger Zones or Shortcuts, locks her in.
 *  5. RESOURCE & BLUFF MANAGEMENT: Conserves energy for high-impact moments, uses free
 *     Flicker Bluff to induce panic and hesitation, and denies Safe Zones.
 */
export class BarrierAI {
  private host: LevelScene

  // ── Action Queue & Timing ──────────────────────────────────────────────────
  private actionQueue: QueuedAction[] = []
  private currentAction: QueuedAction | null = null
  private thinkCooldown = 2.0
  private actionTimer = 0

  // ── Human-like Cursor Movement ─────────────────────────────────────────────
  private stalkOffsetAngle = Math.random() * Math.PI * 2
  private scoutTimer = 0
  private scoutPoint: { x: number; y: number } | null = null
  private cursorNoisePhase = Math.random() * 10

  // ── Memory & Telemetry ─────────────────────────────────────────────────────
  private lastPx = 0
  private lastPy = 0
  private priyaStationaryTime = 0
  private lastIsolateAt = -99
  private lastDrainAt = -99
  private lastFakeMsgAt = -99
  private lastFlickerAt = -99

  constructor(host: LevelScene) {
    this.host = host
    this.lastPx = host.px
    this.lastPy = host.py
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Main Frame Update (Called every game tick)
  // ═══════════════════════════════════════════════════════════════════════════

  update(dt: number) {
    const h = this.host
    if (h.run.ended) return

    // Track Priya's movement dynamics (detect if she's stationary or interacting)
    const priyaMoved = dist(h.px, h.py, this.lastPx, this.lastPy)
    if (priyaMoved < 0.8) {
      this.priyaStationaryTime += dt
    } else {
      this.priyaStationaryTime = 0
    }
    this.lastPx = h.px
    this.lastPy = h.py

    // ── 1. Process Active Action Queue ───────────────────────────────────────
    if (this.currentAction) {
      this.actionTimer -= dt

      // Smoothly steer cursor toward the action's target with natural human ease
      const easeSpeed = Math.min(1, dt * 10)
      h.aim.x = Phaser.Math.Linear(h.aim.x, this.currentAction.x, easeSpeed)
      h.aim.y = Phaser.Math.Linear(h.aim.y, this.currentAction.y, easeSpeed)

      if (this.actionTimer <= 0) {
        // Snap cursor to exact target right on trigger to prevent sub-pixel misses
        h.cursor.x = this.currentAction.x
        h.cursor.y = this.currentAction.y
        h.aim.x = this.currentAction.x
        h.aim.y = this.currentAction.y

        // Execute ability
        h.useAbility(this.currentAction.id)

        const postDelay = this.currentAction.postDelay
        this.currentAction = null

        // Advance to next queued action in combo, or resume think cooldown
        if (this.actionQueue.length > 0) {
          const next = this.actionQueue.shift()!
          this.currentAction = next
          this.actionTimer = next.aimTime
        } else {
          this.thinkCooldown = Math.max(0.2, postDelay)
        }
      }
      return
    }

    // ── 2. Natural Ambient Cursor Behavior (Stalking, Scouting, Feinting) ───
    this.updateAmbientCursor(dt)

    // ── 3. Decision Cycle ────────────────────────────────────────────────────
    this.thinkCooldown -= dt

    // Reactive Trigger: If Priya is stationary interacting, instantly break idle to punish!
    const isInteracting = this.priyaStationaryTime > 0.45 && this.isPriyaNearInteractable()
    if (isInteracting && this.thinkCooldown > 0.4) {
      this.thinkCooldown = 0.15
    }

    if (this.thinkCooldown <= 0) {
      this.think()
      this.resetThinkInterval()
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Ambient Cursor Simulation (Simulates an active, competitive human mouse)
  // ═══════════════════════════════════════════════════════════════════════════

  private updateAmbientCursor(dt: number) {
    const h = this.host
    const { px, py, now } = h
    this.cursorNoisePhase += dt * 3

    // Periodic scouting: look ahead at the next gate or corner
    this.scoutTimer -= dt
    if (this.scoutTimer <= 0) {
      this.scoutTimer = 2.0 + Math.random() * 2.5
      this.scoutPoint = this.findScoutPoint()
    }

    let targetX = px
    let targetY = py

    const isolation = h.run.isolation
    const distGoal = this.distToGoal()

    if (this.scoutPoint && Math.random() < 0.4) {
      // Hovering around an upcoming choke point or gate to anticipate her
      targetX = this.scoutPoint.x
      targetY = this.scoutPoint.y
    } else if (isolation > 50) {
      // Hunter Mode: Intimidating close orbit around Priya
      this.stalkOffsetAngle += dt * 3.5
      const orbitRadius = 45 + Math.sin(this.cursorNoisePhase * 1.5) * 12
      targetX = px + Math.cos(this.stalkOffsetAngle) * orbitRadius
      targetY = py + Math.sin(this.stalkOffsetAngle) * orbitRadius
    } else if (distGoal < 260) {
      // Goal Blocking: Hover between Priya and the exit
      const [gc, gr, gw, gh] = h.world.data.goal
      const gx = (gc + gw / 2) * TILE
      const gy = (gr + gh / 2) * TILE
      targetX = (px + gx) / 2 + Math.sin(now * 2) * 20
      targetY = (py + gy) / 2 + Math.cos(now * 2.3) * 15
    } else {
      // Natural Shadowing: Lurk 65-100px ahead in the direction Priya is traveling
      const vel = this.getPriyaVelocity()
      const forwardDistance = 75
      this.stalkOffsetAngle += dt * 1.2
      const jitterX = Math.sin(this.cursorNoisePhase) * 18
      const jitterY = Math.cos(this.cursorNoisePhase * 1.2) * 14

      targetX = px + vel.x * forwardDistance + Math.cos(this.stalkOffsetAngle) * 35 + jitterX
      targetY = py + vel.y * forwardDistance + Math.sin(this.stalkOffsetAngle) * 35 + jitterY
    }

    // Clamp to valid screen bounds
    targetX = Phaser.Math.Clamp(targetX, 30, W - 30)
    targetY = Phaser.Math.Clamp(targetY, HUD_H + 20, BAR_Y - 20)

    // Smooth human mouse movement
    const followSpeed = Math.min(1, dt * 5.5)
    h.aim.x = Phaser.Math.Linear(h.aim.x, targetX, followSpeed)
    h.aim.y = Phaser.Math.Linear(h.aim.y, targetY, followSpeed)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Core AI Decision Making
  // ═══════════════════════════════════════════════════════════════════════════

  private think() {
    const h = this.host
    const { px, py, now } = h

    if (h.run.ended) return

    const ok = (id: AbilityId) => h.barrier.blockedReason(id, now) === null
    const hidden = this.priyaInSafeZone()
    const isolation = h.run.isolation
    const battery = h.run.battery
    const progress = h.world.progress(px, py)
    const allyCount = h.followers().length
    const isLit = this.priyaIsWellLit()
    const distGoal = this.distToGoal()
    const inDanger = h.world.inAny(px, py, h.world.data.dangerZones)

    // If Priya is safe in a zone and isolation is not threatening, don't waste abilities
    if (hidden && isolation < 15 && battery < 90) {
      return
    }

    // ── TACTICAL COMBO 1: "TOTAL BLACKOUT TRAP" ──────────────────────────────
    // When Priya has allies and is lit: sever allies with Isolate, kill the lamp,
    // and slam the gate ahead. Devastating spike in isolation!
    if (ok('isolate') && allyCount >= 1 && now - this.lastIsolateAt > 15 && ok('lightsOut') && isLit) {
      const litLamp = this.findBestLampToKill()
      if (litLamp) {
        this.lastIsolateAt = now

        const combo: QueuedAction[] = [
          { id: 'isolate', x: px, y: py, aimTime: 0.25, postDelay: 0.2 },
          { id: 'lightsOut', x: litLamp.x, y: litLamp.y, aimTime: 0.3, postDelay: 0.25 },
        ]

        // Follow up with gate closure if available
        if (ok('closeWay')) {
          const aheadGate = this.findGateOnPriyaPath(100, 420)
          if (aheadGate) {
            combo.push({
              id: 'closeWay',
              x: aheadGate.x + aheadGate.w / 2,
              y: aheadGate.y + aheadGate.h / 2,
              aimTime: 0.35,
              postDelay: 0.3,
            })
          }
        }

        this.startCombo(combo)
        return
      }
    }

    // ── TACTICAL COMBO 2: "THE AMBUSH ON INTERACTION" ────────────────────────
    // If Priya stops to repair a lamp, help Kavya, or check a sign, punish her!
    if (this.priyaStationaryTime > 0.4 && this.isPriyaNearInteractable()) {
      const combo: QueuedAction[] = []

      // Shut the nearest gate so she can't easily escape after finishing
      if (ok('closeWay')) {
        const exitGate = this.findNearestGate(px, py, 280)
        if (exitGate) {
          combo.push({
            id: 'closeWay',
            x: exitGate.x + exitGate.w / 2,
            y: exitGate.y + exitGate.h / 2,
            aimTime: 0.28,
            postDelay: 0.2,
          })
        }
      }

      // Hit her with Drain while she cannot move
      if (ok('drain') && !hidden && battery > 15) {
        combo.push({ id: 'drain', x: px, y: py, aimTime: 0.25, postDelay: 0.2 })
      }

      if (combo.length > 0) {
        this.startCombo(combo)
        return
      }
    }

    // ── TACTICAL COMBO 3: "FALSE TRAIL & CHOKE" ──────────────────────────────
    // Misdirect with Decoy sign and immediately close or flicker the real path!
    if (ok('decoy') && (ok('closeWay') || ok('flicker')) && progress > 0.2 && progress < 0.75) {
      const unverifiedSign = h.signs.find((s) => !s.fake && !s.verified && dist(s.x, s.y, px, py) < 450)
      const gateAhead = this.findGateOnPriyaPath(120, 380)

      if (unverifiedSign && gateAhead) {
        const combo: QueuedAction[] = [
          { id: 'decoy', x: unverifiedSign.x, y: unverifiedSign.y, aimTime: 0.3, postDelay: 0.25 },
        ]
        if (ok('closeWay')) {
          combo.push({
            id: 'closeWay',
            x: gateAhead.x + gateAhead.w / 2,
            y: gateAhead.y + gateAhead.h / 2,
            aimTime: 0.32,
            postDelay: 0.3,
          })
        } else if (ok('flicker')) {
          combo.push({
            id: 'flicker',
            x: gateAhead.x + gateAhead.w / 2,
            y: gateAhead.y + gateAhead.h / 2,
            aimTime: 0.3,
            postDelay: 0.2,
          })
        }
        this.startCombo(combo)
        return
      }
    }

    // ── TACTICAL COMBO 4: "CROWD DISPERSAL & SIPHON" ─────────────────────────
    // Scatter the crowd in Level 2 / crowded areas, then siphon battery
    if (ok('crowd') && ok('drain') && !hidden) {
      const crowdNear = h.crowd.filter((n) => dist(n.crew.x, n.crew.y, px, py) < 170)
      if (crowdNear.length >= 2 && battery > 25) {
        this.startCombo([
          { id: 'crowd', x: px, y: py, aimTime: 0.25, postDelay: 0.2 },
          { id: 'drain', x: px, y: py, aimTime: 0.25, postDelay: 0.25 },
        ])
        return
      }
    }

    // ── SINGLE ACTION EVALUATION & SCORING ───────────────────────────────────
    const scores: AbilityScore[] = []

    // 1. ISOLATE: High value whenever Priya relies on allies
    if (ok('isolate') && allyCount >= 1) {
      let w = 3.5 + allyCount * 1.5
      if (isolation > 35) w += 3.0 // Finisher bonus
      if (inDanger) w += 2.5
      if (progress > 0.65) w += 3.0
      scores.push({ id: 'isolate', x: px, y: py, weight: w })
    }

    // 2. CLOSE THE WAY: Predictive route closure right ahead of her
    if (ok('closeWay')) {
      const targetGate = this.findGateOnPriyaPath(90, 420) ?? this.findNearestGate(px, py, 350)
      if (targetGate) {
        const cx = targetGate.x + targetGate.w / 2
        const cy = targetGate.y + targetGate.h / 2
        let w = 4.0
        if (progress > 0.6) w += 2.5
        if (distGoal < 300) w += 3.5 // Deny goal entrance
        if (targetGate.def.shortcut) w += 2.0 // Shut down dark shortcuts
        scores.push({ id: 'closeWay', x: cx, y: cy, weight: w })
      }
    }

    // 3. LIGHTS OUT: Extinguish streetlights to trigger isolation rise
    if (ok('lightsOut') && isLit) {
      const lamp = this.findBestLampToKill()
      if (lamp) {
        let w = 3.8
        if (isolation > 30) w += 2.5 // Push her into crisis
        if (allyCount === 0) w += 2.0 // Without allies, darkness is lethal
        if (inDanger) w += 3.0
        scores.push({ id: 'lightsOut', x: lamp.x, y: lamp.y, weight: w })
      }
    }

    // 4. DRAIN: Attack phone battery (disables flashlight, calls, sharing)
    if (ok('drain') && !hidden && battery > 5 && now - this.lastDrainAt > 10) {
      let w = 2.0
      if (battery < 35) w += 3.5 // Execute: put phone into dead state
      if (h.run.flashlight) w += 1.5 // Counter active flashlight
      scores.push({ id: 'drain', x: px, y: py, weight: w })
    }

    // 5. FAKE MESSAGE: Mental tax & delay during movement
    if (ok('fakeMsg') && !hidden && battery > 0 && now - this.lastFakeMsgAt > 16) {
      let w = 2.2
      if (progress > 0.3 && progress < 0.75) w += 1.8 // Interrupt mid-run
      if (h.def.id === 3) w += 1.0 // Code call in L3 is high stakes
      scores.push({ id: 'fakeMsg', x: px, y: py, weight: w })
    }

    // 6. DECOY SIGN: Divert path early/mid stage
    if (ok('decoy') && progress < 0.7) {
      const sign = h.signs.find((s) => !s.fake && !s.verified && dist(s.x, s.y, px, py) < 500)
      if (sign) {
        scores.push({ id: 'decoy', x: sign.x, y: sign.y, weight: 2.8 })
      } else {
        const aheadTile = this.getTileAheadOfPriya(160)
        if (aheadTile) {
          scores.push({ id: 'decoy', x: aheadTile[0], y: aheadTile[1], weight: 1.2 })
        }
      }
    }

    // 7. CROWD FLOW: Strip passive bystander protection
    if (ok('crowd')) {
      const crowdNear = h.crowd.filter((n) => dist(n.crew.x, n.crew.y, px, py) < 180)
      if (crowdNear.length >= 2) {
        scores.push({ id: 'crowd', x: px, y: py, weight: 2.5 })
      }
    }

    // 8. FLICKER BLUFF: Free psychological feint
    if (ok('flicker') && now - this.lastFlickerAt > 12) {
      const gate = this.findNearestGate(px, py, 320)
      if (gate) {
        let w = 1.8
        if (progress > 0.65) w += 2.0
        scores.push({ id: 'flicker', x: gate.x + gate.w / 2, y: gate.y + gate.h / 2, weight: w })
      }
    }

    if (!scores.length) return

    // Weighted random selection with high competitive bias
    const total = scores.reduce((sum, s) => sum + s.weight, 0)
    let roll = Math.random() * total
    const pick = scores.find((s) => (roll -= s.weight) <= 0) ?? scores[0]

    // Track memory timestamps
    if (pick.id === 'isolate') this.lastIsolateAt = now
    if (pick.id === 'drain') this.lastDrainAt = now
    if (pick.id === 'fakeMsg') this.lastFakeMsgAt = now
    if (pick.id === 'flicker') this.lastFlickerAt = now

    // Faster aim time when urgent
    const urgency = this.calculateUrgency()
    const aimTime = Phaser.Math.Clamp(0.28 + (1 - urgency) * 0.45, 0.22, 0.65)

    this.startCombo([{ id: pick.id, x: pick.x, y: pick.y, aimTime, postDelay: 0.3 }])
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Combo Execution & Pace Tuning
  // ═══════════════════════════════════════════════════════════════════════════

  private startCombo(actions: QueuedAction[]) {
    if (!actions.length) return
    this.actionQueue = [...actions]
    this.currentAction = this.actionQueue.shift()!
    this.actionTimer = this.currentAction.aimTime
  }

  private resetThinkInterval() {
    const urgency = this.calculateUrgency()
    const levelId = this.host.def.id - 1

    // Faster pace on higher levels and when situation is critical
    const basePace = [2.6, 2.0, 1.5][levelId]
    const multiplier = urgency > 0.75 ? 0.45 : urgency > 0.45 ? 0.7 : 1.0
    const jitter = Math.random() * 0.8 // Human unpredictability

    this.thinkCooldown = Math.max(0.4, basePace * multiplier + jitter)
  }

  private calculateUrgency(): number {
    const h = this.host
    const progress = h.world.progress(h.px, h.py)
    const isolation = h.run.isolation
    const allyCount = h.followers().length
    const battery = h.run.battery
    const timeLeft = h.def.time - h.elapsed

    let u = progress * 0.45
    if (isolation > 45) u += 0.35 // Blood in the water
    if (allyCount >= 2) u += 0.2
    if (battery < 30) u += 0.15
    if (timeLeft < 25) u += 0.25

    return Math.min(1.0, u)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Spatial & Environmental Intelligence
  // ═══════════════════════════════════════════════════════════════════════════

  private priyaInSafeZone(): boolean {
    const h = this.host
    return h.world.data.zones.some((z) => h.world.inRect(h.px, h.py, z))
  }

  private priyaIsWellLit(): boolean {
    const h = this.host
    return h.lamps.some((l) => {
      if (l.state !== 'on' && l.state !== 'broken') return false
      return dist(l.x, l.y + 10, h.px, h.py) < (l.def.community ? 130 : 110)
    })
  }

  private isPriyaNearInteractable(): boolean {
    const h = this.host
    const { px, py } = h
    // Check broken lamps being repaired
    const nearBrokenLamp = h.lamps.some((l) => l.state === 'broken' && dist(l.x, l.y + 10, px, py) < 54)
    if (nearBrokenLamp) return true
    // Check unverified signs
    const nearSign = h.signs.some((s) => !s.verified && dist(s.x, s.y, px, py) < 54)
    if (nearSign) return true
    // Check NPCs
    const nearNpc = h.npcs.some((n) => !n.used && dist(n.x, n.y, px, py) < 54)
    return nearNpc
  }

  private findBestLampToKill() {
    const h = this.host
    const { px, py } = h

    // Find working lamps lighting Priya, filtering out those shielded by allies
    const validLamps = h.lamps.filter((l) => {
      if (l.state !== 'on' && l.state !== 'broken') return false
      const d = dist(l.x, l.y + 10, px, py)
      if (d < 35 || d > 360) return false
      // Cannot kill if an ally is standing within 150px
      const allyShields = h.followers().some((a) => dist(a.crew.x, a.crew.y, l.x, l.y) < 150)
      return !allyShields
    })

    if (!validLamps.length) return null

    // Pick the lamp that contributes most directly to Priya's current lighting
    return validLamps.sort((a, b) => dist(a.x, a.y + 10, px, py) - dist(b.x, b.y + 10, px, py))[0]
  }

  /**
   * Predicts Priya's path to the goal using A* pathfinding and identifies
   * the exact gate she will encounter next on her route.
   */
  private findGateOnPriyaPath(minDist: number, maxDist: number) {
    const h = this.host
    const [gc, gr, gw, gh] = h.world.data.goal
    const gx = (gc + gw / 2) * TILE
    const gy = (gr + gh / 2) * TILE

    // Calculate Priya's optimal path
    const path = h.world.path(h.px, h.py, gx, gy)
    if (!path.length) return null

    for (const g of h.gates) {
      if (h.now < g.closedUntil) continue // Already closed
      const gcx = g.x + g.w / 2
      const gcy = g.y + g.h / 2
      const d = dist(gcx, gcy, h.px, h.py)
      if (d < minDist || d > maxDist) continue

      // Don't close if Priya is currently inside
      if (h.world.inRect(h.px, h.py, [g.x / TILE - 0.5, g.y / TILE - 0.5, g.w / TILE + 1, g.h / TILE + 1])) {
        continue
      }

      // Check if any waypoint on Priya's path crosses through this gate
      const crossesPath = path.some(([wx, wy]) => wx >= g.x - 10 && wx <= g.x + g.w + 10 && wy >= g.y - 10 && wy <= g.y + g.h + 10)
      if (crossesPath) {
        return g
      }
    }

    return null
  }

  private findNearestGate(x: number, y: number, maxDist: number) {
    const h = this.host
    const openGates = h.gates.filter((g) => {
      if (h.now < g.closedUntil) return false
      const cx = g.x + g.w / 2
      const cy = g.y + g.h / 2
      const d = dist(cx, cy, x, y)
      if (d > maxDist || d < 40) return false
      if (h.world.inRect(h.px, h.py, [g.x / TILE - 0.5, g.y / TILE - 0.5, g.w / TILE + 1, g.h / TILE + 1])) return false
      return true
    })

    if (!openGates.length) return null
    return openGates.sort((a, b) => dist(a.x + a.w / 2, a.y + a.h / 2, x, y) - dist(b.x + b.w / 2, b.y + b.h / 2, x, y))[0]
  }

  private findScoutPoint(): { x: number; y: number } | null {
    const h = this.host
    const gateAhead = this.findGateOnPriyaPath(100, 480)
    if (gateAhead) {
      return { x: gateAhead.x + gateAhead.w / 2, y: gateAhead.y + gateAhead.h / 2 }
    }
    const [gc, gr, gw, gh] = h.world.data.goal
    const path = h.world.path(h.px, h.py, (gc + gw / 2) * TILE, (gr + gh / 2) * TILE)
    if (path.length > 4) {
      const waypoint = path[Math.min(path.length - 1, 6)]
      return { x: waypoint[0], y: waypoint[1] }
    }
    return null
  }

  private getPriyaVelocity(): { x: number; y: number } {
    const h = this.host
    const trail = h.trail
    if (trail.length < 2) return { x: 1, y: 0 }
    const p1 = trail[trail.length - 1]
    const p0 = trail[Math.max(0, trail.length - 5)]
    const dx = p1[0] - p0[0]
    const dy = p1[1] - p0[1]
    const len = Math.hypot(dx, dy)
    if (len < 0.1) return { x: 1, y: 0 }
    return { x: dx / len, y: dy / len }
  }

  private distToGoal(): number {
    const h = this.host
    const [gc, gr, gw, gh] = h.world.data.goal
    const gx = (gc + gw / 2) * TILE
    const gy = (gr + gh / 2) * TILE
    return dist(h.px, h.py, gx, gy)
  }

  private getTileAheadOfPriya(distance: number): [number, number] | null {
    const h = this.host
    const vel = this.getPriyaVelocity()
    const tx = h.px + vel.x * distance
    const ty = h.py + vel.y * distance
    const c = Math.round(tx / TILE)
    const r = Math.round(ty / TILE)
    return h.world.walkable(c, r) ? [tx, ty] : null
  }
}
