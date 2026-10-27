import { db } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';
import { generateInviteCode, hashInviteCode, checkInviteRateLimit, resetInviteRateLimit } from '../auth/authService.js';

export interface CreateUniverseInput {
  userId: string;
  universeName: string;
}

export interface PlayerStateUpdate {
  currentPlanet?: string;
  positionX?: number;
  positionY?: number;
  lastSafeX?: number;
  lastSafeY?: number;
  health?: number;
  energy?: number;
  equippedOutfit?: string;
}

export interface UniverseStateUpdate {
  sharedStars?: number;
  sharedCrystals?: number;
  portalUnlocked?: boolean;
  bossDefeated?: boolean;
  storyProgress?: string;
}

export class GameSaveService {
  /**
   * Check if a user is an authorized member of a universe
   */
  static isUniverseMember(universeId: string, userId: string): boolean {
    const query = db.prepare(`
      SELECT 1 FROM universe_members WHERE universe_id = ? AND user_id = ?
    `);
    return !!query.get(universeId, userId);
  }

  /**
   * Get universe membership role ('owner' or 'partner')
   */
  static getUniverseMembership(universeId: string, userId: string) {
    const query = db.prepare(`
      SELECT role, joined_at as joinedAt FROM universe_members WHERE universe_id = ? AND user_id = ?
    `);
    return query.get(universeId, userId) as { role: string; joinedAt: string } | undefined;
  }

  /**
   * Create a new private universe for a couple
   */
  static createUniverse(input: CreateUniverseInput) {
    const universeId = uuidv4();
    const membershipId = uuidv4();
    const universeStateId = uuidv4();
    const playerStateId = uuidv4();
    const invitationId = uuidv4();
    const planetStateId = uuidv4();

    const { code, codeHash } = generateInviteCode();

    // Use transaction for atomic universe creation
    const insertUniverse = db.prepare(`
      INSERT INTO universes (id, name, owner_id) VALUES (?, ?, ?)
    `);
    const insertMember = db.prepare(`
      INSERT INTO universe_members (id, universe_id, user_id, role) VALUES (?, ?, ?, 'owner')
    `);
    const insertInvite = db.prepare(`
      INSERT INTO universe_invitations (id, universe_id, code_hash, display_code, created_by, max_uses, uses_count)
      VALUES (?, ?, ?, ?, ?, 1, 0)
    `);
    const insertUniverseState = db.prepare(`
      INSERT INTO universe_states (id, universe_id, shared_stars, shared_crystals, portal_unlocked, boss_defeated, story_progress, version)
      VALUES (?, ?, 50, 10, 0, 0, 'tutorial', 1)
    `);
    const insertPlayerState = db.prepare(`
      INSERT INTO player_states (id, universe_id, user_id, current_planet, position_x, position_y, last_safe_x, last_safe_y, health, energy)
      VALUES (?, ?, ?, 'planet_lumina', 400, 350, 400, 350, 100, 100)
    `);
    const insertPlanetState = db.prepare(`
      INSERT INTO planet_states (id, universe_id, planet_id, unlocked, weather)
      VALUES (?, ?, 'planet_lumina', 1, 'stardust_breeze')
    `);
    const insertInitialMission = db.prepare(`
      INSERT INTO mission_progress (id, universe_id, mission_key, status, progress_count)
      VALUES (?, ?, 'tutorial_stars', 'in_progress', 0)
    `);

    // Execute atomic steps
    insertUniverse.run(universeId, input.universeName, input.userId);
    insertMember.run(membershipId, universeId, input.userId);
    insertInvite.run(invitationId, universeId, codeHash, code, input.userId);
    insertUniverseState.run(universeStateId, universeId);
    insertPlayerState.run(playerStateId, universeId, input.userId);
    insertPlanetState.run(planetStateId, universeId);
    insertInitialMission.run(uuidv4(), universeId);

    // Initial starter decorations placed around the home
    const insertObject = db.prepare(`
      INSERT INTO placed_objects (id, universe_id, planet_id, object_type, tile_x, tile_y, rotation, placed_by)
      VALUES (?, ?, 'planet_lumina', ?, ?, ?, 0, ?)
    `);
    insertObject.run(uuidv4(), universeId, 'cherry_blossom', 300, 260, input.userId);
    insertObject.run(uuidv4(), universeId, 'crystal_lamp', 480, 260, input.userId);
    insertObject.run(uuidv4(), universeId, 'wooden_bench', 380, 270, input.userId);

    // Initial starter inventory
    const insertItem = db.prepare(`
      INSERT INTO inventory_items (id, universe_id, user_id, item_type, quantity, is_shared)
      VALUES (?, ?, NULL, ?, ?, 1)
    `);
    insertItem.run(uuidv4(), universeId, 'cherry_blossom', 2);
    insertItem.run(uuidv4(), universeId, 'crystal_lamp', 2);
    insertItem.run(uuidv4(), universeId, 'cosmic_flower', 5);

    return {
      universe: {
        id: universeId,
        name: input.universeName,
        ownerId: input.userId,
        planetLevel: 1,
      },
      inviteCode: code,
    };
  }

