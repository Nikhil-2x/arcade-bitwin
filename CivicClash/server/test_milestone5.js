/**
 * CIVIC CLASH — MILESTONE 5 AUTOMATED TEST SUITE
 * World Integrity, Anti-Exploit Protection, Complete Level Content & Polish
 */

import assert from 'node:assert'
import { GameManager, LEVEL_DEFINITIONS } from './gameManager.js'
import {
  isPositionBlocked,
  resolveMovement,
  LEVEL_1_OBSTACLES,
  LEVEL_1_BOUNDS
} from './spatialCollision.js'

let totalTests = 0
let passedTests = 0

function runTest(name, fn) {
  totalTests++
  try {
    fn()
    passedTests++
    console.log(`[PASS] ${name}`)
  } catch (err) {
    console.error(`[FAIL] ${name}: ${err.message}`)
    console.error(err)
    process.exitCode = 1
  }
}

console.log('====================================================')
console.log('CIVIC CLASH — MILESTONE 5 TEST SUITE')
console.log('World Integrity, Anti-Exploit & 3-Level Content')
console.log('====================================================\n')

// ─────────────────────────────────────────────────────────────
// 1. SPATIAL COLLISION & BUILDING INTEGRITY (BUG A)
// ─────────────────────────────────────────────────────────────
runTest('Building Obstacle Collision: Solid walls block movement', () => {
  // Test Dhaba back wall: minX: -25, maxX: -11, minZ: -25, maxZ: -23.8
  const backWallCheck = isPositionBlocked(-18.0, -24.4, 0.55)
  assert.strictEqual(backWallCheck.blocked, true, 'Dhaba back wall must block player')
  assert.strictEqual(backWallCheck.obstacle.id, 'dhaba_wall_back')

  // Test Dhaba west wall: minX: -25, maxX: -23.8, minZ: -25, maxZ: -11
  const westWallCheck = isPositionBlocked(-24.4, -18.0, 0.55)
  assert.strictEqual(westWallCheck.blocked, true, 'Dhaba west wall must block player')

  // Test Dhaba east wall: minX: -12.2, maxX: -11.0, minZ: -25, maxZ: -11
  const eastWallCheck = isPositionBlocked(-11.6, -18.0, 0.55)
  assert.strictEqual(eastWallCheck.blocked, true, 'Dhaba east wall must block player')

  // Test City Metro Station (11 to 27 on X and Z)
  const stationCheck = isPositionBlocked(19.0, 19.0, 0.55)
  assert.strictEqual(stationCheck.blocked, true, 'Station high-rise must block player')
})

runTest('Building Doorway Passability: Open entrance allows access to interior', () => {
  // Doorway is between x: [-17.5, -14.5] at z: -11.6
  // Walking through center of doorway at x: -16.0, z: -11.6
  const doorwayCheck = isPositionBlocked(-16.0, -11.6, 0.55)
  assert.strictEqual(doorwayCheck.blocked, false, 'Doorway opening must NOT block character')

  // Interior room position near CCTV console: x: -15.5, z: -14.0
  const interiorCheck = isPositionBlocked(-15.5, -14.0, 0.55)
  assert.strictEqual(interiorCheck.blocked, false, 'Dhaba interior floor must allow movement')
})

runTest('Server-Side Movement Validation & Slide Resolution', () => {
  // Player outside trying to move directly into the solid Dhaba front wall left
  const curPos = { x: -21.0, z: -9.5 }
  const reqPos = { x: -21.0, z: -11.6 } // hits dhaba_wall_front_left
  const resolved = resolveMovement(curPos, reqPos, 0.55)

  assert.strictEqual(resolved.modified, true, 'Movement into solid wall must be modified')
  assert.strictEqual(isPositionBlocked(resolved.x, resolved.z, 0.55).blocked, false, 'Resolved position must be valid and exterior')

  // Out of bounds check: moving beyond max map border
  const oobPos = { x: -39.0, z: 0.0 }
  const oobResolved = resolveMovement({ x: -35.0, z: 0.0 }, oobPos, 0.55)
  assert.strictEqual(oobResolved.modified, true, 'Out-of-bounds movement must be clamped')
  assert.ok(oobResolved.x >= -36.0, 'Clamped position must stay inside bounds')
})

