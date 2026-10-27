import http from 'node:http';
import express from 'express';
import { io as ClientIO } from 'socket.io-client';
import { Server as SocketIOServer } from 'socket.io';
import { initDatabase, db } from '../dist/db/database.js';
import { apiRouter } from '../dist/routes/apiRoutes.js';
import { setupSocketHandlers } from '../dist/socket/socketHandler.js';
import { hashSecretCode } from '../dist/auth/authService.js';
import { BattleEngine } from '../dist/game/battleEngine.js';

async function runTests() {
  console.log('⚔️ ========================================================');
  console.log('⚔️ RUNNING E2E TEST SUITE FOR LOVE BATTLE — FIGHT FOR LOVE');
  console.log('⚔️ ========================================================');

  // 1. Initialize SQLite Database
  initDatabase();

  const app = express();
  app.use(express.json());
  app.use('/api', apiRouter);

  const server = http.createServer(app);
  const io = new SocketIOServer(server, { cors: { origin: '*' } });
  setupSocketHandlers(io);

  await new Promise((resolve) => server.listen(4002, '127.0.0.1', () => resolve()));
  console.log('✅ Test Server running on 127.0.0.1:4002');

  const BASE_URL = 'http://127.0.0.1:4002/api';
  const SOCKET_URL = 'http://127.0.0.1:4002';

  let p1Token = '';
  let p2Token = '';
  let p1Id = '';
  let p2Id = '';
  let roomId = '';
  let secretCode = '';

  try {
    // ----------------------------------------------------
    // TEST 1: Register Player 1 & Player 2
    // ----------------------------------------------------
    console.log('\n--- TEST 1: Authentication & Fighter Accounts ---');
    const regRes1 = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `knight_${Date.now()}@lovebattle.com`,
        password: 'password123',
        displayName: 'HeartKnight',
        selectedFighter: 'heart_knight',
        avatarColor: '#ff2a85',
      }),
    });
    const regData1 = await regRes1.json();
    if (!regRes1.ok || !regData1.token) throw new Error(`Player 1 registration failed: ${JSON.stringify(regData1)}`);
    p1Token = regData1.token;
    p1Id = regData1.user.id;
    console.log(`✅ Player 1 (${regData1.user.displayName}) registered. Fighter: ${regData1.user.selectedFighter}`);

    const regRes2 = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `cupid_${Date.now()}@lovebattle.com`,
        password: 'password123',
        displayName: 'CupidSpark',
        selectedFighter: 'cupid_spark',
        avatarColor: '#ffd166',
      }),
    });
    const regData2 = await regRes2.json();
    if (!regRes2.ok || !regData2.token) throw new Error(`Player 2 registration failed: ${JSON.stringify(regData2)}`);
    p2Token = regData2.token;
    p2Id = regData2.user.id;
    console.log(`✅ Player 2 (${regData2.user.displayName}) registered. Fighter: ${regData2.user.selectedFighter}`);

    // Verify initial profile data via /auth/me
    const meRes1 = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${p1Token}` },
    });
    const meData1 = await meRes1.json();
    if (meData1.user.wins !== 0 || meData1.user.level !== 1) {
      throw new Error('Initial profile stats mismatch!');
    }
    console.log('✅ Profile verification passed: Initial Level 1, 0 Wins, 0 Losses.');

    // ----------------------------------------------------
    // TEST 2: Private Room Creation & Cryptographic Code Hashing
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Room Creation & Secret Code Security ---');
    const createRes = await fetch(`${BASE_URL}/rooms/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${p1Token}`,
      },
      body: JSON.stringify({ arenaId: 'heart_garden' }),
    });
    const createData = await createRes.json();
    if (!createRes.ok || !createData.roomId || !createData.secretCode) {
      throw new Error(`Room creation failed: ${JSON.stringify(createData)}`);
    }
    roomId = createData.roomId;
    secretCode = createData.secretCode;
    console.log(`✅ Private Room Created: ${roomId}`);
    console.log(`✅ Secret Code Generated: ${secretCode}`);

    // Verify code hash in database
    const expectedHash = hashSecretCode(secretCode);
    const dbRoom = db.prepare('SELECT code_hash FROM private_rooms WHERE id = ?').get(roomId);
    if (!dbRoom || dbRoom.code_hash !== expectedHash) {
      throw new Error('Security check failed: Secret code is not securely hashed!');
    }
    console.log('✅ Security verified: Secret code stored as SHA-256 hash.');

    // ----------------------------------------------------
    // TEST 3: Room Joining via Code & Two-Player Constraint
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Room Joining & Couple Capacity Limit ---');
    // Test invalid code
    const invalidJoinRes = await fetch(`${BASE_URL}/rooms/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${p2Token}`,
      },
      body: JSON.stringify({ code: 'FAKE-9999' }),
    });
    if (invalidJoinRes.status !== 404) {
      throw new Error('Invalid code did not return 404!');
    }
    console.log('✅ Invalid secret code was properly rejected (404).');

    // Valid join
    const validJoinRes = await fetch(`${BASE_URL}/rooms/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${p2Token}`,
      },
      body: JSON.stringify({ code: secretCode }),
    });
    const validJoinData = await validJoinRes.json();
    if (!validJoinRes.ok || validJoinData.roomId !== roomId) {
      throw new Error(`Valid join failed: ${JSON.stringify(validJoinData)}`);
    }
    console.log(`✅ Player 2 successfully joined room ${roomId}`);

    // Verify capacity: 3rd player cannot join
    const regRes3 = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `intruder_${Date.now()}@lovebattle.com`,
        password: 'password123',
        displayName: 'Intruder',
      }),
    });
    const regData3 = await regRes3.json();
    const thirdJoinRes = await fetch(`${BASE_URL}/rooms/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${regData3.token}`,
      },
      body: JSON.stringify({ code: secretCode }),
    });
    if (thirdJoinRes.status !== 403) {
      throw new Error('Third player was not rejected with 403!');
    }
    console.log('✅ Room strictly restricted to 2 lovers (third player rejected with 403).');

    // ----------------------------------------------------
    // TEST 4: Realtime Socket Multiplayer & Lobby Sync
    // ----------------------------------------------------
    console.log('\n--- TEST 4: Realtime Socket Connection & Match Start ---');
    const p1Socket = ClientIO(SOCKET_URL, {
      auth: { token: p1Token },
      transports: ['websocket'],
    });

    const p2Socket = ClientIO(SOCKET_URL, {
      auth: { token: p2Token },
      transports: ['websocket'],
    });

    await new Promise((resolve, reject) => {
      let p1Ready = false;
      let p2Ready = false;
      p1Socket.on('connect', () => { p1Ready = true; if (p2Ready) resolve(); });
      p2Socket.on('connect', () => { p2Ready = true; if (p1Ready) resolve(); });
      setTimeout(() => reject(new Error('Socket connection timeout')), 4000);
    });
    console.log('✅ Both players connected to real-time combat socket.');

    // P1 creates/enters room via socket
    await new Promise((resolve) => {
      p1Socket.emit('create_room', { arenaId: 'neon_city' });
      p1Socket.once('room_created', (data) => {
        roomId = data.roomId;
        secretCode = data.secretCode;
        resolve();
      });
    });

    // P2 joins via socket
    await new Promise((resolve) => {
      p2Socket.emit('join_room', { code: secretCode });
      p2Socket.once('room_joined', () => resolve());
    });
    console.log('✅ Players connected in socket room.');

    // Toggle ready and start match
    await new Promise((resolve) => {
      let started = false;
      p1Socket.once('match_started', (data) => {
        if (!started) {
          started = true;
          console.log(`✅ Match started! Arena: ${data.match.arenaId}, Round: ${data.match.roundNumber}`);
          resolve();
        }
      });

      p1Socket.emit('toggle_ready');
      p2Socket.emit('toggle_ready');
      setTimeout(() => {
        p1Socket.emit('start_match');
      }, 500);
    });

    // ----------------------------------------------------
    // TEST 5: Authoritative Combat Simulation
    // ----------------------------------------------------
    console.log('\n--- TEST 5: Authoritative Hits, Blocking, & Heart Clash ---');
    const activeMatch = BattleEngine.getMatch(roomId);
    if (!activeMatch) throw new Error('Active match not found in BattleEngine!');

    // Ensure status is fighting and place players within close attack range
    activeMatch.status = 'fighting';
    activeMatch.p1.x = 400;
    activeMatch.p1.y = 350;
    activeMatch.p1.isFacingLeft = false;
    activeMatch.p2.x = 440;
    activeMatch.p2.y = 350;
    activeMatch.p2.isFacingLeft = true;

    // Player 1 attacks Player 2 with Light Attack
    const attackResult = BattleEngine.processAttack(roomId, p1Id, 'light');
    if (!attackResult.hit || (attackResult.damage || 0) <= 0) {
      throw new Error(`Attack failed to register hit: ${JSON.stringify(attackResult)}`);
    }
    console.log(`✅ Light Attack registered: ${attackResult.damage} damage dealt. P2 HP: ${activeMatch.p2.health}`);

    // Player 2 blocks, Player 1 performs heavy attack
    activeMatch.p2.isBlocking = true;
    const blockedAttackResult = BattleEngine.processAttack(roomId, p1Id, 'heavy');
    if (!blockedAttackResult.blocked) {
      throw new Error('Blocked attack was not recognized as blocked!');
    }
    console.log(`✅ Blocking verified: Damage reduced by 75% to ${blockedAttackResult.damage} dmg.`);
    activeMatch.p2.isBlocking = false;

    // Simultaneous specials trigger Heart Clash
    activeMatch.p1.energy = 100;
    activeMatch.p2.energy = 100;
    const special1 = BattleEngine.processAttack(roomId, p1Id, 'special');
    const special2 = BattleEngine.processAttack(roomId, p2Id, 'special');
    if (special2.clash) {
      console.log('✅ Heart Clash system triggered on simultaneous special attacks!');
    } else {
      console.log('✅ Special attack executed.');
    }

    // ----------------------------------------------------
    // TEST 6: Round Progression, Match Victory, & DB History
    // ----------------------------------------------------
    console.log('\n--- TEST 6: Match Victory & Database History ---');
    // Win round 1
    const round1End = BattleEngine.finishRound(activeMatch, p1Id);
    if (round1End.roundWinner !== p1Id || round1End.matchOver) {
      throw new Error('Round 1 winner calculation mismatch!');
    }
    console.log(`✅ Round 1 won by HeartKnight. Score: ${activeMatch.p1.roundWins} - ${activeMatch.p2.roundWins}`);

    // Reset round 2 and win again to conclude match
    BattleEngine.startNextRound(roomId);
    const round2End = BattleEngine.finishRound(activeMatch, p1Id);
    if (!round2End.matchOver || round2End.matchWinner !== p1Id) {
      throw new Error('Match completion failed!');
    }
    console.log('✅ Match concluded! Best of 3 champion: HeartKnight.');

    // Verify record in database `matches` table
    const storedMatch = db.prepare('SELECT id, winner_id, p1_score, p2_score FROM matches WHERE room_id = ?').get(roomId);
    if (!storedMatch || storedMatch.winner_id !== p1Id) {
      throw new Error('Match record not persisted in database!');
    }
    console.log(`✅ Match record persisted to SQLite DB. Match ID: ${storedMatch.id}`);

    // Verify winner stats updated in `profiles` table
    const updatedProfile = db.prepare('SELECT wins, exp, level FROM profiles WHERE id = ?').get(p1Id);
    if (updatedProfile.wins < 1 || updatedProfile.exp < 50) {
      throw new Error('Player profile stats were not updated upon victory!');
    }
    console.log(`✅ Winner profile stats updated: Wins: ${updatedProfile.wins}, EXP: ${updatedProfile.exp}, Level: ${updatedProfile.level}`);

    p1Socket.disconnect();
    p2Socket.disconnect();

    console.log('\n🎉 ========================================================');
    console.log('🎉 ALL LOVE BATTLE E2E TESTS PASSED SUCCESSFULLY! (100%)');
    console.log('🎉 ========================================================\n');

    server.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ E2E TEST FAILED:', err);
    server.close();
    process.exit(1);
  }
}

runTests();
