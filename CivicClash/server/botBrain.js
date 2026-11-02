/**
 * PATCH-C — Server-side bot brains (easy / normal / hard).
 *
 * Before this file the lobby could add an "AI bot" player, but nothing on the
 * server ever acted for it. These brains play through the same public
 * GameManager API a human uses (no private shortcuts except skipping walking,
 * which is modelled as reaction time), so they exercise the real rules and are
 * what sim_balance.js uses to tune the numbers.
 *
 * Difficulty numbers live in balance.js -> bots.
 */

import { BALANCE } from './balance.js'
import { poolFor, ESCAPE_ID } from './loadout.js'

export function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const DONE_STATES = new Set(['dispatched', 'open', 'tripped', 'secured', 'submitted', 'ringing', 'reviewed', 'collected', 'ready_used'])
const EXIT_POS = { x: 18, z: 18 }

class Base {
  constructor(gm, pid, level, rng) {
    this.gm = gm
    this.pid = pid
    this.P = BALANCE.bots[level] || BALANCE.bots.normal
    this.level = level
    this.rng = rng
    this.nextAt = 0
  }
  get clock() { return this.gm.strategy.clock }
  schedule(sec) { this.nextAt = this.clock + Math.max(1, Math.round(sec * (0.7 + 0.6 * this.rng()))) }
  pick(arr) { return arr[Math.floor(this.rng() * arr.length)] }
}

// ───────────────────────────── Runner ─────────────────────────────
export class RunnerBot extends Base {
  constructor(...a) {
    super(...a)
    this.objDone = new Set()
    this.objDead = new Set()
    this.objRetryAt = {}
    this.tried = new Set()
    this.npcDone = new Set()
    this.scanned = new Set()
    this.intercepted = false
    this.npcResetAt = 40
  }

  step() {
    const gm = this.gm
    const s = gm.strategy
    const P = this.P

    if (gm.escapeProgress.isEscaping && !gm.escapeProgress.isCompleted) {
      if (!this.intercepted) {
        this.intercepted = true
        if (this.rng() < P.interceptRate) gm.cancelEscapeChannel('Intercepted')
      }
    } else {
      this.intercepted = false
    }

    if (this.clock < this.nextAt) return
    if (this.clock >= this.npcResetAt) { this.npcDone.clear(); this.npcResetAt += 40 }
    if (this.rng() < P.wasteRate) return this.schedule(P.reactionSec)
    if (this.tryTool()) return
    this.tryMain()
  }

  tryTool() {
    const gm = this.gm
    const s = gm.strategy
    const P = this.P
    if (this.rng() > P.toolUse) return false
    const t = s.tools

    const fake = gm.informationLog.find((i) => (i.id === 'info_false_lead' || i.reliability === 'LOW') && i.reliability !== 'DEBUNKED')
    if (fake && t.verify.uses > 0 && s.useTool('verify', fake.id).success) { this.schedule(P.reactionSec * 0.5); return true }

    for (const hint of s.publicHints()) {
      if (this.scanned.has(hint) || t.scan.uses <= 0) continue
      this.scanned.add(hint)
      if (s.useTool('scan', hint).success) { this.schedule(P.reactionSec * 0.5); return true }
    }

    const hints = s.publicHints()
    if (t.help.uses > 0 && hints.length >= 2 && s.useTool('help').success) { this.schedule(P.reactionSec * 0.5); return true }

    if (t.lock.uses > 0 && this.clock >= 8 && this.rng() < 0.45) {
      const targets = poolFor(gm.currentLevel)
        .filter((d) => !s._isProtected(d.target))
        .filter((d) => !DONE_STATES.has(gm.objects?.[d.target]?.state))
        .filter((d) => !gm.npcs?.[d.target]?.manipulated)
      if (targets.length) {
        // hard bots protect the most valuable targets; others guess.
        const choice = this.level === 'hard'
          ? targets.slice().sort((a, b) => b.basePoints - a.basePoints)[0]
          : this.pick(targets)
        if (s.useTool('lock', choice.target).success) { this.schedule(P.reactionSec * 0.5); return true }
      }
    }
    return false
  }

  tryMain() {
    const gm = this.gm
    const P = this.P
    const cands = []
    for (const o of Object.values(gm.objects || {})) {
      if (this.objDone.has(o.id) || this.objDead.has(o.id)) continue
      if ((this.objRetryAt[o.id] ?? 0) > this.clock) continue
      cands.push({ k: 'obj', id: o.id })
    }
    for (const n of Object.values(gm.npcs || {})) {
      if (!this.npcDone.has(n.id)) cands.push({ k: 'npc', id: n.id })
    }
    if (!cands.length) return this.schedule(6)

    const c = this.rng() < P.errorRate ? this.pick(cands) : cands[0]
    if (c.k === 'obj') {
      const res = gm.handleObjectAction(c.id, 'use', 'runner')
      if (res.success) this.objDone.add(c.id)
      else if (/sabotaged/i.test(res.message || '')) this.objRetryAt[c.id] = this.clock + 8
      else if (/locked|convince|need|first/i.test(res.message || '')) this.objRetryAt[c.id] = this.clock + 25
      else this.objDead.add(c.id)
      return this.schedule(res.success ? P.reactionSec : P.reactionSec * 0.5)
    }

    const sess = gm.getDialogueSession(c.id, 'runner', this.pid)
    const opt = sess?.options?.find((o) => !this.tried.has(`${c.id}:${o.id}`))
    if (!opt) { this.npcDone.add(c.id); return this.schedule(1) }
    this.tried.add(`${c.id}:${opt.id}`)
    gm.handleDialogueChoice(c.id, opt.id, 'runner', this.pid)
    return this.schedule(P.reactionSec)
  }

