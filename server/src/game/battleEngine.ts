import { db } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';
import { FighterId, ArenaId, FIGHTERS, CombatantState, PlayerAction } from './combatTypes.js';

export interface ActiveMatch {
  matchId: string;
  roomId: string;
  arenaId: ArenaId;
  roundNumber: number;
  roundsToWin: number;
  timerRemaining: number;
  status: 'countdown' | 'fighting' | 'round_end' | 'clash' | 'match_end';
  p1: CombatantState;
  p2: CombatantState;
  winnerUserId: string | null;
  lastSpecialTime: { [userId: string]: number };
  lastAttackTime: { [userId: string]: { light: number; heavy: number } };
  rematchVotes: Set<string>;
  createdAt: number;
  roundEndTime?: number;
}

export class BattleEngine {
  private static matches = new Map<string, ActiveMatch>(); // roomId -> ActiveMatch

  public static getMatch(roomId: string): ActiveMatch | undefined {
    return this.matches.get(roomId);
  }

  /**
   * Initialize a new match between two room members
   */
  public static createMatch(
    roomId: string,
    arenaId: ArenaId,
    p1User: { id: string; displayName: string; fighterId: FighterId },
    p2User: { id: string; displayName: string; fighterId: FighterId }
  ): ActiveMatch {
    const matchId = uuidv4();

    const p1Stats = FIGHTERS[p1User.fighterId] || FIGHTERS.heart_knight;
    const p2Stats = FIGHTERS[p2User.fighterId] || FIGHTERS.heart_knight;

    const match: ActiveMatch = {
      matchId,
      roomId,
      arenaId,
      roundNumber: 1,
      roundsToWin: 2, // Best of 3
      timerRemaining: 60,
      status: 'countdown',
      p1: {
        userId: p1User.id,
        displayName: p1User.displayName,
        fighterId: p1User.fighterId,
        x: 280,
        y: 480,
        vx: 0,
        vy: 0,
        isFacingLeft: false,
        health: p1Stats.maxHealth,
        maxHealth: p1Stats.maxHealth,
        energy: 25, // Starting momentum
        action: 'idle',
        isBlocking: false,
        isDodging: false,
        roundWins: 0,
      },
      p2: {
        userId: p2User.id,
        displayName: p2User.displayName,
        fighterId: p2User.fighterId,
        x: 680,
        y: 480,
        vx: 0,
        vy: 0,
        isFacingLeft: true,
        health: p2Stats.maxHealth,
        maxHealth: p2Stats.maxHealth,
        energy: 25,
        action: 'idle',
        isBlocking: false,
        isDodging: false,
        roundWins: 0,
      },
      winnerUserId: null,
      lastSpecialTime: {},
      lastAttackTime: {
        [p1User.id]: { light: 0, heavy: 0 },
        [p2User.id]: { light: 0, heavy: 0 },
      },
      rematchVotes: new Set(),
      createdAt: Date.now(),
    };

    this.matches.set(roomId, match);

    // Save initial match checkpoint in DB
    this.saveCheckpoint(match);

    return match;
  }

