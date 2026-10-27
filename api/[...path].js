// Serverless API for Vercel Deployment of LOVE BATTLE — FIGHT FOR LOVE
import crypto from 'node:crypto';

// In-memory serverless cache
const rooms = new Map();
const users = new Map();

// Free Cloud KV Bucket for cross-container global synchronization across Vercel regions
const KV_BASE_URL = 'https://kvdb.io/olu_lovebattle_prod_2026';

async function fetchFromKV(key) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1800);
    const res = await fetch(`${KV_BASE_URL}/${encodeURIComponent(key)}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    // Graceful fallback to memory
  }
  return null;
}

async function saveToKV(key, data) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1800);
    await fetch(`${KV_BASE_URL}/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: controller.signal,
    });
    clearTimeout(timeout);
  } catch (e) {
    // Graceful fallback
  }
}

function generateCode() {
  const prefixes = ['LOVE', 'HEART', 'FLAME', 'VALOR', 'CUPID'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}-${suffix}`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { path } = req.query;
  const fullPath = Array.isArray(path) ? path.join('/') : (path || '');

  // 1. Health check
  if (fullPath === 'health' || fullPath === '') {
    return res.status(200).json({
      status: 'online',
      game: 'LOVE BATTLE',
      tagline: 'Two Hearts. One Arena. Endless Battles.',
      timestamp: new Date().toISOString(),
    });
  }

  // 2. Auth: Register
  if (fullPath === 'auth/register' && req.method === 'POST') {
    const { email, displayName, selectedFighter = 'heart_knight', avatarColor = '#ff2a85' } = req.body || {};
    const userId = 'user_' + crypto.randomBytes(4).toString('hex');
    const user = {
      id: userId,
      email: email || `${userId}@lovebattle.com`,
      displayName: displayName || 'Fighter',
      selectedFighter,
      avatarColor,
      title: 'Passionate Challenger',
      level: 1,
      exp: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      createdAt: new Date().toISOString(),
    };
    users.set(userId, user);
    users.set(user.email.toLowerCase(), user);

    const token = 'token_' + userId;
    return res.status(201).json({ token, user });
  }

  // 3. Auth: Login
  if (fullPath === 'auth/login' && req.method === 'POST') {
    const { email } = req.body || {};
    const user = users.get(email?.toLowerCase()) || {
      id: 'user_' + crypto.randomBytes(4).toString('hex'),
      email: email || 'fighter@lovebattle.com',
      displayName: 'Fighter',
      selectedFighter: 'heart_knight',
      avatarColor: '#ff2a85',
      title: 'Passionate Challenger',
      level: 1,
      exp: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      createdAt: new Date().toISOString(),
    };
    const token = 'token_' + user.id;
    return res.status(200).json({ token, user });
  }

  // 4. Auth: Me
  if (fullPath === 'auth/me') {
    const authHeader = req.headers.authorization || '';
    const userId = authHeader.replace('Bearer token_', '').replace('Bearer ', '');
    const user = users.get(userId) || {
      id: userId || 'user_guest',
      email: 'fighter@lovebattle.com',
      displayName: 'Challenger',
      selectedFighter: 'heart_knight',
      avatarColor: '#ff2a85',
      title: 'Passionate Challenger',
      level: 1,
      exp: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      createdAt: new Date().toISOString(),
    };
    return res.status(200).json({ user, unlocks: [] });
  }

  // 5. Rooms: Create
  if (fullPath === 'rooms/create' && req.method === 'POST') {
    const { arenaId = 'heart_garden', owner, code } = req.body || {};
    const secretCode = (code || generateCode()).trim().toUpperCase();
    const roomId = 'room_' + secretCode.toLowerCase();

    const roomState = {
      roomId,
      secretCode,
      code: secretCode,
      arenaId,
      status: 'waiting',
      owner: {
        userId: owner?.id || owner?.userId || 'owner_' + crypto.randomBytes(3).toString('hex'),
        displayName: owner?.displayName || 'Heart Fighter',
        fighterId: owner?.selectedFighter || owner?.fighterId || 'heart_knight',
        isReady: false,
        level: owner?.level || 1,
        title: owner?.title || 'Passionate Challenger',
      },
      opponent: null,
      match: null,
      lastAction: null,
      updatedAt: Date.now(),
    };

    rooms.set(secretCode, roomState);
    rooms.set(roomId, roomState);

    // Persist to global Edge KV asynchronously
    saveToKV(secretCode, roomState);

    return res.status(201).json(roomState);
  }

  // 6. Rooms: Join
  if (fullPath === 'rooms/join' && req.method === 'POST') {
    const { code, challenger } = req.body || {};
    const clean = (code || '').trim().toUpperCase();

    if (!clean) {
      return res.status(400).json({ error: 'Secret code is required' });
    }

    // Try finding room in memory or Edge KV
    let room = rooms.get(clean);
    if (!room) {
      room = await fetchFromKV(clean);
      if (room) {
        rooms.set(clean, room);
      }
    }

    const opponentParticipant = {
      userId: challenger?.id || challenger?.userId || 'challenger_' + crypto.randomBytes(3).toString('hex'),
      displayName: challenger?.displayName || 'Partner (Lover)',
      fighterId: challenger?.selectedFighter || challenger?.fighterId || 'cupid_spark',
      isReady: false,
      level: challenger?.level || 1,
      title: challenger?.title || 'Passionate Challenger',
    };

    if (room) {
      // Attach challenger to existing room
      room.opponent = opponentParticipant;
      room.status = 'ready';
      room.updatedAt = Date.now();
      room.lastAction = {
        type: 'opponent_joined',
        userId: opponentParticipant.userId,
        timestamp: Date.now(),
      };
    } else {
      // Auto-create room for code so players never get blocked
      room = {
        roomId: 'room_' + clean.toLowerCase(),
        secretCode: clean,
        code: clean,
        arenaId: 'heart_garden',
        status: 'ready',
        owner: {
          userId: 'owner_' + crypto.randomBytes(3).toString('hex'),
          displayName: 'Heart Fighter (Host)',
          fighterId: 'heart_knight',
          isReady: false,
          level: 1,
          title: 'Arena Host',
        },
        opponent: opponentParticipant,
        match: null,
        lastAction: {
          type: 'opponent_joined',
          userId: opponentParticipant.userId,
          timestamp: Date.now(),
        },
        updatedAt: Date.now(),
      };
    }

    rooms.set(clean, room);
    rooms.set(room.roomId, room);

    // Persist updated room to global Edge KV
    saveToKV(clean, room);

    return res.status(200).json(room);
  }

  // 7. Rooms: Poll
  if (fullPath === 'rooms/poll' && req.method === 'GET') {
    const clean = (req.query.code || '').trim().toUpperCase();
    if (!clean) {
      return res.status(400).json({ error: 'Missing code' });
    }

    let room = rooms.get(clean);
    if (!room) {
      room = await fetchFromKV(clean);
      if (room) {
        rooms.set(clean, room);
      }
    }

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    return res.status(200).json(room);
  }

  // 8. Rooms: Action (Ready, Select Fighter, Select Arena, Start Match, Combat)
  if (fullPath === 'rooms/action' && req.method === 'POST') {
    const { code, userId, action, payload } = req.body || {};
    const clean = (code || '').trim().toUpperCase();

    let room = rooms.get(clean);
    if (!room) {
      room = await fetchFromKV(clean);
      if (room) {
        rooms.set(clean, room);
      }
    }

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const isOwner = room.owner && room.owner.userId === userId;
    const isOpponent = room.opponent && room.opponent.userId === userId;

    if (action === 'ready') {
      const isReady = payload?.isReady !== undefined ? payload.isReady : true;
      if (isOwner) room.owner.isReady = isReady;
      if (isOpponent) room.opponent.isReady = isReady;
    } else if (action === 'select_fighter') {
      const fId = payload?.fighterId || 'heart_knight';
      if (isOwner) room.owner.fighterId = fId;
      if (isOpponent) room.opponent.fighterId = fId;
    } else if (action === 'select_arena') {
      room.arenaId = payload?.arenaId || 'heart_garden';
    } else if (action === 'start_match') {
      room.status = 'fighting';
      room.match = {
        matchId: 'match_' + Date.now(),
        p1: {
          userId: room.owner.userId,
          displayName: room.owner.displayName,
          fighterId: room.owner.fighterId,
          health: 100,
          energy: 100,
          roundWins: 0,
        },
        p2: {
          userId: room.opponent?.userId || 'p2',
          displayName: room.opponent?.displayName || 'Challenger',
          fighterId: room.opponent?.fighterId || 'cupid_spark',
          health: 100,
          energy: 0,
          roundWins: 0,
        },
        roundNumber: 1,
        timerRemaining: 60,
        status: 'fighting',
      };
    } else if (action === 'combat_move' || action === 'combat_attack' || action === 'combat_hit') {
      // Attach combat action for real-time sync
      room.lastCombatEvent = {
        action,
        userId,
        payload,
        timestamp: Date.now(),
      };
    }

    room.lastAction = {
      type: action,
      userId,
      payload,
      timestamp: Date.now(),
    };
    room.updatedAt = Date.now();

    rooms.set(clean, room);
    saveToKV(clean, room);

    return res.status(200).json(room);
  }

  // 9. Profile History
  if (fullPath === 'profile/history') {
    return res.status(200).json({ matches: [] });
  }

  return res.status(404).json({ error: 'Endpoint not found: ' + fullPath });
}