  /** Sealed accusation. Detection uses only information a human Runner also has. */
  accuse() {
    const gm = this.gm
    const s = gm.strategy
    const A = BALANCE.scoring.accusation
    const cards = gm.getEvidenceCardsForPlayer('runner').filter((c) => c.verified && !c.isContradiction)
    const evidence = cards.slice(0, 2).map((c) => c.id)
    const raw = A.base + A.heatWeight * (s.peakHeat / 100) + A.evidenceWeight * cards.length + (this.scanned.size ? A.scanBonus : 0)
    const p = Math.min(A.max, raw * this.P.accuseSkill)
    const suspectId = this.rng() < p ? 'saboteur' : 'insufficient_evidence'
    return gm.submitVerdict(this.pid, 'runner', { suspectId, selectedEvidenceIds: evidence })
  }
}

// ───────────────────────────── Saboteur ─────────────────────────────
export class SaboteurBot extends Base {
  constructor(...a) {
    super(...a)
    this.coverDone = false
    this.esc = { state: 'idle', until: 0, tries: 0 }
    this.avoidUntil = {}
  }

  /** Pre-round loadout draft. */
  draft() {
    const gm = this.gm
    const s = gm.strategy
    if (s.loadout) return
    const pool = s.pool()
    const n = BALANCE.loadout.picks
    let ids
    if (!this.P.draftSmart) {
      ids = pool.map((d) => d.id).sort(() => this.rng() - 0.5).slice(0, n)
    } else {
      const ranked = pool
        .map((d) => ({ d, v: d.basePoints / ((BALANCE.heat.perAbility[d.id] ?? 10) + 4) }))
        .sort((a, b) => b.v - a.v)
      const chosen = []
      const events = new Set()
      let loud = 0
      for (const { d } of ranked) {
        if (events.has(d.eventType)) continue
        const isLoud = (BALANCE.heat.perAbility[d.id] ?? 0) >= BALANCE.loadout.loudHeat
        if (this.level === 'normal' && isLoud && loud >= 2) continue
        chosen.push(d.id); events.add(d.eventType); loud += isLoud ? 1 : 0
        if (chosen.length === n) break
      }
      for (const { d } of ranked) if (chosen.length < n && !chosen.includes(d.id)) chosen.push(d.id)
      ids = chosen
    }
    s.setLoadout(ids)
  }

  step() {
    const gm = this.gm
    const s = gm.strategy
    const P = this.P
    if (this.clock < this.nextAt) return
    this.draft()

    // Escape state machine
    if (this.esc.state === 'travel') {
      if (this.clock < this.esc.until) return
      const res = gm.startEscapeChannel(EXIT_POS, this.pid)
      if (res.success) { this.esc.state = 'channel'; this.esc.until = this.clock + BALANCE.escape.channelSec + 1; return }
      this.esc.state = 'idle'; this.esc.tries += 1
      return this.schedule(3)
    }
    if (this.esc.state === 'channel') {
      if (gm.escapeProgress.isEscaping) return
      this.esc.state = 'idle'; this.esc.tries += 1      // intercepted
      return this.schedule(P.reactionSec)
    }
    if (this.shouldEscape()) {
      this.esc.state = 'travel'
      this.esc.until = this.clock + BALANCE.escape.travelSec
      return
    }

    if (this.rng() < P.wasteRate) return this.schedule(P.reactionSec)

    // Alibi: one genuinely helpful task per round earns HELPFUL_ALIBI
    if (!this.coverDone && this.clock >= 15 && this.rng() < (this.level === 'easy' ? 0.4 : this.level === 'normal' ? 0.8 : 1)) {
      const t = gm.saboteurTasks.find((x) => x.category === 'COVER' && x.status === 'AVAILABLE')
      if (t) { gm.completeTask(t.id, 'saboteur'); this.coverDone = true; return this.schedule(P.reactionSec) }
      this.coverDone = true
    }

    const remaining = gm.roundDuration - this.clock
    if (s.heat >= P.heatCaution && remaining > 40) return this.schedule(3)     // lay low
    if (this.clock < s.lockoutUntil) return this.schedule(2)

    const me = this.pid
    const key = (e) => `${gm.currentLevel}_${gm.currentRound}_${me}_${e}`
    const options = []
    for (const def of s.pool()) {
      if (!s.loadout.includes(def.id)) continue
      const ab = gm.saboteurAbilities.find((a) => a.id === def.id)
      if (!ab || ab.currentCooldownSec > 0) continue
      if ((this.avoidUntil[def.id] ?? 0) > this.clock) continue
      const heat = BALANCE.heat.perAbility[def.id] ?? 10
      const fresh = !gm.awardedEventKeys.has(key(def.eventType))
      // Re-sabotaging only pays through "disruption" (stalling the Runner); skip targets already jammed.
      const tgt = gm.objects?.[def.target]
      if (!fresh && (tgt?.sabotaged || !tgt || DONE_STATES.has(tgt.state))) continue
      const repeatValue = BALANCE.scoring.disruptionPoints * 0.6
      options.push({ def, v: ((fresh ? def.basePoints : repeatValue) / (heat + 5)) })
    }
    if (!options.length) return this.schedule(2)
    const choice = this.rng() < P.errorRate ? this.pick(options) : options.sort((a, b) => b.v - a.v)[0]
    const res = gm.handleSaboteurAbility(choice.def.id)
    if (res.blocked) this.avoidUntil[choice.def.id] = this.clock + 35
    return this.schedule(res.success ? P.reactionSec : 2)
  }

