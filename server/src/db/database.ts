import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const dbDirectory = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dbDirectory)) {
  fs.mkdirSync(dbDirectory, { recursive: true });
}

const dbPath = path.join(dbDirectory, 'love_battle.db');
export const db = new DatabaseSync(dbPath);

// Enable WAL mode and foreign keys for high concurrency & integrity
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

export function initDatabase() {
  db.exec(`
    -- Profiles table for Love Battle fighters
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      selected_fighter TEXT DEFAULT 'heart_knight',
      avatar_color TEXT DEFAULT '#ff2a85',
      title TEXT DEFAULT 'Passionate Challenger',
      level INTEGER DEFAULT 1,
      exp INTEGER DEFAULT 0,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      draws INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Private Battle Rooms (Secret code access, couple 1v1 limit)
    CREATE TABLE IF NOT EXISTS private_rooms (
      id TEXT PRIMARY KEY,
      code_hash TEXT NOT NULL,
      display_code TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      arena_id TEXT DEFAULT 'heart_garden',
      status TEXT DEFAULT 'waiting', -- 'waiting', 'ready', 'fighting', 'finished'
      rounds_to_win INTEGER DEFAULT 2, -- Best of 3
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE
    );

    -- Room Members (Max 2 fighters per private room)
    CREATE TABLE IF NOT EXISTS room_members (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      fighter_id TEXT DEFAULT 'heart_knight',
      is_ready INTEGER DEFAULT 0,
      role TEXT NOT NULL DEFAULT 'challenger', -- 'owner' or 'challenger'
      joined_at TEXT DEFAULT (datetime('now')),
      UNIQUE(room_id, user_id),
      FOREIGN KEY (room_id) REFERENCES private_rooms(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
    );

    -- Matches & Battle History
    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      room_id TEXT,
      player1_id TEXT NOT NULL,
      player2_id TEXT NOT NULL,
      p1_fighter TEXT NOT NULL,
      p2_fighter TEXT NOT NULL,
      arena_id TEXT NOT NULL,
      winner_id TEXT, -- NULL if draw
      p1_score INTEGER DEFAULT 0,
      p2_score INTEGER DEFAULT 0,
      duration_seconds INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (player1_id) REFERENCES profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (player2_id) REFERENCES profiles(id) ON DELETE CASCADE
    );

    -- Player Cosmetic Unlocks & Achievements
    CREATE TABLE IF NOT EXISTS player_unlocks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      unlock_type TEXT NOT NULL, -- 'title', 'skin', 'emote'
      unlock_key TEXT NOT NULL,
      unlocked_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, unlock_type, unlock_key),
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
    );

    -- Match Checkpoints for Safe Recovery
    CREATE TABLE IF NOT EXISTS match_checkpoints (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL UNIQUE,
      round_number INTEGER DEFAULT 1,
      p1_health INTEGER DEFAULT 100,
      p2_health INTEGER DEFAULT 100,
      p1_score INTEGER DEFAULT 0,
      p2_score INTEGER DEFAULT 0,
      timer_remaining INTEGER DEFAULT 60,
      saved_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (room_id) REFERENCES private_rooms(id) ON DELETE CASCADE
    );

    -- Indexes for high performance queries
    CREATE INDEX IF NOT EXISTS idx_rooms_code ON private_rooms(code_hash);
    CREATE INDEX IF NOT EXISTS idx_room_members_room ON room_members(room_id);
    CREATE INDEX IF NOT EXISTS idx_room_members_user ON room_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_matches_p1 ON matches(player1_id);
    CREATE INDEX IF NOT EXISTS idx_matches_p2 ON matches(player2_id);
  `);

  console.log('❤️🔥 Love Battle SQLite database initialized with battle schemas and indexes.');
}
