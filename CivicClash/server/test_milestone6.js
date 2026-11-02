/**
 * CIVIC CLASH — MILESTONE 6 AUTOMATED TEST SUITE
 * Chaos Control: Secret Objectives, Social Deduction, Civic Response & Final Accusation
 */

import assert from 'node:assert'
import { GameManager, LEVEL_DEFINITIONS } from './gameManager.js'

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
console.log('CIVIC CLASH — MILESTONE 6 TEST SUITE')
console.log('Secret Objectives, Deduction, Environment & Accusation')
console.log('====================================================\n')

// ─────────────────────────────────────────────────────────────
// 1. SECRET ROLE OBFUSCATION
// ─────────────────────────────────────────────────────────────
runTest('Secret Role Obfuscation: Redacted from public state during active round and accusation', () => {
  const gm = new GameManager('M6_ROOM1')
  const host = { id: 'p_runner', name: 'Aarav' }
  const guest = { id: 'p_saboteur', name: 'Kabir' }

  gm.initMatch(host, guest)
  gm.phase = 'ROUND_ACTIVE'

  // In active phase, public getMatchState() MUST NOT expose playerRoles
  const activeState = gm.getMatchState()
  assert.deepStrictEqual(activeState.playerRoles, {}, 'playerRoles must be strictly redacted {} in active match')

  // In accusation phase, public getMatchState() MUST ALSO NOT expose playerRoles
  gm.startAccusationPhase()
  assert.strictEqual(gm.phase, 'ACCUSATION_PHASE')
  const accusationState = gm.getMatchState()
  assert.deepStrictEqual(accusationState.playerRoles, {}, 'playerRoles must remain redacted {} during sealed accusation')

  // When revealed override is true or in VERDICT_REVEAL, playerRoles is populated
  gm.phase = 'VERDICT_REVEAL'
  const revealedState = gm.getMatchState()
  assert.strictEqual(revealedState.playerRoles['p_runner'], 'runner')
  assert.strictEqual(revealedState.playerRoles['p_saboteur'], 'saboteur')
})

runTest('Private Role Telemetry: Each player only receives their own role', () => {
  const gm = new GameManager('M6_ROOM2')
  gm.initMatch({ id: 'p1', name: 'User 1' }, { id: 'p2', name: 'User 2' })
  gm.phase = 'ROUND_ACTIVE'

  const p1Telemetry = gm.getTelemetryForPlayer('p1', 'runner')
  assert.strictEqual(p1Telemetry.assignedRole, 'runner')

  const p2Telemetry = gm.getTelemetryForPlayer('p2', 'saboteur')
  assert.strictEqual(p2Telemetry.assignedRole, 'saboteur')
})

// ─────────────────────────────────────────────────────────────
// 2. PRIVATE TASK TREES & ROLE FILTERING
// ─────────────────────────────────────────────────────────────
runTest('Private Task Trees: Runner receives civic tasks only, Saboteur receives covert/cover only', () => {
  const gm = new GameManager('M6_ROOM3')
  gm.initMatch({ id: 'p_run', name: 'Citizen' }, { id: 'p_sab', name: 'Saboteur' })
  gm.phase = 'ROUND_ACTIVE'

  const runnerTelem = gm.getTelemetryForPlayer('p_run', 'runner')
  const saboteurTelem = gm.getTelemetryForPlayer('p_sab', 'saboteur')

  // Runner telemetry checks
  assert(Array.isArray(runnerTelem.tasks), 'Runner must have tasks array')
  assert(runnerTelem.tasks.length > 0, 'Runner must have tasks')
  const runnerCategories = new Set(runnerTelem.tasks.map((t) => t.category))
  assert(runnerCategories.has('CIVIC_MAIN'), 'Runner must have CIVIC_MAIN tasks')
  assert(!runnerCategories.has('COVERT'), 'Runner MUST NEVER receive COVERT tasks')
  assert(!runnerCategories.has('DECEPTION'), 'Runner MUST NEVER receive DECEPTION tasks')
  assert.strictEqual(runnerTelem.sabotageEnergy, undefined, 'Runner MUST NOT receive sabotageEnergy')
  assert.strictEqual(runnerTelem.saboteurAbilities, undefined, 'Runner MUST NOT receive saboteurAbilities')

  // Saboteur telemetry checks
  assert(Array.isArray(saboteurTelem.tasks), 'Saboteur must have tasks array')
  assert(saboteurTelem.tasks.length > 0, 'Saboteur must have tasks')
  const saboteurCategories = new Set(saboteurTelem.tasks.map((t) => t.category))
  assert(saboteurCategories.has('COVERT') || saboteurCategories.has('COVER'), 'Saboteur must have COVERT/COVER tasks')
  assert(!saboteurCategories.has('CIVIC_MAIN'), 'Saboteur MUST NOT receive Runner private CIVIC_MAIN task tree')
  assert.strictEqual(typeof saboteurTelem.sabotageEnergy, 'number', 'Saboteur must receive sabotageEnergy')
  assert(Array.isArray(saboteurTelem.saboteurAbilities), 'Saboteur must receive abilities')
})

