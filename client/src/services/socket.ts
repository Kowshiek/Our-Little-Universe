import { io, Socket } from 'socket.io-client';
import { api } from './api';
import { getBackendUrl } from '../config';
import { FighterId, ArenaId } from '../types/combat';

type SocketCallback = (...args: any[]) => void;

class SocketService {
  private socket: Socket | null = null;
  private currentRoomId: string | null = null;
  private listeners: Map<string, Set<SocketCallback>> = new Map();

  public isConnected(): boolean {
    return !!this.socket && this.socket.connected;
  }

  public connect() {
    const token = api.getToken();
    if (!token) return;

    if (this.socket && this.socket.connected) {
      return;
    }

    if (this.socket) {
      this.socket.disconnect();
    }

    const backendUrl = getBackendUrl();
    this.socket = io(backendUrl || window.location.origin, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on('connect', () => {
      console.log('⚔️ Connected to Love Battle server');
      this.emitInternal('connection_change', { isConnected: true });
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('Socket disconnected:', reason);
      this.emitInternal('connection_change', { isConnected: false, reason });
    });

    this.socket.on('connect_error', (err) => {
      console.error('Socket error:', err.message);
      this.emitInternal('connection_error', { error: err.message });
    });

    this.socket.on('error', (data) => {
      console.warn('Socket business error:', data);
      this.emitInternal('error', data);
    });

    // Room & Lobby Events
    this.socket.on('room_created', (data) => this.emitInternal('room_created', data));
    this.socket.on('room_joined', (data) => this.emitInternal('room_joined', data));
    this.socket.on('opponent_joined', (data) => this.emitInternal('opponent_joined', data));
    this.socket.on('opponent_left', (data) => this.emitInternal('opponent_left', data));
    this.socket.on('fighter_selected', (data) => this.emitInternal('fighter_selected', data));
    this.socket.on('arena_selected', (data) => this.emitInternal('arena_selected', data));
    this.socket.on('ready_toggled', (data) => this.emitInternal('ready_toggled', data));

    // Combat Events
    this.socket.on('match_started', (data) => this.emitInternal('match_started', data));
    this.socket.on('opponent_moved', (data) => this.emitInternal('opponent_moved', data));
    this.socket.on('attack_triggered', (data) => this.emitInternal('attack_triggered', data));
    this.socket.on('combat_hit', (data) => this.emitInternal('combat_hit', data));
    this.socket.on('heart_clash_triggered', (data) => this.emitInternal('heart_clash_triggered', data));
    this.socket.on('round_over', (data) => this.emitInternal('round_over', data));
    this.socket.on('round_started', (data) => this.emitInternal('round_started', data));
    this.socket.on('match_restarted', (data) => this.emitInternal('match_restarted', data));
    this.socket.on('rematch_voted', (data) => this.emitInternal('rematch_voted', data));
    this.socket.on('emote_received', (data) => this.emitInternal('emote_received', data));
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentRoomId = null;
  }

  // Emitters
  public createRoom(arenaId: ArenaId) {
    this.socket?.emit('create_room', { arenaId });
  }

  public joinRoom(code: string) {
    this.socket?.emit('join_room', { code });
  }

  public selectFighter(fighterId: FighterId) {
    this.socket?.emit('select_fighter', { fighterId });
  }

  public selectArena(arenaId: ArenaId) {
    this.socket?.emit('select_arena', { arenaId });
  }

  public toggleReady() {
    this.socket?.emit('toggle_ready');
  }

  public startMatch() {
    this.socket?.emit('start_match');
  }

  public sendMovement(data: any) {
    this.socket?.emit('combat_move', data);
  }

  public sendMove(data: any) {
    this.sendMovement(data);
  }

  public sendAttack(attackType: 'light' | 'heavy' | 'special') {
    this.socket?.emit('combat_attack', { attackType });
  }

  public performAttack(attackType: 'light' | 'heavy' | 'special') {
    this.sendAttack(attackType);
  }

  public sendEmote(emote: string) {
    this.socket?.emit('combat_emote', { emote });
  }

  public voteRematch() {
    this.socket?.emit('vote_rematch');
  }

  // Event Subscription
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
          console.error(`Error in socket event ${event}:`, e);
        }
      });
    }
  }
}

export const socketService = new SocketService();
