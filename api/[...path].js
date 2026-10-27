// Serverless API for Vercel Deployment of LOVE BATTLE
import crypto from 'node:crypto';

// In-memory serverless cache
const rooms = new Map();
const users = new Map();

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
    const { arenaId = 'heart_garden' } = req.body || {};
    const roomId = 'room_' + crypto.randomBytes(4).toString('hex');
    const secretCode = generateCode();

    rooms.set(secretCode, { roomId, arenaId, secretCode });
    rooms.set(roomId, { roomId, arenaId, secretCode });

    return res.status(201).json({
      roomId,
      secretCode,
      arenaId,
    });
  }

  // 6. Rooms: Join
  if (fullPath === 'rooms/join' && req.method === 'POST') {
    const { code } = req.body || {};
    const clean = (code || '').trim().toUpperCase();
    const existing = rooms.get(clean);

    if (existing) {
      return res.status(200).json(existing);
    }

    // Auto-create room for code if not found so couple always connects!
    const newRoom = {
      roomId: 'room_' + clean.toLowerCase(),
      arenaId: 'heart_garden',
      secretCode: clean,
    };
    rooms.set(clean, newRoom);
    return res.status(200).json(newRoom);
  }

  // 7. Profile History
  if (fullPath === 'profile/history') {
    return res.status(200).json({ matches: [] });
  }

  return res.status(404).json({ error: 'Endpoint not found: ' + fullPath });
}
