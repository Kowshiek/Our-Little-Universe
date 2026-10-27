// Cloud & Edge Synchronization Service for LOVE BATTLE — Cross-Device Multiplayer
import { FighterId, ArenaId } from '../types/combat';
import { getBackendUrl } from '../config';

export interface RoomParticipant {
  userId: string;
  displayName: string;
  fighterId: FighterId;
  isReady: boolean;
  level: number;
  title: string;
}

export interface RoomData {
  roomId: string;
  secretCode: string;
  code: string;
  arenaId: ArenaId;
  status: 'waiting' | 'ready' | 'fighting' | 'ended';
  owner: RoomParticipant;
  opponent: RoomParticipant | null;
  match?: any;
  lastAction?: {
    type: string;
    userId: string;
    payload?: any;
    timestamp: number;
  };
  lastCombatEvent?: {
    action: string;
    userId: string;
    payload?: any;
    timestamp: number;
  };
  updatedAt: number;
}

type SyncCallback = (room: RoomData) => void;
type EventCallback = (data: any) => void;

const KV_BASE_URL = 'https://kvdb.io/olu_lovebattle_prod_2026';

class RoomSyncService {
  private activeCode: string | null = null;
  private currentUserId: string | null = null;
  private heartbeatTimer: any = null;
  private lastKnownRoom: RoomData | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('love_battle_sync');
        this.broadcastChannel.onmessage = (event) => {
          const { type, code, data } = event.data || {};
          if (this.activeCode && code === this.activeCode) {
            if (type === 'ROOM_UPDATE') {
              this.handleRoomUpdate(data);
            } else if (type === 'COMBAT_EVENT') {
              this.emit(data.action, data);
            }
          }
        };
      } catch (e) {
        // Fallback gracefully
      }
    }
  }

  public on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach((cb) => {
      try {
        cb(data);
      } catch (e) {
        console.warn('Sync listener error:', e);
      }
    });
  }

  private getApiUrl(endpoint: string): string {
    const backendUrl = getBackendUrl();
    return `${backendUrl}/api${endpoint}`;
  }

  /**
   * Create Private Room on Serverless Backend + Global Edge KV
   */
  public async createRoom(owner: any, arenaId: ArenaId = 'heart_garden', preferredCode?: string): Promise<RoomData> {
    const payload = {
      arenaId,
      code: preferredCode,
      owner: {
        id: owner.id,
        displayName: owner.displayName,
        selectedFighter: owner.selectedFighter,
        level: owner.level || 1,
        title: owner.title || 'Passionate Challenger',
      },
    };

    let room: RoomData | null = null;

    try {
      const res = await fetch(this.getApiUrl('/rooms/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        room = await res.json();
      }
    } catch (e) {
      console.warn('API /rooms/create failed, falling back to direct Edge KV:', e);
    }

    if (!room) {
      // Direct Edge KV Fallback
      const prefixes = ['LOVE', 'HEART', 'FLAME', 'VALOR', 'CUPID'];
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const code = preferredCode || `${prefix}-${suffix}`;

      room = {
        roomId: 'room_' + code.toLowerCase(),
        secretCode: code,
        code,
        arenaId,
        status: 'waiting',
        owner: {
          userId: owner.id,
          displayName: owner.displayName,
          fighterId: owner.selectedFighter || 'heart_knight',
          isReady: false,
          level: owner.level || 1,
          title: owner.title || 'Passionate Challenger',
        },
        opponent: null,
        updatedAt: Date.now(),
      };

      try {
        await fetch(`${KV_BASE_URL}/${encodeURIComponent(code)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(room),
        });
      } catch (e) {
        // Continue
      }
    }

    this.activeCode = room.secretCode || room.code;
    this.currentUserId = owner.id;
    this.lastKnownRoom = room;

    this.broadcastChannel?.postMessage({
      type: 'ROOM_UPDATE',
      code: this.activeCode,
      data: room,
    });

    return room;
  }

  /**
   * Join Private Room by Secret Code
   */
  public async joinRoom(code: string, challenger: any): Promise<RoomData> {
    const clean = code.trim().toUpperCase();
    const payload = {
      code: clean,
      challenger: {
        id: challenger.id,
        displayName: challenger.displayName,
        selectedFighter: challenger.selectedFighter,
        level: challenger.level || 1,
        title: challenger.title || 'Passionate Challenger',
      },
    };

    let room: RoomData | null = null;

    try {
      const res = await fetch(this.getApiUrl('/rooms/join'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        room = await res.json();
      }
    } catch (e) {
      console.warn('API /rooms/join failed, checking Edge KV:', e);
    }

    if (!room) {
      // Check Edge KV
      try {
        const kvRes = await fetch(`${KV_BASE_URL}/${encodeURIComponent(clean)}`);
        if (kvRes.ok) {
          room = await kvRes.json();
        }
      } catch (e) {
        // Continue
      }

      const opp: RoomParticipant = {
        userId: challenger.id,
        displayName: challenger.displayName,
        fighterId: challenger.selectedFighter || 'cupid_spark',
        isReady: false,
        level: challenger.level || 1,
        title: challenger.title || 'Passionate Challenger',
      };

      if (room) {
        room.opponent = opp;
        room.status = 'ready';
        room.updatedAt = Date.now();
      } else {
        room = {
          roomId: 'room_' + clean.toLowerCase(),
          secretCode: clean,
          code: clean,
          arenaId: 'heart_garden',
          status: 'ready',
          owner: {
            userId: 'owner_' + Math.random().toString(36).substring(2, 7),
            displayName: 'Partner (Host)',
            fighterId: 'heart_knight',
            isReady: false,
            level: 1,
            title: 'Arena Host',
          },
          opponent: opp,
          updatedAt: Date.now(),
        };
      }

      try {
        await fetch(`${KV_BASE_URL}/${encodeURIComponent(clean)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(room),
        });
      } catch (e) {
        // Continue
      }
    }

    this.activeCode = clean;
    this.currentUserId = challenger.id;
    this.lastKnownRoom = room;

    this.broadcastChannel?.postMessage({
      type: 'ROOM_UPDATE',
      code: this.activeCode,
      data: room,
    });

    return room;
  }

  /**
   * Poll Room State by Code
   */
  public async pollRoom(code: string): Promise<RoomData | null> {
    const clean = code.trim().toUpperCase();

    try {
      const res = await fetch(this.getApiUrl(`/rooms/poll?code=${encodeURIComponent(clean)}`));
      if (res.ok) {
        const room: RoomData = await res.json();
        this.handleRoomUpdate(room);
        return room;
      }
    } catch (e) {
      // Fallback to KV
    }

    try {
      const kvRes = await fetch(`${KV_BASE_URL}/${encodeURIComponent(clean)}`);
      if (kvRes.ok) {
        const room: RoomData = await kvRes.json();
        this.handleRoomUpdate(room);
        return room;
      }
    } catch (e) {
      // Continue
    }

    return null;
  }

  /**
   * Send In-Room Action (ready, fighter, arena, match start, combat)
   */
  public async sendAction(code: string, userId: string, action: string, payload?: any): Promise<RoomData | null> {
    const clean = code.trim().toUpperCase();
    const body = { code: clean, userId, action, payload };

    let updatedRoom: RoomData | null = null;

    try {
      const res = await fetch(this.getApiUrl('/rooms/action'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        updatedRoom = await res.json();
        if (updatedRoom) {
          this.handleRoomUpdate(updatedRoom);
        }
      }
    } catch (e) {
      // Continue
    }

    if (!updatedRoom && this.lastKnownRoom) {
      // Local optimistic update
      const room = { ...this.lastKnownRoom };
      const isOwner = room.owner.userId === userId;
      const isOpp = room.opponent?.userId === userId;

      if (action === 'ready') {
        const isReady = payload?.isReady !== undefined ? payload.isReady : true;
        if (isOwner) room.owner.isReady = isReady;
        if (isOpp && room.opponent) room.opponent.isReady = isReady;
      } else if (action === 'select_fighter') {
        const fId = payload?.fighterId || 'heart_knight';
        if (isOwner) room.owner.fighterId = fId;
        if (isOpp && room.opponent) room.opponent.fighterId = fId;
      } else if (action === 'select_arena') {
        room.arenaId = payload?.arenaId || 'heart_garden';
      } else if (action === 'start_match') {
        room.status = 'fighting';
        room.match = payload?.match || {
          matchId: 'match_' + Date.now(),
          p1: { userId: room.owner.userId, displayName: room.owner.displayName, fighterId: room.owner.fighterId, health: 100, energy: 100, roundWins: 0 },
          p2: { userId: room.opponent?.userId || 'p2', displayName: room.opponent?.displayName || 'Challenger', fighterId: room.opponent?.fighterId || 'cupid_spark', health: 100, energy: 0, roundWins: 0 },
          roundNumber: 1,
          timerRemaining: 60,
          status: 'fighting',
        };
      }
      room.updatedAt = Date.now();
      updatedRoom = room;
      this.handleRoomUpdate(room);

      try {
        await fetch(`${KV_BASE_URL}/${encodeURIComponent(clean)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(room),
        });
      } catch (e) {
        // Continue
      }
    }

    if (action.startsWith('combat_')) {
      this.broadcastChannel?.postMessage({
        type: 'COMBAT_EVENT',
        code: clean,
        data: { action, userId, payload },
      });
    }

    return updatedRoom;
  }

  /**
   * Handle incoming room update and fire events
   */
  private handleRoomUpdate(room: RoomData | null) {
    if (!room) return;
    const prev = this.lastKnownRoom;
    this.lastKnownRoom = room;

    // Check if opponent joined (PC detects mobile!)
    if (!prev?.opponent && room.opponent) {
      console.log('⚔️ [RoomSync] Opponent detected:', room.opponent.displayName);
      this.emit('opponent_joined', { opponent: room.opponent });
    }

    // Check if opponent left
    if (prev?.opponent && !room.opponent) {
      this.emit('opponent_left', {});
    }

    // Check if ready changed
    if (prev?.opponent?.isReady !== room.opponent?.isReady && room.opponent) {
      this.emit('ready_toggled', { userId: room.opponent.userId, isReady: room.opponent.isReady });
    }
    if (prev?.owner?.isReady !== room.owner?.isReady) {
      this.emit('ready_toggled', { userId: room.owner.userId, isReady: room.owner.isReady });
    }

    // Check if fighter changed
    if (prev?.opponent?.fighterId !== room.opponent?.fighterId && room.opponent) {
      this.emit('fighter_selected', { userId: room.opponent.userId, fighterId: room.opponent.fighterId });
    }
    if (prev?.owner?.fighterId !== room.owner?.fighterId) {
      this.emit('fighter_selected', { userId: room.owner.userId, fighterId: room.owner.fighterId });
    }

    // Check if arena changed
    if (prev?.arenaId !== room.arenaId) {
      this.emit('arena_selected', { arenaId: room.arenaId });
    }

    // Check if match started
    if ((prev?.status !== 'fighting' && room.status === 'fighting') || (!prev?.match && room.match)) {
      console.log('⚔️ [RoomSync] Match started detected!');
      this.emit('match_started', { match: room.match });
    }

    // Check combat event
    if (room.lastCombatEvent && room.lastCombatEvent.timestamp !== prev?.lastCombatEvent?.timestamp) {
      this.emit(room.lastCombatEvent.action, room.lastCombatEvent);
    }

    this.emit('room_sync', room);
  }

  /**
   * Start Active Polling Heartbeat
   */
  public startHeartbeat(code: string, userId: string, onUpdate?: SyncCallback, intervalMs = 900): () => void {
    this.stopHeartbeat();
    this.activeCode = code.trim().toUpperCase();
    this.currentUserId = userId;

    if (onUpdate) {
      this.on('room_sync', onUpdate);
    }

    // Initial immediate poll
    this.pollRoom(this.activeCode);

    this.heartbeatTimer = setInterval(() => {
      if (this.activeCode) {
        this.pollRoom(this.activeCode);
      }
    }, intervalMs);

    return () => this.stopHeartbeat();
  }

  public stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.activeCode = null;
  }
}

export const roomSync = new RoomSyncService();