  shouldEscape() {
    const gm = this.gm
    const s = gm.strategy
    if (this.esc.tries >= 2 || this.esc.state !== 'idle') return false
    const remaining = gm.roundDuration - this.clock
    if (this.clock + BALANCE.escape.travelSec < BALANCE.escape.earliestSec) return false
    // Normal/hard bots read the public event feed: once the Runner is close to finishing, run.
    const runnerDone = gm.runnerObjectives.filter((o) => o.completed).length
    const runnerNearlyDone = this.level !== 'easy' && runnerDone >= 3
    if (remaining > 75 && !runnerNearlyDone) return false
    const A = BALANCE.scoring.accusation
    const noise = this.level === 'easy' ? (this.rng() - 0.5) * 0.4 : this.level === 'normal' ? (this.rng() - 0.5) * 0.15 : 0
    const pCaught = Math.min(A.max, A.base + A.heatWeight * (s.peakHeat / 100) + noise)
    const evStay = (1 - pCaught) * 30
    return 20 > evStay
  }

  defend() {
    const gm = this.gm
    const n = gm.getDefenseNarratives()
    return gm.submitVerdict(this.pid, 'saboteur', { suspectId: 'runner', selectedEvidenceIds: [], counterNarrativeId: n[0]?.id || null })
  }
}

// ───────────────────────────── Manager ─────────────────────────────
/**
 * Drives bot players for one GameManager. Call tick() once per second AFTER gm.tick().
 *   difficulty: 'easy' | 'normal' | 'hard' | { runner, saboteur }
 *   all: control both seats (simulation); default only seats whose id starts with 'bot_'
 */
export class BotManager {
  constructor(gm, { difficulty = 'normal', rng = Math.random, all = false } = {}) {
    this.gm = gm
    this.rng = rng
    this.all = all
    this.diff = typeof difficulty === 'string' ? { runner: difficulty, saboteur: difficulty } : difficulty
    this.roundKey = ''
    this.brains = {}
    this.submitted = false
  }

  setDifficulty(d) { this.diff = typeof d === 'string' ? { runner: d, saboteur: d } : d }

  _seats() {
    const out = {}
    for (const [pid, role] of Object.entries(this.gm.playerRoles)) {
      if (this.all || String(pid).startsWith('bot_')) out[role] = pid
    }
    return out
  }

  _ensureBrains() {
    const gm = this.gm
    const key = `${gm.currentLevel}_${gm.currentRound}_${JSON.stringify(gm.playerRoles)}`
    if (key === this.roundKey) return
    this.roundKey = key
    this.submitted = false
    this.brains = {}
    const seats = this._seats()
    if (seats.runner) this.brains.runner = new RunnerBot(gm, seats.runner, this.diff.runner, this.rng)
    if (seats.saboteur) this.brains.saboteur = new SaboteurBot(gm, seats.saboteur, this.diff.saboteur, this.rng)
  }

  /** Call during pre-round phases so the bot's draft is locked before play starts. */
  draft() {
    this._ensureBrains()
    this.brains.saboteur?.draft()
  }

  tick() {
    const gm = this.gm
    this._ensureBrains()
    if (gm.phase === 'ROUND_ACTIVE') {
      this.brains.saboteur?.step()
      this.brains.runner?.step()
      return { allSubmitted: false }
    }
    if (gm.phase === 'ACCUSATION_PHASE' && !this.submitted) {
      this.submitted = true
      const a = this.brains.saboteur?.defend()
      const b = this.brains.runner?.accuse()
      return { allSubmitted: !!(a?.allSubmitted || b?.allSubmitted) }
    }
    return { allSubmitted: false }
  }
}
