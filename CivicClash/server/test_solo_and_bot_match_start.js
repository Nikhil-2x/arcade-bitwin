import { io as Client } from 'socket.io-client'
import assert from 'assert'
import { httpServer, PORT } from './server.js'

console.log('========================================================================')
console.log('   CIVIC CLASH — SOLO & AI BOT MATCH START AUTOMATED TEST')
console.log('========================================================================\n')

async function run() {
  const url = `http://localhost:${PORT}`

  // 1. Connect Solo Host
  const clientHost = Client(url, { transports: ['websocket'], forceNew: true, reconnection: false })
  await new Promise((resolve) => clientHost.on('connect', resolve))
  console.log('[PASS 1] Solo Host client connected to game server')

  // 2. Create room
  const roomCreated = await new Promise((resolve) => {
    clientHost.emit('create-room', { playerName: 'Solo_Citizen' })
    clientHost.on('room-created', resolve)
  })
  const code = roomCreated.code
  console.log(`[PASS 2] Room created with code: ${code}`)

  // 3. Host toggles ready status in lobby
  const readyUpdatePromise = new Promise((resolve) => {
    clientHost.on('lobby:ready:update', resolve)
  })
  clientHost.emit('match:player:ready', { ready: true })
  const readyUpdate = await readyUpdatePromise
  assert.strictEqual(readyUpdate.hostReady, true, 'Host should be marked ready')
  console.log('[PASS 3] Host successfully confirmed ready in lobby')

  // 4. Host tests adding AI Bot to lobby
  const botAddedPromise = new Promise((resolve) => {
    clientHost.on('peer-joined', resolve)
  })
  clientHost.emit('lobby:bot:add')
  const peerData = await botAddedPromise
  assert.strictEqual(peerData.guest.id, 'bot_saboteur')
  assert.strictEqual(peerData.guest.ready, true)
  console.log(`[PASS 4] AI Bot opponent successfully added to room: ${peerData.guest.name}`)

  // 5. Host tests removing AI Bot from lobby
  const botRemovedPromise = new Promise((resolve) => {
    clientHost.on('peer-left', resolve)
  })
  clientHost.emit('lobby:bot:remove')
  await botRemovedPromise
  console.log('[PASS 5] AI Bot opponent successfully removed from room')

  // 6. Host starts match while solo -> Server auto-assigns AI Bot and emits match-started
  const matchStartedPromise = new Promise((resolve) => {
    clientHost.on('match-started', resolve)
  })
  clientHost.emit('start-match', { startingLevel: 1 })
  const matchStartedData = await matchStartedPromise
  assert.ok(matchStartedData.room.guest, 'Guest should be auto-assigned')
  assert.strictEqual(matchStartedData.room.guest.id, 'bot_saboteur')
  assert.strictEqual(matchStartedData.matchState.phase, 'LEVEL_INTRO')
  console.log('[PASS 6] Solo match start succeeded! Server auto-assigned AI Bot and initialized LEVEL_INTRO')

  // 7. Host confirms round ready -> Round starts immediately because bot is auto-ready!
  const roundStartPromise = new Promise((resolve) => {
    clientHost.on('match:round:start', resolve)
  })
  clientHost.emit('match:round:ready')
  const roundStartData = await roundStartPromise
  assert.strictEqual(roundStartData.currentRound, 1)
  assert.strictEqual(roundStartData.matchState.phase, 'ROUND_ACTIVE')
  console.log('[PASS 7] Round 1 started immediately upon Host clicking ready (Bot auto-readied)!')

  // 8. Test Host Force-Start capability
  const forceStartPromise = new Promise((resolve) => {
    clientHost.on('match:round:start', resolve)
  })
  clientHost.emit('match:round:force-start')
  const forceStartData = await forceStartPromise
  assert.strictEqual(forceStartData.matchState.phase, 'ROUND_ACTIVE')
  console.log('[PASS 8] Host force-start successfully triggered active round!')

  clientHost.disconnect()

  console.log('\n========================================================================')
  console.log('   ALL 8 SOLO & BOT MATCH START TEST SCENARIOS PASSED CLEANLY!')
  console.log('========================================================================\n')
  process.exit(0)
}

run().catch((err) => {
  console.error('[FAIL]', err)
  process.exit(1)
})

