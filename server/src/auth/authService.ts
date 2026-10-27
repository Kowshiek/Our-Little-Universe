import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_cosmic_jwt_key_love_universe_2026_dev';
const SALT_ROUNDS = 10;

// Rate limiting map for invite code attempts (IP / User -> { attempts, lastAttemptTime })
const inviteRateLimits = new Map<string, { attempts: number; blockedUntil: number }>();

export function checkInviteRateLimit(identifier: string): { allowed: boolean; waitSeconds?: number } {
  const now = Date.now();
  const record = inviteRateLimits.get(identifier);

  if (!record) {
    inviteRateLimits.set(identifier, { attempts: 1, blockedUntil: 0 });
    return { allowed: true };
  }

  if (record.blockedUntil > now) {
    return {
      allowed: false,
      waitSeconds: Math.ceil((record.blockedUntil - now) / 1000),
    };
  }

  record.attempts += 1;
  // If more than 5 attempts within a minute, block for 60 seconds
  if (record.attempts > 5) {
    record.blockedUntil = now + 60000;
    record.attempts = 0;
    return { allowed: false, waitSeconds: 60 };
  }

  return { allowed: true };
}

export function resetInviteRateLimit(identifier: string): void {
  inviteRateLimits.delete(identifier);
}

// Generate human-friendly, cryptographically secure code e.g. LOVE-7X9K
export function generateInviteCode(): { code: string; codeHash: string } {
  const prefixList = ['LOVE', 'STAR', 'COSMIC', 'HEART', 'MOON'];
  const prefix = prefixList[Math.floor(Math.random() * prefixList.length)];
  const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  const code = `${prefix}-${randomSuffix}`;
  const codeHash = hashInviteCode(code);
  return { code, codeHash };
}

export function hashInviteCode(code: string): string {
  return crypto.createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: { userId: string; email: string; displayName: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '14d' });
}

export function verifyToken(token: string): { userId: string; email: string; displayName: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string; displayName: string };
  } catch (err) {
    return null;
  }
}

export function getUserById(userId: string) {
  const query = db.prepare(`
    SELECT id, email, display_name as displayName, avatar_color as avatarColor, avatar_style as avatarStyle, created_at as createdAt
    FROM profiles WHERE id = ?
  `);
  return query.get(userId) as any;
}

export function getUserByEmail(email: string) {
  const query = db.prepare(`
    SELECT id, email, password_hash as passwordHash, display_name as displayName, avatar_color as avatarColor, avatar_style as avatarStyle
    FROM profiles WHERE LOWER(email) = LOWER(?)
  `);
  return query.get(email) as any;
}
