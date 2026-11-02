/**
 * PATCH-C — Strategy layer for the authoritative GameManager.
 *
 *  - Pre-round Saboteur loadout draft (pick N of the level's ability pool)
 *  - Heat/suspicion meter (heat === gm.suspicionLevel) with consequences
 *  - Runner counter-tools with limited uses: scan, lock, verify, call-for-help
 *  - Comeback mechanics + anti-spam rules
 *  - Real effects for the Level 2/3 abilities that previously spent energy and did nothing
 *
 * Every number comes from ./balance.js. This file holds rules and content only.
 * It never imports gameManager.js (the GameManager owns one StrategyLayer).
 */

import { BALANCE } from './balance.js'

export const ESCAPE_ID = 'sab_escape'

// ───────────────────────── Ability pool (content) ─────────────────────────
// target: what a Runner 'lock' protects. eventType/objective mirror the engine's scoring.
// basePoints is the engine's point value, used only for bot valuation + new abilities.
const A = (o) => ({ range: 4.5, ...o })

export const ABILITY_POOL = {
  1: [
    A({ id: 'sab_mislead', name: 'Mislead Witness', icon: '🗣️', target: 'npc_priya', eventType: 'MISLEAD_WITNESS', basePoints: 10,
        description: 'Plant doubt in eyewitness memory', tradeoff: 'Cheap and quiet, but only dents one interview.' }),
    A({ id: 'sab_distract', name: 'Stage Distraction', icon: '💥', target: 'npc_amit', eventType: 'DISTRACTION', basePoints: 10, range: 6,
        description: 'Divert bystanders away from victim', tradeoff: 'Noisy: pulls attention to the scene.' }),
    A({ id: 'sab_discourage', name: 'Discourage Ramesh', icon: '🤫', target: 'npc_ramesh', eventType: 'DISCOURAGE_RAMESH', basePoints: 10,
        description: 'Intimidate shopkeeper regarding DVR seizure', tradeoff: 'Slows the CCTV chain without touching hardware.' }),
    A({ id: 'sab_cctv', name: 'Disable CCTV', icon: '📹', target: 'obj_cctv', eventType: 'CCTV_DELAY', basePoints: 10,
        description: 'Corrupt CCTV storage feed for 25s', tradeoff: 'Highest impact on the evidence chain, highest heat.' }),
    A({ id: 'sab_false_lead', name: 'Plant False Lead', icon: '📌', target: 'obj_infoboard', eventType: 'FALSE_LEAD', basePoints: 15,
        description: 'Pin a rumour about a green auto on the notice board', tradeoff: 'Poisons evidence; a Runner Verify debunks it and burns you.' }),
    A({ id: 'sab_lights_out', name: 'Lights Out', icon: '💡', target: 'obj_light_switch', eventType: 'LIGHTS_CUT', basePoints: 15, range: 6,
        description: 'Cut junction streetlights', tradeoff: 'Strong cover task, but a loud, obvious act.' })
  ],
  2: [
    A({ id: 'sab_panic_crowd', name: 'Spread Panic Rumor', icon: '📢', target: 'npc_deepak', eventType: 'PANIC_RUMOR', basePoints: 10, range: 5,
        description: 'Incite panic in market visitors', tradeoff: 'Cheap crowd chaos that fades as people calm down.' }),
    A({ id: 'sab_jam_shutter', name: 'Jam Exit Shutter', icon: '🔒', target: 'obj_exit_shutter', eventType: 'SAB_SHUTTER', basePoints: 15, range: 4,
        description: 'Jam the roll-up emergency shutter', tradeoff: 'Blocks a key objective for a while; very visible.' }),
    A({ id: 'sab_cut_hydrant', name: 'Cut Hydrant Valve', icon: '🚰', target: 'obj_water_source', eventType: 'SAB_HYDRANT', basePoints: 10, range: 4,
        description: 'Close municipal water valve', tradeoff: 'Moderate heat; the Runner can route around it.' }),
    A({ id: 'sab_tamper_alarm', name: 'Cut Alarm Circuit', icon: '⚡', target: 'obj_fire_alarm', eventType: 'SAB_ALARM', basePoints: 15, range: 4,
        description: 'Disable fire alarm siren', tradeoff: 'Delays the evacuation alert; loud wiring work.' }),
    A({ id: 'sab_jam_breaker', name: 'Jam Breaker Panel', icon: '🔌', target: 'obj_electrical_panel', eventType: 'SAB_BREAKER', basePoints: 15, range: 4,
        description: 'Jam the electrical panel closed', tradeoff: 'Stops the power shut-off, the first objective in the chain.' })
  ],
  3: [
    A({ id: 'sab_tamper_desk', name: 'Tamper Safety Logs', icon: '📁', target: 'obj_safety_records', eventType: 'TAMPER_LOGS', basePoints: 15, range: 4,
        description: 'Corrupt the safety records desk', tradeoff: 'Denies the Runner key evidence.' }),
    A({ id: 'sab_cut_camera', name: 'Cut CCTV Tower Feed', icon: '📹', target: 'obj_cctv_tower', eventType: 'CUT_CAMERA', basePoints: 15, range: 4,
        description: 'Disable the high-mast camera', tradeoff: 'Erases footage but trips tamper alarms (high heat).' }),
    A({ id: 'sab_intimidate_laxman', name: 'Intimidate Laxman', icon: '🤫', target: 'npc_laxman', eventType: 'INTIMIDATE_WORKER', basePoints: 10, range: 4,
        description: 'Threaten worker regarding wage loss', tradeoff: 'Quiet pressure on a witness.' }),
    A({ id: 'sab_lock_kiosk', name: 'Lock Report Kiosk', icon: '💻', target: 'obj_report_terminal', eventType: 'LOCK_TERMINAL', basePoints: 15, range: 4,
        description: 'Lock the digital reporting kiosk', tradeoff: 'Blocks the statutory report; the Runner will notice.' }),
    A({ id: 'sab_whisper_kishore', name: 'Whisper to Kishore', icon: '👂', target: 'npc_kishore', eventType: 'WHISPER_KISHORE', basePoints: 10, range: 4,
        description: 'Frighten the night watchman into silence', tradeoff: 'Low heat, low reward: the patient Saboteur\'s tool.' })
  ]
}