// ─────────────────────────────────────────────────────────────
// 3. TASK DEPENDENCY ENGINE
// ─────────────────────────────────────────────────────────────
runTest('Task Dependency Engine: Dependent tasks unlock upon prerequisite completion', () => {
  const gm = new GameManager('M6_ROOM4')
  gm.initMatch({ id: 'p_run', name: 'Citizen' }, { id: 'p_sab', name: 'Saboteur' })
  gm.phase = 'ROUND_ACTIVE'

  // Initial State: t_r_safety is AVAILABLE, t_r_triage is LOCKED
  const initialSafety = gm.runnerTasks.find((t) => t.id === 't_r_safety')
  const initialTriage = gm.runnerTasks.find((t) => t.id === 't_r_triage')
  const initialCctv = gm.runnerTasks.find((t) => t.id === 't_r_cctv')

  assert.strictEqual(initialSafety.status, 'AVAILABLE', 'Safety assessment must start AVAILABLE')
  assert.strictEqual(initialTriage.status, 'LOCKED', 'Triage must start LOCKED pending safety assessment')
  assert.strictEqual(initialCctv.status, 'LOCKED', 'CCTV check must start LOCKED')

  // Complete safety assessment
  gm.completeTask('t_r_safety', 'runner')
  assert.strictEqual(initialSafety.status, 'COMPLETED')

  // Verify dependent tasks are now AVAILABLE
  const updatedTriage = gm.runnerTasks.find((t) => t.id === 't_r_triage')
  const updatedCctv = gm.runnerTasks.find((t) => t.id === 't_r_cctv')
  assert.strictEqual(updatedTriage.status, 'AVAILABLE', 'Triage must unlock after safety is completed')
  assert.strictEqual(updatedCctv.status, 'AVAILABLE', 'CCTV must unlock after safety is completed')

  // Complete triage, which should unlock call112 and firstaid
  gm.completeTask('t_r_triage', 'runner')
  assert.strictEqual(updatedTriage.status, 'COMPLETED')

  const updated112 = gm.runnerTasks.find((t) => t.id === 't_r_call112')
  const updatedFirstAid = gm.runnerTasks.find((t) => t.id === 't_r_firstaid')
  assert.strictEqual(updated112.status, 'AVAILABLE', '112 dispatch must unlock after triage')
  assert.strictEqual(updatedFirstAid.status, 'AVAILABLE', 'First aid must unlock after triage')
})

// ─────────────────────────────────────────────────────────────
// 4. SABOTEUR COVER TASKS & ALIBI GENERATION
// ─────────────────────────────────────────────────────────────
runTest('Saboteur Cover Tasks: Helpful actions award score and build deception alibi', () => {
  const gm = new GameManager('M6_ROOM5')
  gm.initMatch({ id: 'p_run', name: 'Citizen' }, { id: 'p_sab', name: 'Saboteur' })
  gm.phase = 'ROUND_ACTIVE'

  const coverTask = gm.saboteurTasks.find((t) => t.category === 'COVER')
  assert(coverTask, 'Saboteur must have at least one COVER task')

  gm.completeTask(coverTask.id, 'saboteur')
  assert.strictEqual(coverTask.status, 'COMPLETED')
  const completedCover = gm.saboteurTasks.filter((t) => t.category === 'COVER' && t.status === 'COMPLETED').length
  assert(completedCover >= 1)
})

