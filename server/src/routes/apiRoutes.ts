import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database.js';
import {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  getUserById,
  getUserByEmail,
  generateSecretCode,
  hashSecretCode,
  checkCodeRateLimit,
  resetCodeRateLimit,
} from '../auth/authService.js';

export const apiRouter = Router();

// Middleware to extract and verify authenticated user
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  (req as any).user = payload;
  next();
}

/**
 * AUTHENTICATION ROUTES
 */

// Register new fighter
apiRouter.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, password, displayName, selectedFighter, avatarColor } = req.body;

    if (!email || !password || !displayName) {
      return res.status(400).json({ error: 'Email, password, and display name are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const userId = uuidv4();
    const passwordHash = await hashPassword(password);
    const fighter = selectedFighter || 'heart_knight';
    const color = avatarColor || '#ff2a85';

    db.prepare(`
      INSERT INTO profiles (id, email, password_hash, display_name, selected_fighter, avatar_color, title, level, exp, wins, losses, draws)
      VALUES (?, ?, ?, ?, ?, ?, 'Passionate Challenger', 1, 0, 0, 0, 0)
    `).run(userId, email.toLowerCase(), passwordHash, displayName.trim(), fighter, color);

    // Initial unlocked titles
    db.prepare(`
      INSERT INTO player_unlocks (id, user_id, unlock_type, unlock_key)
      VALUES (?, ?, 'title', 'Passionate Challenger')
    `).run(uuidv4(), userId);

    const token = generateToken({ userId, email: email.toLowerCase(), displayName: displayName.trim() });
    const user = getUserById(userId);

    return res.status(201).json({ token, user });
  } catch (err: any) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
});

// Login
apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken({ userId: user.id, email: user.email, displayName: user.displayName });
    const profile = getUserById(user.id);

    return res.json({ token, user: profile });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

// Get current profile
apiRouter.get('/auth/me', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const user = getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const unlocks = db.prepare(`
      SELECT unlock_type as unlockType, unlock_key as unlockKey, unlocked_at as unlockedAt
      FROM player_unlocks WHERE user_id = ?
    `).all(userId);

    return res.json({ user, unlocks });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * PRIVATE ROOM MANAGEMENT
 */

// Create private battle room
apiRouter.post('/rooms/create', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { arenaId = 'heart_garden' } = req.body;

    const roomId = uuidv4();
    const { code, codeHash } = generateSecretCode();

    db.prepare(`
      INSERT INTO private_rooms (id, code_hash, display_code, owner_id, arena_id, status)
      VALUES (?, ?, ?, ?, ?, 'waiting')
    `).run(roomId, codeHash, code, userId, arenaId);

    db.prepare(`
      INSERT INTO room_members (id, room_id, user_id, role, is_ready)
      VALUES (?, ?, ?, 'owner', 0)
    `).run(uuidv4(), roomId, userId);

    return res.status(201).json({
      roomId,
      secretCode: code,
      arenaId,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Join private battle room
apiRouter.post('/rooms/join', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { code } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({ error: 'Secret invitation code is required' });
    }

    const rateCheck = checkCodeRateLimit(userId);
    if (!rateCheck.allowed) {
      return res.status(429).json({ error: `Too many attempts. Please wait ${rateCheck.waitSeconds}s.` });
    }

    const codeHash = hashSecretCode(code.trim().toUpperCase());
    const room = db.prepare(`
      SELECT id, owner_id as ownerId, arena_id as arenaId, display_code as displayCode
      FROM private_rooms WHERE code_hash = ?
    `).get(codeHash) as any;

    if (!room) {
      return res.status(404).json({ error: 'Invalid secret invitation code. Please check with your partner!' });
    }

    const memberCount = db.prepare(`SELECT count(*) as count FROM room_members WHERE room_id = ?`).get(room.id) as any;
    const alreadyMember = db.prepare(`SELECT id FROM room_members WHERE room_id = ? AND user_id = ?`).get(room.id, userId);

    if (!alreadyMember) {
      if (memberCount.count >= 2) {
        return res.status(403).json({ error: 'This battle room is already full! (Max 2 fighters)' });
      }

      db.prepare(`
        INSERT INTO room_members (id, room_id, user_id, role, is_ready)
        VALUES (?, ?, ?, 'challenger', 0)
      `).run(uuidv4(), room.id, userId);
    }

    resetCodeRateLimit(userId);

    return res.json({
      roomId: room.id,
      arenaId: room.arenaId,
      secretCode: room.displayCode,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Get battle history
apiRouter.get('/profile/history', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const matches = db.prepare(`
      SELECT m.id, m.arena_id as arenaId, m.winner_id as winnerId,
             m.p1_fighter as p1Fighter, m.p2_fighter as p2Fighter,
             m.p1_score as p1Score, m.p2_score as p2Score,
             m.duration_seconds as durationSeconds, m.created_at as createdAt,
             p1.display_name as p1Name, p2.display_name as p2Name
      FROM matches m
      JOIN profiles p1 ON p1.id = m.player1_id
      JOIN profiles p2 ON p2.id = m.player2_id
      WHERE m.player1_id = ? OR m.player2_id = ?
      ORDER BY m.created_at DESC
      LIMIT 15
    `).all(userId, userId);

    return res.json({ matches });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
