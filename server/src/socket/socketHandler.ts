import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyToken, getUserById, checkCodeRateLimit, resetCodeRateLimit, generateSecretCode, hashSecretCode } from '../auth/authService.js';
import { db } from '../db/database.js';
import { BattleEngine } from '../game/battleEngine.js';
import { FighterId, ArenaId, FIGHTERS } from '../game/combatTypes.js';
import { v4 as uuidv4 } from 'uuid';

interface BattleSocket extends Socket {
  userId?: string;
  displayName?: string;
  currentRoomId?: string;
}

export function setupSocketHandlers(io: SocketIOServer) {
  // Authentication middleware
  io.use((socket: BattleSocket, next) => {
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
    next();
  });

  io.on('connection', (socket: BattleSocket) => {
    const userId = socket.userId!;
    const displayName = socket.displayName!;

    console.log(`⚔️ Fighter connected: ${displayName} (${userId})`);

    /**
     * Create Private Battle Room
     */
    socket.on('create_room', ({ arenaId = 'heart_garden' }: { arenaId?: ArenaId }) => {
      try {
        const roomId = uuidv4();
        const { code, codeHash } = generateSecretCode();

        db.prepare(`
          INSERT INTO private_rooms (id, code_hash, display_code, owner_id, arena_id, status)
          VALUES (?, ?, ?, ?, ?, 'waiting')
        `).run(roomId, codeHash, code, userId);

        db.prepare(`
          INSERT INTO room_members (id, room_id, user_id, fighter_id, role, is_ready)
          VALUES (?, ?, ?, 'heart_knight', 'owner', 0)
        `).run(uuidv4(), roomId, userId);

        socket.currentRoomId = roomId;
        socket.join(`room:${roomId}`);

        socket.emit('room_created', {
          roomId,
          secretCode: code,
          arenaId,
          role: 'owner',
          opponent: null,
        });

        console.log(`❤️ Room created: ${roomId} with code ${code} by ${displayName}`);
      } catch (err: any) {
        socket.emit('error', { message: err.message });
      }
    });

    /**
     * Join Private Room via Secret Code
     */
    socket.on('join_room', ({ code }: { code: string }) => {
      try {
        const rateCheck = checkCodeRateLimit(userId);
        if (!rateCheck.allowed) {
          socket.emit('error', { message: `Too many attempts. Please wait ${rateCheck.waitSeconds}s.` });
          return;
        }

        const trimmedCode = code.trim().toUpperCase();
        const codeHash = hashSecretCode(trimmedCode);

        const room = db.prepare(`
          SELECT id, owner_id as ownerId, arena_id as arenaId, status
          FROM private_rooms WHERE code_hash = ?
        `).get(codeHash) as any;

        if (!room) {
          socket.emit('error', { message: 'Invalid secret battle code. Check with your partner!' });
          return;
        }

        // Check 2-player capacity limit
        const members = db.prepare(`
          SELECT m.user_id as userId, m.role, m.fighter_id as fighterId, m.is_ready as isReady,
                 p.display_name as displayName, p.level, p.title
          FROM room_members m
          JOIN profiles p ON p.id = m.user_id
          WHERE m.room_id = ?
        `).all(room.id) as any[];

        const existingMember = members.find((m) => m.userId === userId);

        if (!existingMember && members.length >= 2) {
          socket.emit('error', { message: 'This battle room is already full! (Max 2 fighters for 1v1)' });
          return;
        }

        if (!existingMember) {
          db.prepare(`
            INSERT INTO room_members (id, room_id, user_id, fighter_id, role, is_ready)
            VALUES (?, ?, ?, 'cupid_spark', 'challenger', 0)
          `).run(uuidv4(), room.id, userId);
        }

        resetCodeRateLimit(userId);

        socket.currentRoomId = room.id;
        socket.join(`room:${room.id}`);

        // Fetch refreshed members
        const updatedMembers = db.prepare(`
          SELECT m.user_id as userId, m.role, m.fighter_id as fighterId, m.is_ready as isReady,
                 p.display_name as displayName, p.level, p.title
          FROM room_members m
          JOIN profiles p ON p.id = m.user_id
          WHERE m.room_id = ?
        `).all(room.id) as any[];

        const myMembership = updatedMembers.find((m) => m.userId === userId);
        const opponentMembership = updatedMembers.find((m) => m.userId !== userId);

        // Notify joining player
        socket.emit('room_joined', {
          roomId: room.id,
          arenaId: room.arenaId,
          role: myMembership?.role || 'challenger',
          me: myMembership,
          opponent: opponentMembership || null,
        });

        // Notify other player in room
        socket.to(`room:${room.id}`).emit('opponent_joined', {
          opponent: myMembership,
        });

        console.log(`🔥 Player ${displayName} joined battle room ${room.id}`);
      } catch (err: any) {
        socket.emit('error', { message: err.message });
      }
    });

    /**
     * Select Fighter
     */
    socket.on('select_fighter', ({ fighterId }: { fighterId: FighterId }) => {
      const roomId = socket.currentRoomId;
      if (!roomId) return;

      db.prepare(`UPDATE room_members SET fighter_id = ? WHERE room_id = ? AND user_id = ?`).run(fighterId, roomId, userId);
      db.prepare(`UPDATE profiles SET selected_fighter = ? WHERE id = ?`).run(fighterId, userId);

      io.to(`room:${roomId}`).emit('fighter_selected', {
        userId,
        fighterId,
      });
    });

    /**
     * Select Arena (Room owner only)
     */
    socket.on('select_arena', ({ arenaId }: { arenaId: ArenaId }) => {
      const roomId = socket.currentRoomId;
      if (!roomId) return;

      db.prepare(`UPDATE private_rooms SET arena_id = ? WHERE id = ?`).run(arenaId, roomId);

      io.to(`room:${roomId}`).emit('arena_selected', {
        arenaId,
      });
    });

    /**
     * Toggle Ready
     */
    socket.on('toggle_ready', () => {
      const roomId = socket.currentRoomId;
      if (!roomId) return;

      const member = db.prepare(`SELECT is_ready FROM room_members WHERE room_id = ? AND user_id = ?`).get(roomId, userId) as any;
      const newReady = member?.is_ready ? 0 : 1;

      db.prepare(`UPDATE room_members SET is_ready = ? WHERE room_id = ? AND user_id = ?`).run(newReady, roomId, userId);

      io.to(`room:${roomId}`).emit('ready_toggled', {
        userId,
        isReady: !!newReady,
      });
    });

    /**
     * Start Match (Owner only, requires both players ready)
     */
    socket.on('start_match', () => {
      const roomId = socket.currentRoomId;
      if (!roomId) return;

      const members = db.prepare(`
        SELECT m.user_id as id, m.fighter_id as fighterId, p.display_name as displayName
        FROM room_members m
        JOIN profiles p ON p.id = m.user_id
        WHERE m.room_id = ?
      `).all(roomId) as any[];

      if (members.length < 2) {
        socket.emit('error', { message: 'Waiting for your partner to join!' });
        return;
      }

      const room = db.prepare(`SELECT arena_id as arenaId FROM private_rooms WHERE id = ?`).get(roomId) as any;
      const arenaId: ArenaId = room?.arenaId || 'heart_garden';

      const match = BattleEngine.createMatch(roomId, arenaId, members[0], members[1]);

      io.to(`room:${roomId}`).emit('match_started', {
        match,
      });

      console.log(`⚔️ Match ${match.matchId} started in room ${roomId}`);
    });

    /**
     * Combat Movement Update
     */
    socket.on('combat_move', (data) => {
      const roomId = socket.currentRoomId;
      if (!roomId) return;

      const result = BattleEngine.processMovement(roomId, userId, data);
      if (result) {
        socket.to(`room:${roomId}`).emit('opponent_moved', {
          userId,
          x: result.combatant.x,
          y: result.combatant.y,
          vx: result.combatant.vx,
          vy: result.combatant.vy,
          isFacingLeft: result.combatant.isFacingLeft,
          action: result.combatant.action,
          isBlocking: result.combatant.isBlocking,
          isDodging: result.combatant.isDodging,
          timestamp: Date.now(),
        });
      }
    });

    /**
     * Authoritative Attack Execution
     */
    socket.on('combat_attack', ({ attackType }: { attackType: 'light' | 'heavy' | 'special' }) => {
      const roomId = socket.currentRoomId;
      if (!roomId) return;

      const result = BattleEngine.processAttack(roomId, userId, attackType);

      // Broadcast visual attack animation trigger
      io.to(`room:${roomId}`).emit('attack_triggered', {
        attackerId: userId,
        attackType,
      });

      if (result.clash) {
        io.to(`room:${roomId}`).emit('heart_clash_triggered', {
          message: '💥 HEART CLASH! Both ultimate powers collided!',
        });
      } else if (result.hit) {
        io.to(`room:${roomId}`).emit('combat_hit', {
          attackerId: userId,
          damage: result.damage,
          blocked: result.blocked,
          targetHealth: result.targetHealth,
          attackerEnergy: result.attackerEnergy,
        });

        if (result.roundOver) {
          io.to(`room:${roomId}`).emit('round_over', {
            roundWinner: result.roundWinner,
            matchOver: result.matchOver,
            matchWinner: result.matchWinner,
          });

          // If match continues, start next round after 3.5s dramatic intermission
          if (!result.matchOver) {
            setTimeout(() => {
              const nextRound = BattleEngine.startNextRound(roomId);
              if (nextRound) {
                io.to(`room:${roomId}`).emit('round_started', {
                  roundNumber: nextRound.roundNumber,
                  match: nextRound,
                });
              }
            }, 3500);
          }
        }
      } else if (result.dodged) {
        io.to(`room:${roomId}`).emit('attack_dodged', {
          attackerId: userId,
        });
      }
    });

    /**
     * Send Romantic/Fight Emote
     */
    socket.on('combat_emote', ({ emote }: { emote: string }) => {
      const roomId = socket.currentRoomId;
      if (!roomId) return;

      io.to(`room:${roomId}`).emit('emote_received', {
        userId,
        displayName,
        emote,
        timestamp: Date.now(),
      });
    });

    /**
     * Rematch Vote
     */
    socket.on('vote_rematch', () => {
      const roomId = socket.currentRoomId;
      if (!roomId) return;

      const res = BattleEngine.voteRematch(roomId, userId);
      if (res?.restarted) {
        io.to(`room:${roomId}`).emit('match_restarted', {
          match: res.match,
        });
      } else {
        io.to(`room:${roomId}`).emit('rematch_voted', {
          userId,
          displayName,
          votesCount: res?.votesCount || 1,
        });
      }
    });

    /**
     * Disconnection Handling
     */
    socket.on('disconnect', () => {
      console.log(`🔌 Fighter disconnected: ${displayName} (${userId})`);
      const roomId = socket.currentRoomId;
      if (roomId) {
        socket.to(`room:${roomId}`).emit('opponent_left', {
          userId,
          displayName,
        });
      }
    });
  });
}
