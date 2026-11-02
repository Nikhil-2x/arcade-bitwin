import assert from 'assert'
import { GameManager, LEVEL_DEFINITIONS } from './gameManager.js'

console.log('====================================================')
console.log('CIVIC CLASH — MILESTONE 4 AUTOMATED TEST SUITE')
console.log('Complete Match Flow, Scoring, Role Switching & Victory')
console.log('====================================================\n')

let passedTests = 0

function runTest(name, fn) {
  try {
    fn()
    console.log(`[PASS] ${name}`)
    passedTests++
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message)
    console.error(err.stack)
    process.exit(1)
  }
}

// ─────────────────────────────────────────────────────────────
// 1. MATCH INITIALIZATION & LEVEL DEFINITIONS
// ─────────────────────────────────────────────────────────────
runTest('Level Definitions & Topics (3 Levels registered)', () => {
  assert.strictEqual(LEVEL_DEFINITIONS.length, 3, 'Must have exactly 3 registered levels')
  assert.ok(LEVEL_DEFINITIONS[0].civicTopic.includes('Good Samaritan Law'), 'Level 1 must cover Good Samaritan Law')
  assert.ok(
    LEVEL_DEFINITIONS[1].civicTopic.includes('Information Technology Act') ||
    LEVEL_DEFINITIONS[1].civicTopic.includes('Building Code') ||
    LEVEL_DEFINITIONS[1].civicTopic.includes('Disaster Management'),
    'Level 2 must cover public safety / digital protection'
  )
  assert.ok(
    LEVEL_DEFINITIONS[2].civicTopic.includes('Right to Information') ||
    LEVEL_DEFINITIONS[2].civicTopic.includes('BOCW') ||
    LEVEL_DEFINITIONS[2].civicTopic.includes('Construction Workers'),
    'Level 3 must cover public accountability / worker safety'
  )
})

runTest('Match State Machine Initialization', () => {
  const gm = new GameManager('TEST1')
  const host = { id: 'p_host', name: 'Citizen Arjun Fan' }
  const guest = { id: 'p_guest', name: 'Rogue Driver' }

  gm.initMatch(host, guest)
  const state = gm.getMatchState(true) // Use revealed override to verify internal role state

  assert.strictEqual(state.phase, 'LEVEL_INTRO', 'Initial match phase must be LEVEL_INTRO')
  assert.strictEqual(state.currentLevel, 1, 'Current level must start at 1')
  assert.strictEqual(state.currentRound, 1, 'Current round must start at 1')
  assert.strictEqual(state.totalLevels, 3, 'Must be 3 levels')
  assert.strictEqual(state.roundsPerLevel, 2, 'Must be 2 rounds per level')
  assert.strictEqual(state.totalRounds, 6, 'Must be 6 total rounds')
  assert.strictEqual(state.playerRoles['p_host'], 'runner', 'Host must start as runner')
  assert.strictEqual(state.playerRoles['p_guest'], 'saboteur', 'Guest must start as saboteur')
  assert.strictEqual(state.players['p_host'].totalScore, 0, 'Host initial score must be 0')
  assert.strictEqual(state.players['p_guest'].totalScore, 0, 'Guest initial score must be 0')
})

// ─────────────────────────────────────────────────────────────
// 2. READY CHECK ENGINE
// ─────────────────────────────────────────────────────────────
runTest('Dual Player Ready Check Logic', () => {
  const gm = new GameManager('TEST2')
  gm.initMatch({ id: 'p1', name: 'P1' }, { id: 'p2', name: 'P2' })

  const res1 = gm.setPlayerReady('p1', true)
  assert.strictEqual(res1.allReady, false, 'Should not be all ready when only P1 is ready')

  const res2 = gm.setPlayerReady('p2', true)
  assert.strictEqual(res2.allReady, true, 'Should be all ready when both P1 and P2 are ready')
})

// ─────────────────────────────────────────────────────────────
// 3. SERVER-AUTHORITATIVE COMPETITIVE SCORING
// ─────────────────────────────────────────────────────────────
runTest('Runner Scoring & Unique Action Keying', () => {
  const gm = new GameManager('TEST3')
  gm.initMatch({ id: 'p1', name: 'Runner' }, { id: 'p2', name: 'Saboteur' })
  gm.phase = 'ROUND_ACTIVE'

  // Pick up First-Aid Kit
  gm.handleObjectAction('obj_firstaid', 'pickup', 'runner')
  assert.strictEqual(gm.players['p1'].runnerScore, 10, 'First-aid kit pickup must award +10 pts')

  // Apply First-Aid to Arjun
  gm.handleDialogueChoice('npc_arjun', 'arjun_firstaid', 'runner')
  assert.strictEqual(gm.npcs.npc_arjun.isStabilized, true, 'Arjun must be stabilized')

  // Task Amit to dial 112
  gm.handleDialogueChoice('npc_amit', 'amit_opt_call', 'runner')
  assert.strictEqual(gm.players['p1'].runnerScore, 40, 'Amit tasking + emergency dispatch must award +30 pts (total 40)')

  // Secure eyewitness testimony from Priya
  gm.handleDialogueChoice('npc_priya', 'priya_opt_plate', 'runner')
  assert.strictEqual(gm.players['p1'].runnerScore, 65, 'Priya testimony + plate clue must award +25 pts (total 65)')
})