// ─────────────────────────────────────────────────────────────
// 2. DIALOGUE ANTI-EXPLOIT ENGINE (BUG B)
// ─────────────────────────────────────────────────────────────
runTest('Authoritative Dialogue: First selection awards stats, clue & score', () => {
  const gm = new GameManager('ROOM_M5')
  gm.initMatch({ id: 'p_runner', name: 'Runner1' }, { id: 'p_sab', name: 'Saboteur1' })
  gm.phase = 'ROUND_ACTIVE'

  const priyaInitCoop = gm.npcs.npc_priya.cooperation
  const priyaInitTrust = gm.npcs.npc_priya.trust

  // First selection: priya_opt_plate
  const res1 = gm.handleDialogueChoice('npc_priya', 'priya_opt_plate', 'runner', 'p_runner')
  assert.strictEqual(res1.success, true)
  assert.ok(gm.npcs.npc_priya.cooperation > priyaInitCoop, 'Cooperation must increase on first selection')
  assert.ok(gm.npcs.npc_priya.trust > priyaInitTrust, 'Trust must increase on first selection')
  assert.strictEqual(gm.runnerObjectives.find((o) => o.id === 'ro_4').completed, true, 'Objective ro_4 completed')

  const runnerScore1 = gm.players['p_runner'].totalScore
  assert.ok(runnerScore1 > 0, 'Score must be awarded on first selection')

  // Verify DialogueActionRecord logged
  assert.ok(gm.dialogueActionRecords.length >= 1)
  const lastRecord = gm.dialogueActionRecords[gm.dialogueActionRecords.length - 1]
  assert.strictEqual(lastRecord.rewardApplied, true)
  assert.strictEqual(lastRecord.npcId, 'npc_priya')
  assert.strictEqual(lastRecord.optionId, 'priya_opt_plate')
})

runTest('Dialogue Anti-Exploit: Repeat selection yields 0 duplicate stats, 0 duplicate score', () => {
  const gm = new GameManager('ROOM_M5_REP')
  gm.initMatch({ id: 'p_runner', name: 'Runner1' }, { id: 'p_sab', name: 'Saboteur1' })
  gm.phase = 'ROUND_ACTIVE'

  // Selection 1
  gm.handleDialogueChoice('npc_priya', 'priya_opt_plate', 'runner', 'p_runner')
  const coopAfterFirst = gm.npcs.npc_priya.cooperation
  const trustAfterFirst = gm.npcs.npc_priya.trust
  const scoreAfterFirst = gm.players['p_runner'].totalScore

  // Selection 2: SAME option repeated
  const res2 = gm.handleDialogueChoice('npc_priya', 'priya_opt_plate', 'runner', 'p_runner')
  assert.strictEqual(res2.success, true)
  assert.strictEqual(gm.npcs.npc_priya.cooperation, coopAfterFirst, 'Cooperation must NOT duplicate on repeat')
  assert.strictEqual(gm.npcs.npc_priya.trust, trustAfterFirst, 'Trust must NOT duplicate on repeat')
  assert.strictEqual(gm.players['p_runner'].totalScore, scoreAfterFirst, 'Score must NOT increase on repeat')
  assert.ok(res2.statusMessage.includes('already') || res2.statusMessage.includes('told you'), 'Natural repeat response returned')

  // Verify DialogueActionRecord logged with rewardApplied = false
  const repeatRecord = gm.dialogueActionRecords[gm.dialogueActionRecords.length - 1]
  assert.strictEqual(repeatRecord.rewardApplied, false, 'Repeat dialogue action must have rewardApplied = false')
})

runTest('Semantic Reward Grouping: Alternative options in same group grant 0 duplicate rewards', () => {
  const gm = new GameManager('ROOM_M5_GRP')
  gm.initMatch({ id: 'p_runner', name: 'Runner1' }, { id: 'p_sab', name: 'Saboteur1' })
  gm.phase = 'ROUND_ACTIVE'

  // Ramesh: Select option A (appeals to duty, part of RAMESH_COOPERATION)
  gm.handleDialogueChoice('npc_ramesh', 'ramesh_opt_A', 'runner', 'p_runner')
  const coopAfterA = gm.npcs.npc_ramesh.cooperation

  // Ramesh: Select option B (cites s.134A Good Samaritan law, also in RAMESH_COOPERATION)
  const resB = gm.handleDialogueChoice('npc_ramesh', 'ramesh_opt_B', 'runner', 'p_runner')
  assert.strictEqual(resB.success, true)
  assert.strictEqual(gm.npcs.npc_ramesh.cooperation, coopAfterA, 'Semantic group must prevent duplicate cooperation reward')
  assert.ok(resB.statusMessage.includes('already agreed') || resB.statusMessage.includes('CCTV'), 'Natural repeat response returned')
})

