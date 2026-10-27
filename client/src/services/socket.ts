import { io, Socket } from 'socket.io-client';
import { api } from './api';

export interface RemotePartnerState {
  userId: string;
  displayName: string;
  avatarColor: string;
  avatarStyle: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  anim: string;
  flipX: boolean;
  planetId: string;
  isOnline: boolean;
  lastMovedAt: number;
}

export interface EmoteEvent {
  userId: string;
  displayName: string;
  emote: string;
  x: number;
  y: number;
  timestamp: number;
}

export interface BossCombatState {
  health: number;
  maxHealth: number;
  phase: number;
  isAlive: boolean;
}

type SocketCallback = (...args: any[]) => void;

class SocketService {
  private socket: Socket | null = null;
  private currentUniverseId: string | null = null;
  private partnerState: RemotePartnerState | null = null;
  private listeners: Map<string, Set<SocketCallback>> = new Map();

  public isConnected(): boolean {
    return !!this.socket && this.socket.connected;
  }

  public getPartnerState(): RemotePartnerState | null {
    return this.partnerState;
  }

  public connect(universeId: string) {
    const token = api.getToken();
    if (!token) {
      console.warn('Socket connect skipped: No auth token');
      return;
    }

    if (this.socket && this.socket.connected && this.currentUniverseId === universeId) {
      return;
    }

    if (this.socket) {
      this.socket.disconnect();
    }

    this.currentUniverseId = universeId;

    this.socket = io(window.location.origin, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on('connect', () => {
      console.log('🌌 Socket connected to universe server');
      this.socket?.emit('join_universe', { universeId });
      this.emitInternal('connection_change', { isConnected: true });
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('Socket disconnected:', reason);
      this.emitInternal('connection_change', { isConnected: false, reason });
    });

    this.socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
      this.emitInternal('connection_error', { error: err.message });
    });

    this.socket.on('universe_joined', (data) => {
      console.log('✨ Universe joined session verified:', data);
      this.emitInternal('universe_joined', data);
    });

    this.socket.on('partner_joined', (data) => {
      console.log('💖 Partner joined universe:', data.displayName);
      this.partnerState = {
        userId: data.userId,
        displayName: data.displayName,
        avatarColor: data.avatarColor,
        avatarStyle: data.avatarStyle,
        x: 440,
        y: 350,
        vx: 0,
        vy: 0,
        anim: 'idle',
        flipX: false,
        planetId: 'planet_lumina',
        isOnline: true,
        lastMovedAt: Date.now(),
      };
      this.emitInternal('partner_status', { isOnline: true, partner: this.partnerState });
    });

    this.socket.on('partner_left', (data) => {
      console.log('💔 Partner left universe:', data.displayName);
      if (this.partnerState) {
        this.partnerState.isOnline = false;
      }
      this.emitInternal('partner_status', { isOnline: false, userId: data.userId });
    });

    this.socket.on('partner_moved', (data) => {
      if (this.partnerState) {
        this.partnerState.x = data.x;
        this.partnerState.y = data.y;
        this.partnerState.vx = data.vx;
        this.partnerState.vy = data.vy;
        this.partnerState.anim = data.anim;
        this.partnerState.flipX = data.flipX;
        this.partnerState.planetId = data.planetId;
        this.partnerState.isOnline = true;
        this.partnerState.lastMovedAt = data.timestamp;
      } else {
        this.partnerState = {
          userId: data.userId,
          displayName: data.displayName,
          avatarColor: '#8a65d4',
          avatarStyle: 'starlight',
          x: data.x,
          y: data.y,
          vx: data.vx,
          vy: data.vy,
          anim: data.anim,
          flipX: data.flipX,
          planetId: data.planetId,
          isOnline: true,
          lastMovedAt: data.timestamp,
        };
      }
      this.emitInternal('partner_moved', data);
    });

    this.socket.on('emote_triggered', (data: EmoteEvent) => {
      this.emitInternal('emote_triggered', data);
    });

    this.socket.on('star_collected', (data) => {
      this.emitInternal('star_collected', data);
    });

    this.socket.on('boss_damaged', (data) => {
      this.emitInternal('boss_damaged', data);
    });

    this.socket.on('boss_phase_change', (data) => {
      this.emitInternal('boss_phase_change', data);
    });

    this.socket.on('boss_defeated', (data) => {
      this.emitInternal('boss_defeated', data);
    });

    this.socket.on('portal_unlocked', (data) => {
      this.emitInternal('portal_unlocked', data);
    });

    this.socket.on('object_placed', (data) => {
      this.emitInternal('object_placed', data);
    });

    this.socket.on('object_removed', (data) => {
      this.emitInternal('object_removed', data);
    });
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.partnerState = null;
    this.currentUniverseId = null;
  }

  // Socket Emitters
  public sendMovement(movement: {
    x: number;
    y: number;
    vx?: number;
    vy?: number;
    anim?: string;
    flipX?: boolean;
    planetId?: string;
  }) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('player_move', movement);
    }
  }

  public sendEmote(emote: string, x: number, y: number) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('player_emote', { emote, x, y });
    }
  }

  public collectStar(starId: number) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('collect_star', { starId });
    }
  }

  public attackBoss(damage: number, attackType: string = 'star_burst') {
    if (this.socket && this.socket.connected) {
      this.socket.emit('boss_attack', { damage, attackType });
    }
  }

  public unlockPortal() {
    if (this.socket && this.socket.connected) {
      this.socket.emit('unlock_portal');
    }
  }

  public notifyObjectPlaced(placedObject: any) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('object_placed', placedObject);
    }
  }

  public notifyObjectRemoved(objectId: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('object_removed', { objectId });
    }
  }

  // Event Subscription Helpers
  public on(event: string, callback: SocketCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emitInternal(event: string, ...args: any[]) {
    const list = this.listeners.get(event);
    if (list) {
      list.forEach((cb) => {
        try {
          cb(...args);
        } catch (e) {
          console.error(`Error in socket listener for ${event}:`, e);
        }
      });
    }
  }
}

export const socketService = new SocketService();