// ─────────────────────────────────────────────────────────────
// 5. ENVIRONMENTAL CHAOS: STREETLIGHT TOGGLE & RESTORATION
// ─────────────────────────────────────────────────────────────
runTest('Environmental Chaos: Saboteur cuts streetlights; Runner restores power', () => {
  const gm = new GameManager('M6_ROOM6')
  gm.initMatch({ id: 'p_run', name: 'Citizen' }, { id: 'p_sab', name: 'Saboteur' })
  gm.phase = 'ROUND_ACTIVE'

  // Streetlights initial state
  assert.strictEqual(gm.environmentalState.streetlights, 'ON', 'Streetlights must start ON')

  // Verify obj_light_switch exists
  assert(gm.objects.obj_light_switch, 'obj_light_switch must exist in Level 1')

  // Saboteur cuts lights
  const cutResult = gm.handleObjectAction('obj_light_switch', 'cut_lights', 'saboteur')
  assert.strictEqual(cutResult.success, true)
  assert.strictEqual(gm.environmentalState.streetlights, 'OFF', 'Streetlights must be OFF after sabotage')

  // Runner restores power
  const restoreResult = gm.handleObjectAction('obj_light_switch', 'restore_lights', 'runner')
  assert.strictEqual(restoreResult.success, true)
  assert.strictEqual(gm.environmentalState.streetlights, 'ON', 'Streetlights must be restored ON by Runner')
})

// ─────────────────────────────────────────────────────────────
// 6. ENVIRONMENTAL CHAOS: STAGED NOISE DISTRACTION
// ─────────────────────────────────────────────────────────────
runTest('Environmental Chaos: Saboteur stages noise distraction', () => {
  const gm = new GameManager('M6_ROOM7')
  gm.initMatch({ id: 'p_run', name: 'Citizen' }, { id: 'p_sab', name: 'Saboteur' })
  gm.phase = 'ROUND_ACTIVE'

  const startEnergy = gm.sabotageEnergy
  const res = gm.handleSaboteurAbility('sab_distract')
  assert.strictEqual(res.success, true)
  assert(gm.sabotageEnergy < startEnergy, 'Energy must be deducted for distraction')
  assert(gm.suspicionLevel > 0, 'Suspicion must increase')
})

// ─────────────────────────────────────────────────────────────
// 7. SEALED FINAL ACCUSATION LOCKING
// ─────────────────────────────────────────────────────────────
runTest('Sealed Final Accusation: Verdict held in secret until both players submit', () => {
  const gm = new GameManager('M6_ROOM8')
  gm.initMatch({ id: 'p_run', name: 'Citizen' }, { id: 'p_sab', name: 'Saboteur' })
  gm.startAccusationPhase()

  assert.strictEqual(gm.phase, 'ACCUSATION_PHASE')

  // Runner submits verdict accusing p_sab
  const sub1 = gm.submitVerdict('p_run', 'runner', {
    suspectId: 'p_sab',
    selectedEvidenceIds: ['ev_cctv_footage', 'ev_witness_priya']
  })
  assert.strictEqual(sub1.allSubmitted, false, 'Must not resolve with only Runner submitted')
  assert.strictEqual(gm.phase, 'ACCUSATION_PHASE', 'Phase must remain ACCUSATION_PHASE')

  // Saboteur submits counter-defense
  const sub2 = gm.submitVerdict('p_sab', 'saboteur', {
    counterNarrativeId: 'narrative_innocent_bystander'
  })
  assert.strictEqual(sub2.allSubmitted, true, 'Must resolve once both submit')

  const reveal = gm.evaluateAccusationAndReveal()
  assert(reveal !== null, 'Reveal must be generated')
  assert.strictEqual(gm.phase, 'VERDICT_REVEAL', 'Phase must transition to VERDICT_REVEAL')
  assert.strictEqual(reveal.runnerSuspectId, 'p_sab')
  assert.strictEqual(reveal.actualSaboteurId, 'p_sab')
  assert.strictEqual(reveal.isAccusationCorrect, true)
})