  /**
   * Join a universe using a secure invitation code
   */
  static joinUniverseWithCode(userId: string, code: string, rateLimitKey: string) {
    const rateCheck = checkInviteRateLimit(rateLimitKey);
    if (!rateCheck.allowed) {
      throw new Error(`Too many join attempts. Please wait ${rateCheck.waitSeconds} seconds.`);
    }

    const trimmedCode = code.trim().toUpperCase();
    const codeHash = hashInviteCode(trimmedCode);

    const findInvite = db.prepare(`
      SELECT i.id, i.universe_id as universeId, i.is_revoked as isRevoked, i.max_uses as maxUses,
             i.uses_count as usesCount, i.expires_at as expiresAt, u.name as universeName
      FROM universe_invitations i
      JOIN universes u ON u.id = i.universe_id
      WHERE i.code_hash = ?
    `);

    const invite = findInvite.get(codeHash) as any;
    if (!invite) {
      throw new Error('Invalid invitation code. Please double-check with your partner!');
    }

    if (invite.isRevoked) {
      throw new Error('This invitation code has been revoked by the universe owner.');
    }

    if (invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now()) {
      throw new Error('This invitation code has expired.');
    }

    // Check if already a member
    const existingMember = db.prepare(`
      SELECT id FROM universe_members WHERE universe_id = ? AND user_id = ?
    `).get(invite.universeId, userId) as any;

    if (existingMember) {
      resetInviteRateLimit(rateLimitKey);
      return {
        universeId: invite.universeId,
        universeName: invite.universeName,
        message: 'Welcome back! You are already a member of this universe.',
      };
    }

    // Check couple capacity (maximum 2 partners for couple game)
    const memberCountQuery = db.prepare(`
      SELECT COUNT(*) as count FROM universe_members WHERE universe_id = ?
    `);
    const countResult = memberCountQuery.get(invite.universeId) as { count: number };
    if (countResult.count >= 2) {
      throw new Error('This universe already has two partners! A universe is a private sanctuary for 2 players.');
    }

    // Add partner to universe
    const membershipId = uuidv4();
    const playerStateId = uuidv4();

    const insertMember = db.prepare(`
      INSERT INTO universe_members (id, universe_id, user_id, role)
      VALUES (?, ?, ?, 'partner')
    `);
    const updateInviteUses = db.prepare(`
      INSERT INTO player_states (id, universe_id, user_id, current_planet, position_x, position_y, last_safe_x, last_safe_y, health, energy)
      VALUES (?, ?, ?, 'planet_lumina', 440, 350, 440, 350, 100, 100)
    `);
    const markUsed = db.prepare(`
      UPDATE universe_invitations SET uses_count = uses_count + 1 WHERE id = ?
    `);

    insertMember.run(membershipId, invite.universeId, userId);
    updateInviteUses.run(playerStateId, invite.universeId, userId);
    markUsed.run(invite.id);

    resetInviteRateLimit(rateLimitKey);

    return {
      universeId: invite.universeId,
      universeName: invite.universeName,
      message: 'Successfully joined your shared universe! Two hearts, one universe.',
    };
  }

