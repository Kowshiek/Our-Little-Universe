import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

// Ensure data directory exists
const dbDirectory = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dbDirectory)) {
  fs.mkdirSync(dbDirectory, { recursive: true });
}

const dbPath = path.join(dbDirectory, 'universe.db');
export const db = new DatabaseSync(dbPath);

// Enable WAL mode and foreign keys for high concurrency and relational integrity
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

export function initDatabase() {
  db.exec(`
    -- Profiles table
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      avatar_color TEXT DEFAULT '#ec4899',
      avatar_style TEXT DEFAULT 'starlight',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Universes table
    CREATE TABLE IF NOT EXISTS universes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      planet_level INTEGER DEFAULT 1,
      theme TEXT DEFAULT 'cosmic_dream',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE
    );

    -- Universe Members (Couples authorization)
    CREATE TABLE IF NOT EXISTS universe_members (
      id TEXT PRIMARY KEY,
      universe_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'partner',
      joined_at TEXT DEFAULT (datetime('now')),
      UNIQUE(universe_id, user_id),
      FOREIGN KEY (universe_id) REFERENCES universes(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
    );

    -- Universe Invitations (Hashed codes for security, rotatable)
    CREATE TABLE IF NOT EXISTS universe_invitations (
      id TEXT PRIMARY KEY,
      universe_id TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      display_code TEXT NOT NULL, -- Short readable code like LOVE-XXXX for display to owner
      created_by TEXT NOT NULL,
      is_revoked INTEGER DEFAULT 0,
      max_uses INTEGER DEFAULT 1,
      uses_count INTEGER DEFAULT 0,
      expires_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (universe_id) REFERENCES universes(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE
    );

    -- Shared Universe States
    CREATE TABLE IF NOT EXISTS universe_states (
      id TEXT PRIMARY KEY,
      universe_id TEXT UNIQUE NOT NULL,
      shared_stars INTEGER DEFAULT 50,
      shared_crystals INTEGER DEFAULT 10,
      portal_unlocked INTEGER DEFAULT 0,
      boss_defeated INTEGER DEFAULT 0,
      story_progress TEXT DEFAULT 'tutorial',
      version INTEGER DEFAULT 1,
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (universe_id) REFERENCES universes(id) ON DELETE CASCADE
    );

    -- Player States (Coordinates, safe resume point, health, stats)
    CREATE TABLE IF NOT EXISTS player_states (
      id TEXT PRIMARY KEY,
      universe_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      current_planet TEXT DEFAULT 'planet_lumina',
      position_x REAL DEFAULT 400.0,
      position_y REAL DEFAULT 350.0,
      last_safe_x REAL DEFAULT 400.0,
      last_safe_y REAL DEFAULT 350.0,
      health INTEGER DEFAULT 100,
      max_health INTEGER DEFAULT 100,
      energy INTEGER DEFAULT 100,
      max_energy INTEGER DEFAULT 100,
      equipped_outfit TEXT DEFAULT 'cosmic_explorer',
      last_saved_at TEXT DEFAULT (datetime('now')),
      UNIQUE(universe_id, user_id),
      FOREIGN KEY (universe_id) REFERENCES universes(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
    );

    -- Planet States
    CREATE TABLE IF NOT EXISTS planet_states (
      id TEXT PRIMARY KEY,
      universe_id TEXT NOT NULL,
      planet_id TEXT NOT NULL,
      unlocked INTEGER DEFAULT 1,
      weather TEXT DEFAULT 'stardust_breeze',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(universe_id, planet_id),
      FOREIGN KEY (universe_id) REFERENCES universes(id) ON DELETE CASCADE
    );

    -- Placed Objects (Decorations, benches, lamps, trees, buildings)
    CREATE TABLE IF NOT EXISTS placed_objects (
      id TEXT PRIMARY KEY,
      universe_id TEXT NOT NULL,
      planet_id TEXT NOT NULL DEFAULT 'planet_lumina',
      object_type TEXT NOT NULL,
      tile_x INTEGER NOT NULL,
      tile_y INTEGER NOT NULL,
      rotation INTEGER DEFAULT 0,
      custom_data TEXT DEFAULT '{}',
      placed_by TEXT,
      placed_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (universe_id) REFERENCES universes(id) ON DELETE CASCADE,
      FOREIGN KEY (placed_by) REFERENCES profiles(id) ON DELETE SET NULL
    );

    -- Inventory Items
    CREATE TABLE IF NOT EXISTS inventory_items (
      id TEXT PRIMARY KEY,
      universe_id TEXT NOT NULL,
      user_id TEXT,
      item_type TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      is_shared INTEGER DEFAULT 1,
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (universe_id) REFERENCES universes(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
    );

    -- Missions Definition Table
    CREATE TABLE IF NOT EXISTS missions (
      id TEXT PRIMARY KEY,
      mission_key TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      required_count INTEGER DEFAULT 1,
      reward_type TEXT DEFAULT 'stars',
      reward_amount INTEGER DEFAULT 50,
      reward_item TEXT
    );

    -- Mission Progress per Universe
    CREATE TABLE IF NOT EXISTS mission_progress (
      id TEXT PRIMARY KEY,
      universe_id TEXT NOT NULL,
      mission_key TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'in_progress',
      progress_count INTEGER DEFAULT 0,
      completed_at TEXT,
      claimed_at TEXT,
      completed_by TEXT,
      UNIQUE(universe_id, mission_key),
      FOREIGN KEY (universe_id) REFERENCES universes(id) ON DELETE CASCADE,
      FOREIGN KEY (mission_key) REFERENCES missions(mission_key) ON DELETE CASCADE,
      FOREIGN KEY (completed_by) REFERENCES profiles(id) ON DELETE SET NULL
    );

    -- Achievements
    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      universe_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      achievement_key TEXT NOT NULL,
      unlocked_at TEXT DEFAULT (datetime('now')),
      UNIQUE(universe_id, user_id, achievement_key),
      FOREIGN KEY (universe_id) REFERENCES universes(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
    );

    -- Save Versions (Concurrency & Audit log)
    CREATE TABLE IF NOT EXISTS save_versions (
      id TEXT PRIMARY KEY,
      universe_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      state_hash TEXT,
      saved_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (universe_id) REFERENCES universes(id) ON DELETE CASCADE,
      FOREIGN KEY (saved_by) REFERENCES profiles(id) ON DELETE SET NULL
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_universe_members_user ON universe_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_universe_members_univ ON universe_members(universe_id);
    CREATE INDEX IF NOT EXISTS idx_placed_objects_univ_planet ON placed_objects(universe_id, planet_id);
    CREATE INDEX IF NOT EXISTS idx_player_states_univ ON player_states(universe_id);
    CREATE INDEX IF NOT EXISTS idx_invitations_code ON universe_invitations(code_hash);
  `);

  // Seed default mission definitions
  const insertMission = db.prepare(`
    INSERT OR IGNORE INTO missions (id, mission_key, title, description, required_count, reward_type, reward_amount, reward_item)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertMission.run(
    'm-1',
    'tutorial_stars',
    'Magical Starlight',
    'Collect 5 magical stars scattered across Lumina Island together.',
    5,
    'stars',
    50,
    'crystal_lamp'
  );

  insertMission.run(
    'm-2',
    'explore_island',
    'Island Explorers',
    'Explore the floating cosmic island and locate the Ancient Stargate Portal.',
    1,
    'stars',
    40,
    'cherry_blossom'
  );

  insertMission.run(
    'm-3',
    'unlock_portal',
    'Portal Awakening',
    'Activate the Ancient Portal to open passage to the Nebula Arena.',
    1,
    'crystals',
    20,
    'star_fountain'
  );

  insertMission.run(
    'm-4',
    'defeat_boss',
    'Celestial Guardians',
    'Defeat the Starlight Golem boss together in the Nebula Arena.',
    1,
    'stars',
    200,
    'heart_monument'
  );

  console.log('✅ SQLite database initialized with schemas, indexes, and missions.');
}