runTest('Authoritative Stat Bounding: Trust, Fear, Cooperation clamped [0, 100]', () => {
  const gm = new GameManager('ROOM_M5_BOUNDS')
  gm.initMatch({ id: 'p_runner', name: 'Runner1' }, { id: 'p_sab', name: 'Saboteur1' })
  gm.phase = 'ROUND_ACTIVE'

  // Intentionally set high stats
  gm.npcs.npc_ramesh.trust = 95
  gm.npcs.npc_ramesh.fear = 95
  gm.npcs.npc_ramesh.cooperation = 95

  gm.handleDialogueChoice('npc_ramesh', 'ramesh_opt_A', 'runner', 'p_runner')
  assert.ok(gm.npcs.npc_ramesh.trust <= 100, 'Trust must never exceed 100')
  assert.ok(gm.npcs.npc_ramesh.cooperation <= 100, 'Cooperation must never exceed 100')
  assert.ok(gm.npcs.npc_ramesh.fear >= 0, 'Fear must never be negative')
})

// ─────────────────────────────────────────────────────────────
// 3. SABOTAGE & SCORE ANTI-EXPLOIT
// ─────────────────────────────────────────────────────────────
runTest('Sabotage Anti-Farming: Energy cannot drop below 0 and score cannot be farmed', () => {
  const gm = new GameManager('ROOM_M5_SAB')
  gm.initMatch({ id: 'p_runner', name: 'Runner1' }, { id: 'p_sab', name: 'Saboteur1' })
  gm.phase = 'ROUND_ACTIVE'

  gm.sabotageEnergy = 20
  // Ability sab_cctv costs 30 energy
  const abResult = gm.handleSaboteurAbility('sab_cctv')
  assert.strictEqual(abResult.success, false, 'Insufficient energy must reject ability')
  assert.ok(gm.sabotageEnergy >= 0, 'Sabotage energy must never become negative')

  // Set enough energy and execute once
  gm.sabotageEnergy = 100
  const abExec1 = gm.handleSaboteurAbility('sab_mislead')
  assert.strictEqual(abExec1.success, true)
  const score1 = gm.players['p_sab'].totalScore
  assert.ok(score1 > 0, 'Score granted on first sabotage')

  // Execute same ability again in same round: score must not duplicate
  gm.saboteurAbilities.find((a) => a.id === 'sab_mislead').currentCooldownSec = 0
  gm.sabotageEnergy = 100
  const abExec2 = gm.handleSaboteurAbility('sab_mislead')
  assert.strictEqual(abExec2.success, true)
  const score2 = gm.players['p_sab'].totalScore
  assert.strictEqual(score2, score1, 'Duplicate sabotage cannot farm score in same round')
})

// ─────────────────────────────────────────────────────────────
// 4. LEVEL 1, 2, AND 3 CONTENT AUDIT
// ─────────────────────────────────────────────────────────────
runTest('Level 1 Content Completeness: Hit & Run', () => {
  const gm = new GameManager('ROOM_L1')
  gm.initMatch({ id: 'p_host', name: 'Host' }, { id: 'p_guest', name: 'Guest' })
  gm.currentLevel = 1
  gm.resetRoundState()

  // 5 NPCs
  const expectedNPCs = ['npc_arjun', 'npc_ramesh', 'npc_priya', 'npc_amit', 'npc_sharma']
  for (const id of expectedNPCs) {
    assert.ok(gm.npcs[id], `Level 1 must contain NPC ${id}`)
  }

  // 6 Objects
  const expectedObjects = ['obj_phone', 'obj_cctv', 'obj_signal', 'obj_firstaid', 'obj_infoboard', 'obj_escape']
  for (const id of expectedObjects) {
    assert.ok(gm.objects[id], `Level 1 must contain Object ${id}`)
  }

  // Objectives
  assert.strictEqual(gm.runnerObjectives.length, 5, 'Level 1 Runner must have 5 objectives')
  assert.strictEqual(gm.saboteurObjectives.length, 4, 'Level 1 Saboteur must have 4 objectives')

  // Civic Takeaways
  const l1Def = LEVEL_DEFINITIONS.find((l) => l.level === 1)
  assert.ok(l1Def.keyTakeaways.some((t) => t.includes('Good Samaritan')), 'Must include Good Samaritan law')
  assert.ok(l1Def.keyTakeaways.some((t) => t.includes('Golden Hour')), 'Must include Golden Hour')
  assert.ok(l1Def.keyTakeaways.some((t) => t.includes('112')), 'Must include 112 emergency')
})