  /**
   * Process combat action (Movement, Block, Dodge)
   */
  public static processMovement(
    roomId: string,
    userId: string,
    data: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      isFacingLeft: boolean;
      action: PlayerAction;
      isBlocking?: boolean;
      isDodging?: boolean;
    }
  ) {
    const match = this.matches.get(roomId);
    if (!match || (match.status !== 'fighting' && match.status !== 'countdown')) return null;

    const combatant = match.p1.userId === userId ? match.p1 : match.p2.userId === userId ? match.p2 : null;
    if (!combatant) return null;

    // Bounds checking (keep players inside 960px arena)
    combatant.x = Math.max(80, Math.min(880, data.x));
    combatant.y = Math.min(480, data.y);
    combatant.vx = data.vx;
    combatant.vy = data.vy;
    combatant.isFacingLeft = data.isFacingLeft;
    combatant.action = data.action;
    combatant.isBlocking = !!data.isBlocking;
    combatant.isDodging = !!data.isDodging;

    return {
      userId,
      combatant,
    };
  }

  /**
   * Process authoritative attack (Light, Heavy, or Special)
   */
  public static processAttack(
    roomId: string,
    attackerId: string,
    attackType: 'light' | 'heavy' | 'special'
  ): {
    success: boolean;
    clash?: boolean;
    hit?: boolean;
    blocked?: boolean;
    dodged?: boolean;
    damage?: number;
    attackerEnergy?: number;
    targetHealth?: number;
    roundOver?: boolean;
    matchOver?: boolean;
    roundWinner?: string;
    matchWinner?: string;
    reason?: string;
  } {
    const match = this.matches.get(roomId);
    if (!match || match.status !== 'fighting') {
      return { success: false, reason: 'Match not in fighting state' };
    }

    const isP1 = match.p1.userId === attackerId;
    const attacker = isP1 ? match.p1 : match.p2;
    const defender = isP1 ? match.p2 : match.p1;

    const stats = FIGHTERS[attacker.fighterId] || FIGHTERS.heart_knight;
    const now = Date.now();

    // Check Cooldowns
    if (attackType === 'light') {
      const lastLight = match.lastAttackTime[attackerId]?.light || 0;
      if (now - lastLight < stats.lightCooldown) {
        return { success: false, reason: 'Cooldown active' };
      }
      match.lastAttackTime[attackerId].light = now;
    } else if (attackType === 'heavy') {
      const lastHeavy = match.lastAttackTime[attackerId]?.heavy || 0;
      if (now - lastHeavy < stats.heavyCooldown) {
        return { success: false, reason: 'Cooldown active' };
      }
      match.lastAttackTime[attackerId].heavy = now;
    } else if (attackType === 'special') {
      if (attacker.energy < 100) {
        return { success: false, reason: 'Not enough Heart Energy' };
      }

      // Consume energy
      attacker.energy = 0;
      match.lastSpecialTime[attackerId] = now;

      // Heart Clash Detection: Did the opponent activate special within 450ms?
      const opponentLastSpecial = match.lastSpecialTime[defender.userId] || 0;
      if (Math.abs(now - opponentLastSpecial) <= 450) {
        // Trigger dramatic HEART CLASH!
        match.status = 'clash';
        attacker.health = Math.max(1, attacker.health - 12);
        defender.health = Math.max(1, defender.health - 12);

        setTimeout(() => {
          if (match.status === 'clash') match.status = 'fighting';
        }, 1200);

        return {
          success: true,
          clash: true,
          damage: 12,
        };
      }
    }

    // Distance & Hitbox Check
    const dist = Math.hypot(attacker.x - defender.x, attacker.y - defender.y);
    const range = attackType === 'special' ? 800 : stats.attackRange + 40;

    // Check Facing Direction (Must face opponent or have special projectile)
    const isFacingOpponent = (attacker.x < defender.x && !attacker.isFacingLeft) ||
                             (attacker.x > defender.x && attacker.isFacingLeft) ||
                             attackType === 'special';

    if (dist <= range && isFacingOpponent) {
      // 1. Defender Dodging?
      if (defender.isDodging) {
        return {
          success: true,
          hit: false,
          dodged: true,
          reason: 'Dodged with invulnerability frames',
        };
      }

      // Base damage determination
      let baseDamage = attackType === 'light' ? stats.lightDamage :
                       attackType === 'heavy' ? stats.heavyDamage : stats.specialDamage;

      // 2. Defender Blocking?
      const isBlocked = defender.isBlocking;
      const finalDamage = isBlocked ? Math.round(baseDamage * 0.25) : baseDamage;

      // Apply damage
      defender.health = Math.max(0, defender.health - finalDamage);

      // Energy accumulation
      attacker.energy = Math.min(100, attacker.energy + (isBlocked ? 8 : 18));
      defender.energy = Math.min(100, defender.energy + 10); // Defender gains comeback energy

      // Check Round End / K.O.
      if (defender.health <= 0) {
        return this.finishRound(match, attacker.userId);
      }

      return {
        success: true,
        hit: true,
        blocked: isBlocked,
        damage: finalDamage,
        attackerEnergy: attacker.energy,
        targetHealth: defender.health,
      };
    }

    return {
      success: true,
      hit: false,
      reason: 'Whiffed attack (out of range)',
    };
  }

  /**
   * Finish a round when a player is knocked out or timer expires
   */
  public static finishRound(match: ActiveMatch, roundWinnerId: string) {
    match.status = 'round_end';
    match.roundEndTime = Date.now();

    const winner = match.p1.userId === roundWinnerId ? match.p1 : match.p2;
    winner.roundWins += 1;

    // Check if match is won (Best of 3 -> 2 round wins)
    const matchWon = winner.roundWins >= match.roundsToWin;
    if (matchWon) {
      match.status = 'match_end';
      match.winnerUserId = winner.userId;
      this.persistMatchResults(match);

      return {
        success: true,
        hit: true,
        roundOver: true,
        matchOver: true,
        roundWinner: winner.userId,
        matchWinner: winner.userId,
      };
    }

    // Save checkpoint
    this.saveCheckpoint(match);

    return {
      success: true,
      hit: true,
      roundOver: true,
      matchOver: false,
      roundWinner: winner.userId,
    };
  }

  /**
   * Start next round
   */
  public static startNextRound(roomId: string) {
    const match = this.matches.get(roomId);
    if (!match || match.status !== 'round_end') return null;

    match.roundNumber += 1;
    match.timerRemaining = 60;
    match.status = 'fighting';

    // Reset fighter round stats & positions
    const p1Stats = FIGHTERS[match.p1.fighterId];
    const p2Stats = FIGHTERS[match.p2.fighterId];

    match.p1.health = p1Stats.maxHealth;
    match.p1.x = 280;
    match.p1.y = 480;
    match.p1.vx = 0;
    match.p1.vy = 0;
    match.p1.isFacingLeft = false;
    match.p1.action = 'idle';

    match.p2.health = p2Stats.maxHealth;
    match.p2.x = 680;
    match.p2.y = 480;
    match.p2.vx = 0;
    match.p2.vy = 0;
    match.p2.isFacingLeft = true;
    match.p2.action = 'idle';

    this.saveCheckpoint(match);

    return match;
  }

  /**
   * Vote for Rematch
   */
  public static voteRematch(roomId: string, userId: string) {
    const match = this.matches.get(roomId);
    if (!match) return null;

    match.rematchVotes.add(userId);

    if (match.rematchVotes.size >= 2) {
      // Both voted rematch! Reset match completely
      match.roundNumber = 1;
      match.timerRemaining = 60;
      match.status = 'countdown';
      match.winnerUserId = null;
      match.rematchVotes.clear();

      match.p1.roundWins = 0;
      match.p1.health = FIGHTERS[match.p1.fighterId].maxHealth;
      match.p1.energy = 25;
      match.p1.x = 280;
      match.p1.y = 480;

      match.p2.roundWins = 0;
      match.p2.health = FIGHTERS[match.p2.fighterId].maxHealth;
      match.p2.energy = 25;
      match.p2.x = 680;
      match.p2.y = 480;

      return { restarted: true, match };
    }

    return { restarted: false, votesCount: match.rematchVotes.size };
  }

  /**
   * Save match checkpoint to SQLite database for crash/disconnect resilience
   */
  private static saveCheckpoint(match: ActiveMatch) {
    try {
      db.prepare(`
        INSERT INTO match_checkpoints (id, room_id, round_number, p1_health, p2_health, p1_score, p2_score, timer_remaining, saved_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(room_id) DO UPDATE SET
          round_number = excluded.round_number,
          p1_health = excluded.p1_health,
          p2_health = excluded.p2_health,
          p1_score = excluded.p1_score,
          p2_score = excluded.p2_score,
          timer_remaining = excluded.timer_remaining,
          saved_at = datetime('now')
      `).run(
        uuidv4(),
        match.roomId,
        match.roundNumber,
        match.p1.health,
        match.p2.health,
        match.p1.roundWins,
        match.p2.roundWins,
        match.timerRemaining
      );
    } catch (e) {
      console.warn('Could not save match checkpoint:', e);
    }
  }

  /**
   * Authoritatively persist completed match results, EXP, and title unlocks
   */
  private static persistMatchResults(match: ActiveMatch) {
    try {
      const durationSeconds = Math.round((Date.now() - match.createdAt) / 1000);
      const isP1Winner = match.winnerUserId === match.p1.userId;
      const loserId = isP1Winner ? match.p2.userId : match.p1.userId;

      // 1. Insert Match Record
      db.prepare(`
        INSERT INTO matches (id, room_id, player1_id, player2_id, p1_fighter, p2_fighter, arena_id, winner_id, p1_score, p2_score, duration_seconds)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        match.matchId,
        match.roomId,
        match.p1.userId,
        match.p2.userId,
        match.p1.fighterId,
        match.p2.fighterId,
        match.arenaId,
        match.winnerUserId,
        match.p1.roundWins,
        match.p2.roundWins,
        durationSeconds
      );

      // 2. Update Winner Profile (+1 Win, +150 EXP)
      if (match.winnerUserId) {
        db.prepare(`
          UPDATE profiles
          SET wins = wins + 1,
              exp = exp + 150,
              level = 1 + CAST((exp + 150) / 300 AS INT),
              updated_at = datetime('now')
          WHERE id = ?
        `).run(match.winnerUserId);

        // Grant Title Unlock: "Grand Arena Champion"
        db.prepare(`
          INSERT OR IGNORE INTO player_unlocks (id, user_id, unlock_type, unlock_key)
          VALUES (?, ?, 'title', 'Grand Arena Champion')
        `).run(uuidv4(), match.winnerUserId);
      }

      // 3. Update Loser Profile (+1 Loss, +60 EXP for effort)
      db.prepare(`
        UPDATE profiles
        SET losses = losses + 1,
            exp = exp + 60,
            level = 1 + CAST((exp + 60) / 300 AS INT),
            updated_at = datetime('now')
        WHERE id = ?
      `).run(loserId);

      // Clear checkpoint
      db.prepare(`DELETE FROM match_checkpoints WHERE room_id = ?`).run(match.roomId);

      console.log(`🏆 Match ${match.matchId} persisted authoritatively. Winner: ${match.winnerUserId}`);
    } catch (e) {
      console.error('Error persisting match results:', e);
    }
  }
}
