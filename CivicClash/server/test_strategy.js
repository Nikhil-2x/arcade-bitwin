/**
 * PATCH-C tests: loadout draft, heat meter, anti-spam, runner tools, comeback, privacy.
 * Pure Node (no sockets):  node server/test_strategy.js
 */
import assert from 'node:assert/strict'
import { GameManager } from './gameManager.js'
import { BALANCE } from './balance.js'
import { poolFor } from './loadout.js'

const log = console.log
console.log = () => {}
let passed = 0
function t(name, fn) {
  try { fn(); passed++; log(`  ok  ${name}`) } catch (e) { log(`FAIL  ${name}\n      ${e.message}`); process.exitCode = 1 }
}

function fresh(level = 1) {
  const gm = new GameManager('T')
  gm.initMatch({ id: 'p1', name: 'P1' }, { id: 'p2', name: 'P2' }, level)
  gm.phase = 'ROUND_ACTIVE'
  return gm
}
const tick = (gm, n) => { for (let i = 0; i < n; i++) gm.tick() }

t('loadout validates count, duplicates and level pool', () => {
  const gm = fresh()
  const s = gm.strategy
  assert.equal(s.setLoadout(['sab_mislead']).success, false)
  assert.equal(s.setLoadout(['sab_mislead', 'sab_mislead', 'sab_cctv']).success, false)
  assert.equal(s.setLoadout(['sab_mislead', 'sab_cctv', 'sab_panic_crowd']).success, false) // L2 ability on L1
  gm.phase = 'LEVEL_INTRO'
  assert.equal(s.setLoadout(['sab_mislead', 'sab_cctv', 'sab_lights_out']).success, true)
})

t('loadout locks at round start and hides unpicked abilities', () => {
  const gm = fresh()
  gm.phase = 'LEVEL_INTRO'
  gm.strategy.setLoadout(['sab_mislead', 'sab_cctv', 'sab_lights_out'])
  gm.phase = 'ROUND_ACTIVE'
  assert.equal(gm.strategy.setLoadout(['sab_distract', 'sab_discourage', 'sab_false_lead']).success, false)
  const ids = gm.saboteurAbilities.map((a) => a.id).sort()
  assert.deepEqual(ids, ['sab_cctv', 'sab_escape', 'sab_lights_out', 'sab_mislead'])
  assert.equal(gm.handleSaboteurAbility('sab_distract').success, false)
})

t('undrafted saboteur is auto-drafted with level defaults', () => {
  const gm = fresh()
  tick(gm, 6)
  gm.handleSaboteurAbility('sab_mislead')
  assert.ok(gm.strategy.loadout && gm.strategy.autoDrafted)
})

t('heat comes from balance.js, not the old hard-coded numbers', () => {
  const gm = fresh()
  gm.phase = 'LEVEL_INTRO'
  gm.strategy.setLoadout(['sab_mislead', 'sab_cctv', 'sab_lights_out'])
  gm.phase = 'ROUND_ACTIVE'
  tick(gm, 6)
  const before = gm.suspicionLevel
  assert.equal(gm.handleSaboteurAbility('sab_cctv').success, true)
  assert.equal(gm.suspicionLevel, before + BALANCE.heat.perAbility.sab_cctv)
})

t('global cooldown stops ability spam', () => {
  const gm = fresh()
  gm.phase = 'LEVEL_INTRO'
  gm.strategy.setLoadout(['sab_mislead', 'sab_cctv', 'sab_lights_out'])
  gm.phase = 'ROUND_ACTIVE'
  tick(gm, 6)
  assert.equal(gm.handleSaboteurAbility('sab_mislead').success, true)
  const r = gm.handleSaboteurAbility('sab_lights_out')
  assert.equal(r.success, false)
  assert.match(r.message, /wait/i)
})

t('failed abilities refund energy, cooldown and heat', () => {
  const gm = fresh()
  gm.phase = 'LEVEL_INTRO'
  gm.strategy.setLoadout(['sab_mislead', 'sab_cctv', 'sab_lights_out'])
  gm.phase = 'ROUND_ACTIVE'
  tick(gm, 6)
  assert.equal(gm.handleSaboteurAbility('sab_lights_out').success, true)
  tick(gm, 20)
  const e = gm.sabotageEnergy, h = gm.suspicionLevel
  const r = gm.handleSaboteurAbility('sab_lights_out') // already off
  assert.equal(r.success, false)
  assert.equal(gm.sabotageEnergy, e)
  assert.equal(gm.suspicionLevel, h)
  assert.equal(gm.saboteurAbilities.find((a) => a.id === 'sab_lights_out').currentCooldownSec, 0)
})

