-- Migration: 20261027000000_init_our_little_universe.sql
-- Description: Core schema, tables, indexes, and RLS policies for Our Little Universe
-- Visual Theme: Dreamy cosmic couple adventure

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (Couples / Users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    avatar_color TEXT DEFAULT '#ec4899', -- pink/lavender default
    avatar_style TEXT DEFAULT 'starlight',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Universes Table
CREATE TABLE IF NOT EXISTS universes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    planet_level INT DEFAULT 1,
    theme TEXT DEFAULT 'cosmic_dream',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Universe Members (Authorization for shared access)
CREATE TABLE IF NOT EXISTS universe_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    universe_id UUID NOT NULL REFERENCES universes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'partner', -- 'owner' or 'partner'
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(universe_id, user_id)
);

-- 4. Universe Invitations (Secure, hashed, rotatable invite codes)
CREATE TABLE IF NOT EXISTS universe_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    universe_id UUID NOT NULL REFERENCES universes(id) ON DELETE CASCADE,
    code_hash TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    is_revoked BOOLEAN DEFAULT FALSE,
    max_uses INT DEFAULT 1,
    uses_count INT DEFAULT 0,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Shared Universe State
CREATE TABLE IF NOT EXISTS universe_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    universe_id UUID UNIQUE NOT NULL REFERENCES universes(id) ON DELETE CASCADE,
    shared_stars INT DEFAULT 0,
    shared_crystals INT DEFAULT 0,
    portal_unlocked BOOLEAN DEFAULT FALSE,
    boss_defeated BOOLEAN DEFAULT FALSE,
    story_progress TEXT DEFAULT 'tutorial',
    version INT DEFAULT 1,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Individual Player States (Safe positions, stats, current scene)
CREATE TABLE IF NOT EXISTS player_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    universe_id UUID NOT NULL REFERENCES universes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    current_planet TEXT DEFAULT 'planet_lumina',
    position_x REAL DEFAULT 400.0,
    position_y REAL DEFAULT 350.0,
    last_safe_x REAL DEFAULT 400.0,
    last_safe_y REAL DEFAULT 350.0,
    health INT DEFAULT 100,
    max_health INT DEFAULT 100,
    energy INT DEFAULT 100,
    max_energy INT DEFAULT 100,
    equipped_outfit TEXT DEFAULT 'cosmic_explorer',
    last_saved_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(universe_id, user_id)
);

-- 7. Planet States (Environments, weather, unlocked areas)
CREATE TABLE IF NOT EXISTS planet_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    universe_id UUID NOT NULL REFERENCES universes(id) ON DELETE CASCADE,
    planet_id TEXT NOT NULL, -- e.g. 'planet_lumina', 'nebula_oasis'
    unlocked BOOLEAN DEFAULT TRUE,
    weather TEXT DEFAULT 'stardust_breeze',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(universe_id, planet_id)
);

-- 8. Placed Objects (Planet building, furniture, trees, lamps, bridges)
CREATE TABLE IF NOT EXISTS placed_objects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    universe_id UUID NOT NULL REFERENCES universes(id) ON DELETE CASCADE,
    planet_id TEXT NOT NULL DEFAULT 'planet_lumina',
    object_type TEXT NOT NULL, -- 'cherry_blossom', 'crystal_lamp', 'wooden_bench', 'star_fountain', 'heart_monument'
    tile_x INT NOT NULL,
    tile_y INT NOT NULL,
    rotation INT DEFAULT 0,
    custom_data JSONB DEFAULT '{}',
    placed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    placed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Inventory Items (Shared or personal items/decorations/seeds/crafting)
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    universe_id UUID NOT NULL REFERENCES universes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- null if shared
    item_type TEXT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    is_shared BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Missions definition
CREATE TABLE IF NOT EXISTS missions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mission_key TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    required_count INT DEFAULT 1,
    reward_type TEXT DEFAULT 'stars',
    reward_amount INT DEFAULT 50,
    reward_item TEXT
);

