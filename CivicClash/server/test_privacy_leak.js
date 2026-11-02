/**
 * Role-privacy leak test over every outbound payload builder.
 *   node server/test_privacy_leak.js
 *
 * Plays full bot-vs-bot matches headlessly and, at every phase change plus every
 * 5th second of play, builds each payload the server would emit and checks what
 * the OPPONENT of the Saboteur (the Runner) could see.
 * Scope: payload builders in GameManager (no sockets). It does not cover
 * ad-hoc emits written inline in server.js.
 */
import { GameManager } from './gameManager.js'
import { BotManager, mulberry32 } from './botBrain.js'

const log = console.log
console.log = () => {}

// Things only the Saboteur may ever receive during live phases.
const SABOTEUR_ONLY_KEYS = [
  'sabotageEnergy', 'suspicionLevel', 'saboteurAbilities', 'saboteurObjectives', 'availableDefenseNarratives',
  'heat', 'loadout', 'archetype', 'lockoutSec', 'globalCooldownSec', 'escapeEarliestSec', 'abilityId'
]
const LIVE = new Set(['ROUND_ACTIVE', 'ACCUSATION_PHASE', 'LEVEL_INTRO', 'ROLE_SWITCH'])

const problems = new Map()
let payloads = 0
function flag(kind, where, detail) {
  const k = `${kind} @ ${where}`
  if (!problems.has(k)) problems.set(k, detail)
}

// Only what survives JSON serialisation can leak (undefined values are dropped on the wire).
function keysDeep(o, out = new Set()) {
  if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (v !== undefined) out.add(k); keysDeep(v, out) }
  return out
}
// Past-round results are revealed to both players by design (roles swap each round).
const PAST_ROUND_FIELDS = ['roundResults', 'levelSummaries', 'finalResult', 'latestVerdictReveal', 'latestCivicDebrief']
function livePart(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return p
  const c = { ...p }
  for (const f of PAST_ROUND_FIELDS) delete c[f]
  return c
}

function checkRunnerBound(name, payload, phase) {
  payloads++
  const keys = keysDeep(payload)
  for (const k of SABOTEUR_ONLY_KEYS) if (keys.has(k)) flag('saboteur-only key in runner payload', `${name}.${k}`, `phase ${phase}`)
  const json = JSON.stringify(payload)
  if (/"sab_[a-z_]+"/.test(json)) flag('ability id in runner payload', name, json.match(/"sab_[a-z_]+"/)[0])
}

function checkShared(name, payload, phase, gm) {
  payload = livePart(payload)
  payloads++
  checkRunnerBound(name, payload, phase)
  const json = JSON.stringify(payload)
  if (LIVE.has(phase) && phase !== 'ROLE_SWITCH' && phase !== 'LEVEL_INTRO') {
    // Roles must not be derivable from shared payloads while a round is live.
    for (const [pid, role] of Object.entries(gm.playerRoles)) {
      if (json.includes(`"${pid}":"${role}"`)) flag('player->role mapping in shared payload', name, `phase ${phase}`)
    }
    if (/"(runnerScore|saboteurScore)"/.test(json)) flag('per-role score in shared payload during live phase', name, `phase ${phase}`)
  }
  if (/interactedWithSaboteur/.test(json)) {
    flag('npc.interactedWithSaboteur broadcast to both players', name, 'reveals whom the Saboteur talked to')
  }
}

function sample(gm, rIdFn) {
  const phase = gm.phase
  const runnerId = Object.keys(gm.playerRoles).find((p) => gm.playerRoles[p] === 'runner')
  checkRunnerBound('telemetry(runner)', gm.getTelemetryForPlayer(runnerId, 'runner'), phase)
  checkShared('getTelemetry()', gm.getTelemetry(), phase, gm)
  checkShared('getMatchState()', gm.getMatchState(), phase, gm)
  checkShared('worldState.npcs', gm.npcs, phase, gm)
  checkShared('worldState.objects', gm.objects, phase, gm)
  checkShared('worldState.informationLog', gm.informationLog, phase, gm)
  checkShared('eventFeed', gm.eventFeed, phase, gm)
  // The Saboteur must still receive its own strategy view.
  const sabId = Object.keys(gm.playerRoles).find((p) => gm.playerRoles[p] === 'saboteur')
  const st = gm.getTelemetryForPlayer(sabId, 'saboteur')
  if (!st.strategy || typeof st.strategy.heat !== 'number') flag('saboteur lost its own strategy view', 'telemetry(saboteur)', `phase ${phase}`)
}

for (let seed = 1; seed <= 6; seed++) {
  const rng = mulberry32(seed * 977)
  Math.random = rng
  const gm = new GameManager('LEAK' + seed)
  gm.initMatch({ id: 'bot_A', name: 'A' }, { id: 'bot_B', name: 'B' }, 1)
  const mgr = new BotManager(gm, { rng, all: true, difficulty: seed % 2 ? 'normal' : 'hard' })
  let guard = 0, lastPhase = '', n = 0
  while (gm.phase !== 'FINAL_RESULTS' && guard++ < 4000) {
    if (gm.phase !== lastPhase || n % 5 === 0) sample(gm)
    lastPhase = gm.phase
    n++
    switch (gm.phase) {
      case 'LEVEL_INTRO': case 'ROLE_SWITCH': mgr.draft(); gm.phase = 'ROUND_ACTIVE'; break
      case 'ROUND_ACTIVE': gm.tick(); if (gm.phase === 'ROUND_ACTIVE') mgr.tick(); break
      case 'ACCUSATION_PHASE': mgr.tick(); gm.evaluateAccusationAndReveal(); break
      default: gm.advanceMatchFlow()
    }
  }
}

console.log = log
log(`Checked ${payloads} outbound payload samples across 6 simulated matches.`)
if (problems.size) {
  log(`\n${problems.size} distinct leak(s) found:`)
  for (const [k, d] of problems) log(`  - ${k}  (${d})`)
  process.exit(1)
}
log('No role-privacy leaks found.')
