import { io } from 'socket.io-client'

async function runMilestone1Tests() {
  console.log('=== RUNNING CIVIC CLASH MILESTONE 1 VERIFICATION TESTS ===\n')

  const SERVER_URL = 'http://localhost:8788'
  let passed = 0
  let failed = 0

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`)
      passed++
    } else {
      console.error(`[FAIL] ${testName}`)
      failed++
    }
  }

  // 1. Client 1 (Host / Runner) connects
  const client1 = io(SERVER_URL, { transports: ['websocket'] })
  await new Promise((resolve) => client1.on('connect', resolve))
  assert(client1.connected, 'Client 1 connected to Socket.IO Server on 8788')

  // 2. Client 1 creates room
  let roomCode = ''
  await new Promise((resolve) => {
    client1.emit('create-room', { playerName: 'Aarav (Runner)' })
    client1.on('room-created', ({ code, player, room }) => {
      roomCode = code
      assert(code && code.length === 5, `Room created successfully with 5-char code: ${code}`)
      assert(player.role === 'runner', 'Host is assigned Player 1 role: "runner"')
      assert(room.host.name === 'Aarav (Runner)', 'Host name matches input')
      resolve()
    })
  })

  // 3. Client 2 (Guest / Saboteur) connects and joins room
  const client2 = io(SERVER_URL, { transports: ['websocket'] })
  await new Promise((resolve) => client2.on('connect', resolve))
  assert(client2.connected, 'Client 2 connected to Socket.IO Server on 8788')

  await new Promise((resolve) => {
    client2.emit('join-room', { code: roomCode, playerName: 'Meera (Saboteur)' })
    client2.on('room-joined', ({ code, player, room }) => {
      assert(code === roomCode, 'Client 2 joined matching room code')
      assert(player.role === 'saboteur', 'Guest is assigned Player 2 role: "saboteur"')
      assert(room.guest.name === 'Meera (Saboteur)', 'Guest name matches input')
      assert(room.host && room.guest, 'Room now has exactly 2 players (Host + Guest)')
      resolve()
    })
  })

  // 4. Test 2-Player Capacity Limit: Client 3 attempts to join full room
  const client3 = io(SERVER_URL, { transports: ['websocket'] })
  await new Promise((resolve) => client3.on('connect', resolve))

  await new Promise((resolve) => {
    client3.emit('join-room', { code: roomCode, playerName: 'Intruder' })
    client3.on('join-error', ({ message }) => {
      assert(
        message.includes('already full') || message.includes('Maximum 2 players'),
        `Client 3 rejected when joining 2-player room: "${message}"`
      )
      client3.disconnect()
      resolve()
    })
  })

  // 5. Host starts match
  await new Promise((resolve) => {
    let client1Started = false
    let client2Started = false

    client1.on('match-started', ({ room, spawnData }) => {
      assert(spawnData.runnerSpawn && spawnData.saboteurSpawn, 'Host received 3D spawn coordinates')
      client1Started = true
      if (client1Started && client2Started) resolve()
    })

    client2.on('match-started', ({ room, spawnData }) => {
      assert(spawnData.runnerSpawn.x === -8, 'Guest received synchronized spawn data')
      client2Started = true
      if (client1Started && client2Started) resolve()
    })

    client1.emit('start-match')
  })

  // 6. Test Real-Time Movement Synchronization between Client 1 and Client 2
  await new Promise((resolve) => {
    const movePacket = {
      x: 1.5,
      y: 0,
      z: 5.2,
      yaw: 1.57,
      isMoving: true,
      isSprinting: true,
      timestamp: Date.now()
    }

    client2.on('peer-moved', (received) => {
      assert(received.x === 1.5 && received.z === 5.2, 'Client 2 received synchronized position from Client 1')
      assert(received.isSprinting === true, 'Client 2 received sprinting state from Client 1')
      assert(received.role === 'runner', 'Packet identified as coming from runner')
      resolve()
    })

    client1.emit('player-move', movePacket)
  })

  // 7. Test Movement Synchronization from Client 2 to Client 1
  await new Promise((resolve) => {
    const movePacket2 = {
      x: -4.0,
      y: 0,
      z: -10.0,
      yaw: 3.14,
      isMoving: true,
      isSprinting: false,
      timestamp: Date.now()
    }

    client1.on('peer-moved', (received) => {
      assert(received.x === -4.0 && received.z === -10.0, 'Client 1 received synchronized position from Client 2')
      assert(received.role === 'saboteur', 'Packet identified as coming from saboteur')
      resolve()
    })

    client2.emit('player-move', movePacket2)
  })

  // Clean up
  client1.disconnect()
  client2.disconnect()

  console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===`)
  if (failed === 0) {
    console.log('✅ ALL MILESTONE 1 ACCEPTANCE CRITERIA VERIFIED!')
    process.exit(0)
  } else {
    process.exit(1)
  }
}

runMilestone1Tests().catch((err) => {
  console.error('Test execution error:', err)
  process.exit(1)
})