runTest('Duplicate Scoring Prevention (Zero Point Farming)', () => {
  const gm = new GameManager('TEST4')
  gm.initMatch({ id: 'p1', name: 'Runner' }, { id: 'p2', name: 'Saboteur' })
  gm.phase = 'ROUND_ACTIVE'

  // Repeat same action multiple times
  gm.awardScore('p1', 'runner', 'VICTIM_ASSESSMENT', 10, 'Assessed victim')
  assert.strictEqual(gm.players['p1'].totalScore, 10)

  // Try again with exact same action in same round
  const duplicateEvt = gm.awardScore('p1', 'runner', 'VICTIM_ASSESSMENT', 10, 'Assessed victim')
  assert.strictEqual(duplicateEvt, null, 'Duplicate scoring event must be rejected')
  assert.strictEqual(gm.players['p1'].totalScore, 10, 'Score must remain 10 without farming')
})

runTest('Saboteur Scoring & Abilities', () => {
  const gm = new GameManager('TEST5')
  gm.initMatch({ id: 'p1', name: 'Runner' }, { id: 'p2', name: 'Saboteur' })
  gm.phase = 'ROUND_ACTIVE'

  // Saboteur misleads Priya
  gm.handleSaboteurAbility('sab_mislead')
  assert.strictEqual(gm.players['p2'].saboteurScore, 10, 'Misleading witness must award +10 pts')

  // Saboteur disables CCTV
  gm.handleSaboteurAbility('sab_cctv')
  assert.strictEqual(gm.players['p2'].saboteurScore, 20, 'Disabling CCTV must award +10 pts (total 20)')

  // Saboteur plants false lead on notice board
  gm.handleObjectAction('obj_infoboard', 'plant_rumor', 'saboteur')
  assert.strictEqual(gm.players['p2'].saboteurScore, 35, 'Planting false rumor must award +15 pts (total 35)')
})

// ─────────────────────────────────────────────────────────────
// 4. ROUND ENDING & EVALUATION
// ─────────────────────────────────────────────────────────────
runTest('Round Ending & Outcome Determination', () => {
  const gm = new GameManager('TEST6')
  gm.initMatch({ id: 'p1', name: 'Runner' }, { id: 'p2', name: 'Saboteur' })
  gm.phase = 'ROUND_ACTIVE'

  // Runner completes all objectives
  gm.handleObjectAction('obj_firstaid', 'pickup', 'runner')
  gm.handleDialogueChoice('npc_arjun', 'arjun_firstaid', 'runner')
  gm.handleDialogueChoice('npc_amit', 'amit_opt_call', 'runner')
  gm.handleDialogueChoice('npc_ramesh', 'ramesh_opt_A', 'runner') // unlocks CCTV
  gm.handleDialogueChoice('npc_priya', 'priya_opt_plate', 'runner')
  gm.handleObjectAction('obj_cctv', 'review', 'runner')
  gm.handleDialogueChoice('npc_sharma', 'sharma_opt_report', 'runner')

  const lastResult = gm.roundResults[gm.roundResults.length - 1]
  assert.ok(lastResult, 'Round result must be recorded')
  assert.strictEqual(lastResult.runnerOutcome, 'EXCELLENT_RESPONSE', 'Runner outcome should be EXCELLENT_RESPONSE')
  assert.strictEqual(gm.phase, 'ROUND_RESULTS', 'Phase must transition to ROUND_RESULTS')
})