t('exposure locks abilities, drops heat and rewards the Runner', () => {
  const gm = fresh()
  gm.phase = 'LEVEL_INTRO'
  gm.strategy.setLoadout(['sab_mislead', 'sab_cctv', 'sab_lights_out'])
  gm.phase = 'ROUND_ACTIVE'
  gm.strategy.addHeat(100)
  assert.equal(gm.strategy.band(), 'EXPOSED')
  assert.equal(gm.suspicionLevel, BALANCE.heat.exposedHeatAfter)
  const r = gm.handleSaboteurAbility('sab_mislead')
  assert.equal(r.success, false)
  assert.match(r.message, /Exposed/)
  assert.ok(gm.scoreEvents.some((e) => e.eventType === 'HEAT_EXPOSED' && e.role === 'runner'))
  tick(gm, BALANCE.heat.exposedLockoutSec + 1)
  assert.notEqual(gm.strategy.band(), 'EXPOSED')
})

t('heat decays over time', () => {
  const gm = fresh()
  gm.strategy.addHeat(30)
  const h = gm.suspicionLevel
  tick(gm, 30)
  assert.ok(gm.suspicionLevel < h)
})

t('Level 2/3 abilities now have real effects (they used to do nothing)', () => {
  for (const [level, picks, target] of [
    [2, ['sab_jam_shutter', 'sab_panic_crowd', 'sab_tamper_alarm'], 'obj_exit_shutter'],
    [3, ['sab_tamper_desk', 'sab_lock_kiosk', 'sab_cut_camera'], 'obj_safety_records']
  ]) {
    const gm = fresh(level)
    gm.phase = 'LEVEL_INTRO'
    assert.equal(gm.strategy.setLoadout(picks).success, true)
    gm.phase = 'ROUND_ACTIVE'
    tick(gm, 6)
    const r = gm.handleSaboteurAbility(picks[0])
    assert.equal(r.success, true, `L${level} ${picks[0]}: ${r.message}`)
    assert.ok(gm.scoreEvents.some((e) => e.role === 'saboteur'))
    assert.equal(gm.objects[target].sabotaged, true)
  }
})

t('sabotaged object blocks the Runner, pays the Saboteur, and expires', () => {
  const gm = fresh(3)
  gm.phase = 'LEVEL_INTRO'
  gm.strategy.setLoadout(['sab_tamper_desk', 'sab_lock_kiosk', 'sab_cut_camera'])
  gm.phase = 'ROUND_ACTIVE'
  tick(gm, 6)
  gm.handleSaboteurAbility('sab_tamper_desk')
  const r = gm.handleObjectAction('obj_safety_records', 'collect', 'runner')
  assert.equal(r.success, false)
  assert.match(r.message, /sabotaged/)
  assert.ok(gm.scoreEvents.some((e) => e.eventType === 'DISRUPTION_1'))
  tick(gm, BALANCE.runnerTools.sabotageDurationSec + 1)
  assert.equal(gm.objects.obj_safety_records.sabotaged, false)
  assert.equal(gm.handleObjectAction('obj_safety_records', 'collect', 'runner').success, true)
})

t('lock tool blocks sabotage, flags the culprit and gives the Runner evidence', () => {
  const gm = fresh()
  gm.phase = 'LEVEL_INTRO'
  gm.strategy.setLoadout(['sab_mislead', 'sab_cctv', 'sab_lights_out'])
  gm.phase = 'ROUND_ACTIVE'
  tick(gm, 6)
  assert.equal(gm.strategy.useTool('lock', 'obj_cctv').success, true)
  const h = gm.suspicionLevel, e = gm.sabotageEnergy
  const r = gm.handleSaboteurAbility('sab_cctv')
  assert.equal(r.success, false)
  assert.equal(r.blocked, true)
  assert.equal(gm.sabotageEnergy, e)
  assert.equal(gm.suspicionLevel, h + BALANCE.heat.blockedAttemptHeat)
  assert.ok(gm.informationLog.some((i) => i.id === 'ev_attempt_obj_cctv' && i.verified))
})

t('scan finds tampering, logs verified evidence, and misses cost a use', () => {
  const gm = fresh()
  gm.phase = 'LEVEL_INTRO'
  gm.strategy.setLoadout(['sab_mislead', 'sab_cctv', 'sab_lights_out'])
  gm.phase = 'ROUND_ACTIVE'
  tick(gm, 6)
  gm.handleSaboteurAbility('sab_cctv')
  const hit = gm.strategy.useTool('scan', 'obj_cctv')
  assert.equal(hit.found, true)
  assert.ok(gm.informationLog.some((i) => i.id === 'ev_scan_obj_cctv' && i.verified))
  const usesBefore = gm.strategy.tools.scan.uses
  tick(gm, BALANCE.runnerTools.scan.cooldownSec + 1)
  const miss = gm.strategy.useTool('scan', 'obj_phone')
  assert.equal(miss.found, false)
  assert.equal(gm.strategy.tools.scan.uses, usesBefore - 1)
})

t('tools are limited: uses and cooldowns are enforced', () => {
  const gm = fresh()
  const s = gm.strategy
  assert.equal(s.useTool('scan', 'obj_phone').success, true)
  assert.match(s.useTool('scan', 'obj_phone').message, /Cooling/)
  s.tools.scan.cooldownUntil = -1
  s.tools.scan.uses = 0
  assert.match(s.useTool('scan', 'obj_phone').message, /No uses/)
  assert.equal(s.useTool('scan', 'not_a_thing').success, false)
})

