#!/usr/bin/env node
/**
 * PATCH-C — headless balance simulation.
 *
 *   node server/sim_balance.js                      # 1200 mirror matches + 300 cross-skill matches
 *   node server/sim_balance.js --matches 2000 --seed 7
 *   node server/sim_balance.js --set heat.decayPerSec=0.45 --set comeback.gapThreshold=20
 *   node server/sim_balance.js --check              # exit 1 if any mirror level leaves 45-55%
 *
 * It plays complete 6-round matches through the real GameManager (no sockets):
 * both seats are bots, the loadout draft happens before every round, and rounds
 * end by timeout/accusation or by a Saboteur escape.
 *
 * A "role win" is a round where that role scored more than the other role.
 * Draws are reported separately and count half toward the win rate.
 * Mirror matches (same difficulty both seats) are what the 45-55% target applies to.
 */

import { GameManager } from './gameManager.js'
import { BALANCE, applyOverrides } from './balance.js'
import { BotManager, mulberry32 } from './botBrain.js'

// ───────────── CLI ─────────────
const args = process.argv.slice(2)
const opt = { matches: 1200, cross: 300, seed: 1, check: false, json: false, sets: [] }
for (let i = 0; i < args.length; i++) {
  const a = args[i]
  if (a === '--matches') opt.matches = parseInt(args[++i], 10)
  else if (a === '--cross') opt.cross = parseInt(args[++i], 10)
  else if (a === '--seed') opt.seed = parseInt(args[++i], 10)
  else if (a === '--check') opt.check = true
  else if (a === '--json') opt.json = true
  else if (a === '--set') opt.sets.push(args[++i].split('='))
  else if (a === '--help') { console.log(process.argv[1] + ' [--matches N] [--cross N] [--seed N] [--set a.b=v] [--check] [--json]'); process.exit(0) }
}
if (opt.sets.length) applyOverrides(opt.sets)

// ───────────── Match runner ─────────────
const realLog = console.log
function quiet(fn) {
  const l = console.log
  console.log = () => {}
  try { return fn() } finally { console.log = l }
}

function playMatch(seed, diffA, diffB) {
  const rng = mulberry32(seed)
  Math.random = rng
  const gm = new GameManager('SIM' + seed)
  gm.initMatch({ id: 'bot_A', name: 'A' }, { id: 'bot_B', name: 'B' }, 1)
  const mgr = new BotManager(gm, { rng, all: true, difficulty: { runner: diffA, saboteur: diffB } })
  const roundsSeen = []
  const meta = []
  let guard = 0
  let lastRoundCount = 0

  while (gm.phase !== 'FINAL_RESULTS' && guard++ < 6 * 400 + 200) {
    switch (gm.phase) {
      case 'LEVEL_INTRO':
      case 'ROLE_SWITCH': {
        // Both players ready. A's difficulty follows the player, not the role.
        const roles = gm.playerRoles
        mgr.setDifficulty({
          runner: roles.bot_A === 'runner' ? diffA : diffB,
          saboteur: roles.bot_A === 'saboteur' ? diffA : diffB
        })
        mgr.draft()
        gm.phase = 'ROUND_ACTIVE'
        break
      }
      case 'ROUND_ACTIVE':
        gm.tick()
        if (gm.phase === 'ROUND_ACTIVE') mgr.tick()
        break
      case 'ACCUSATION_PHASE':
        mgr.tick()
        gm.evaluateAccusationAndReveal()
        break
      default:
        gm.advanceMatchFlow()
    }
    if (gm.roundResults.length > lastRoundCount) {
      lastRoundCount = gm.roundResults.length
      const s = gm.strategy
      meta.push({
        archetype: s.archetype?.key || 'none',
        peakHeat: s.peakHeat,
        exposures: s.exposures,
        escaped: gm.escapeProgress.isCompleted,
        comeback: s.comeback.side,
        scans: s.tools.scan.used || 0,
        locks: s.tools.lock.used || 0,
        verifies: s.tools.verify.used || 0
      })
    }
  }

  for (let i = 0; i < gm.roundResults.length; i++) {
    const r = gm.roundResults[i]
    roundsSeen.push({
      level: r.level, round: r.round,
      runnerScore: r.runnerScore, saboteurScore: r.saboteurScore,
      runnerIsA: r.runnerId === 'bot_A',
      meta: meta[i] || {}
    })
  }
  const a = gm.players.bot_A.totalScore
  const b = gm.players.bot_B.totalScore
  return { rounds: roundsSeen, aScore: a, bScore: b, finished: gm.phase === 'FINAL_RESULTS' }
}