// ─────────────────────────────────────────────────────────────
// 5. ROLE SWITCHING & LEVEL PROGRESSION (6 ROUNDS)
// ─────────────────────────────────────────────────────────────
runTest('Role Switching Between Round 1 and Round 2', () => {
  const gm = new GameManager('TEST7')
  gm.initMatch({ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' })
  gm.phase = 'ROUND_ACTIVE'

  // End Round 1
  gm.endRound('TIME_EXPIRED')
  assert.strictEqual(gm.phase, 'ROUND_RESULTS')

  // Advance to Round 2
  const step = gm.advanceMatchFlow()
  assert.strictEqual(step.type, 'ROLE_SWITCH')
  assert.strictEqual(gm.currentRound, 2, 'Current round must advance to 2')
  assert.strictEqual(gm.playerRoles['p1'], 'saboteur', 'Alice must switch from runner to saboteur')
  assert.strictEqual(gm.playerRoles['p2'], 'runner', 'Bob must switch from saboteur to runner')

  // Centralized round reset check
  assert.strictEqual(gm.timeRemainingSec, gm.roundDuration, 'Timer must reset to round duration')
  assert.strictEqual(gm.sabotageEnergy, 100, 'Sabotage energy must reset to 100')
  assert.strictEqual(gm.suspicionLevel, 10, 'Suspicion must reset to initial 10')
  assert.strictEqual(gm.inventory.length, 0, 'Inventory must be cleared')
  assert.strictEqual(gm.npcs.npc_arjun.isStabilized, false, 'Victim stabilization must reset')
})

runTest('Full 6-Round Match Progression to FINAL_RESULTS', () => {
  const gm = new GameManager('TEST8')
  gm.initMatch({ id: 'p1', name: 'Player A' }, { id: 'p2', name: 'Player B' })

  // Simulate 3 levels x 2 rounds = 6 rounds
  for (let lvl = 1; lvl <= 3; lvl++) {
    // Round 1 of Level
    gm.phase = 'ROUND_ACTIVE'
    gm.awardScore(null, 'runner', 'VICTIM_ASSESSMENT', 20, 'Action L' + lvl + ' R1')
    gm.endRound('TIME_EXPIRED')
    gm.advanceMatchFlow() // Moves to ROLE_SWITCH for Round 2

    // Round 2 of Level
    gm.phase = 'ROUND_ACTIVE'
    gm.awardScore(null, 'runner', 'WITNESS_COOPERATION', 30, 'Action L' + lvl + ' R2')
    gm.endRound('TIME_EXPIRED')
    const lvlStep = gm.advanceMatchFlow() // Moves to LEVEL_RESULTS or FINAL_RESULTS

    if (lvl < 3) {
      assert.strictEqual(lvlStep.type, 'LEVEL_RESULTS')
      assert.strictEqual(gm.currentLevel, lvl + 1)
      assert.strictEqual(gm.currentRound, 1)
    } else {
      assert.strictEqual(lvlStep.type, 'FINAL_RESULTS')
    }
  }

  assert.strictEqual(gm.phase, 'FINAL_RESULTS', 'Phase must be FINAL_RESULTS after 6 rounds')
  assert.strictEqual(gm.roundResults.length, 6, 'Must have recorded exactly 6 round results')
  assert.strictEqual(gm.levelSummaries.length, 3, 'Must have recorded exactly 3 level summaries')
  assert.ok(gm.finalResult, 'Final match result must be generated')
  assert.strictEqual(gm.finalResult.totalRoundsPlayed, 6, 'Total rounds played must be 6')
})

// ─────────────────────────────────────────────────────────────
// 6. DISCONNECTION & FORFEIT HANDLING
// ─────────────────────────────────────────────────────────────
runTest('Player Disconnect Pause & Reconnection', () => {
  const gm = new GameManager('TEST9')
  gm.initMatch({ id: 'p1', name: 'P1' }, { id: 'p2', name: 'P2' })
  gm.phase = 'ROUND_ACTIVE'

  // Player disconnects
  gm.handlePlayerDisconnect('p1')
  assert.strictEqual(gm.isPaused, true, 'Match must be paused on disconnect')
  assert.strictEqual(gm.pauseRemainingSec, 45, 'Grace period must be 45s')

  // Player reconnects with new socket ID
  gm.handlePlayerReconnect('p1', 'p1_new')
  assert.strictEqual(gm.isPaused, false, 'Match must resume after reconnection')
  assert.ok(gm.players['p1_new'], 'Player state must be preserved under new socket ID')
})

runTest('Rematch Full Reset', () => {
  const gm = new GameManager('TEST10')
  gm.initMatch({ id: 'p1', name: 'P1' }, { id: 'p2', name: 'P2' })
  gm.players['p1'].totalScore = 150
  gm.players['p2'].totalScore = 120

  // P1 votes rematch
  const v1 = gm.voteRematch('p1')
  assert.strictEqual(v1.rematchTriggered, false)

  // P2 votes rematch
  const v2 = gm.voteRematch('p2')
  assert.strictEqual(v2.rematchTriggered, true)
  assert.strictEqual(gm.currentLevel, 1, 'Level must reset to 1')
  assert.strictEqual(gm.currentRound, 1, 'Round must reset to 1')
  assert.strictEqual(gm.players['p1'].totalScore, 0, 'Scores must reset to 0')
  assert.strictEqual(gm.players['p2'].totalScore, 0, 'Scores must reset to 0')
  assert.strictEqual(gm.phase, 'LEVEL_INTRO', 'Phase must reset to LEVEL_INTRO')
})

console.log(`\n====================================================`)
console.log(`ALL ${passedTests} MILESTONE 4 TEST SCENARIOS PASSED CLEANLY!`)
console.log(`====================================================\n`)
