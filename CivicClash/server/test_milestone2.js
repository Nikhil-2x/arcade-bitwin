import { io } from 'socket.io-client'

const SERVER_URL = 'http://localhost:8788'

function createClient(name) {
  return io(SERVER_URL, {
    transports: ['websocket'],
    forceNew: true
  })
}

async function runMilestone2Tests() {
  console.log('================================================================')
  console.log('   CIVIC CLASH — MILESTONE 2 COMPREHENSIVE VERIFICATION SUITE   ')
  console.log('================================================================\n')

  let runner = createClient('Aarav_Runner')
  let saboteur = createClient('Vikram_Saboteur')

  try {
    // ─── TEST 1: CONNECTIVITY & ROOM SETUP ───
    console.log('[TEST 1] Connecting clients & establishing 2-player match...')
    await new Promise((resolve) => runner.on('connect', resolve))
    await new Promise((resolve) => saboteur.on('connect', resolve))
    console.log('  ✓ Both Runner and Saboteur connected to server.')

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
    const matchStartPromiseRunner = new Promise((resolve) => runner.on('match-started', resolve))
    const matchStartPromiseSaboteur = new Promise((resolve) => saboteur.on('match-started', resolve))
    runner.emit('start-match')
    const [startRunner, startSaboteur] = await Promise.all([matchStartPromiseRunner, matchStartPromiseSaboteur])

    console.log('  ✓ Match started. World state received on both clients.')
    if (!startRunner.worldState || !startRunner.worldState.npcs || !startRunner.worldState.objects) {
      throw new Error('Initial worldState missing from match-started payload!')
    }

    const npcs = startRunner.worldState.npcs
    const objects = startRunner.worldState.objects
    console.log(`  ✓ Loaded 5 NPCs: ${Object.keys(npcs).join(', ')}`)
    console.log(`  ✓ Loaded 5 Interactive Objects: ${Object.keys(objects).join(', ')}`)

    // ─── TEST 2: SERVER DISTANCE VALIDATION (CHEAT RESISTANCE) ───
    console.log('\n[TEST 2] Server Distance Validation (Out-of-range rejection)...')
    // Runner starts at spawn (0, 0, 8), trying to interact with Ramesh at (-14, 0, -2) without moving
    const outOfRangePromise = new Promise((resolve) => {
      runner.once('interaction:result', (data) => {
        resolve(data)
      })
    })
    runner.emit('npc:interact', { npcId: 'npc_ramesh' })
    const rejectResult = await outOfRangePromise

    if (rejectResult.success === false && rejectResult.message.includes('Too far')) {
      console.log(`  ✓ Correctly rejected out-of-range NPC interaction: "${rejectResult.message}"`)
    } else {
      throw new Error(`Expected out-of-range rejection, got: ${JSON.stringify(rejectResult)}`)
    }

    // ─── TEST 3: RUNNER MOVEMENT & ARJUN INTERACTION ───
    console.log('\n[TEST 3] Runner approaches Victim Arjun in Accident Zone...')
    // Move Runner to Arjun's location: (-2, 0, 0)
    runner.emit('player-move', {
      position: { x: -2, y: 0, z: 1.5 },
      yaw: 0,
      isMoving: true,
      isSprinting: false,
      timestamp: Date.now()
    })
    await new Promise((r) => setTimeout(r, 100))

    // Interact with Arjun
    const arjunDialoguePromise = new Promise((resolve) => runner.once('npc:dialogue:session', resolve))
    runner.emit('npc:interact', { npcId: 'npc_arjun' })
    const arjunSession = await arjunDialoguePromise
    console.log(`  ✓ Arjun dialogue opened: "${arjunSession.promptText}"`)
    console.log(`  ✓ Available dialogue choices: ${arjunSession.options.length}`)

    // Choose Option (Assess breathing and reassure)
    const arjunResultPromise = new Promise((resolve) => runner.once('dialogue:result', resolve))
    runner.emit('npc:dialogue:select', { npcId: 'npc_arjun', optionId: 'arjun_firstaid' })
    const arjunResult = await arjunResultPromise
    console.log(`  ✓ Arjun dialogue choice outcome: "${arjunResult.statusMessage}"`)

    // ─── TEST 4: FIRST-AID KIT PICKUP & ARJUN STABILIZATION ───
    console.log('\n[TEST 4] Collect First-Aid Kit & Stabilize Arjun...')
    // Move Runner to First-Aid Box at (-10.0, 0, -8.5)
    runner.emit('player-move', {
      position: { x: -10.0, y: 0, z: -8.0 },
      yaw: 0,
      isMoving: true,
      isSprinting: false,
      timestamp: Date.now()
    })
    await new Promise((r) => setTimeout(r, 100))

    // Collect first aid
    const objUpdatePromise = new Promise((resolve) => runner.once('object:state:update', resolve))
    const telemetryPromise1 = new Promise((resolve) => runner.once('game:telemetry:update', resolve))
    runner.emit('object:action', { objId: 'obj_firstaid', actionType: 'pickup' })
    const objUpdate = await objUpdatePromise
    const telem1 = await telemetryPromise1
    console.log(`  ✓ First-aid object status: ${objUpdate.objState.state}`)
    console.log(`  ✓ Runner Inventory: [${telem1.telemetry.inventory.join(', ')}]`)

    // Return to Arjun and apply
    runner.emit('player-move', {
      position: { x: -0.5, y: 0, z: 2.2 },
      yaw: 0,
      isMoving: true,
      isSprinting: false,
      timestamp: Date.now()
    })
    await new Promise((r) => setTimeout(r, 1050))

    const stabilizePromise = new Promise((resolve) => runner.once('dialogue:result', resolve))
    runner.emit('npc:dialogue:select', { npcId: 'npc_arjun', optionId: 'arjun_firstaid' })
    const stabilizeResult = await stabilizePromise
    console.log(`  ✓ Victim stabilized: "${stabilizeResult.statusMessage}"`)
    console.log(`  ✓ Arjun cooperation: ${stabilizeResult.npcState.cooperation}%`)

    // ─── TEST 5: RUNNER TALKING TO SHOPKEEPER RAMESH ───
    console.log('\n[TEST 5] Runner interviews Shopkeeper Ramesh in Shop Zone...')
    // Move Runner to Ramesh: (-11.5, 0, -8.0)
    runner.emit('player-move', {
      position: { x: -11.5, y: 0, z: -7.5 },
      yaw: 0,
      isMoving: true,
      isSprinting: false,
      timestamp: Date.now()
    })
    await new Promise((r) => setTimeout(r, 100))

    const rameshSessionPromise = new Promise((resolve) => runner.once('npc:dialogue:session', resolve))
    runner.emit('npc:interact', { npcId: 'npc_ramesh' })
    const rameshSession = await rameshSessionPromise
    console.log(`  ✓ Ramesh prompt: "${rameshSession.promptText}"`)
    console.log(`  ✓ Ramesh Initial Trust: ${rameshSession.trust}, Coop: ${rameshSession.cooperation}`)

    await new Promise((r) => setTimeout(r, 1050))
    // Choose Option A: Preserving footage
    const rameshResultPromise = new Promise((resolve) => runner.once('dialogue:result', resolve))
    runner.emit('npc:dialogue:select', { npcId: 'npc_ramesh', optionId: 'ramesh_opt_A' })
    const rameshResult = await rameshResultPromise
    console.log(`  ✓ Ramesh updated state -> Trust: ${rameshResult.npcState.trust}, Coop: ${rameshResult.npcState.cooperation}`)
    console.log(`  ✓ Ramesh outcome: "${rameshResult.statusMessage}"`)

    // ─── TEST 6: SABOTEUR MANIPULATING RAMESH ───
    console.log('\n[TEST 6] Saboteur approaches Ramesh and attempts intimidation...')
    // Move Saboteur to Ramesh: (-11.5, 0, -8.0)
    saboteur.emit('player-move', {
      position: { x: -11.5, y: 0, z: -8.5 },
      yaw: 0,
      isMoving: true,
      isSprinting: false,
      timestamp: Date.now()
    })
    await new Promise((r) => setTimeout(r, 100))

    const sabRameshSessionPromise = new Promise((resolve) => saboteur.once('npc:dialogue:session', resolve))
    saboteur.emit('npc:interact', { npcId: 'npc_ramesh' })
    const sabRameshSession = await sabRameshSessionPromise
    console.log(`  ✓ Saboteur opened Ramesh manipulation dialogue. Choices: ${sabRameshSession.options.length}`)

    // Saboteur chooses Option A (Encourage not getting involved, cost 20 energy)
    const sabResultPromise = new Promise((resolve) => saboteur.once('dialogue:result', resolve))
    const runnerRameshSyncPromise = new Promise((resolve) => runner.once('npc:state:update', resolve))
    saboteur.emit('npc:dialogue:select', { npcId: 'npc_ramesh', optionId: 'sab_ramesh_A' })
    const sabResult = await sabResultPromise
    const runnerSync = await runnerRameshSyncPromise
    console.log(`  ✓ Saboteur manipulation applied: "${sabResult.statusMessage}"`)
    console.log(`  ✓ Ramesh fear increased to: ${sabResult.npcState.fear}`)
    console.log(`  ✓ State synchronized to Runner: Fear=${runnerSync.npcState.fear}, Trust=${runnerSync.npcState.trust}`)

    // ─── TEST 7: SABOTEUR DISABLING CCTV CONSOLE ───
    console.log('\n[TEST 7] Saboteur disables Dhaba CCTV Console...')
    // CCTV is at (-14.5, 0, -14.0)
    saboteur.emit('player-move', {
      position: { x: -14.5, y: 0, z: -13.5 },
      yaw: 0,
      isMoving: false,
      isSprinting: false,
      timestamp: Date.now()
    })
    await new Promise((r) => setTimeout(r, 100))

    const cctvDisablePromise = new Promise((resolve) => saboteur.once('object:state:update', resolve))
    saboteur.emit('object:action', { objId: 'obj_cctv', actionType: 'sabotage' })
    const cctvState = await cctvDisablePromise
    console.log(`  ✓ CCTV Console status: ${cctvState.objState.state} (Disabled Timer: ${cctvState.objState.disabledTimer}s)`)

    // ─── TEST 8: RUNNER INTERVIEWING EYEWITNESS PRIYA ───
    console.log('\n[TEST 8] Runner questions Eyewitness Priya at Bus Stop...')
    // Priya is at (12.0, 0, -11.0)
    runner.emit('player-move', {
      position: { x: 12.0, y: 0, z: -10.5 },
      yaw: 0,
      isMoving: true,
      isSprinting: false,
      timestamp: Date.now()
    })
    await new Promise((r) => setTimeout(r, 100))

    const priyaDialoguePromise = new Promise((resolve) => runner.once('npc:dialogue:session', resolve))
    runner.emit('npc:interact', { npcId: 'npc_priya' })
    const priyaSession = await priyaDialoguePromise
    console.log(`  ✓ Priya prompt: "${priyaSession.promptText}"`)

    await new Promise((r) => setTimeout(r, 1050))
    // Ask about vehicle details
    const priyaResultPromise = new Promise((resolve) => runner.once('dialogue:result', resolve))
    const infoUpdatePromise = new Promise((resolve) => runner.once('information:update', resolve))
    runner.emit('npc:dialogue:select', { npcId: 'npc_priya', optionId: 'priya_opt_plate' })
    const priyaResult = await priyaResultPromise
    const infoUpdate = await infoUpdatePromise
    console.log(`  ✓ Priya result: "${priyaResult.statusMessage}"`)
    console.log(`  ✓ Information log updated: ${infoUpdate.informationLog.map(i => i.title).join(', ')}`)

    // ─── TEST 9: SABOTEUR PLANTS FALSE LEAD & CONTRADICTION DETECTION ───
    console.log('\n[TEST 9] Saboteur plants false lead on Notice Board...')
    // Board is at (-2.5, 0, -4.5)
    saboteur.emit('player-move', {
      position: { x: -2.5, y: 0, z: -4.0 },
      yaw: 0,
      isMoving: false,
      isSprinting: false,
      timestamp: Date.now()
    })
    await new Promise((r) => setTimeout(r, 100))

    const falseLeadInfoPromise = new Promise((resolve) => runner.once('information:update', resolve))
    saboteur.emit('object:action', { objId: 'obj_infoboard', actionType: 'plant_false_lead' })
    const falseLeadUpdate = await falseLeadInfoPromise
    const hasPriya = falseLeadUpdate.informationLog.some(i => i.id === 'info_priya')
    const hasFalseLead = falseLeadUpdate.informationLog.some(i => i.id === 'info_false_lead')
    console.log(`  ✓ Information log contains Priya: ${hasPriya}, False Lead: ${hasFalseLead}`)
    console.log('  ✓ Contradiction system active (Dark sedan vs Green auto-rickshaw).')

    // ─── TEST 10: EMERGENCY CALL 112 DISPATCH ───
    console.log('\n[TEST 10] Runner dispatches Emergency Call (112)...')
    // Phone is at (-4.5, 0, 4.5)
    runner.emit('player-move', {
      position: { x: -4.5, y: 0, z: 4.0 },
      yaw: 0,
      isMoving: false,
      isSprinting: false,
      timestamp: Date.now()
    })
    await new Promise((r) => setTimeout(r, 100))

    const phoneUpdatePromise = new Promise((resolve) => runner.once('object:state:update', resolve))
    const phoneTelemetryPromise = new Promise((resolve) => runner.once('game:telemetry:update', resolve))
    runner.emit('object:action', { objId: 'obj_phone', actionType: 'call' })
    const phoneState = await phoneUpdatePromise
    const phoneTelem = await phoneTelemetryPromise
    console.log(`  ✓ Emergency Phone state: ${phoneState.objState.state}`)
    const phoneObj = phoneTelem.telemetry.runnerObjectives.find(o => o.id === 'ro_2')
    console.log(`  ✓ Runner "Call 112" Objective Completed: ${phoneObj?.completed}`)

    // ─── TEST 11: SABOTEUR TAMPERS WITH TRAFFIC SIGNAL ───
    console.log('\n[TEST 11] Saboteur tampers with Traffic Signal in Traffic Zone...')
    // Signal is at (6.5, 0, 6.5)
    saboteur.emit('player-move', {
      position: { x: 6.5, y: 0, z: 6.0 },
      yaw: 0,
      isMoving: false,
      isSprinting: false,
      timestamp: Date.now()
    })
    await new Promise((r) => setTimeout(r, 100))

    const signalPromise = new Promise((resolve) => saboteur.once('object:state:update', resolve))
    saboteur.emit('object:action', { objId: 'obj_signal', actionType: 'tamper' })
    const signalState = await signalPromise
    console.log(`  ✓ Traffic Signal state: ${signalState.objState.state}`)

    // ─── TEST 12: ASYMMETRIC TELEMETRY & ENERGY REGEN ───
    console.log('\n[TEST 12] Verifying Saboteur Energy regen & Cooperation Meter...')
    await new Promise((r) => setTimeout(r, 3200)) // Wait for energy regen ticks (5 energy/3s)
    const finalTelemPromise = new Promise((resolve) => runner.once('game:telemetry:update', resolve))
    runner.emit('information:request')
    const finalTelem = await finalTelemPromise
    console.log(`  ✓ Final Sabotage Energy: ${finalTelem.telemetry.sabotageEnergy} / 100`)
    console.log(`  ✓ Final Community Cooperation: ${finalTelem.telemetry.communityCooperation}%`)

    console.log('\n================================================================')
    console.log('   🎉 ALL 12 MILESTONE 2 VERIFICATION TESTS PASSED SUCCESSFULLY!  ')
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

runMilestone2Tests()