-- 11. Mission Progress (Tracks progress per universe, prevents duplicate reward claims)
CREATE TABLE IF NOT EXISTS mission_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    universe_id UUID NOT NULL REFERENCES universes(id) ON DELETE CASCADE,
    mission_key TEXT NOT NULL REFERENCES missions(mission_key) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'completed', 'claimed'
    progress_count INT DEFAULT 0,
    completed_at TIMESTAMPTZ,
    claimed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    UNIQUE(universe_id, mission_key)
);

-- 12. Achievements
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    universe_id UUID NOT NULL REFERENCES universes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    achievement_key TEXT NOT NULL,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(universe_id, user_id, achievement_key)
);

-- 13. Save Versions (Optimistic concurrency & history)
CREATE TABLE IF NOT EXISTS save_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    universe_id UUID NOT NULL REFERENCES universes(id) ON DELETE CASCADE,
    version INT NOT NULL,
    state_hash TEXT,
    saved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_universe_members_user ON universe_members(user_id);
CREATE INDEX IF NOT EXISTS idx_universe_members_univ ON universe_members(universe_id);
CREATE INDEX IF NOT EXISTS idx_placed_objects_univ_planet ON placed_objects(universe_id, planet_id);
CREATE INDEX IF NOT EXISTS idx_player_states_univ ON player_states(universe_id);
CREATE INDEX IF NOT EXISTS idx_invitations_code ON universe_invitations(code_hash);

-- Row Level Security (RLS) Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE universes ENABLE ROW LEVEL SECURITY;
ALTER TABLE universe_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE universe_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE universe_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE planet_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE placed_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE save_versions ENABLE ROW LEVEL SECURITY;

-- Helper function to check if a user is an authorized member of a universe
CREATE OR REPLACE FUNCTION is_universe_member(check_universe_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM universe_members
        WHERE universe_id = check_universe_id
        AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: Users can view profiles of universe partners and edit their own
CREATE POLICY "Users can view own profile or partner profile" ON profiles
    FOR SELECT USING (
        id = auth.uid() OR
        id IN (
            SELECT um2.user_id FROM universe_members um1
            JOIN universe_members um2 ON um1.universe_id = um2.universe_id
            WHERE um1.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (id = auth.uid());

-- Universes: Members can view and update their universe
CREATE POLICY "Universe members can view their universe" ON universes
    FOR SELECT USING (is_universe_member(id));

CREATE POLICY "Universe members can update their universe" ON universes
    FOR UPDATE USING (is_universe_member(id));

-- Universe States: Members can view and update
CREATE POLICY "Universe members can view universe states" ON universe_states
    FOR SELECT USING (is_universe_member(universe_id));

CREATE POLICY "Universe members can update universe states" ON universe_states
    FOR UPDATE USING (is_universe_member(universe_id));

-- Placed Objects: Members can view, insert, and delete placed objects
CREATE POLICY "Universe members can view placed objects" ON placed_objects
    FOR SELECT USING (is_universe_member(universe_id));

CREATE POLICY "Universe members can insert placed objects" ON placed_objects
    FOR INSERT WITH CHECK (is_universe_member(universe_id));

CREATE POLICY "Universe members can delete placed objects" ON placed_objects
    FOR DELETE USING (is_universe_member(universe_id));

-- Player States: Members can view partner state, but only update their own
CREATE POLICY "Universe members can view player states" ON player_states
    FOR SELECT USING (is_universe_member(universe_id));

CREATE POLICY "Users can update own player state" ON player_states
    FOR UPDATE USING (user_id = auth.uid() AND is_universe_member(universe_id));

-- Mission Progress: Members can view and update mission progress
CREATE POLICY "Universe members can view mission progress" ON mission_progress
    FOR SELECT USING (is_universe_member(universe_id));

CREATE POLICY "Universe members can update mission progress" ON mission_progress
    FOR UPDATE USING (is_universe_member(universe_id));