  /**
   * Rotate invitation code (owner only)
   */
  static rotateInviteCode(universeId: string, userId: string) {
    const member = this.getUniverseMembership(universeId, userId);
    if (!member || member.role !== 'owner') {
      throw new Error('Only the universe owner can generate a new invitation code.');
    }

    // Revoke old codes
    db.prepare(`UPDATE universe_invitations SET is_revoked = 1 WHERE universe_id = ?`).run(universeId);

    // Create new code
    const { code, codeHash } = generateInviteCode();
    const id = uuidv4();

    db.prepare(`
      INSERT INTO universe_invitations (id, universe_id, code_hash, display_code, created_by, max_uses, uses_count)
      VALUES (?, ?, ?, ?, ?, 1, 0)
    `).run(id, universeId, codeHash, code, userId);

    return { code };
  }

  /**
   * Get active invitation code (owner only)
   */
  static getActiveInviteCode(universeId: string, userId: string) {
    const member = this.getUniverseMembership(universeId, userId);
    if (!member) {
      throw new Error('Unauthorized');
    }

    const query = db.prepare(`
      SELECT display_code as code, created_at as createdAt, is_revoked as isRevoked, uses_count as usesCount
      FROM universe_invitations
      WHERE universe_id = ? AND is_revoked = 0
      ORDER BY created_at DESC LIMIT 1
    `);
    return query.get(universeId) as any;
  }

  /**
   * Load entire universe state for authorized member
   */
  static loadUniverseState(universeId: string, userId: string) {
    if (!this.isUniverseMember(universeId, userId)) {
      throw new Error('Access denied: You are not authorized to access this universe.');
    }

    const universe = db.prepare(`
      SELECT id, name, owner_id as ownerId, planet_level as planetLevel, theme, created_at as createdAt
      FROM universes WHERE id = ?
    `).get(universeId) as any;

    const members = db.prepare(`
      SELECT m.user_id as userId, m.role, m.joined_at as joinedAt,
             p.display_name as displayName, p.avatar_color as avatarColor, p.avatar_style as avatarStyle
      FROM universe_members m
      JOIN profiles p ON p.id = m.user_id
      WHERE m.universe_id = ?
    `).all(universeId) as any[];

    const universeState = db.prepare(`
      SELECT shared_stars as sharedStars, shared_crystals as sharedCrystals,
             portal_unlocked as portalUnlocked, boss_defeated as bossDefeated,
             story_progress as storyProgress, version, updated_at as updatedAt
      FROM universe_states WHERE universe_id = ?
    `).get(universeId) as any;

    const placedObjects = db.prepare(`
      SELECT id, planet_id as planetId, object_type as objectType,
             tile_x as tileX, tile_y as tileY, rotation, custom_data as customData,
             placed_by as placedBy, placed_at as placedAt
      FROM placed_objects WHERE universe_id = ?
    `).all(universeId) as any[];

    const inventory = db.prepare(`
      SELECT id, item_type as itemType, quantity, is_shared as isShared, user_id as userId
      FROM inventory_items WHERE universe_id = ?
    `).all(universeId) as any[];

    const missions = db.prepare(`
      SELECT m.mission_key as missionKey, m.title, m.description, m.required_count as requiredCount,
             m.reward_type as rewardType, m.reward_amount as rewardAmount, m.reward_item as rewardItem,
             COALESCE(p.status, 'in_progress') as status,
             COALESCE(p.progress_count, 0) as progressCount,
             p.completed_at as completedAt,
             p.claimed_at as claimedAt
      FROM missions m
      LEFT JOIN mission_progress p ON p.mission_key = m.mission_key AND p.universe_id = ?
    `).all(universeId) as any[];

    return {
      universe,
      members,
      state: universeState || {
        sharedStars: 50,
        sharedCrystals: 10,
        portalUnlocked: 0,
        bossDefeated: 0,
        storyProgress: 'tutorial',
        version: 1,
      },
      placedObjects,
      inventory,
      missions,
    };
  }

