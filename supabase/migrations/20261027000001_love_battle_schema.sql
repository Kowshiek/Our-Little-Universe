-- Migration: 20261027000001_love_battle_schema.sql
-- LOVE BATTLE: FIGHT FOR LOVE
-- Tagline: Two Hearts. One Arena. Endless Battles.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table for Love Battle fighters
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    selected_fighter TEXT DEFAULT 'heart_knight',
    avatar_color TEXT DEFAULT '#ff2a85',
    title TEXT DEFAULT 'Passionate Challenger',
    level INT DEFAULT 1,
    exp INT DEFAULT 0,
    wins INT DEFAULT 0,
    losses INT DEFAULT 0,
    draws INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Private Battle Rooms (2-player couple limit)
CREATE TABLE IF NOT EXISTS private_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code_hash TEXT NOT NULL,
    display_code TEXT NOT NULL,
    owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    arena_id TEXT DEFAULT 'heart_garden',
    status TEXT DEFAULT 'waiting',
    rounds_to_win INT DEFAULT 2,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Room Members
CREATE TABLE IF NOT EXISTS room_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES private_rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    fighter_id TEXT DEFAULT 'heart_knight',
    is_ready BOOLEAN DEFAULT FALSE,
    role TEXT DEFAULT 'challenger',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(room_id, user_id)
);

-- Matches & Battle History
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID,
    player1_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    player2_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    p1_fighter TEXT NOT NULL,
    p2_fighter TEXT NOT NULL,
    arena_id TEXT NOT NULL,
    winner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    p1_score INT DEFAULT 0,
    p2_score INT DEFAULT 0,
    duration_seconds INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player Cosmetic Unlocks & Titles
CREATE TABLE IF NOT EXISTS player_unlocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    unlock_type TEXT NOT NULL,
    unlock_key TEXT NOT NULL,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, unlock_type, unlock_key)
);

-- Match Checkpoints for Reconnect Resilience
CREATE TABLE IF NOT EXISTS match_checkpoints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID UNIQUE REFERENCES private_rooms(id) ON DELETE CASCADE,
    round_number INT DEFAULT 1,
    p1_health INT DEFAULT 100,
    p2_health INT DEFAULT 100,
    p1_score INT DEFAULT 0,
    p2_score INT DEFAULT 0,
    timer_remaining INT DEFAULT 60,
    saved_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rooms_code ON private_rooms(code_hash);
CREATE INDEX IF NOT EXISTS idx_room_members_room ON room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_matches_players ON matches(player1_id, player2_id);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view fighter profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (id = auth.uid());
