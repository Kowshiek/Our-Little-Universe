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
} from '../auth/authService.js';
import { GameSaveService } from '../services/gameSaveService.js';

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

// Register new user
apiRouter.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, password, displayName, avatarColor, avatarStyle } = req.body;

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
    const color = avatarColor || '#ec4899';
    const style = avatarStyle || 'starlight';

    db.prepare(`
      INSERT INTO profiles (id, email, password_hash, display_name, avatar_color, avatar_style)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, email.toLowerCase(), passwordHash, displayName.trim(), color, style);

    const token = generateToken({ userId, email: email.toLowerCase(), displayName: displayName.trim() });

    return res.status(201).json({
      token,
      user: {
        id: userId,
        email: email.toLowerCase(),
        displayName: displayName.trim(),
        avatarColor: color,
        avatarStyle: style,
      },
    });
  } catch (err: any) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Failed to create account: ' + err.message });
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

    // Retrieve active universes for this user
    const userUniverses = db.prepare(`
      SELECT u.id, u.name, u.planet_level as planetLevel, u.owner_id as ownerId, m.role, m.joined_at as joinedAt
      FROM universe_members m
      JOIN universes u ON u.id = m.universe_id
      WHERE m.user_id = ?
      ORDER BY m.joined_at DESC
    `).all(user.id);

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarColor: user.avatarColor,
        avatarStyle: user.avatarStyle,
      },
      universes: userUniverses,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

// Get current user profile & universes
apiRouter.get('/auth/me', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const user = getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const universes = db.prepare(`
      SELECT u.id, u.name, u.planet_level as planetLevel, u.owner_id as ownerId, m.role, m.joined_at as joinedAt
      FROM universe_members m
      JOIN universes u ON u.id = m.universe_id
      WHERE m.user_id = ?
      ORDER BY m.joined_at DESC
    `).all(userId);

    return res.json({ user, universes });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * UNIVERSE MANAGEMENT ROUTES
 */

// Create private universe
apiRouter.post('/universe/create', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { universeName } = req.body;

    if (!universeName || !universeName.trim()) {
      return res.status(400).json({ error: 'Universe name is required' });
    }

    const result = GameSaveService.createUniverse({
      userId,
      universeName: universeName.trim(),
    });

    return res.status(201).json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Join universe with code
apiRouter.post('/universe/join', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { code } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({ error: 'Invitation code is required' });
    }

    // Rate limit per IP/User to prevent brute forcing codes
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const rateLimitKey = `${userId}:${ip}`;

    const result = GameSaveService.joinUniverseWithCode(userId, code, rateLimitKey);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Get active invite code for universe (owner only)
apiRouter.get('/universe/:id/invite', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const universeId = req.params.id;

    const invite = GameSaveService.getActiveInviteCode(universeId, userId);
    if (!invite) {
      return res.status(404).json({ error: 'No active invitation code found' });
    }

    return res.json(invite);
  } catch (err: any) {
    return res.status(403).json({ error: err.message });
  }
});

// Rotate invite code (owner only)
apiRouter.post('/universe/:id/invite/rotate', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const universeId = req.params.id;

    const result = GameSaveService.rotateInviteCode(universeId, userId);
    return res.json(result);
  } catch (err: any) {
    return res.status(403).json({ error: err.message });
  }
});

/**
 * GAME SAVE & RESUME ARCHITECTURE ROUTES
 */

// Load full shared universe state & individual player state
apiRouter.get('/game/load/:universeId', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const universeId = req.params.universeId;

    const universeData = GameSaveService.loadUniverseState(universeId, userId);
    const playerData = GameSaveService.loadPlayerState(universeId, userId);

    return res.json({
      ...universeData,
      player: playerData,
    });
  } catch (err: any) {
    return res.status(403).json({ error: err.message });
  }
});

// Save player state (coordinates, health, scene, safe resume point)
apiRouter.post('/game/save-player/:universeId', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const universeId = req.params.universeId;

    const result = GameSaveService.savePlayerState(universeId, userId, req.body);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Save shared universe state
apiRouter.post('/game/save-universe/:universeId', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const universeId = req.params.universeId;

    const result = GameSaveService.saveUniverseState(universeId, userId, req.body);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Place object/decoration
apiRouter.post('/game/place-object/:universeId', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const universeId = req.params.universeId;

    const result = GameSaveService.placeObject(universeId, userId, req.body);
    return res.status(201).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Remove object/decoration
apiRouter.post('/game/remove-object/:universeId', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const universeId = req.params.universeId;
    const { objectId } = req.body;

    const result = GameSaveService.removeObject(universeId, userId, objectId);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Purchase shop item using shared stars
apiRouter.post('/game/purchase/:universeId', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const universeId = req.params.universeId;
    const { itemType, cost } = req.body;

    const result = GameSaveService.purchaseShopItem(universeId, userId, itemType, cost);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Claim mission reward atomically
apiRouter.post('/game/claim-mission/:universeId', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const universeId = req.params.universeId;
    const { missionKey } = req.body;

    const result = GameSaveService.claimMissionReward(universeId, userId, missionKey);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Sync pending offline changes queue
apiRouter.post('/game/sync-queue/:universeId', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const universeId = req.params.universeId;
    const { queue } = req.body;

    const result = GameSaveService.syncPendingChanges(universeId, userId, queue || []);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});