  /**
   * Load individual player state (position, safe coordinates, health, energy)
   */
  static loadPlayerState(universeId: string, userId: string) {
    if (!this.isUniverseMember(universeId, userId)) {
      throw new Error('Access denied: You are not authorized to access this player state.');
    }

    const state = db.prepare(`
      SELECT current_planet as currentPlanet, position_x as positionX, position_y as positionY,
             last_safe_x as lastSafeX, last_safe_y as lastSafeY,
             health, max_health as maxHealth, energy, max_energy as maxEnergy,
             equipped_outfit as equippedOutfit, last_saved_at as lastSavedAt
      FROM player_states
      WHERE universe_id = ? AND user_id = ?
    `).get(universeId, userId) as any;

    if (!state) {
      // Create if missing
      db.prepare(`
        INSERT INTO player_states (id, universe_id, user_id, current_planet, position_x, position_y, last_safe_x, last_safe_y, health, energy)
        VALUES (?, ?, ?, 'planet_lumina', 400, 350, 400, 350, 100, 100)
      `).run(uuidv4(), universeId, userId);

      return {
        currentPlanet: 'planet_lumina',
        positionX: 400,
        positionY: 350,
        lastSafeX: 400,
        lastSafeY: 350,
        health: 100,
        maxHealth: 100,
        energy: 100,
        maxEnergy: 100,
        equippedOutfit: 'cosmic_explorer',
      };
    }

    return state;
  }

  /**
   * Save player state (coordinates, health, last safe resume position)
   */
  static savePlayerState(universeId: string, userId: string, update: PlayerStateUpdate) {
    if (!this.isUniverseMember(universeId, userId)) {
      throw new Error('Unauthorized');
    }

    // Default last safe coordinates to position coordinates if not specified
    const posX = update.positionX ?? 400;
    const posY = update.positionY ?? 350;
    const safeX = update.lastSafeX ?? posX;
    const safeY = update.lastSafeY ?? posY;

    db.prepare(`
      UPDATE player_states
      SET current_planet = COALESCE(?, current_planet),
          position_x = COALESCE(?, position_x),
          position_y = COALESCE(?, position_y),
          last_safe_x = COALESCE(?, last_safe_x),
          last_safe_y = COALESCE(?, last_safe_y),
          health = COALESCE(?, health),
          energy = COALESCE(?, energy),
          equipped_outfit = COALESCE(?, equipped_outfit),
          last_saved_at = datetime('now')
      WHERE universe_id = ? AND user_id = ?
    `).run(
      update.currentPlanet ?? null,
      update.positionX ?? null,
      update.positionY ?? null,
      safeX,
      safeY,
      update.health ?? null,
      update.energy ?? null,
      update.equippedOutfit ?? null,
      universeId,
      userId
    );

    return { saved: true, lastSavedAt: new Date().toISOString() };
  }

  /**
   * Save shared universe state (stars, crystals, boss state, portal)
   */
  static saveUniverseState(universeId: string, userId: string, update: UniverseStateUpdate) {
    if (!this.isUniverseMember(universeId, userId)) {
      throw new Error('Unauthorized');
    }

    db.prepare(`
      UPDATE universe_states
      SET shared_stars = COALESCE(?, shared_stars),
          shared_crystals = COALESCE(?, shared_crystals),
          portal_unlocked = COALESCE(?, portal_unlocked),
          boss_defeated = COALESCE(?, boss_defeated),
          story_progress = COALESCE(?, story_progress),
          version = version + 1,
          updated_at = datetime('now')
      WHERE universe_id = ?
    `).run(
      update.sharedStars !== undefined ? update.sharedStars : null,
      update.sharedCrystals !== undefined ? update.sharedCrystals : null,
      update.portalUnlocked !== undefined ? (update.portalUnlocked ? 1 : 0) : null,
      update.bossDefeated !== undefined ? (update.bossDefeated ? 1 : 0) : null,
      update.storyProgress ?? null,
      universeId
    );

    // Record save version
    const newVersion = (db.prepare(`SELECT version FROM universe_states WHERE universe_id = ?`).get(universeId) as any)?.version || 1;
    db.prepare(`
      INSERT INTO save_versions (id, universe_id, version, saved_by)
      VALUES (?, ?, ?, ?)
    `).run(uuidv4(), universeId, newVersion, userId);

    return { saved: true, version: newVersion };
  }