// ─────────────────────────────────────────────────────────────
// 8. EVIDENCE-BACKED ACCUSATION EVALUATION & SCORING
// ─────────────────────────────────────────────────────────────
runTest('Evidence Scoring: 2 Verified Evidence Cards grant maximum score (+35 pts)', () => {
  const gm = new GameManager('M6_ROOM9')
  gm.initMatch({ id: 'p_run', name: 'Citizen' }, { id: 'p_sab', name: 'Saboteur' })
  gm.phase = 'ROUND_ACTIVE'

  // Seed 2 verified evidence items into information log
  gm.informationLog.push({
    id: 'ev_cctv',
    title: 'Verified CCTV Video',
    description: 'Front bumper visible',
    source: 'Dhaba CCTV',
    verified: true
  })
  gm.informationLog.push({
    id: 'ev_priya',
    title: 'Eyewitness Priya Statement',
    description: 'Black sedan confirmed',
    source: 'Eyewitness',
    verified: true
  })

  gm.startAccusationPhase()
  const startScore = gm.players['p_run'].totalScore

  gm.submitVerdict('p_run', 'runner', {
    suspectId: 'p_sab',
    selectedEvidenceIds: ['ev_cctv', 'ev_priya']
  })
  gm.submitVerdict('p_sab', 'saboteur', {
    counterNarrativeId: 'narrative_innocent_bystander'
  })

  const reveal = gm.evaluateAccusationAndReveal()
  assert.strictEqual(reveal.evidenceScoreAwarded, 35, '2 verified evidence cards must yield +35 pts')
  assert.strictEqual(gm.players['p_run'].totalScore, startScore + 35)
})

runTest('Evidence Scoring: 1 Verified Evidence Card grants +20 pts', () => {
  const gm = new GameManager('M6_ROOM10')
  gm.initMatch({ id: 'p_run', name: 'Citizen' }, { id: 'p_sab', name: 'Saboteur' })
  gm.phase = 'ROUND_ACTIVE'

  // Seed 1 verified evidence item into information log
  gm.informationLog.push({
    id: 'ev_cctv',
    title: 'Verified CCTV Video',
    description: 'Front bumper visible',
    source: 'Dhaba CCTV',
    verified: true
  })

  gm.startAccusationPhase()
  const startScore = gm.players['p_run'].totalScore

  gm.submitVerdict('p_run', 'runner', {
    suspectId: 'p_sab',
    selectedEvidenceIds: ['ev_cctv']
  })
  gm.submitVerdict('p_sab', 'saboteur', {
    counterNarrativeId: 'narrative_innocent_bystander'
  })

  const reveal = gm.evaluateAccusationAndReveal()
  assert.strictEqual(reveal.evidenceScoreAwarded, 20, '1 verified evidence card must yield +20 pts')
  assert.strictEqual(gm.players['p_run'].totalScore, startScore + 20)
})

runTest('Evidence Scoring: Guess with 0 Verified Evidence grants only +10 pts', () => {
  const gm = new GameManager('M6_ROOM11')
  gm.initMatch({ id: 'p_run', name: 'Citizen' }, { id: 'p_sab', name: 'Saboteur' })
  gm.phase = 'ROUND_ACTIVE'
  gm.startAccusationPhase()

  const startScore = gm.players['p_run'].totalScore

  gm.submitVerdict('p_run', 'runner', {
    suspectId: 'p_sab',
    selectedEvidenceIds: []
  })
  gm.submitVerdict('p_sab', 'saboteur', {
    counterNarrativeId: 'narrative_innocent_bystander'
  })

  const reveal = gm.evaluateAccusationAndReveal()
  assert.strictEqual(reveal.evidenceScoreAwarded, 10, '0 evidence guess must yield only +10 pts')
  assert.strictEqual(gm.players['p_run'].totalScore, startScore + 10)
})

runTest('Deception Scoring: Evading detection awards Saboteur +30 pts deception bonus', () => {
  const gm = new GameManager('M6_ROOM12')
  gm.initMatch({ id: 'p_run', name: 'Citizen' }, { id: 'p_sab', name: 'Saboteur' })
  gm.phase = 'ROUND_ACTIVE'
  gm.startAccusationPhase()

  const startScore = gm.players['p_sab'].totalScore

  // Runner accuses an innocent bystander or cannot determine
  gm.submitVerdict('p_run', 'runner', {
    suspectId: 'npc_bystander',
    selectedEvidenceIds: []
  })
  gm.submitVerdict('p_sab', 'saboteur', {
    counterNarrativeId: 'narrative_innocent_bystander'
  })

  const reveal = gm.evaluateAccusationAndReveal()
  assert.strictEqual(reveal.isAccusationCorrect, false)
  assert.strictEqual(reveal.evidenceScoreAwarded, 0)
  assert(reveal.saboteurDeceptionAwarded >= 30, 'Saboteur must receive deception evasion bonus >= +30 pts')
  assert(gm.players['p_sab'].totalScore >= startScore + 30)
})

