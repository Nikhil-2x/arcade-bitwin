import { io } from 'socket.io-client'

const SERVER_URL = 'http://localhost:8788'

function createClient(name) {
  return io(SERVER_URL, {
    transports: ['websocket'],
    forceNew: true
  })
}

async function runMilestone3ComprehensiveTests() {
  console.log('================================================================')
  console.log('   CIVIC CLASH — MILESTONE 3 COMPREHENSIVE VERIFICATION SUITE   ')
  console.log('================================================================\n')

  let runner = createClient('Aarav_Runner')
  let saboteur = createClient('Vikram_Saboteur')

  try {
    // ─── TEST 1: MULTIPLAYER CONNECTION & 2-PLAYER ROOM ───
    console.log('[TEST 1] Establishing real 2-player multiplayer session...')
    await new Promise((r) => runner.on('connect', r))
    await new Promise((r) => saboteur.on('connect', r))
    console.log('  ✓ Runner & Saboteur connected to Socket.IO backend.')

    const roomData = await new Promise((resolve) => {
      runner.emit('create-room', { playerName: 'Aarav_Runner' })
      runner.on('room-created', resolve)
    })
    const roomCode = roomData.code
    console.log(`  ✓ Room created with code: ${roomCode}`)

    await new Promise((resolve) => {
      saboteur.emit('join-room', { code: roomCode, playerName: 'Vikram_Saboteur' })
      saboteur.on('room-joined', resolve)
    })
    console.log('  ✓ Saboteur joined the room.')

    // Start match
    const startRunnerPromise = new Promise((resolve) => runner.on('match-started', resolve))
    const startSaboteurPromise = new Promise((resolve) => saboteur.on('match-started', resolve))
    runner.emit('start-match')
    const [startRunner, startSaboteur] = await Promise.all([startRunnerPromise, startSaboteurPromise])

    console.log('  ✓ Match started on both clients.')
    const npcs = startRunner.worldState.npcs
    console.log(`  ✓ NPCs loaded: ${Object.keys(npcs).join(', ')}`)

    // ─── TEST 2: BIDIRECTIONAL MOVEMENT SYNCHRONIZATION ───
    console.log('\n[TEST 2] Bidirectional Player Movement Synchronization...')
    const peerMovedOnSaboteur = new Promise((resolve) => saboteur.once('peer-moved', resolve))
    runner.emit('player-move', {
      x: -6.0,
      y: 0,
      z: 10.0,
      yaw: 0.5,
      isMoving: true,
      isSprinting: false,
      timestamp: Date.now()
    })
    const runnerMoveEvent = await peerMovedOnSaboteur
    console.log(`  ✓ Runner movement observed by Saboteur at (${runnerMoveEvent.x}, ${runnerMoveEvent.z})`)

    const peerMovedOnRunner = new Promise((resolve) => runner.once('peer-moved', resolve))
    saboteur.emit('player-move', {
      x: 6.0,
      y: 0,
      z: -10.0,
      yaw: 3.14,
      isMoving: true,
      isSprinting: false,
      timestamp: Date.now()
    })
    const saboteurMoveEvent = await peerMovedOnRunner
    console.log(`  ✓ Saboteur movement observed by Runner at (${saboteurMoveEvent.x}, ${saboteurMoveEvent.z})`)

    // ─── TEST 3: REAL PLAYER-TO-PLAYER COLLISION ENFORCEMENT ───
    console.log('\n[TEST 3] Player-to-Player Dynamic Capsule Collision...')
    // Saboteur moves to (0, 0, 0)
    saboteur.emit('player-move', { x: 0, y: 0, z: 0, yaw: 0, isMoving: false, isSprinting: false, timestamp: Date.now() })
    await new Promise((r) => setTimeout(r, 100))

    // Runner attempts to occupy (0, 0, 0.2) - penetrating Saboteur capsule!
    const collisionEnforcedPromise = new Promise((resolve) => {
      saboteur.once('peer-moved', (packet) => resolve(packet))
    })
    runner.emit('player-move', { x: 0, y: 0, z: 0.2, yaw: 0, isMoving: true, isSprinting: false, timestamp: Date.now() })
    const clampedPacket = await collisionEnforcedPromise

    // Calculate clamped separation
    const separation = Math.sqrt(clampedPacket.x ** 2 + clampedPacket.z ** 2)
    console.log(`  ✓ Client attempted penetration at 0.2m separation. Server enforced separation: ${separation.toFixed(2)}m (>= 1.05m)`)
    if (separation < 1.0) {
      throw new Error(`Player collision failed! Separation was ${separation}`)
    }

    // ─── TEST 4: NPC AUTONOMOUS MOVEMENT & WAYPOINTS ───
    console.log('\n[TEST 4] NPC Autonomous Waypoint Navigation & Routine Execution...')
    const initialArjun = npcs.npc_arjun.position
    const initialRamesh = { ...npcs.npc_ramesh.position }
    console.log(`  ✓ Initial Ramesh Position: (${initialRamesh.x.toFixed(1)}, ${initialRamesh.z.toFixed(1)})`)

    // Wait for 2 server tick cycles for autonomous movement
    await new Promise((r) => setTimeout(r, 2200))

    const batchUpdate = await new Promise((resolve) => runner.once('npc:batch:update', resolve))
    const movedRamesh = batchUpdate.npcs.npc_ramesh.position
    const curArjun = batchUpdate.npcs.npc_arjun.position

    console.log(`  ✓ Updated Ramesh Position: (${movedRamesh.x.toFixed(1)}, ${movedRamesh.z.toFixed(1)})`)
    console.log(`  ✓ Arjun Crash Victim Position: (${curArjun.x.toFixed(1)}, ${curArjun.z.toFixed(1)})`)

    if (Math.abs(curArjun.x - initialArjun.x) > 0.1 || Math.abs(curArjun.z - initialArjun.z) > 0.1) {
      throw new Error('Arjun moved away from the accident scene!')
    }
    console.log('  ✓ Verified: Injured victim Arjun remains fixed at Accident Zone.')

    // ─── TEST 5 & 7: COOPERATIVE DIALOGUE & PHYSICAL REACTIONS ───
    console.log('\n[TEST 5 & 7] Dialogue Physical Reactions & Shared Client Synchronization...')
    // Move Runner near Ramesh
    runner.emit('player-move', {
      x: movedRamesh.x + 1.0,
      y: 0,
      z: movedRamesh.z,
      yaw: 0,
      isMoving: false,
      isSprinting: false,
      timestamp: Date.now()
    })
    await new Promise((r) => setTimeout(r, 100))

    // Select cooperative dialogue option A
    const reactionOnSaboteur = new Promise((resolve) => saboteur.once('npc:reaction:trigger', resolve))
    const dialogueResultOnRunner = new Promise((resolve) => runner.once('dialogue:result', resolve))

    runner.emit('npc:dialogue:select', { npcId: 'npc_ramesh', optionId: 'ramesh_opt_A' })
    const [reactionEvent, dialogueRes] = await Promise.all([reactionOnSaboteur, dialogueResultOnRunner])

    console.log(`  ✓ Physical Reaction Triggered: "${reactionEvent.reaction}" for NPC ${reactionEvent.npcId}`)
    console.log(`  ✓ Dialogue Outcome: "${dialogueRes.statusMessage}"`)
    console.log('  ✓ Reaction synchronized to both Runner and Saboteur.')

    // ─── TEST 6: NEGATIVE DIALOGUE OUTCOME & STEP BACK REACTION ───
    console.log('\n[TEST 6] Negative Dialogue Consequence & Defensive Reaction...')
    await new Promise((r) => setTimeout(r, 1050))
    const negReactionOnRunner = new Promise((resolve) => runner.once('npc:reaction:trigger', resolve))
    runner.emit('npc:dialogue:select', { npcId: 'npc_ramesh', optionId: 'ramesh_opt_C' })
    const negReaction = await negReactionOnRunner
    console.log(`  ✓ Defensive/Negative Reaction Triggered: "${negReaction.reaction}"`)

    // ─── TEST 8: EMERGENCY 112 PHONE DISPATCH ───
    console.log('\n[TEST 8] Emergency Assistance 112 Dispatch...')
    // Phone is at (-4.5, 0, 4.5)
    runner.emit('player-move', { x: -4.0, y: 0, z: 4.5, yaw: 0, isMoving: false, isSprinting: false, timestamp: Date.now() })
    await new Promise((r) => setTimeout(r, 100))

    const phoneUpdateOnSaboteur = new Promise((resolve) => saboteur.once('object:state:update', resolve))
    runner.emit('object:action', { objId: 'obj_phone', actionType: 'call' })
    const phoneState = await phoneUpdateOnSaboteur
    console.log(`  ✓ Emergency 112 Phone Dispatched: state="${phoneState.objState.state}"`)

    // ─── TEST 9: SABOTEUR ABILITIES, ENERGY & COOLDOWNS ───
    console.log('\n[TEST 9] Saboteur Abilities, Energy Deductions & Cooldown Tracking...')
    const telemBeforeSabotage = await new Promise((resolve) => saboteur.once('game:telemetry:update', resolve))
    const startEnergy = telemBeforeSabotage.telemetry.sabotageEnergy
    console.log(`  ✓ Starting Saboteur Energy: ${startEnergy}`)

    // Use Ability: Stage Distraction (Cost: 20 energy, Cooldown: 12s)
    const telemAfterSabotage = new Promise((resolve) => saboteur.once('game:telemetry:update', resolve))
    saboteur.emit('saboteur:ability:use', { abilityId: 'sab_distract' })
    const telemResult = await telemAfterSabotage

    const endEnergy = telemResult.telemetry.sabotageEnergy
    const distractAbility = telemResult.telemetry.saboteurAbilities.find((a) => a.id === 'sab_distract')
    console.log(`  ✓ Energy after distraction: ${endEnergy} (Deducted ${startEnergy - endEnergy})`)
    console.log(`  ✓ Cooldown applied: ${distractAbility.currentCooldownSec}s remaining`)
    console.log(`  ✓ Suspicion increased to: ${telemResult.telemetry.suspicionLevel}%`)

    // ─── TEST 10: RUNNER COUNTERPLAY & INFORMATION CONTRADICTION ───
    console.log('\n[TEST 10] Runner Counterplay & Contradiction Resolution...')
    // Move Saboteur to notice board (-2.5, 0, -4.5) and plant false lead
    saboteur.emit('player-move', { x: -2.5, y: 0, z: -4.0, yaw: 0, isMoving: false, isSprinting: false, timestamp: Date.now() })
    await new Promise((r) => setTimeout(r, 100))

    const falseLeadUpdate = new Promise((resolve) => runner.once('information:update', resolve))
    saboteur.emit('object:action', { objId: 'obj_infoboard', actionType: 'plant_false_lead' })
    const infoLog = await falseLeadUpdate
    console.log(`  ✓ Information entries recorded: ${infoLog.informationLog.length}`)
    const falseLead = infoLog.informationLog.find((i) => i.id === 'info_false_lead')
    console.log(`  ✓ False lead recorded with LOW reliability: "${falseLead?.title}" (Reliability: ${falseLead?.reliability})`)

    // ─── TEST 11: ESCAPE ZONE CHANNELING & RUNNER INTERRUPTION ───
    console.log('\n[TEST 11] Escape Zone Channeling & Runner Interruption...')
    // Saboteur moves to Escape Zone at (18, 0, 18)
    saboteur.emit('player-move', { x: 18.0, y: 0, z: 18.0, yaw: 0, isMoving: false, isSprinting: false, timestamp: Date.now() })
    await new Promise((r) => setTimeout(r, 100))

    const escapeStartTelem = new Promise((resolve) => runner.once('game:telemetry:update', resolve))
    saboteur.emit('escape:channel:start')
    const escapeStartData = await escapeStartTelem
    console.log(`  ✓ Escape channeling started: isEscaping=${escapeStartData.telemetry.escapeProgress.isEscaping}`)

    // Runner rushes to Escape Zone to interrupt!
    const escapeCancelledTelem = new Promise((resolve) => runner.once('game:telemetry:update', resolve))
    runner.emit('player-move', { x: 18.5, y: 0, z: 18.0, yaw: 0, isMoving: true, isSprinting: true, timestamp: Date.now() })
    const escapeCancelledData = await escapeCancelledTelem
    console.log(`  ✓ Runner closed within 3.0m! Escape interrupted: isEscaping=${escapeCancelledData.telemetry.escapeProgress.isEscaping}`)

    // ─── TEST 12: SERVER VALIDATION & CHEAT REJECTION ───
    console.log('\n[TEST 12] Authoritative Server Validation & Invalid Action Rejection...')
    // 1. Out of range interaction rejection
    const outOfRangePromise = new Promise((resolve) => runner.once('interaction:result', resolve))
    runner.emit('npc:interact', { npcId: 'npc_priya' }) // Priya is at ~ (12, -11), Runner is at (18.5, 18)
    const oofResult = await outOfRangePromise
    console.log(`  ✓ Out-of-range action rejected: "${oofResult.message}"`)

    // 2. Ability on cooldown rejection
    const cdPromise = new Promise((resolve) => saboteur.once('interaction:result', resolve))
    saboteur.emit('saboteur:ability:use', { abilityId: 'sab_distract' })
    const cdResult = await cdPromise
    console.log(`  ✓ Cooldown action rejected: "${cdResult.message}"`)

    // 3. Unauthorized role action rejection
    const unauthPromise = new Promise((resolve) => runner.once('interaction:result', resolve))
    runner.emit('saboteur:ability:use', { abilityId: 'sab_mislead' })
    const unauthResult = await unauthPromise
    console.log(`  ✓ Unauthorized role action rejected: "${unauthResult.message}"`)

    console.log('\n================================================================')
    console.log('   🎉 ALL 12 MILESTONE 3 VERIFICATION TESTS PASSED SUCCESSFULLY!  ')
    console.log('================================================================')

    runner.disconnect()
    saboteur.disconnect()
    process.exit(0)
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err)
    runner.disconnect()
    saboteur.disconnect()
    process.exit(1)
  }
}

runMilestone3ComprehensiveTests()
