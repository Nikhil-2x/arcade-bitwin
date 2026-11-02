import { io as Client } from 'socket.io-client';
import assert from 'assert';
import { httpServer, PORT } from './server.js';

console.log('========================================================================');
console.log('   CIVIC CLASH — LEVEL SELECTION & LEVEL WINNER AUTOMATED TEST');
console.log('========================================================================\n');

async function run() {
  const url = `http://localhost:${PORT}`;

  // 1. Connect two clients
  const clientA = Client(url, { transports: ['websocket'], forceNew: true, reconnection: false });
  const clientB = Client(url, { transports: ['websocket'], forceNew: true, reconnection: false });

  await new Promise((resolve) => clientA.on('connect', resolve));
  await new Promise((resolve) => clientB.on('connect', resolve));
  console.log('[PASS 1] Both test clients connected to game server');

  // 2. Client A creates room
  const roomCreated = await new Promise((resolve) => {
    clientA.emit('create-room', { playerName: 'Host_Leader' });
    clientA.on('room-created', resolve);
  });
  const code = roomCreated.code;
  console.log(`[PASS 2] Room created with code: ${code}`);

  // 3. Client B joins room
  await new Promise((resolve) => {
    clientB.emit('join-room', { code, playerName: 'Guest_Player' });
    clientA.on('peer-joined', resolve);
  });
  console.log('[PASS 3] Guest joined room');

  // 4. Host selects Level 2 in Lobby
  const levelUpdatedPromise = new Promise((resolve) => {
    clientB.on('lobby:level:updated', resolve);
  });
  clientA.emit('lobby:level:select', { level: 2 });
  const levelUpdate = await levelUpdatedPromise;
  assert.strictEqual(levelUpdate.selectedLevel, 2, 'Selected level should be 2');
  console.log('[PASS 4] Host selected Level 2 in Lobby; synchronized live to Guest');

  // 5. Host selects Level 3 in Lobby
  const level3Promise = new Promise((resolve) => {
    clientB.on('lobby:level:updated', resolve);
  });
  clientA.emit('lobby:level:select', { level: 3 });
  const level3Update = await level3Promise;
  assert.strictEqual(level3Update.selectedLevel, 3, 'Selected level should be 3');
  console.log('[PASS 5] Host selected Level 3 in Lobby; synchronized live to Guest');

  // 6. Host starts match directly at chosen Level 3
  const matchStartedA = new Promise((resolve) => clientA.on('match-started', resolve));
  const matchStartedB = new Promise((resolve) => clientB.on('match-started', resolve));

  clientA.emit('match:player:ready', { ready: true });
  clientB.emit('match:player:ready', { ready: true });
  clientA.emit('start-match', { startingLevel: 3 });

  const [startDataA, startDataB] = await Promise.all([matchStartedA, matchStartedB]);
  assert.strictEqual(startDataA.matchState.currentLevel, 3, 'Match should start at chosen Level 3');
  assert.strictEqual(startDataB.matchState.currentLevel, 3, 'Match should start at chosen Level 3 on both clients');
  console.log('[PASS 6] Match started authoritatively at Level 3 (Construction Site Accident)');

  // 7. Verify Level Summary declares a clear winner
  const { GameManager } = await import('./gameManager.js');
  const testGm = new GameManager('TEST_LEVEL_WINNER');
  testGm.initMatch(
    { id: 'player_a', name: 'Aarav' },
    { id: 'player_b', name: 'Kabir' },
    1
  );

  // Round 1: Aarav (Runner) scores 50, Kabir (Saboteur) scores 15
  testGm.currentLevel = 1;
  testGm.currentRound = 1;
  testGm.roundResults.push({
    level: 1,
    round: 1,
    runnerId: 'player_a',
    runnerName: 'Aarav',
    saboteurId: 'player_b',
    saboteurName: 'Kabir',
    runnerScore: 50,
    saboteurScore: 15,
    summaryText: 'Round 1 ended'
  });

  // Round 2: Roles switch. Kabir (Runner) scores 20, Aarav (Saboteur) scores 25
  testGm.currentRound = 2;
  testGm.roundResults.push({
    level: 1,
    round: 2,
    runnerId: 'player_b',
    runnerName: 'Kabir',
    saboteurId: 'player_a',
    saboteurName: 'Aarav',
    runnerScore: 20,
    saboteurScore: 25,
    summaryText: 'Round 2 ended'
  });

  // Aarav total: 50 + 25 = 75 pts
  // Kabir total: 15 + 20 = 35 pts
  const summary = testGm.generateLevelSummary();
  assert.strictEqual(summary.playerAScore, 75, 'Aarav should have 75 pts in Level 1');
  assert.strictEqual(summary.playerBScore, 35, 'Kabir should have 35 pts in Level 1');
  assert.strictEqual(summary.winnerId, 'player_a', 'Winner should be Aarav (player_a)');
  assert.strictEqual(summary.winnerName, 'Aarav', 'Winner name should be Aarav');
  assert.strictEqual(summary.isDraw, false, 'Should not be a draw');
  assert.strictEqual(summary.margin, 40, 'Margin of victory should be 40 points');
  assert.ok(summary.winnerText.includes('Aarav'), 'Winner text should declare Aarav');
  console.log(`[PASS 7] Clear Level Winner declared authoritatively: ${summary.winnerText}`);
  console.log(`         Aarav: Runner 50 + Saboteur 25 = 75 pts`);
  console.log(`         Kabir: Runner 20 + Saboteur 15 = 35 pts`);

  // 8. Test Draw condition in Level Summary
  const testGmDraw = new GameManager('TEST_LEVEL_DRAW');
  testGmDraw.initMatch(
    { id: 'player_a', name: 'Aarav' },
    { id: 'player_b', name: 'Kabir' },
    2
  );
  testGmDraw.currentLevel = 2;
  testGmDraw.roundResults.push(
    { level: 2, round: 1, runnerId: 'player_a', saboteurId: 'player_b', runnerScore: 40, saboteurScore: 30 },
    { level: 2, round: 2, runnerId: 'player_b', saboteurId: 'player_a', runnerScore: 40, saboteurScore: 30 }
  );
  const drawSummary = testGmDraw.generateLevelSummary();
  assert.strictEqual(drawSummary.playerAScore, 70);
  assert.strictEqual(drawSummary.playerBScore, 70);
  assert.strictEqual(drawSummary.isDraw, true, 'Should declare DRAW when scores are equal');
  assert.strictEqual(drawSummary.margin, 0);
  console.log(`[PASS 8] Tie condition verified: ${drawSummary.winnerText}`);

  // 9. Host Level Override during match
  const levelChangePromise = new Promise((resolve) => {
    clientB.on('match:level:changed', resolve);
  });
  clientA.emit('match:choose-level', { level: 2 });
  const levelChangeData = await levelChangePromise;
  assert.strictEqual(levelChangeData.level, 2, 'Match should switch to Level 2 on host request');
  console.log('[PASS 9] Host Level Override during match: transitioned room to Level 2');

  clientA.disconnect();
  clientB.disconnect();

  console.log('\n========================================================================');
  console.log('   ALL 9 LEVEL SELECTION & WINNER TEST SCENARIOS PASSED CLEANLY!');
  console.log('========================================================================\n');
  process.exit(0);
}

run().catch((err) => {
  console.error('[FAIL]', err);
  process.exit(1);
});