// ───────────── Aggregation ─────────────
function blank() {
  return { rounds: 0, runnerWins: 0, saboteurWins: 0, draws: 0, rs: 0, ss: 0, escapes: 0, exposures: 0, peak: 0,
           comebackRounds: 0, comebackWins: 0, scans: 0, locks: 0, verifies: 0, byLevel: { 1: [0, 0, 0], 2: [0, 0, 0], 3: [0, 0, 0] },
           archetypes: {}, matches: 0, unfinished: 0, aWins: 0, bWins: 0, matchDraws: 0 }
}
function add(agg, m) {
  agg.matches++
  if (!m.finished) agg.unfinished++
  if (m.aScore > m.bScore) agg.aWins++
  else if (m.bScore > m.aScore) agg.bWins++
  else agg.matchDraws++
  for (const r of m.rounds) {
    agg.rounds++
    agg.rs += r.runnerScore
    agg.ss += r.saboteurScore
    const L = agg.byLevel[r.level]
    let outcome = 'draw'
    if (r.runnerScore > r.saboteurScore) { agg.runnerWins++; L[0]++; outcome = 'runner' }
    else if (r.saboteurScore > r.runnerScore) { agg.saboteurWins++; L[1]++; outcome = 'saboteur' }
    else { agg.draws++; L[2]++ }
    const mt = r.meta
    if (mt.escaped) agg.escapes++
    agg.exposures += mt.exposures || 0
    agg.peak += mt.peakHeat || 0
    agg.scans += mt.scans || 0
    agg.locks += mt.locks || 0
    agg.verifies += mt.verifies || 0
    if (mt.comeback) {
      agg.comebackRounds++
      if (outcome === mt.comeback) agg.comebackWins++
    }
    const k = mt.archetype || 'none'
    const e = (agg.archetypes[k] ||= { n: 0, sabWins: 0, sabScore: 0 })
    e.n++
    if (outcome === 'saboteur') e.sabWins++
    e.sabScore += r.saboteurScore
  }
}
const pct = (x, n) => (n ? (100 * x / n).toFixed(1) : '0.0').padStart(5) + '%'
const roleRate = (a) => (a.runnerWins + 0.5 * a.draws) / Math.max(1, a.rounds)

// ───────────── Run ─────────────
const levels = ['easy', 'normal', 'hard']
const t0 = Date.now()
const results = { mirror: {}, cross: {} }
const perLevel = Math.max(1, Math.round(opt.matches / levels.length))

quiet(() => {
  levels.forEach((lv, li) => {
    const agg = blank()
    for (let i = 0; i < perLevel; i++) add(agg, playMatch(opt.seed * 100003 + li * 7919 + i, lv, lv))
    results.mirror[lv] = agg
  })
  const pairs = [['hard', 'normal'], ['normal', 'easy'], ['hard', 'easy']]
  const perPair = Math.max(1, Math.round(opt.cross / pairs.length))
  pairs.forEach(([x, y], pi) => {
    const agg = blank()
    for (let i = 0; i < perPair; i++) add(agg, playMatch(opt.seed * 7001 + pi * 104729 + i, x, y))
    results.cross[`${x} vs ${y}`] = agg
  })
})

const secs = ((Date.now() - t0) / 1000).toFixed(1)
if (opt.json) {
  realLog(JSON.stringify(results, null, 2))
  process.exit(0)
}

