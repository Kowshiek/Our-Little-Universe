import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyToken, getUserById } from '../auth/authService.js';
import { GameSaveService } from '../services/gameSaveService.js';
import { db } from '../db/database.js';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  universeId?: string;
  displayName?: string;
  avatarColor?: string;
  avatarStyle?: string;
}

// In-memory boss state per universe arena
interface BossState {
  health: number;
  maxHealth: number;
  phase: number;
  isAlive: boolean;
  targetUserId?: string;
  lastAttackTime: number;
}

const universeBosses = new Map<string, BossState>();

// Active star pickups currently spawned per universe
const universeStars = new Map<string, Set<number>>();

export function setupSocketHandlers(io: SocketIOServer) {
  // Socket.IO authentication middleware
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token || typeof token !== 'string') {
      return next(new Error('Authentication token required'));
    }

    const payload = verifyToken(token);
    if (!payload) {
      return next(new Error('Invalid or expired authentication token'));
    }

    const user = getUserById(payload.userId);
    if (!user) {
      return next(new Error('User not found'));
    }

    socket.userId = user.id;
    socket.displayName = user.displayName;
    socket.avatarColor = user.avatarColor || '#ec4899';
    socket.avatarStyle = user.avatarStyle || 'starlight';
    next();
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    const displayName = socket.displayName!;

    console.log(`🔌 Player connected: ${displayName} (${userId})`);

    /**
     * Join Universe Room
     */
    socket.on('join_universe', ({ universeId }: { universeId: string }) => {
      try {
        if (!GameSaveService.isUniverseMember(universeId, userId)) {
          socket.emit('error', { message: 'Unauthorized universe access' });
          return;
        }

        socket.universeId = universeId;
        const roomName = `universe:${universeId}`;
        socket.join(roomName);

        // Initialize boss state if not yet created
        if (!universeBosses.has(universeId)) {
          const uState = db.prepare(`SELECT boss_defeated FROM universe_states WHERE universe_id = ?`).get(universeId) as any;
          universeBosses.set(universeId, {
            health: uState?.boss_defeated ? 0 : 300,
            maxHealth: 300,
            phase: 1,
            isAlive: !uState?.boss_defeated,
            lastAttackTime: Date.now(),
          });
        }

        // Initialize spawned stars if not set (ids 1 to 5)
        if (!universeStars.has(universeId)) {
          universeStars.set(universeId, new Set([1, 2, 3, 4, 5]));
        }

        // Notify partner that player has entered the universe
        socket.to(roomName).emit('partner_joined', {
          userId,
          displayName,
          avatarColor: socket.avatarColor,
          avatarStyle: socket.avatarStyle,
          timestamp: Date.now(),
        });

        // Let the joining player know partner presence
        const roomSockets = io.sockets.adapter.rooms.get(roomName);
        const partnerIsPresent = (roomSockets ? roomSockets.size : 0) > 1;

        socket.emit('universe_joined', {
          universeId,
          partnerPresent: partnerIsPresent,
          activeStars: Array.from(universeStars.get(universeId) || []),
          bossState: universeBosses.get(universeId),
        });

        console.log(`✨ Player ${displayName} joined universe room ${universeId}. Active: ${roomSockets?.size || 1}`);
      } catch (err: any) {
        socket.emit('error', { message: err.message });
      }
    });

    /**
     * Real-time Player Movement
     */
    socket.on('player_move', (data: {
      x: number;
      y: number;
      vx?: number;
      vy?: number;
      anim?: string;
      flipX?: boolean;
      planetId?: string;
    }) => {
      if (!socket.universeId) return;

      // Broadcast position to partner in the same universe room
      socket.to(`universe:${socket.universeId}`).emit('partner_moved', {
        userId,
        displayName,
        x: data.x,
        y: data.y,
        vx: data.vx || 0,
        vy: data.vy || 0,
        anim: data.anim || 'idle',
        flipX: !!data.flipX,
        planetId: data.planetId || 'planet_lumina',
        timestamp: Date.now(),
      });
    });

    /**
     * Private Couple Emote (Heart, Kiss, Hug, Sparkle, Dance)
     */
    socket.on('player_emote', (data: { emote: string; x: number; y: number }) => {
      if (!socket.universeId) return;

      io.to(`universe:${socket.universeId}`).emit('emote_triggered', {
        userId,
        displayName,
        emote: data.emote,
        x: data.x,
        y: data.y,
        timestamp: Date.now(),
      });
    });

    /**
     * Collect Starlight / Resource
     */
    socket.on('collect_star', (data: { starId: number }) => {
      const universeId = socket.universeId;
      if (!universeId) return;

      const stars = universeStars.get(universeId);
      if (stars && stars.has(data.starId)) {
        // Remove star so neither player can collect it again
        stars.delete(data.starId);

        // Update database shared stars and mission progress atomically
        db.prepare(`
          UPDATE universe_states
          SET shared_stars = shared_stars + 10, updated_at = datetime('now')
          WHERE universe_id = ?
        `).run(universeId);

        const missionUpdate = GameSaveService.updateMissionProgress(universeId, 'tutorial_stars', 1);

        const updatedState = db.prepare(`
          SELECT shared_stars as sharedStars FROM universe_states WHERE universe_id = ?
        `).get(universeId) as any;

        // Broadcast to both partners
        io.to(`universe:${universeId}`).emit('star_collected', {
          starId: data.starId,
          collectedBy: displayName,
          sharedStars: updatedState.sharedStars,
          missionUpdate,
          timestamp: Date.now(),
        });
      }
    });

    /**
     * Boss Encounter Combat (Cooperative attack)
     */
    socket.on('boss_attack', (data: { damage: number; attackType?: string }) => {
      const universeId = socket.universeId;
      if (!universeId) return;

      const boss = universeBosses.get(universeId);
      if (!boss || !boss.isAlive) return;

      const actualDamage = Math.min(Math.max(data.damage || 15, 10), 35);
      boss.health = Math.max(0, boss.health - actualDamage);

      // Check phase transition
      if (boss.health < boss.maxHealth * 0.5 && boss.phase === 1) {
        boss.phase = 2;
        io.to(`universe:${universeId}`).emit('boss_phase_change', {
          phase: 2,
          message: 'The Starlight Golem enters Cosmic Overdrive!',
        });
      }

      // Broadcast boss damage
      io.to(`universe:${universeId}`).emit('boss_damaged', {
        attackerId: userId,
        attackerName: displayName,
        damage: actualDamage,
        bossHealth: boss.health,
        bossMaxHealth: boss.maxHealth,
        phase: boss.phase,
      });

      // Boss defeat check
      if (boss.health <= 0) {
        boss.isAlive = false;

        // Update DB
        db.prepare(`
          UPDATE universe_states
          SET boss_defeated = 1, shared_stars = shared_stars + 100, updated_at = datetime('now')
          WHERE universe_id = ?
        `).run(universeId);

        GameSaveService.updateMissionProgress(universeId, 'defeat_boss', 1);

        // Add special unlocked item: Heart of the Universe monument to shared inventory
        const existing = db.prepare(`
          SELECT id FROM inventory_items WHERE universe_id = ? AND item_type = 'heart_monument'
        `).get(universeId);

        if (!existing) {
          db.prepare(`
            INSERT INTO inventory_items (id, universe_id, item_type, quantity, is_shared)
            VALUES (?, ?, 'heart_monument', 1, 1)
          `).run(require('crypto').randomUUID ? require('crypto').randomUUID() : `item-${Date.now()}`, universeId);
        }

        io.to(`universe:${universeId}`).emit('boss_defeated', {
          defeatedBy: displayName,
          message: 'Starlight Golem defeated! The cosmos rejoices with infinite starlight!',
          rewardItem: 'heart_monument',
        });
      }
    });

    /**
     * Real-time Object Placement / Removal synchronization
     */
    socket.on('object_placed', (placedObject: any) => {
      if (!socket.universeId) return;
      socket.to(`universe:${socket.universeId}`).emit('object_placed', placedObject);
    });

    socket.on('object_removed', (data: { objectId: string }) => {
      if (!socket.universeId) return;
      socket.to(`universe:${socket.universeId}`).emit('object_removed', data);
    });

    /**
     * Unlock Portal synchronization
     */
    socket.on('unlock_portal', () => {
      const universeId = socket.universeId;
      if (!universeId) return;

      db.prepare(`
        UPDATE universe_states SET portal_unlocked = 1, updated_at = datetime('now') WHERE universe_id = ?
      `).run(universeId);

      GameSaveService.updateMissionProgress(universeId, 'unlock_portal', 1);

      io.to(`universe:${universeId}`).emit('portal_unlocked', {
        unlockedBy: displayName,
        message: 'The Stargate to Nebula Arena is now OPEN!',
      });
    });

    /**
     * Disconnect Handling
     */
    socket.on('disconnect', () => {
      console.log(`🔌 Player disconnected: ${displayName} (${userId})`);
      if (socket.universeId) {
        socket.to(`universe:${socket.universeId}`).emit('partner_left', {
          userId,
          displayName,
          timestamp: Date.now(),
        });
      }
    });
  });
}
