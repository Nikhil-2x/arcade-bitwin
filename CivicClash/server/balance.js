/**
 * PATCH-C — single source of truth for every strategy/balance number.
 *
 * Nothing in loadout.js, botBrain.js or the GameManager hooks hard-codes a
 * gameplay number; they read it from here. Tune this file, then re-run
 *   node server/sim_balance.js --matches 1200
 * until each role wins roughly 45-55%.
 *
 * Plain mutable object on purpose: sim_balance.js can sweep values with
 *   --set heat.decayPerSec=0.4
 */

export const BALANCE = {
  // ───────────────────────── Energy ─────────────────────────
  energy: {
    max: 100,
    regenPerSec: 1.0,
    // Cost of sabotage done via world objects (replaces the old hard-coded 25).
    objectSabotageCost: 25,
    // Using the same ability again inside repeatWindowSec costs this much more.
    repeatCostMult: 1.5
  },

  // Per-ability cost and cooldown (replaces the values baked into initSaboteurAbilities).
  abilities: {
    sab_mislead:           { energyCost: 15, cooldownSec: 10 },
    sab_distract:          { energyCost: 20, cooldownSec: 12 },
    sab_discourage:        { energyCost: 20, cooldownSec: 12 },
    sab_cctv:              { energyCost: 30, cooldownSec: 20 },
    sab_false_lead:        { energyCost: 20, cooldownSec: 15 },
    sab_lights_out:        { energyCost: 15, cooldownSec: 14 },
    sab_panic_crowd:       { energyCost: 20, cooldownSec: 10 },
    sab_jam_shutter:       { energyCost: 25, cooldownSec: 18 },
    sab_cut_hydrant:       { energyCost: 20, cooldownSec: 15 },
    sab_tamper_alarm:      { energyCost: 25, cooldownSec: 20 },
    sab_jam_breaker:       { energyCost: 25, cooldownSec: 18 },
    sab_tamper_desk:       { energyCost: 25, cooldownSec: 15 },
    sab_cut_camera:        { energyCost: 25, cooldownSec: 18 },
    sab_intimidate_laxman: { energyCost: 20, cooldownSec: 12 },
    sab_lock_kiosk:        { energyCost: 25, cooldownSec: 20 },
    sab_whisper_kishore:   { energyCost: 18, cooldownSec: 12 }
  },

  // The Saboteur may only start the escape channel after this much round time,
  // and not while exposed. Stops the 5-second early-round escape from ending rounds.
  escape: {
    earliestSec: 110,
    travelSec: 25,        // bots: time spent walking to the exit before channelling
    channelSec: 5
  },

  // ───────────────────── Heat / suspicion meter ─────────────────────
  // Heat IS gm.suspicionLevel. The Runner never sees the number.
  heat: {
    start: 10,
    max: 100,
    decayPerSec: 0.35,
    // Bands: below `watched` = COLD.
    watched: 40,   // WATCHED: energy regen x watchedRegenMult
    hot: 65,       // HOT:     energy regen x hotRegenMult, Runner scans pinpoint the Saboteur
    exposed: 85,   // EXPOSED: abilities locked, Runner is rewarded
    watchedRegenMult: 0.85,
    hotRegenMult: 0.6,
    exposedLockoutSec: 12,
    exposedHeatAfter: 60,        // heat drops to this when the lockout starts
    exposedRunnerBonus: 8,       // points to the Runner for flushing the Saboteur out
    lowHeatBonusBelow: 40,       // existing end-of-round LOW_SUSPICION bonus threshold
    // Heat added per ability (replaces the scattered hard-coded +12/+15/+25...)
    perAbility: {
      sab_mislead: 12, sab_distract: 10, sab_discourage: 13, sab_cctv: 22,
      sab_false_lead: 16, sab_lights_out: 14,
      sab_panic_crowd: 14, sab_jam_shutter: 20, sab_cut_hydrant: 16,
      sab_tamper_alarm: 22, sab_jam_breaker: 18,
      sab_tamper_desk: 18, sab_cut_camera: 22, sab_intimidate_laxman: 13,
      sab_lock_kiosk: 20, sab_whisper_kishore: 12
    },
    // Extra heat when you spam the same ability (multiplier per recent repeat).
    repeatHeatMult: 1.6,
    // Heat added to the Saboteur when the Runner's lock tool blocks an attempt.
    blockedAttemptHeat: 10,
    // Heat added when Verify debunks a planted false lead.
    debunkHeat: 8
  },

  // ───────────────────── Anti-spam ─────────────────────
  antiSpam: {
    globalCooldownSec: 5,   // minimum gap between ANY two abilities
    repeatWindowSec: 40,    // "same ability again" window
    repeatScoreMult: 0.5    // score multiplier on repeats (dedupe already blocks most)
  },

  // ───────────────────── Saboteur loadout draft ─────────────────────
  loadout: {
    picks: 3,
    // "Loud" abilities (heat >= loudHeat) vs "quiet" ones decide the loadout archetype.
    loudHeat: 18,
    // Archetype perks derived from the composition of the 3 picks.
    archetypes: {
      ghost:    { label: 'Ghost',         loud: 0, heatDecayMult: 1.5, energyRegenMult: 0.9,  exposedAt: 85 },
      balanced: { label: 'Operator',      loud: 1, heatDecayMult: 1.15, energyRegenMult: 1.0, exposedAt: 85 },
      loud:     { label: 'Saboteur-Prime', loud: 2, heatDecayMult: 1.0, energyRegenMult: 1.15, exposedAt: 82 },
      wrecker:  { label: 'Wrecking Crew', loud: 3, heatDecayMult: 0.85, energyRegenMult: 1.3, exposedAt: 78 }
    },
    // Used when the player does not draft in time, and by bots on EASY.
    defaults: {
      1: ['sab_mislead', 'sab_cctv', 'sab_lights_out'],
      2: ['sab_panic_crowd', 'sab_jam_shutter', 'sab_tamper_alarm'],
      3: ['sab_tamper_desk', 'sab_intimidate_laxman', 'sab_lock_kiosk']
    }
  },

  // ───────────────────── Runner counter-tools ─────────────────────
  runnerTools: {
    range: 6,
    scan:   { uses: 3, cooldownSec: 18, evidenceVerified: true },
    lock:   { uses: 2, cooldownSec: 15, durationSec: 30 },
    verify: { uses: 3, cooldownSec: 8 },
    help:   { uses: 1, cooldownSec: 0, cooperationBoost: 15, fearRelief: 10, sabotageShortenSec: 10, lockoutSec: 10 },
    // Sabotage that sticks to an object lasts this long unless the Runner intervenes.
    sabotageDurationSec: 70,
    // Score for catching sabotage with tools (kept small so tools are decisions, not farms).
    scanFindPoints: 5,
    verifyDebunkPoints: 6
  },

  // ───────────────────── Comeback mechanics ─────────────────────
  comeback: {
    // Applied at round start to whoever trails on cumulative match score.
    gapThreshold: 25,
    gapForMax: 70,
    // Trailing Saboteur
    saboteurRegenBonus: 0.35,    // +35% regen at max gap (scaled linearly)
    saboteurHeatDecayBonus: 0.3,
    // Trailing Runner
    runnerExtraToolUses: 1,      // extra scan + verify at max gap
    // Both roles
    pointsBonusMax: 0.15,        // up to +15% points on events while trailing
    // Leader never gets a bonus; bonus ends once the gap closes below threshold.
    roundPointsCap: 140          // per-role per-round cap on points (anti-snowball)
  },

  // ───────────────────── Scoring multipliers ─────────────────────
  scoring: {
    runnerPointsMult: 1.05,
    // Per game level corrections (each level has different objects/NPCs, so raw point flow differs).
    levelMult: {
      1: { runner: 0.85, saboteur: 1.0 },
      2: { runner: 1.03, saboteur: 1.0 },
      3: { runner: 1.12, saboteur: 1.0 }
    },
    saboteurPointsMult: 1.05,
    // Absolute per-event overrides (eventType -> points); empty = engine default.
    eventPoints: {},
    // Disruption: the Saboteur earns points each time a Runner interaction is blocked by
    // live sabotage (a round can end early when the Runner finishes, so stalling must pay).
    disruptionPoints: 8,
    disruptionMax: 5,
    // Detection model for bot Runners at the sealed accusation:
    // P(correct) = base + heatWeight*(heat/100) + evidenceWeight*verifiedEvidence + scanBonus
    accusation: { base: 0.25, heatWeight: 0.45, evidenceWeight: 0.12, scanBonus: 0.08, max: 0.95 }
  },

  // ───────────────────── Bot difficulty ─────────────────────
  // Mirrored (numbers only) in src/.../engine/bot.ts BOT_DIFFICULTY. Keep in sync.
  bots: {
    easy: {
      reactionSec: 12, errorRate: 0.45, heatCaution: 78, draftSmart: false,
      toolUse: 0.4, accuseSkill: 0.85, wasteRate: 0.25, interceptRate: 0.45
    },
    normal: {
      reactionSec: 9, errorRate: 0.14, heatCaution: 77, draftSmart: true,
      toolUse: 0.8, accuseSkill: 1.2, wasteRate: 0.1, interceptRate: 0.7
    },
    hard: {
      reactionSec: 8, errorRate: 0.04, heatCaution: 75, draftSmart: true,
      toolUse: 1.0, accuseSkill: 1.25, wasteRate: 0.03, interceptRate: 0.55
    }
  }
}

export function applyOverrides(pairs) {
  for (const [path, raw] of pairs) {
    const keys = path.split('.')
    let obj = BALANCE
    for (let i = 0; i < keys.length - 1; i++) {
      if (obj[keys[i]] === undefined) throw new Error(`Unknown balance path: ${path}`)
      obj = obj[keys[i]]
    }
    const last = keys[keys.length - 1]
    if (obj[last] === undefined) throw new Error(`Unknown balance path: ${path}`)
    obj[last] = typeof obj[last] === 'number' ? Number(raw) : raw
  }
}

export default BALANCE