t('verify debunks the false lead and burns the Saboteur', () => {
  const gm = fresh()
  gm.phase = 'LEVEL_INTRO'
  gm.strategy.setLoadout(['sab_false_lead', 'sab_cctv', 'sab_lights_out'])
  gm.phase = 'ROUND_ACTIVE'
  tick(gm, 6)
  assert.equal(gm.handleSaboteurAbility('sab_false_lead').success, true)
  const h = gm.suspicionLevel
  const r = gm.strategy.useTool('verify', 'info_false_lead')
  assert.equal(r.success, true)
  assert.equal(gm.suspicionLevel, h + BALANCE.heat.debunkHeat)
  assert.equal(gm.informationLog.find((i) => i.id === 'info_false_lead').reliability, 'DEBUNKED')
})

t('call for help is single-use and shortens active sabotage', () => {
  const gm = fresh(3)
  gm.phase = 'LEVEL_INTRO'
  gm.strategy.setLoadout(['sab_tamper_desk', 'sab_lock_kiosk', 'sab_cut_camera'])
  gm.phase = 'ROUND_ACTIVE'
  tick(gm, 6)
  gm.handleSaboteurAbility('sab_tamper_desk')
  const before = gm.objects.obj_safety_records.sabotagedUntil
  assert.equal(gm.strategy.useTool('help').success, true)
  assert.equal(gm.objects.obj_safety_records.sabotagedUntil, before - BALANCE.runnerTools.help.sabotageShortenSec)
  assert.equal(gm.strategy.useTool('help').success, false)
})

t('comeback: trailing player gets a bonus only past the gap threshold', () => {
  const gm = fresh()
  gm.players.p1.totalScore = 90
  gm.players.p2.totalScore = 90 - (BALANCE.comeback.gapThreshold - 1)
  gm.strategy.reset()
  assert.equal(gm.strategy.comeback.side, null)
  gm.players.p2.totalScore = 90 - BALANCE.comeback.gapForMax
  gm.strategy.reset()
  const trailingRole = gm.playerRoles.p2
  assert.equal(gm.strategy.comeback.side, trailingRole)
  assert.ok(gm.strategy.comeback.scale > 0.9)
  if (trailingRole === 'runner') assert.equal(gm.strategy.tools.scan.uses, BALANCE.runnerTools.scan.uses + BALANCE.comeback.runnerExtraToolUses)
})

t('anti-snowball: per-role per-round points are capped', () => {
  const gm = fresh()
  for (let i = 0; i < 40; i++) gm.awardScore(null, 'runner', 'EVT_' + i, 20, 'x')
  const total = gm.scoreEvents.filter((e) => e.role === 'runner').reduce((s, e) => s + e.points, 0)
  assert.ok(total <= BALANCE.comeback.roundPointsCap)
})

t('escape cannot be started before the earliest time or while exposed', () => {
  const gm = fresh()
  assert.equal(gm.startEscapeChannel({ x: 18, z: 18 }, 'p2').success, false)
  tick(gm, BALANCE.escape.earliestSec)
  assert.equal(gm.startEscapeChannel({ x: 18, z: 18 }, 'p2').success, true)
})

t('privacy: Runner telemetry never contains heat, loadout or energy', () => {
  const gm = fresh()
  gm.phase = 'LEVEL_INTRO'
  gm.strategy.setLoadout(['sab_mislead', 'sab_cctv', 'sab_lights_out'])
  gm.phase = 'ROUND_ACTIVE'
  gm.strategy.addHeat(20)
  const rt = gm.getTelemetryForPlayer('p1', 'runner')
  const json = JSON.stringify(rt)
  assert.equal(rt.suspicionLevel, undefined)
  assert.equal(rt.sabotageEnergy, undefined)
  assert.ok(!/"heat"|"loadout"|"archetype"|sab_mislead/.test(json), 'runner payload leaks saboteur strategy')
  const st = gm.getTelemetryForPlayer('p2', 'saboteur')
  assert.ok(typeof st.strategy.heat === 'number' && st.strategy.loadout.length === 3)
  // world objects broadcast to both players must not carry ability ids
  gm.tick()
  assert.ok(!/sab_/.test(JSON.stringify(gm.objects)), 'object state leaks ability ids')
  assert.ok(!/sab_/.test(JSON.stringify(gm.npcs)), 'npc state leaks ability ids')
})

t('every level has a draftable pool larger than the pick count', () => {
  for (const L of [1, 2, 3]) assert.ok(poolFor(L).length > BALANCE.loadout.picks)
  for (const L of [1, 2, 3]) for (const d of poolFor(L)) {
    assert.ok(BALANCE.abilities[d.id], `missing stats for ${d.id}`)
    assert.ok(BALANCE.heat.perAbility[d.id] > 0, `missing heat for ${d.id}`)
  }
})

log(`\n${passed} strategy tests passed${process.exitCode ? ' (with failures)' : ''}`)