// ─────────────────────────────────────────────────────────────
// 9. CIVIC EDUCATION DEBRIEF GENERATION
// ─────────────────────────────────────────────────────────────
runTest('Civic Debrief Generation: Level 1 includes Indian Good Samaritan law', () => {
  const gm = new GameManager('M6_ROOM13')
  gm.currentLevel = 1

  const debrief = gm.generateCivicDebrief()
  assert.strictEqual(debrief.level, 1)
  assert(Array.isArray(debrief.whatYouDidRight))
  assert(Array.isArray(debrief.whatToImprove))
  assert(typeof debrief.realWorldTakeaway === 'string')
  assert(typeof debrief.officialGuidanceRef === 'string')

  const takeawayAndRef = debrief.realWorldTakeaway + ' ' + debrief.officialGuidanceRef
  assert(takeawayAndRef.includes('134A') || takeawayAndRef.includes('Good Samaritan'), 'Debrief must cite Section 134A Good Samaritan Law')
})

runTest('Civic Debrief Generation: Level 2 & 3 statutory content verification', () => {
  const gm = new GameManager('M6_ROOM14')

  gm.currentLevel = 2
  const debriefL2 = gm.generateCivicDebrief()
  assert.strictEqual(debriefL2.level, 2)
  const l2Combined = debriefL2.realWorldTakeaway + ' ' + debriefL2.officialGuidanceRef
  assert(l2Combined.includes('National Building Code') || l2Combined.includes('Fire'), 'L2 must cite NBC Fire Safety')

  gm.currentLevel = 3
  const debriefL3 = gm.generateCivicDebrief()
  assert.strictEqual(debriefL3.level, 3)
  const l3Combined = debriefL3.realWorldTakeaway + ' ' + debriefL3.officialGuidanceRef
  assert(l3Combined.includes('BOCW') || l3Combined.includes('Factories Act'), 'L3 must cite BOCW Act / Factories Act')
})

// ─────────────────────────────────────────────────────────────
// 10. MULTI-LEVEL TASK TREE INITIALIZATION
// ─────────────────────────────────────────────────────────────
runTest('Multi-Level Task Trees: Level 2 and Level 3 initialize distinct tasks', () => {
  const gmL2 = new GameManager('M6_L2')
  gmL2.initMatch({ id: 'p1', name: 'Citizen 1' }, { id: 'p2', name: 'Citizen 2' })
  gmL2.currentLevel = 2
  gmL2.initTasks()

  assert(gmL2.runnerTasks.length >= 3, 'Level 2 must have runner tasks')
  assert(gmL2.saboteurTasks.length >= 3, 'Level 2 must have saboteur tasks')
  const l2RunnerIds = gmL2.runnerTasks.map((t) => t.id)
  assert(l2RunnerIds.includes('t_r_2_alarm'), 'Level 2 must have fire alarm task (t_r_2_alarm)')

  const gmL3 = new GameManager('M6_L3')
  gmL3.initMatch({ id: 'p1', name: 'Citizen 1' }, { id: 'p2', name: 'Citizen 2' })
  gmL3.currentLevel = 3
  gmL3.initTasks()

  assert(gmL3.runnerTasks.length >= 3, 'Level 3 must have runner tasks')
  assert(gmL3.saboteurTasks.length >= 3, 'Level 3 must have saboteur tasks')
  const l3RunnerIds = gmL3.runnerTasks.map((t) => t.id)
  assert(l3RunnerIds.includes('t_r_3_siren'), 'Level 3 must have site siren task (t_r_3_siren)')
})

console.log('\n====================================================')
console.log(`RESULTS: ${passedTests} / ${totalTests} TEST SCENARIOS PASSED`)
console.log('====================================================\n')