// Saboteur object interactions that count as sabotage and must obey the loadout.
const OBJECT_ABILITY = {
  obj_light_switch: 'sab_lights_out', obj_cctv: 'sab_cctv', obj_infoboard: 'sab_false_lead',
  obj_electrical_panel: 'sab_jam_breaker', obj_safety_records: 'sab_tamper_desk',
  obj_report_terminal: 'sab_lock_kiosk', obj_cctv_tower: 'sab_cut_camera'
}

export function poolFor(level) {
  return ABILITY_POOL[level] || ABILITY_POOL[1]
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

export class StrategyLayer {
  constructor(gm) {
    this.gm = gm
    this.resetState()
  }

  resetState() {
    this.clock = 0                // elapsed ROUND_ACTIVE seconds
    this.loadout = null           // array of ability ids, null = not drafted yet
    this.archetype = null
    this.autoDrafted = false
    this.heatCarry = 0
    this.energyCarry = 0
    this.lockoutUntil = -1
    this.lastAbilityAt = -999
    this.uses = {}                // abilityId -> [clock timestamps]
    this.sabotageLog = []         // {abilityId, targetId, at}  (private to Saboteur/bots)
    this.protectedUntil = {}      // targetId -> clock
    this.exposures = 0
    this.peakHeat = 0
    this.disruptions = 0
    this.comeback = { side: null, scale: 0 }
    this.tools = this._freshTools(0)
    this.toolLockUntil = -1
  }

  _freshTools(extra) {
    const t = BALANCE.runnerTools
    return {
      scan:   { uses: t.scan.uses + extra,   cooldownUntil: -1 },
      lock:   { uses: t.lock.uses,           cooldownUntil: -1 },
      verify: { uses: t.verify.uses + extra, cooldownUntil: -1 },
      help:   { uses: t.help.uses,           cooldownUntil: -1 }
    }
  }

  // Called by the GameManager at match init and at every round reset.
  reset() {
    this.resetState()
    this.gm.suspicionLevel = BALANCE.heat.start
    this._computeComeback()
    this.tools = this._freshTools(this.comeback.side === 'runner'
      ? Math.round(BALANCE.comeback.runnerExtraToolUses * this.comeback.scale) : 0)
    this.configureAbilities()
  }

  _computeComeback() {
    const gm = this.gm
    const pids = Object.keys(gm.players || {})
    if (pids.length !== 2) return
    const [a, b] = pids.map((p) => gm.players[p])
    const gap = Math.abs(a.totalScore - b.totalScore)
    const C = BALANCE.comeback
    if (gap < C.gapThreshold) return
    const trailing = a.totalScore < b.totalScore ? a : b
    const role = gm.playerRoles[trailing.playerId]
    if (!role) return
    const scale = clamp(0.3 + 0.7 * (gap - C.gapThreshold) / Math.max(1, C.gapForMax - C.gapThreshold), 0.3, 1)
    this.comeback = { side: role, scale }
  }

  // ───────────────────── Loadout ─────────────────────
  pool() { return poolFor(this.gm.currentLevel) }
  poolIds() { return this.pool().map((a) => a.id) }

  configureAbilities() {
    const gm = this.gm
    if (!gm.saboteurAbilities) return
    const have = new Set(gm.saboteurAbilities.map((a) => a.id))
    for (const def of this.pool()) {
      if (!have.has(def.id)) {
        gm.saboteurAbilities.push({
          id: def.id, name: def.name, energyCost: 0, cooldownSec: 0, currentCooldownSec: 0,
          range: def.range, icon: def.icon, description: def.description
        })
      }
    }
    for (const ab of gm.saboteurAbilities) {
      const stats = BALANCE.abilities[ab.id]
      if (stats) {
        ab.energyCost = stats.energyCost
        ab.cooldownSec = stats.cooldownSec
      }
      const def = this.pool().find((d) => d.id === ab.id)
      if (def) ab.tradeoff = def.tradeoff
      ab.heat = BALANCE.heat.perAbility[ab.id] ?? 0
    }
    // Drop abilities that are not in this level's pool (except escape).
    const ids = new Set(this.poolIds())
    gm.saboteurAbilities = gm.saboteurAbilities.filter((a) => a.id === ESCAPE_ID || ids.has(a.id))
    if (this.loadout) {
      gm.saboteurAbilities = gm.saboteurAbilities.filter((a) => a.id === ESCAPE_ID || this.loadout.includes(a.id))
    }
  }

  archetypeFor(ids) {
    const loud = ids.filter((id) => (BALANCE.heat.perAbility[id] ?? 0) >= BALANCE.loadout.loudHeat).length
    const table = BALANCE.loadout.archetypes
    const key = loud >= 3 ? 'wrecker' : loud === 2 ? 'loud' : loud === 1 ? 'balanced' : 'ghost'
    return { key, loud, ...table[key] }
  }

  validateLoadout(ids) {
    const n = BALANCE.loadout.picks
    if (!Array.isArray(ids) || ids.length !== n) return `Pick exactly ${n} abilities.`
    if (ids.some((x) => typeof x !== 'string')) return 'Invalid ability id.'
    if (new Set(ids).size !== ids.length) return 'Duplicate abilities in loadout.'
    const ok = new Set(this.poolIds())
    for (const id of ids) if (!ok.has(id)) return `Ability not available this level: ${id}`
    return null
  }

  canDraft() {
    const gm = this.gm
    return gm.phase !== 'ROUND_ACTIVE' && gm.phase !== 'ACCUSATION_PHASE' && gm.phase !== 'VERDICT_REVEAL' && gm.phase !== 'FINAL_RESULTS'
  }

  setLoadout(ids, { auto = false } = {}) {
    const err = this.validateLoadout(ids)
    if (err) return { success: false, message: err }
    if (this.loadout && this.gm.phase === 'ROUND_ACTIVE') return { success: false, message: 'Loadout is locked once the round starts.' }
    this.loadout = [...ids]
    this.autoDrafted = auto
    this.archetype = this.archetypeFor(ids)
    // Rebuild ability list from scratch so the filter starts from the full pool.
    this.gm.initSaboteurAbilities()
    this.configureAbilities()
    return { success: true, message: `Loadout locked: ${this.archetype.label}.`, archetype: this.archetype }
  }

  ensureLoadout() {
    if (this.loadout) return
    const defaults = BALANCE.loadout.defaults[this.gm.currentLevel] || this.poolIds().slice(0, BALANCE.loadout.picks)
    this.setLoadout(defaults, { auto: true })
  }

  optionsView() {
    return {
      level: this.gm.currentLevel,
      picks: BALANCE.loadout.picks,
      loudHeat: BALANCE.loadout.loudHeat,
      archetypes: BALANCE.loadout.archetypes,
      abilities: this.pool().map((d) => ({
        id: d.id, name: d.name, icon: d.icon, description: d.description, tradeoff: d.tradeoff,
        energyCost: BALANCE.abilities[d.id]?.energyCost, cooldownSec: BALANCE.abilities[d.id]?.cooldownSec,
        heat: BALANCE.heat.perAbility[d.id] ?? 0, loud: (BALANCE.heat.perAbility[d.id] ?? 0) >= BALANCE.loadout.loudHeat
      })),
      defaults: BALANCE.loadout.defaults[this.gm.currentLevel] || []
    }
  }

  // ───────────────────── Heat ─────────────────────
  get heat() { return this.gm.suspicionLevel }

  band() {
    const h = this.heat
    const H = BALANCE.heat
    if (this.clock < this.lockoutUntil) return 'EXPOSED'
    if (h >= H.hot) return 'HOT'
    if (h >= H.watched) return 'WATCHED'
    return 'COLD'
  }

  exposedThreshold() { return this.archetype?.exposedAt ?? BALANCE.heat.exposed }

  addHeat(amount) {
    this.gm.suspicionLevel = clamp(Math.round(this.gm.suspicionLevel + amount), 0, BALANCE.heat.max)
    this.peakHeat = Math.max(this.peakHeat, this.gm.suspicionLevel)
    this.checkExposure()
  }

  checkExposure() {
    const gm = this.gm
    if (this.clock < this.lockoutUntil) return
    if (gm.suspicionLevel >= this.exposedThreshold()) {
      this.lockoutUntil = this.clock + BALANCE.heat.exposedLockoutSec
      gm.suspicionLevel = BALANCE.heat.exposedHeatAfter
      this.exposures += 1
      gm.addEventFeedItem(`🚨 Someone was seen tampering! Suspicious activity is cutting off the culprit for ${BALANCE.heat.exposedLockoutSec}s.`, 'emergency')
      gm.awardScore(null, 'runner', 'HEAT_EXPOSED', BALANCE.heat.exposedRunnerBonus, 'Flushed out suspicious sabotage activity')
      if (this.exposures === 1) this.tools.scan.uses += 1
    }
  }

  // ───────────────────── Per-second update ─────────────────────
  tick() {
    const gm = this.gm
    this.clock += 1
    const H = BALANCE.heat
    const C = BALANCE.comeback
    const cbSab = this.comeback.side === 'saboteur' ? this.comeback.scale : 0
    const arch = this.archetype

    // Energy regen (fractional carry so the UI keeps showing whole numbers)
    const bandMult = this.band() === 'EXPOSED' ? 0 : this.heat >= H.hot ? H.hotRegenMult : this.heat >= H.watched ? H.watchedRegenMult : 1
    const regen = BALANCE.energy.regenPerSec * bandMult * (arch?.energyRegenMult ?? 1) * (1 + C.saboteurRegenBonus * cbSab)
    this.energyCarry += regen
    const whole = Math.floor(this.energyCarry)
    this.energyCarry -= whole
    gm.sabotageEnergy = Math.min(BALANCE.energy.max, gm.sabotageEnergy + whole)

    // Heat decay
    this.heatCarry += H.decayPerSec * (arch?.heatDecayMult ?? 1) * (1 + C.saboteurHeatDecayBonus * cbSab)
    const dec = Math.floor(this.heatCarry)
    this.heatCarry -= dec
    if (dec > 0 && this.clock >= this.lockoutUntil) gm.suspicionLevel = Math.max(0, gm.suspicionLevel - dec)

    // Expire sticky sabotage
    for (const o of Object.values(gm.objects || {})) {
      if (o.sabotaged && this.clock >= o.sabotagedUntil) {
        o.sabotaged = false
        o.sabotageRemainingSec = 0
        gm.addEventFeedItem(`🔧 ${o.name} is working again.`, 'cooperation')
      } else if (o.sabotaged) {
        o.sabotageRemainingSec = o.sabotagedUntil - this.clock
      }
    }
    if (this.clock === this.lockoutUntil) gm.addEventFeedItem('✅ The culprit slipped back into the crowd.', 'sabotage')
  }

  // ───────────────────── Anti-spam / gating ─────────────────────
  _recentUses(id) {
    const w = BALANCE.antiSpam.repeatWindowSec
    return (this.uses[id] || []).filter((t) => this.clock - t <= w).length
  }

  _targetOf(id) { return this.pool().find((d) => d.id === id)?.target }

  _isProtected(targetId) {
    return targetId && (this.protectedUntil[targetId] ?? -1) > this.clock
  }

  /** Called before the engine runs an ability. */
  beforeAbility(abilityId) {
    if (abilityId === ESCAPE_ID) return { ok: true, extraCost: 0 }
    this.ensureLoadout()
    if (!this.pool().some((d) => d.id === abilityId)) return { ok: false, message: 'Ability not available this level.' }
    if (!this.loadout.includes(abilityId)) return { ok: false, message: 'Not in your loadout this round.' }
    if (this.clock < this.lockoutUntil) return { ok: false, message: `Exposed! Lay low for ${this.lockoutUntil - this.clock}s.` }
    const gap = BALANCE.antiSpam.globalCooldownSec - (this.clock - this.lastAbilityAt)
    if (gap > 0) return { ok: false, message: `Too hasty — wait ${gap}s between sabotage actions.` }

    const target = this._targetOf(abilityId)
    if (this._isProtected(target)) return this._blocked(target)

    const stats = BALANCE.abilities[abilityId]
    const repeats = this._recentUses(abilityId)
    const extraCost = repeats > 0 ? Math.round(stats.energyCost * (BALANCE.energy.repeatCostMult - 1) * repeats) : 0
    if (this.gm.sabotageEnergy < stats.energyCost + extraCost) {
      return { ok: false, message: `Insufficient energy (needs ${stats.energyCost + extraCost}${extraCost ? ', repeat surcharge' : ''})` }
    }
    return { ok: true, extraCost }
  }

  _blocked(targetId) {
    this.addHeat(BALANCE.heat.blockedAttemptHeat)
    this.gm.addInformation({
      id: `ev_attempt_${targetId}`, title: 'Attempted Tampering', source: 'Runner Watch',
      description: `Someone tried to interfere with ${targetId.replace(/^(obj|npc)_/, '')} while it was under watch.`,
      reliability: 'HIGH', verified: true
    })
    return { ok: false, blocked: true, message: 'Blocked: that target is under close watch. You were almost seen!' }
  }

  /** Runs after the engine's ability code. Normalises heat, tracks usage, refunds failures. */
  afterAbility(abilityId, res, ctx) {
    const gm = this.gm
    const ab = gm.saboteurAbilities.find((a) => a.id === abilityId)
    if (!res.success) {
      gm.sabotageEnergy = ctx.energyBefore
      if (ab) ab.currentCooldownSec = ctx.cooldownBefore
      gm.suspicionLevel = ctx.heatBefore
      return res
    }
    if (abilityId === ESCAPE_ID) return res

    gm.sabotageEnergy = Math.max(0, gm.sabotageEnergy - (ctx.extraCost || 0))
    const repeats = this._recentUses(abilityId)
    const base = BALANCE.heat.perAbility[abilityId] ?? 0
    const heat = Math.round(base * Math.pow(BALANCE.heat.repeatHeatMult, repeats))
    gm.suspicionLevel = ctx.heatBefore            // discard engine's hard-coded increment
    ;(this.uses[abilityId] ||= []).push(this.clock)
    this.lastAbilityAt = this.clock
    const target = this._targetOf(abilityId)
    this.sabotageLog.push({ abilityId, targetId: target, at: this.clock })
    this._flagTarget(target)
    this.addHeat(heat)
    return res
  }

  _flagTarget(targetId) {
    const o = targetId && this.gm.objects?.[targetId]
    if (o) {
      o.sabotaged = true
      o.sabotagedUntil = this.clock + BALANCE.runnerTools.sabotageDurationSec
      o.sabotageRemainingSec = BALANCE.runnerTools.sabotageDurationSec
    }
  }

  // Object-path sabotage (saboteur uses the world object directly).
  gateObjectAction(objId, role) {
    const gm = this.gm
    const obj = gm.objects?.[objId]
    if (!obj) return null
    if (role === 'runner') {
      if (obj.sabotaged) {
        this.disruptions = (this.disruptions || 0) + 1
        if (this.disruptions <= BALANCE.scoring.disruptionMax) {
          gm.awardScore(null, 'saboteur', `DISRUPTION_${this.disruptions}`, BALANCE.scoring.disruptionPoints, 'Sabotage stalled the Runner')
        }
        return {
          success: false,
          message: `${obj.name} is sabotaged (~${Math.max(1, obj.sabotagedUntil - this.clock)}s). Call for Help speeds repairs.`
        }
      }
      return null
    }
    const abilityId = OBJECT_ABILITY[objId]
    if (role !== 'saboteur' || !abilityId) return null
    const pre = this.beforeAbility(abilityId)
    if (!pre.ok) return { success: false, message: pre.message }
    return { pass: true, abilityId, extraCost: pre.extraCost }
  }

  afterObjectAction(gate, res, ctx) {
    const gm = this.gm
    if (!gate?.pass) return res
    if (!res.success) {
      gm.sabotageEnergy = ctx.energyBefore
      gm.suspicionLevel = ctx.heatBefore
      return res
    }
    gm.sabotageEnergy = Math.max(0, gm.sabotageEnergy - (gate.extraCost || 0))
    const repeats = this._recentUses(gate.abilityId)
    const base = BALANCE.heat.perAbility[gate.abilityId] ?? 0
    gm.suspicionLevel = ctx.heatBefore
    ;(this.uses[gate.abilityId] ||= []).push(this.clock)
    this.lastAbilityAt = this.clock
    const target = this._targetOf(gate.abilityId)
    this.sabotageLog.push({ abilityId: gate.abilityId, targetId: target, at: this.clock })
    this.addHeat(Math.round(base * Math.pow(BALANCE.heat.repeatHeatMult, repeats)))
    return res
  }

  escapeAllowed() {
    const E = BALANCE.escape
    if (this.clock < E.earliestSec) return { ok: false, message: `Too early to slip away (${E.earliestSec - this.clock}s until the perimeter thins).` }
    if (this.clock < this.lockoutUntil) return { ok: false, message: 'You are being watched — you cannot slip away while exposed.' }
    return { ok: true }
  }

  // ───────────────────── Points hook (comeback + caps) ─────────────────────
  adjustPoints(role, eventType, points) {
    const gm = this.gm
    const S = BALANCE.scoring
    const C = BALANCE.comeback
    let p = S.eventPoints[eventType] ?? points
    p *= role === 'runner' ? S.runnerPointsMult : S.saboteurPointsMult
    p *= S.levelMult?.[gm.currentLevel]?.[role] ?? 1
    if (this.comeback.side === role) p *= 1 + C.pointsBonusMax * this.comeback.scale
    const already = gm.scoreEvents
      .filter((e) => e.level === gm.currentLevel && e.round === gm.currentRound && e.role === role)
      .reduce((s, e) => s + e.points, 0)
    p = Math.min(p, Math.max(0, C.roundPointsCap - already))
    return Math.round(p)
  }

  // ───────────────────── L2/L3/new ability effects ─────────────────────
  applyAbilityEffect(abilityId) {
    const gm = this.gm
    const npc = (id) => gm.npcs?.[id]
    const hit = (id, fear, coop) => {
      const n = npc(id)
      if (!n) return false
      n.fear = clamp(n.fear + fear, 0, 100)
      n.cooperation = clamp(n.cooperation - coop, 0, 100)
      n.manipulated = true
      n.currentReaction = 'step_back'
      n.reactionDurationSec = 3.5
      return true
    }
    const score = (evt, pts, text) => gm.awardScore(null, 'saboteur', evt, pts, text)
    const obj = (id) => gm.objects?.[id]
    const feed = (t) => gm.addEventFeedItem(t, 'sabotage')

    switch (abilityId) {
      case 'sab_lights_out': {
        if (gm.environmentalState.streetlights === 'OFF') return { success: false, message: 'Streetlights are already off.' }
        gm.environmentalState.streetlights = 'OFF'
        if (obj('obj_light_switch')) obj('obj_light_switch').state = 'off'
        gm.completeTask?.('t_s_light_cut', 'saboteur')
        score('LIGHTS_CUT', 15, 'Cut junction streetlights to plunge intersection into darkness')
        feed('💡 Junction streetlights cut! Area plunged into darkness.')
        return { success: true, message: 'Switched off junction streetlights!', environmentalState: gm.environmentalState }
      }
      case 'sab_panic_crowd': {
        if (!hit('npc_deepak', 25, 15)) return { success: false, message: 'No one nearby to panic.' }
        hit('npc_meera', 12, 8)
        gm.completeSaboteurObjective('so_2_2')
        score('PANIC_RUMOR', 10, 'Spread a panic rumour through the market')
        feed('📢 A wild rumour is spreading through the bazaar. People are panicking!')
        return { success: true, message: 'Panic spreads through the crowd!' }
      }
      case 'sab_jam_shutter': {
        const o = obj('obj_exit_shutter')
        if (!o || o.state === 'open') return { success: false, message: 'The shutter is already open.' }
        gm.completeSaboteurObjective('so_2_1')
        score('SAB_SHUTTER', 15, 'Jammed the emergency exit shutter')
        feed('🔒 The emergency exit shutter is jammed!')
        return { success: true, message: 'Shutter jammed for a while.' }
      }
      case 'sab_cut_hydrant': {
        if (!obj('obj_water_source') || obj('obj_water_source').state === 'open') return { success: false, message: 'The valve is already open and in use.' }
        gm.completeSaboteurObjective('so_2_3')
        score('SAB_HYDRANT', 10, 'Closed the municipal hydrant valve')
        feed('🚰 Hydrant pressure has dropped!')
        return { success: true, message: 'Hydrant valve shut.' }
      }
      case 'sab_tamper_alarm': {
        const o = obj('obj_fire_alarm')
        if (!o || o.state === 'ringing') return { success: false, message: 'The alarm is already sounding.' }
        gm.completeSaboteurObjective('so_2_4')
        score('SAB_ALARM', 15, 'Cut the fire alarm circuit')
        feed('⚡ The fire alarm circuit has gone dead!')
        return { success: true, message: 'Alarm circuit cut.' }
      }
      case 'sab_jam_breaker': {
        const o = obj('obj_electrical_panel')
        if (!o || o.state === 'tripped') return { success: false, message: 'Power is already isolated.' }
        score('SAB_BREAKER', 15, 'Jammed the electrical panel closed')
        feed('🔌 The breaker panel is jammed shut!')
        return { success: true, message: 'Breaker panel jammed.' }
      }
      case 'sab_tamper_desk': {
        const o = obj('obj_safety_records')
        if (!o || o.state === 'secured') return { success: false, message: 'The logbook is already secured.' }
        gm.completeSaboteurObjective('so_3_2')
        score('TAMPER_LOGS', 15, 'Corrupted site safety registers')
        feed('🔥 Safety logbook desk files tampered with.')
        return { success: true, message: 'Safety records corrupted.' }
      }
      case 'sab_cut_camera': {
        const o = obj('obj_cctv_tower')
        if (!o || o.state === 'reviewed') return { success: false, message: 'The footage was already reviewed.' }
        gm.completeSaboteurObjective('so_3_3')
        score('CUT_CAMERA', 15, 'Cut surveillance camera tower feed')
        feed('📹 Site CCTV tower cable severed!')
        return { success: true, message: 'Camera feed cut.' }
      }
      case 'sab_intimidate_laxman': {
        if (!hit('npc_laxman', 25, 20)) return { success: false, message: 'Laxman is not here.' }
        gm.completeSaboteurObjective('so_3_1')
        score('INTIMIDATE_WORKER', 10, 'Intimidated worker Laxman')
        feed('🤫 Laxman is frightened and has stopped talking.')
        return { success: true, message: 'Laxman is scared into silence.' }
      }
      case 'sab_lock_kiosk': {
        const o = obj('obj_report_terminal')
        if (!o || o.state === 'submitted') return { success: false, message: 'The report was already filed.' }
        gm.completeSaboteurObjective('so_3_4')
        score('LOCK_TERMINAL', 15, 'Locked incident report terminal')
        feed('💻 The incident report kiosk is locked!')
        return { success: true, message: 'Kiosk locked.' }
      }
      case 'sab_whisper_kishore': {
        if (!hit('npc_kishore', 25, 20)) return { success: false, message: 'Kishore is not here.' }
        score('WHISPER_KISHORE', 10, 'Frightened watchman Kishore into silence')
        feed('👂 Watchman Kishore looks very nervous.')
        return { success: true, message: 'Kishore is staying quiet.' }
      }
      default:
        return { success: true, message: 'Ability activated' }
    }
  }

  // ───────────────────── Runner counter-tools ─────────────────────
  _toolGate(tool) {
    if (this.gm.phase !== 'ROUND_ACTIVE') return 'Tools are only usable during a round.'
    const t = this.tools[tool]
    if (!t) return 'Unknown tool.'
    if (this.clock < this.toolLockUntil) return `Busy: tools ready in ${this.toolLockUntil - this.clock}s.`
    if (t.uses <= 0) return 'No uses left this round.'
    if (this.clock < t.cooldownUntil) return `Cooling down (${t.cooldownUntil - this.clock}s).`
    return null
  }

  _spend(tool) {
    const t = this.tools[tool]
    t.uses -= 1
    t.used = (t.used || 0) + 1
    t.cooldownUntil = this.clock + BALANCE.runnerTools[tool].cooldownSec
  }

  _validTarget(targetId) {
    return typeof targetId === 'string' && (!!this.gm.objects?.[targetId] || !!this.gm.npcs?.[targetId])
  }

  _tamperTraces(targetId) {
    const gm = this.gm
    const o = gm.objects?.[targetId]
    const n = gm.npcs?.[targetId]
    if (o?.sabotaged) return true
    if (n?.manipulated) return true
    return this.sabotageLog.some((e) => e.targetId === targetId && this.clock - e.at <= 60)
  }

  /** Targets the Runner can legitimately suspect: public state only. */
  publicHints() {
    const gm = this.gm
    const out = []
    for (const o of Object.values(gm.objects || {})) if (o.sabotaged) out.push(o.id)
    for (const n of Object.values(gm.npcs || {})) if (n.manipulated) out.push(n.id)
    return out
  }

  useTool(tool, targetId) {
    const gm = this.gm
    const R = BALANCE.runnerTools
    const err = this._toolGate(tool)
    if (err) return { success: false, message: err }

    if (tool === 'scan') {
      if (!this._validTarget(targetId)) return { success: false, message: 'Pick something to scan.' }
      this._spend('scan')
      if (!this._tamperTraces(targetId)) return { success: true, found: false, message: 'Scan complete: nothing unusual here.' }
      gm.addInformation({
        id: `ev_scan_${targetId}`, title: 'Tamper Traces Found', source: 'Runner Scan',
        description: `Scan found signs of deliberate interference at ${targetId.replace(/^(obj|npc)_/, '')}.`,
        reliability: 'HIGH', verified: R.scan.evidenceVerified
      })
      gm.awardScore(null, 'runner', `SCAN_FIND_${targetId}`, R.scanFindPoints, 'Scan uncovered signs of tampering')
      const hot = this.heat >= BALANCE.heat.hot
      return {
        success: true, found: true,
        message: hot ? 'Tamper traces found — and the pattern points to someone nearby acting nervous.' : 'Tamper traces found. Logged as evidence.'
      }
    }

    if (tool === 'lock') {
      if (!this._validTarget(targetId)) return { success: false, message: 'Pick something to lock down.' }
      if (this._isProtected(targetId)) return { success: false, message: 'Already under watch.' }
      this._spend('lock')
      this.protectedUntil[targetId] = this.clock + R.lock.durationSec
      gm.addEventFeedItem(`🛡️ ${gm.objects?.[targetId]?.name || gm.npcs?.[targetId]?.name || targetId} is now under close watch.`, 'cooperation')
      return { success: true, message: `Watching it for ${R.lock.durationSec}s. Sabotage there will fail and flag the culprit.` }
    }

    if (tool === 'verify') {
      const info = gm.informationLog.find((i) => i.id === targetId)
      if (!info) return { success: false, message: 'Pick an information entry to verify.' }
      const fake = info.id === 'info_false_lead' || info.reliability === 'LOW'
      if (info.verified && !fake) return { success: false, message: 'Already verified.' }
      if (info.reliability === 'DEBUNKED') return { success: false, message: 'Already debunked.' }
      this._spend('verify')
      if (fake) {
        info.reliability = 'DEBUNKED'
        info.verified = false
        info.title = `DEBUNKED: ${info.title}`
        gm.awardScore(null, 'runner', 'VERIFY_DEBUNK', R.verifyDebunkPoints, 'Debunked a planted false lead')
        this.addHeat(BALANCE.heat.debunkHeat)
        return { success: true, message: 'That lead is fake! It has been discarded.' }
      }
      info.verified = true
      return { success: true, message: 'Verified. This now counts as solid evidence.' }
    }

    if (tool === 'help') {
      this._spend('help')
      const h = R.help
      gm.communityCooperation = Math.min(100, gm.communityCooperation + h.cooperationBoost)
      for (const n of Object.values(gm.npcs || {})) {
        n.fear = Math.max(0, n.fear - h.fearRelief)
        n.cooperation = Math.min(100, n.cooperation + Math.round(h.cooperationBoost / 3))
      }
      for (const o of Object.values(gm.objects || {})) {
        if (o.sabotaged) o.sabotagedUntil = Math.max(this.clock + 1, o.sabotagedUntil - h.sabotageShortenSec)
      }
      this.toolLockUntil = this.clock + h.lockoutSec
      gm.addEventFeedItem('📣 A call for help rallies the neighbourhood! Bystanders are calmer and repairs speed up.', 'cooperation')
      return { success: true, message: 'Help is rallying. Your tools are busy for a moment.' }
    }
    return { success: false, message: 'Unknown tool.' }
  }

  // ───────────────────── Role-filtered views (privacy) ─────────────────────
  viewFor(role) {
    if (role === 'saboteur') {
      return {
        heat: Math.round(this.heat),
        band: this.band(),
        thresholds: { watched: BALANCE.heat.watched, hot: BALANCE.heat.hot, exposed: this.exposedThreshold() },
        loadout: this.loadout,
        archetype: this.archetype ? { key: this.archetype.key, label: this.archetype.label } : null,
        lockoutSec: Math.max(0, this.lockoutUntil - this.clock),
        globalCooldownSec: Math.max(0, BALANCE.antiSpam.globalCooldownSec - (this.clock - this.lastAbilityAt)),
        comebackActive: this.comeback.side === 'saboteur',
        escapeEarliestSec: Math.max(0, BALANCE.escape.earliestSec - this.clock)
      }
    }
    const t = this.tools
    const view = (k) => ({ uses: t[k].uses, cooldownSec: Math.max(0, t[k].cooldownUntil - this.clock) })
    return {
      tools: { scan: view('scan'), lock: view('lock'), verify: view('verify'), help: view('help') },
      toolsBusySec: Math.max(0, this.toolLockUntil - this.clock),
      watched: Object.keys(this.protectedUntil).filter((k) => this.protectedUntil[k] > this.clock),
      comebackActive: this.comeback.side === 'runner',
      culpritExposed: this.clock < this.lockoutUntil
    }
  }
}

// ───────────────────── Socket handlers (one-line hook in server.js) ─────────────────────
/**
 * registerStrategyHandlers({ io, socket, gameManagers, rooms, broadcastTelemetry })
 * Adds: loadout:request, loadout:submit, runner:tool:use
 */
export function registerStrategyHandlers({ io, socket, gameManagers, rooms, broadcastTelemetry }) {
  const last = { loadout: 0, tool: 0 }
  const tooFast = (k, ms) => {
    const now = Date.now()
    if (now - last[k] < ms) return true
    last[k] = now
    return false
  }
  const roleOf = (gm) => gm.playerRoles?.[socket.id] || socket.data.role

  socket.on('loadout:request', () => {
    const gm = gameManagers.get(socket.data.roomCode)
    if (!gm || roleOf(gm) !== 'saboteur') return
    socket.emit('loadout:options', { ...gm.strategy.optionsView(), locked: gm.strategy.loadout })
  })

  socket.on('loadout:submit', (payload) => {
    if (tooFast('loadout', 300)) return
    const gm = gameManagers.get(socket.data.roomCode)
    if (!gm || roleOf(gm) !== 'saboteur') return socket.emit('loadout:result', { success: false, message: 'Only the Saboteur drafts a loadout.' })
    if (!gm.strategy.canDraft()) return socket.emit('loadout:result', { success: false, message: 'The draft is closed.' })
    const ids = payload && Array.isArray(payload.abilityIds) ? payload.abilityIds.slice(0, 8) : null
    const res = gm.strategy.setLoadout(ids)
    socket.emit('loadout:result', res)
    if (res.success) broadcastTelemetry?.(socket.data.roomCode, gm)
  })

  socket.on('runner:tool:use', (payload) => {
    if (tooFast('tool', 250)) return
    const code = socket.data.roomCode
    const gm = gameManagers.get(code)
    if (!gm || roleOf(gm) !== 'runner') return socket.emit('runner:tool:result', { success: false, message: 'Only the Runner has these tools.' })
    const tool = payload && typeof payload.tool === 'string' ? payload.tool : ''
    const targetId = payload && typeof payload.targetId === 'string' ? payload.targetId.slice(0, 64) : ''

    // Range check for scan/lock when the player's transform is known.
    if (tool === 'scan' || tool === 'lock') {
      const room = rooms.get(code)
      const me = room?.host?.id === socket.id ? room.host : room?.guest
      const target = gm.objects?.[targetId] || gm.npcs?.[targetId]
      const pos = target?.position
      if (me?.transform && pos) {
        const d = Math.hypot(me.transform.x - pos.x, me.transform.z - pos.z)
        if (d > BALANCE.runnerTools.range) {
          return socket.emit('runner:tool:result', { success: false, message: 'Too far away to use that here.' })
        }
      }
    }
    const res = gm.strategy.useTool(tool, targetId)
    socket.emit('runner:tool:result', { tool, ...res })
    if (res.success) {
      io.to(code).emit('information:update', { informationLog: gm.informationLog })
      broadcastTelemetry?.(code, gm)
      io.to(code).emit('match:state:update', { matchState: gm.getMatchState() })
    }
  })
}
