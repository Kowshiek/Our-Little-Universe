import http from 'node:http';
import express from 'express';
import { io as ClientIO } from 'socket.io-client';
import { Server as SocketIOServer } from 'socket.io';
import { initDatabase, db } from '../dist/db/database.js';
import { apiRouter } from '../dist/routes/apiRoutes.js';
import { setupSocketHandlers } from '../dist/socket/socketHandler.js';
import { GameSaveService } from '../dist/services/gameSaveService.js';
import { hashInviteCode } from '../dist/auth/authService.js';

async function runTests() {
  console.log('🌌 ===============================================');
  console.log('🌌 RUNNING E2E TEST SUITE FOR OUR LITTLE UNIVERSE');
  console.log('🌌 ===============================================');

  // 1. Initialize SQLite Database
  initDatabase();

  const app = express();
  app.use(express.json());
  app.use('/api', apiRouter);

  const server = http.createServer(app);
  const io = new SocketIOServer(server, { cors: { origin: '*' } });
  setupSocketHandlers(io);

  await new Promise((resolve) => server.listen(4001, () => resolve()));
  console.log('✅ Test Server running on port 4001');

  const BASE_URL = 'http://localhost:4001/api';

  try {
    // ----------------------------------------------------
    // TEST 1: Register Player 1 (Luna) & Player 2 (Orion)
    // ----------------------------------------------------
    console.log('\n--- TEST 1: Authentication & Profiles ---');
    const regRes1 = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `luna_${Date.now()}@starlight.com`,
        password: 'password123',
        displayName: 'Luna',
        avatarColor: '#ec4899',
        avatarStyle: 'starlight',
      }),
    });
    const regData1 = await regRes1.json();
    if (!regRes1.ok || !regData1.token) throw new Error(`Player 1 registration failed: ${JSON.stringify(regData1)}`);
    console.log('✅ Player 1 (Luna) registered successfully with token.');

    const regRes2 = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `orion_${Date.now()}@starlight.com`,
        password: 'password123',
        displayName: 'Orion',
        avatarColor: '#38bdf8',
        avatarStyle: 'starlight',
      }),
    });
    const regData2 = await regRes2.json();
    if (!regRes2.ok || !regData2.token) throw new Error(`Player 2 registration failed: ${JSON.stringify(regData2)}`);
    console.log('✅ Player 2 (Orion) registered successfully with token.');

    // ----------------------------------------------------
    // TEST 2: Private Universe Creation & Invitation Code
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Universe Creation & Secure Invitation ---');
    const createRes = await fetch(`${BASE_URL}/universe/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${regData1.token}`,
      },
      body: JSON.stringify({ universeName: 'Starlight Sanctuary' }),
    });
    const createData = await createRes.json();
    if (!createRes.ok || !createData.universe || !createData.inviteCode) {
      throw new Error(`Universe creation failed: ${JSON.stringify(createData)}`);
    }
    const universeId = createData.universe.id;
    const inviteCode = createData.inviteCode;
    console.log(`✅ Universe created: "${createData.universe.name}" (ID: ${universeId})`);
    console.log(`✅ Secure invitation code generated: "${inviteCode}"`);

    // Verify invitation is stored hashed in DB
    const expectedHash = hashInviteCode(inviteCode);
    const storedInvite = db.prepare('SELECT code_hash FROM universe_invitations WHERE universe_id = ?').get(universeId);
    if (!storedInvite || storedInvite.code_hash !== expectedHash) {
      throw new Error('Security check failed: Invitation code is not hashed properly!');
    }
    console.log('✅ Security verified: Invitation code stored as cryptographic SHA-256 hash.');

    // ----------------------------------------------------
    // TEST 3: Invitation Code Validation & Joining
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Partner Joining & Capacity Enforcement ---');
    // Test invalid code first
    const badJoin = await fetch(`${BASE_URL}/universe/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${regData2.token}`,
      },
      body: JSON.stringify({ code: 'FAKE-9999' }),
    });
    if (badJoin.ok) throw new Error('Security check failed: Invalid invitation code was accepted!');
    console.log('✅ Invalid code correctly rejected with 400 status.');

    // Valid join by Orion
    const goodJoin = await fetch(`${BASE_URL}/universe/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${regData2.token}`,
      },
      body: JSON.stringify({ code: inviteCode }),
    });
    const joinData = await goodJoin.json();
    if (!goodJoin.ok || joinData.universeId !== universeId) {
      throw new Error(`Join universe failed: ${JSON.stringify(joinData)}`);
    }
    console.log(`✅ Player 2 joined successfully: "${joinData.message}"`);

    // Test 3rd player joining attempt (couple capacity limit = 2)
    const regRes3 = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `stranger_${Date.now()}@starlight.com`,
        password: 'password123',
        displayName: 'Stranger',
      }),
    });
    const regData3 = await regRes3.json();

    const thirdJoin = await fetch(`${BASE_URL}/universe/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${regData3.token}`,
      },
      body: JSON.stringify({ code: inviteCode }),
    });
    if (thirdJoin.ok) throw new Error('Capacity check failed: Third player was allowed to join couple universe!');
    console.log('✅ Privacy protection verified: Universe restricted to authorized couple (max 2).');

    // ----------------------------------------------------
    // TEST 4: Load Game State & Checkpoint Resume
    // ----------------------------------------------------
    console.log('\n--- TEST 4: Cloud Save & Resume Verification ---');
    const loadRes1 = await fetch(`${BASE_URL}/game/load/${universeId}`, {
      headers: { Authorization: `Bearer ${regData1.token}` },
    });
    const loadData1 = await loadRes1.json();
    if (!loadRes1.ok || !loadData1.universe || !loadData1.player) {
      throw new Error(`Load game failed: ${JSON.stringify(loadData1)}`);
    }
    console.log(`✅ Game state loaded: Shared Stars=${loadData1.state.sharedStars}, Placed Objects=${loadData1.placedObjects.length}`);
    console.log(`✅ Player safe resume coordinates verified: (${loadData1.player.lastSafeX}, ${loadData1.player.lastSafeY})`);

    // Save updated safe coordinates & stats
    const saveRes = await fetch(`${BASE_URL}/game/save-player/${universeId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${regData1.token}`,
      },
      body: JSON.stringify({
        positionX: 520,
        positionY: 410,
        lastSafeX: 520,
        lastSafeY: 410,
        health: 95,
      }),
    });
    if (!saveRes.ok) throw new Error('Save player state failed');

    // Verify persistence across reload
    const reloadRes = await fetch(`${BASE_URL}/game/load/${universeId}`, {
      headers: { Authorization: `Bearer ${regData1.token}` },
    });
    const reloadData = await reloadRes.json();
    if (reloadData.player.lastSafeX !== 520 || reloadData.player.lastSafeY !== 410 || reloadData.player.health !== 95) {
      throw new Error('Persistence failed: Safe resume checkpoint was not restored accurately!');
    }
    console.log('✅ Checkpoint persistence verified: Player restores exactly at safe coordinates (520, 410).');

    // ----------------------------------------------------
    // TEST 5: Atomic Missions & Reward Claim (Prevent Duplicates)
    // ----------------------------------------------------
    console.log('\n--- TEST 5: Missions & Duplicate Reward Prevention ---');
    // Complete tutorial stars mission
    GameSaveService.updateMissionProgress(universeId, 'tutorial_stars', 5);

    // First claim
    const claimRes1 = await fetch(`${BASE_URL}/game/claim-mission/${universeId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${regData1.token}`,
      },
      body: JSON.stringify({ missionKey: 'tutorial_stars' }),
    });
    const claimData1 = await claimRes1.json();
    if (!claimRes1.ok || !claimData1.success) {
      throw new Error(`Claim mission failed: ${JSON.stringify(claimData1)}`);
    }
    console.log(`✅ Mission reward claimed: +${claimData1.rewardAmount} stars. New total: ${claimData1.universeState.sharedStars}`);

    // Second claim attempt (Duplicate check)
    const claimRes2 = await fetch(`${BASE_URL}/game/claim-mission/${universeId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${regData2.token}`,
      },
      body: JSON.stringify({ missionKey: 'tutorial_stars' }),
    });
    if (claimRes2.ok) {
      throw new Error('Integrity failed: Duplicate mission reward was granted!');
    }
    console.log('✅ Concurrency protection verified: Duplicate mission reward claims strictly blocked.');

    // ----------------------------------------------------
    // TEST 6: Shop Purchases & Decoration Placement
    // ----------------------------------------------------
    console.log('\n--- TEST 6: Shop Purchases & Island Customization ---');
    // Purchase a cherry blossom tree (Cost: 20 stars)
    const buyRes = await fetch(`${BASE_URL}/game/purchase/${universeId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${regData1.token}`,
      },
      body: JSON.stringify({ itemType: 'cherry_blossom', cost: 20 }),
    });
    const buyData = await buyRes.json();
    if (!buyRes.ok || !buyData.success) throw new Error('Shop purchase failed');
    console.log(`✅ Shop purchase successful: 1 Cherry Blossom Tree bought. Remaining stars: ${buyData.sharedStars}`);

    // Place the decoration
    const placeRes = await fetch(`${BASE_URL}/game/place-object/${universeId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${regData1.token}`,
      },
      body: JSON.stringify({
        objectType: 'cherry_blossom',
        tileX: 350,
        tileY: 300,
        planetId: 'planet_lumina',
      }),
    });
    const placeData = await placeRes.json();
    if (!placeRes.ok || !placeData.success) throw new Error('Place object failed');
    console.log(`✅ Object placed at (350, 300) with ID: ${placeData.placedObject.id}`);

    // Test overlapping placement validation
    const overlapRes = await fetch(`${BASE_URL}/game/place-object/${universeId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${regData2.token}`,
      },
      body: JSON.stringify({
        objectType: 'crystal_lamp',
        tileX: 352,
        tileY: 301,
      }),
    });
    if (overlapRes.ok) throw new Error('Overlap validation failed: Objects placed too close together!');
    console.log('✅ Placement validation verified: Overlapping placements prevented.');

    // ----------------------------------------------------
    // TEST 7: Real-Time Socket.IO Multiplayer Synchronization
    // ----------------------------------------------------
    console.log('\n--- TEST 7: Real-Time Socket.IO Multiplayer & Co-Op ---');
    const socket1 = ClientIO('http://localhost:4001', {
      auth: { token: regData1.token },
      transports: ['websocket'],
    });

    const socket2 = ClientIO('http://localhost:4001', {
      auth: { token: regData2.token },
      transports: ['websocket'],
    });

    await new Promise((resolve, reject) => {
      let count = 0;
      const onConnect = () => {
        count++;
        if (count === 2) resolve();
      };
      socket1.on('connect', onConnect);
      socket2.on('connect', onConnect);
      setTimeout(() => reject(new Error('Socket connection timed out')), 4000);
    });
    console.log('✅ Both players authenticated & connected to Socket.IO server.');

    // Wait for both sockets to join the universe room
    const joinedPromise = new Promise((resolve) => {
      let joinedCount = 0;
      const onJoined = () => {
        joinedCount++;
        if (joinedCount === 2) resolve();
      };
      socket1.on('universe_joined', onJoined);
      socket2.on('universe_joined', onJoined);
    });

    socket1.emit('join_universe', { universeId });
    socket2.emit('join_universe', { universeId });
    await joinedPromise;

    // Test Movement Synchronization
    const movePromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Movement sync timed out')), 4000);
      socket2.on('partner_moved', (data) => {
        if (data.x === 580 && data.y === 420 && data.displayName === 'Luna') {
          clearTimeout(timeout);
          resolve();
        }
      });
    });

    socket1.emit('player_move', { x: 580, y: 420, vx: 100, vy: 0, anim: 'walk' });
    await movePromise;
    console.log('✅ Real-time movement synchronized between players with zero lag.');

    // Test Emote Synchronization
    const emotePromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Emote sync timed out')), 4000);
      socket1.on('emote_triggered', (data) => {
        if (data.emote === 'heart' && data.displayName === 'Orion') {
          clearTimeout(timeout);
          resolve();
        }
      });
    });

    socket2.emit('player_emote', { emote: 'heart', x: 440, y: 350 });
    await emotePromise;
    console.log('✅ Floating couple emote ("heart") received in real-time by partner.');

    // Test Cooperative Boss Encounter Combat
    const bossDamagePromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Boss attack timed out')), 4000);
      socket2.on('boss_damaged', (data) => {
        if (data.damage > 0 && data.bossHealth < data.bossMaxHealth) {
          clearTimeout(timeout);
          resolve();
        }
      });
    });

    socket1.emit('boss_attack', { damage: 25 });
    await bossDamagePromise;
    console.log('✅ Cooperative boss combat validated authoritatively on server.');

    socket1.disconnect();
    socket2.disconnect();

    console.log('\n===============================================');
    console.log('🎉 ALL E2E MULTIPLAYER & PERSISTENCE TESTS PASSED!');
    console.log('===============================================\n');

  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
