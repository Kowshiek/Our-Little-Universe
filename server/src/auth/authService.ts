import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'love_battle_secret_key_flame_2026_dev';
const SALT_ROUNDS = 10;

// Rate limiting map for secret code attempts (IP / User -> { attempts, blockedUntil })
const codeRateLimits = new Map<string, { attempts: number; blockedUntil: number }>();

export function checkCodeRateLimit(identifier: string): { allowed: boolean; waitSeconds?: number } {
  const now = Date.now();
  const record = codeRateLimits.get(identifier);

  if (!record) {
    codeRateLimits.set(identifier, { attempts: 1, blockedUntil: 0 });
    return { allowed: true };
  }

  if (record.blockedUntil > now) {
    return {
      allowed: false,
      waitSeconds: Math.ceil((record.blockedUntil - now) / 1000),
    };
  }

  record.attempts += 1;
  // If more than 5 failed attempts within 60s, block for 60 seconds
  if (record.attempts > 5) {
    record.blockedUntil = now + 60000;
    record.attempts = 0;
    return { allowed: false, waitSeconds: 60 };
  }

  return { allowed: true };
}

export function resetCodeRateLimit(identifier: string): void {
  codeRateLimits.delete(identifier);
}

// Generate unpredictable, romantic secret invitation code e.g. LOVE-9F2C, HEART-4B7E
export function generateSecretCode(): { code: string; codeHash: string } {
  const prefixes = ['LOVE', 'HEART', 'FLAME', 'VALOR', 'CUPID'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  const code = `${prefix}-${randomSuffix}`;
  const codeHash = hashSecretCode(code);
  return { code, codeHash };
}

export function hashSecretCode(code: string): string {
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
    SELECT id, email, display_name as displayName, selected_fighter as selectedFighter,
           avatar_color as avatarColor, title, level, exp, wins, losses, draws, created_at as createdAt
    FROM profiles WHERE id = ?
  `);
  return query.get(userId) as any;
}

export function getUserByEmail(email: string) {
  const query = db.prepare(`
    SELECT id, email, password_hash as passwordHash, display_name as displayName,
           selected_fighter as selectedFighter, avatar_color as avatarColor, title,
           level, exp, wins, losses, draws
    FROM profiles WHERE LOWER(email) = LOWER(?)
  `);
  return query.get(email) as any;
}
