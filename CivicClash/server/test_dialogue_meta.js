/**
 * Dialogue preview tests: what the UI promises must match what the server does.
 *   node server/test_dialogue_meta.js
 */
import assert from 'node:assert/strict'
import { GameManager } from './gameManager.js'
import { OPTION_META } from './dialogueMeta.js'

const log = console.log
console.log = () => {}
let passed = 0
function t(name, fn) {
  try { fn(); passed++; log(`  ok  ${name}`) } catch (e) { log(`FAIL  ${name}\n      ${e.message}`); process.exitCode = 1 }
}

const LEVEL_OF = { sunil: 2, deepak: 2, meera: 2, rajesh: 2, verma: 2, laxman: 3, bose: 3, kishore: 3, gupta: 3 }
function npcOf(optionId) {
  return 'npc_' + optionId.replace(/^sab_/, '').split('_')[0]
}
function fresh(level) {
  const gm = new GameManager('T')
  gm.initMatch({ id: 'p1', name: 'P1' }, { id: 'p2', name: 'P2' }, level)
  gm.phase = 'ROUND_ACTIVE'
  gm.sabotageEnergy = 100
  return gm
}

for (const [optionId, meta] of Object.entries(OPTION_META)) {
  if (!meta.effects || meta.needs) continue
  const npcKey = npcOf(optionId).replace('npc_', '')
  const level = LEVEL_OF[npcKey] || 1
  const role = optionId.startsWith('sab_') ? 'saboteur' : 'runner'
  t(`preview matches real effect: ${optionId}`, () => {
    const gm = fresh(level)
    const npc = gm.npcs[npcOf(optionId)]
    assert.ok(npc, `npc ${npcOf(optionId)} exists at level ${level}`)
    npc.trust = 50; npc.fear = 50; npc.cooperation = 60
    const res = gm.handleDialogueChoice(npc.id, optionId, role, role === 'runner' ? 'p1' : 'p2')
    assert.equal(res.success, true)
    for (const stat of ['trust', 'fear', 'cooperation']) {
      assert.equal(res.effects[stat], meta.effects[stat] || 0, `${stat} delta for ${optionId}`)
    }
  })
}

t('repeating an option gives zero effect and outcome "repeat"', () => {
  const gm = fresh(1)
  gm.handleDialogueChoice('npc_ramesh', 'ramesh_opt_A', 'runner', 'p1')
  const again = gm.handleDialogueChoice('npc_ramesh', 'ramesh_opt_A', 'runner', 'p1')
  assert.equal(again.outcome, 'repeat')
  assert.deepEqual(again.effects, { trust: 0, fear: 0, cooperation: 0 })
})

t('threatening a witness is classified as a backfire', () => {
  const gm = fresh(1)
  const res = gm.handleDialogueChoice('npc_ramesh', 'ramesh_opt_C', 'runner', 'p1')
  assert.equal(res.outcome, 'backfire')
})

t('every option the runner is offered carries a preview', () => {
  for (const [level, npcs] of [[1, ['arjun', 'ramesh', 'priya', 'amit', 'sharma']], [2, ['sunil', 'deepak', 'meera', 'rajesh', 'verma']], [3, ['laxman', 'bose', 'kishore', 'gupta']]]) {
    const gm = fresh(level)
    for (const n of npcs) {
      const s = gm.getDialogueSession('npc_' + n, 'runner', 'p1')
      if (!s) continue
      for (const o of s.options) assert.ok(o.preview, `${o.id} has a preview`)
    }
  }
})

t('Runner sees a "counters" hint only when the Saboteur has manipulated the NPC', () => {
  const gm = fresh(1)
  let s = gm.getDialogueSession('npc_ramesh', 'runner', 'p1')
  assert.equal(s.options.find((o) => o.id === 'ramesh_opt_B').preview.counters, null)
  gm.npcs.npc_ramesh.manipulated = true
  s = gm.getDialogueSession('npc_ramesh', 'runner', 'p1')
  assert.ok(s.options.find((o) => o.id === 'ramesh_opt_B').preview.counters)
})

t('Saboteur previews never leak to the Runner session', () => {
  const gm = fresh(1)
  const s = gm.getDialogueSession('npc_ramesh', 'runner', 'p1')
  assert.ok(s.options.every((o) => !o.id.startsWith('sab_') && !o.preview.heat))
})

t('a player cannot accuse themselves', () => {
  const gm = fresh(1)
  gm.phase = 'ACCUSATION_PHASE'
  gm.submitVerdict('p1', 'runner', { suspectId: 'p1', selectedEvidenceIds: [] })
  assert.equal(gm.sealedVerdicts.p1.suspectId, 'insufficient_evidence')
})

log(`\n${passed} dialogue-meta checks passed`)