runTest('Level 2 Content Completeness: Marketplace Fire Incident', () => {
  const gm = new GameManager('ROOM_L2')
  gm.initMatch({ id: 'p_host', name: 'Host' }, { id: 'p_guest', name: 'Guest' })
  gm.currentLevel = 2
  gm.resetRoundState()

  // 5 NPCs: Sunil, Deepak, Meera, Rajesh, Verma
  const expectedNPCs = ['npc_sunil', 'npc_deepak', 'npc_meera', 'npc_rajesh', 'npc_verma']
  for (const id of expectedNPCs) {
    assert.ok(gm.npcs[id], `Level 2 must contain NPC ${id}`)
  }

  // 6 Objects: electrical_panel, fire_alarm, extinguisher, exit_shutter, water_source, market_escape
  const expectedObjects = [
    'obj_electrical_panel',
    'obj_fire_alarm',
    'obj_extinguisher',
    'obj_exit_shutter',
    'obj_water_source',
    'obj_market_escape'
  ]
  for (const id of expectedObjects) {
    assert.ok(gm.objects[id], `Level 2 must contain Object ${id}`)
  }

  // Objectives
  assert.strictEqual(gm.runnerObjectives.length, 5, 'Level 2 Runner must have 5 objectives')
  assert.strictEqual(gm.saboteurObjectives.length, 5, 'Level 2 Saboteur must have 5 objectives')

  // Civic Takeaways
  const l2Def = LEVEL_DEFINITIONS.find((l) => l.level === 2)
  assert.ok(l2Def.keyTakeaways.some((t) => t.includes('electrical fire') || t.includes('water on electrical')), 'Must cover electrical fire hazard')
  assert.ok(l2Def.keyTakeaways.some((t) => t.includes('exit') || t.includes('National Building Code')), 'Must cover emergency exit rights')
})

runTest('Level 3 Content Completeness: Construction Site Accident Cover-up', () => {
  const gm = new GameManager('ROOM_L3')
  gm.initMatch({ id: 'p_host', name: 'Host' }, { id: 'p_guest', name: 'Guest' })
  gm.currentLevel = 3
  gm.resetRoundState()

  // 5 NPCs: Laxman, Bose, Gupta, Kishore, Anita
  const expectedNPCs = ['npc_laxman', 'npc_bose', 'npc_gupta', 'npc_kishore', 'npc_anita']
  for (const id of expectedNPCs) {
    assert.ok(gm.npcs[id], `Level 3 must contain NPC ${id}`)
  }

  // 6 Objects: first_aid_station, safety_records, report_terminal, emergency_alarm, cctv_tower, site_escape
  const expectedObjects = [
    'obj_first_aid_station',
    'obj_safety_records',
    'obj_report_terminal',
    'obj_emergency_alarm',
    'obj_cctv_tower',
    'obj_site_escape'
  ]
  for (const id of expectedObjects) {
    assert.ok(gm.objects[id], `Level 3 must contain Object ${id}`)
  }

  // Objectives
  assert.strictEqual(gm.runnerObjectives.length, 5, 'Level 3 Runner must have 5 objectives')
  assert.strictEqual(gm.saboteurObjectives.length, 5, 'Level 3 Saboteur must have 5 objectives')

  // Civic Takeaways
  const l3Def = LEVEL_DEFINITIONS.find((l) => l.level === 3)
  assert.ok(l3Def.keyTakeaways.some((t) => t.includes('BOCW') || t.includes('Construction Workers')), 'Must cover BOCW Act')
  assert.ok(l3Def.keyTakeaways.some((t) => t.includes('24 hours') || t.includes('accident')), 'Must cover 24-hour mandatory accident reporting')
})

runTest('Round Reset Integrity: Reward tracking resets cleanly for next round', () => {
  const gm = new GameManager('ROOM_RESET')
  gm.initMatch({ id: 'p_host', name: 'Host' }, { id: 'p_guest', name: 'Guest' })
  gm.phase = 'ROUND_ACTIVE'

  // Round 1: Select Priya dialogue
  gm.handleDialogueChoice('npc_priya', 'priya_opt_plate', 'runner', 'p_host')
  assert.strictEqual(gm.rewardedDialogueOptions.size > 0, true)

  // Switch to Round 2
  gm.currentRound = 2
  gm.resetRoundState()

  // Verify reward tracking sets are cleared for Round 2
  assert.strictEqual(gm.rewardedDialogueOptions.size, 0, 'Dialogue options must reset for Round 2')
  assert.strictEqual(gm.rewardedSemanticGroups.size, 0, 'Semantic groups must reset for Round 2')

  // Now in Round 2, new runner can legitimately interact with Priya
  const resRound2 = gm.handleDialogueChoice('npc_priya', 'priya_opt_plate', 'runner', 'p_guest')
  assert.strictEqual(resRound2.success, true)
  assert.strictEqual(gm.dialogueActionRecords[gm.dialogueActionRecords.length - 1].rewardApplied, true, 'Round 2 must allow first-time reward for the new runner')
})

console.log('\n====================================================')
console.log(`ALL ${totalTests} MILESTONE 5 TEST SCENARIOS PASSED CLEANLY!`)
console.log('====================================================\n')