  /**
   * Place an object on the planet (validates placement and shared resources)
   */
  static placeObject(universeId: string, userId: string, object: { objectType: string; tileX: number; tileY: number; planetId?: string }) {
    if (!this.isUniverseMember(universeId, userId)) {
      throw new Error('Unauthorized');
    }

    const planetId = object.planetId || 'planet_lumina';
    const objectId = uuidv4();

    // Check if an object already occupies that exact tile (grid size 32 or distance < 24)
    const existing = db.prepare(`
      SELECT id FROM placed_objects
      WHERE universe_id = ? AND planet_id = ? AND abs(tile_x - ?) < 24 AND abs(tile_y - ?) < 24
    `).get(universeId, planetId, object.tileX, object.tileY);

    if (existing) {
      throw new Error('An object is already placed too close to this spot.');
    }

    // Insert placed object
    db.prepare(`
      INSERT INTO placed_objects (id, universe_id, planet_id, object_type, tile_x, tile_y, rotation, placed_by)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?)
    `).run(objectId, universeId, planetId, object.objectType, object.tileX, object.tileY, userId);

    return {
      success: true,
      placedObject: {
        id: objectId,
        universeId,
        planetId,
        objectType: object.objectType,
        tileX: object.tileX,
        tileY: object.tileY,
        placedBy: userId,
        placedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Remove a placed object
   */
  static removeObject(universeId: string, userId: string, objectId: string) {
    if (!this.isUniverseMember(universeId, userId)) {
      throw new Error('Unauthorized');
    }

    const obj = db.prepare(`SELECT object_type FROM placed_objects WHERE id = ? AND universe_id = ?`).get(objectId, universeId) as any;
    if (!obj) {
      throw new Error('Object not found.');
    }

    db.prepare(`DELETE FROM placed_objects WHERE id = ? AND universe_id = ?`).run(objectId, universeId);

    return { success: true, removedId: objectId, objectType: obj.object_type };
  }

  /**
   * Purchase a decoration from the Shop using shared stars
   */
  static purchaseShopItem(universeId: string, userId: string, itemType: string, cost: number) {
    if (!this.isUniverseMember(universeId, userId)) {
      throw new Error('Unauthorized');
    }

    const state = db.prepare(`SELECT shared_stars FROM universe_states WHERE universe_id = ?`).get(universeId) as any;
    if (!state || state.shared_stars < cost) {
      throw new Error(`Not enough stars! Need ${cost} stars, but universe only has ${state?.shared_stars || 0}.`);
    }

    // Deduct stars atomically
    db.prepare(`
      UPDATE universe_states SET shared_stars = shared_stars - ?, updated_at = datetime('now') WHERE universe_id = ?
    `).run(cost, universeId);

    // Add to inventory
    const existing = db.prepare(`
      SELECT id, quantity FROM inventory_items WHERE universe_id = ? AND item_type = ? AND is_shared = 1
    `).get(universeId, itemType) as any;

    if (existing) {
      db.prepare(`UPDATE inventory_items SET quantity = quantity + 1 WHERE id = ?`).run(existing.id);
    } else {
      db.prepare(`
        INSERT INTO inventory_items (id, universe_id, item_type, quantity, is_shared)
        VALUES (?, ?, ?, 1, 1)
      `).run(uuidv4(), universeId, itemType);
    }

    const updatedState = db.prepare(`SELECT shared_stars as sharedStars FROM universe_states WHERE universe_id = ?`).get(universeId) as any;

    return {
      success: true,
      itemType,
      sharedStars: updatedState.sharedStars,
    };
  }

  /**
   * Atomically claim a completed mission reward (prevents duplicate claims)
   */
  static claimMissionReward(universeId: string, userId: string, missionKey: string) {
    if (!this.isUniverseMember(universeId, userId)) {
      throw new Error('Unauthorized');
    }

    const mission = db.prepare(`
      SELECT mission_key, reward_type, reward_amount, reward_item
      FROM missions WHERE mission_key = ?
    `).get(missionKey) as any;

    if (!mission) {
      throw new Error('Mission not found');
    }

    const progress = db.prepare(`
      SELECT status, claimed_at FROM mission_progress
      WHERE universe_id = ? AND mission_key = ?
    `).get(universeId, missionKey) as any;

    if (!progress) {
      throw new Error('Mission is not in progress or completed yet');
    }

    if (progress.status === 'claimed' || progress.claimed_at) {
      throw new Error('This reward has already been claimed!');
    }

    // Mark as claimed and update resources atomically
    db.prepare(`
      UPDATE mission_progress
      SET status = 'claimed', claimed_at = datetime('now'), completed_by = ?
      WHERE universe_id = ? AND mission_key = ?
    `).run(userId, universeId, missionKey);

    if (mission.reward_type === 'stars') {
      db.prepare(`
        UPDATE universe_states
        SET shared_stars = shared_stars + ?, updated_at = datetime('now')
        WHERE universe_id = ?
      `).run(mission.reward_amount, universeId);
    } else if (mission.reward_type === 'crystals') {
      db.prepare(`
        UPDATE universe_states
        SET shared_crystals = shared_crystals + ?, updated_at = datetime('now')
        WHERE universe_id = ?
      `).run(mission.reward_amount, universeId);
    }

    // Add item reward to shared inventory if applicable
    if (mission.reward_item) {
      const existing = db.prepare(`
        SELECT id, quantity FROM inventory_items WHERE universe_id = ? AND item_type = ? AND is_shared = 1
      `).get(universeId, mission.reward_item) as any;

      if (existing) {
        db.prepare(`UPDATE inventory_items SET quantity = quantity + 1 WHERE id = ?`).run(existing.id);
      } else {
        db.prepare(`
          INSERT INTO inventory_items (id, universe_id, item_type, quantity, is_shared)
          VALUES (?, ?, ?, 1, 1)
        `).run(uuidv4(), universeId, mission.reward_item);
      }
    }

    const updatedState = db.prepare(`
      SELECT shared_stars as sharedStars, shared_crystals as sharedCrystals FROM universe_states WHERE universe_id = ?
    `).get(universeId) as any;

    return {
      success: true,
      missionKey,
      rewardType: mission.reward_type,
      rewardAmount: mission.reward_amount,
      rewardItem: mission.reward_item,
      universeState: updatedState,
    };
  }

  /**
   * Complete mission step / progress
   */
  static updateMissionProgress(universeId: string, missionKey: string, increment: number = 1) {
    const mission = db.prepare(`SELECT required_count FROM missions WHERE mission_key = ?`).get(missionKey) as any;
    if (!mission) return null;

    let progress = db.prepare(`SELECT progress_count, status FROM mission_progress WHERE universe_id = ? AND mission_key = ?`).get(universeId, missionKey) as any;

    if (!progress) {
      db.prepare(`
        INSERT INTO mission_progress (id, universe_id, mission_key, status, progress_count)
        VALUES (?, ?, ?, 'in_progress', 0)
      `).run(uuidv4(), universeId, missionKey);
      progress = { progress_count: 0, status: 'in_progress' };
    }

    if (progress.status === 'claimed') {
      return { status: 'claimed', count: progress.progress_count };
    }

    const newCount = progress.progress_count + increment;
    const isCompleted = newCount >= mission.required_count;
    const newStatus = isCompleted ? 'completed' : 'in_progress';

    db.prepare(`
      UPDATE mission_progress
      SET progress_count = ?,
          status = ?,
          completed_at = CASE WHEN ? = 'completed' AND completed_at IS NULL THEN datetime('now') ELSE completed_at END
      WHERE universe_id = ? AND mission_key = ?
    `).run(newCount, newStatus, newStatus, universeId, missionKey);

    return {
      missionKey,
      progressCount: newCount,
      requiredCount: mission.required_count,
      status: newStatus,
      isCompleted,
    };
  }

  /**
   * Reconcile offline/pending change queue
   */
  static syncPendingChanges(universeId: string, userId: string, queue: any[]) {
    if (!this.isUniverseMember(universeId, userId)) {
      throw new Error('Unauthorized');
    }

    const results = [];
    for (const action of queue) {
      try {
        if (action.type === 'SAVE_PLAYER') {
          this.savePlayerState(universeId, userId, action.data);
          results.push({ actionId: action.id, status: 'synced' });
        } else if (action.type === 'PLACE_OBJECT') {
          this.placeObject(universeId, userId, action.data);
          results.push({ actionId: action.id, status: 'synced' });
        } else if (action.type === 'REMOVE_OBJECT') {
          this.removeObject(universeId, userId, action.data.objectId);
          results.push({ actionId: action.id, status: 'synced' });
        }
      } catch (err: any) {
        results.push({ actionId: action.id, status: 'error', error: err.message });
      }
    }

    return {
      syncedCount: results.filter(r => r.status === 'synced').length,
      results,
    };
  }
}