const out = (s = '') => realLog(s)
const totalMatches = Object.values(results.mirror).reduce((s, a) => s + a.matches, 0) + Object.values(results.cross).reduce((s, a) => s + a.matches, 0)
out(`CivicClash balance simulation — ${totalMatches} bot-vs-bot matches (${perLevel * levels.length} mirror + ${totalMatches - perLevel * levels.length} cross-skill), seed ${opt.seed}, ${secs}s`)
if (opt.sets.length) out('Overrides: ' + opt.sets.map((p) => p.join('=')).join(', '))
out('')
out('MIRROR MATCHES (same difficulty on both seats) — role win rate per round')
out('level   rounds   Runner   Saboteur   Draw    avg R pts  avg S pts   target')
let allOk = true
for (const lv of levels) {
  const a = results.mirror[lv]
  const rr = roleRate(a)
  const ok = rr >= 0.45 && rr <= 0.55
  if (!ok) allOk = false
  out(`${lv.padEnd(7)} ${String(a.rounds).padStart(6)}  ${pct(a.runnerWins, a.rounds)}   ${pct(a.saboteurWins, a.rounds)}   ${pct(a.draws, a.rounds)}   ${(a.rs / a.rounds).toFixed(1).padStart(8)}  ${(a.ss / a.rounds).toFixed(1).padStart(8)}    ${ok ? 'OK' : 'OUT'} (runner ${(rr * 100).toFixed(1)}% incl. half-draws)`)
}
out('')
out('Per game level (all mirror difficulties combined): Runner / Saboteur / Draw')
for (const L of [1, 2, 3]) {
  const w = [0, 0, 0]
  for (const lv of levels) results.mirror[lv].byLevel[L].forEach((v, i) => (w[i] += v))
  const n = w[0] + w[1] + w[2]
  out(`  Level ${L}: ${pct(w[0], n)} / ${pct(w[1], n)} / ${pct(w[2], n)}  (${n} rounds)`)
}
out('')
out('Strategy telemetry per round (mirror)')
out('level   escape%  exposures  peak heat  scans  locks  verifies  comeback rounds won')
for (const lv of levels) {
  const a = results.mirror[lv]
  out(`${lv.padEnd(7)} ${pct(a.escapes, a.rounds)}  ${(a.exposures / a.rounds).toFixed(2).padStart(9)}  ${(a.peak / a.rounds).toFixed(1).padStart(9)}  ${(a.scans / a.rounds).toFixed(2).padStart(5)}  ${(a.locks / a.rounds).toFixed(2).padStart(5)}  ${(a.verifies / a.rounds).toFixed(2).padStart(8)}  ${a.comebackRounds ? pct(a.comebackWins, a.comebackRounds) + ' of ' + a.comebackRounds : 'n/a'}`)
}
out('')
out('Saboteur loadout archetypes (all mirror): rounds, Saboteur round-win rate, avg Saboteur points')
const arch = {}
for (const lv of levels) for (const [k, v] of Object.entries(results.mirror[lv].archetypes)) {
  const e = (arch[k] ||= { n: 0, sabWins: 0, sabScore: 0 })
  e.n += v.n; e.sabWins += v.sabWins; e.sabScore += v.sabScore
}
for (const [k, v] of Object.entries(arch).sort((a, b) => b[1].n - a[1].n)) {
  out(`  ${k.padEnd(9)} ${String(v.n).padStart(6)} rounds   ${pct(v.sabWins, v.n)}   ${(v.sabScore / v.n).toFixed(1)} pts`)
}
out('')
out('CROSS-SKILL MATCHES — does difficulty mean something? (first named side should win)')
for (const [k, a] of Object.entries(results.cross)) {
  out(`  ${k.padEnd(16)} ${a.matches} matches: ${k.split(' vs ')[0]} wins ${pct(a.aWins, a.matches)}, ${k.split(' vs ')[1]} wins ${pct(a.bWins, a.matches)}, draws ${pct(a.matchDraws, a.matches)}`)
}
const unfinished = [...Object.values(results.mirror), ...Object.values(results.cross)].reduce((s, a) => s + a.unfinished, 0)
if (unfinished) out(`\nWARNING: ${unfinished} matches did not reach FINAL_RESULTS`)
out('')
out(allOk ? 'RESULT: all mirror levels within 45-55% role balance.' : 'RESULT: at least one mirror level is outside 45-55% — tune server/balance.js and re-run.')
if (opt.check && (!allOk || unfinished)) process.exit(1)
