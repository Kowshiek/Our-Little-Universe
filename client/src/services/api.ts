import { connectivity } from './connectivity';
import { getBackendUrl } from '../config';
import { FighterId, ArenaId } from '../types/combat';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  selectedFighter: FighterId;
  avatarColor: string;
  title: string;
  level: number;
  exp: number;
  wins: number;
  losses: number;
  draws: number;
  createdAt: string;
}

export interface MatchRecord {
  id: string;
  arenaId: ArenaId;
  winnerId: string | null;
  p1Fighter: FighterId;
  p2Fighter: FighterId;
  p1Score: number;
  p2Score: number;
  durationSeconds: number;
  createdAt: string;
  p1Name: string;
  p2Name: string;
}

class ApiService {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('love_battle_token');
    }
  }

  public setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('love_battle_token', token);
    } else {
      localStorage.removeItem('love_battle_token');
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      };

      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api${endpoint}`, {
        ...options,
        headers,
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        return data as T;
      }
    } catch (e) {
      console.warn(`API ${endpoint} network fallback:`, e);
    }

    // Graceful automatic local fallbacks (Instant Play with zero configuration)
    if (endpoint === '/auth/register' || endpoint === '/auth/login') {
      const body = options.body ? JSON.parse(options.body as string) : {};
      const localUser: UserProfile = {
        id: 'user_' + Math.random().toString(36).substring(2, 9),
        email: body.email || 'fighter@lovebattle.com',
        displayName: body.displayName || 'Heart Fighter',
        selectedFighter: body.selectedFighter || 'heart_knight',
        avatarColor: body.avatarColor || '#ff2a85',
        title: 'Passionate Challenger',
        level: 1,
        exp: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        createdAt: new Date().toISOString(),
      };
      const token = 'token_' + localUser.id;
      this.setToken(token);
      return { token, user: localUser } as T;
    }

    if (endpoint === '/auth/me') {
      const localUser: UserProfile = {
        id: 'user_' + Math.random().toString(36).substring(2, 9),
        email: 'fighter@lovebattle.com',
        displayName: 'Heart Fighter',
        selectedFighter: 'heart_knight',
        avatarColor: '#ff2a85',
        title: 'Passionate Challenger',
        level: 1,
        exp: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        createdAt: new Date().toISOString(),
      };
      return { user: localUser, unlocks: [] } as T;
    }

    if (endpoint === '/rooms/create') {
      const prefixes = ['LOVE', 'HEART', 'FLAME', 'CUPID'];
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const code = `${prefix}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      return { roomId: 'room_' + Date.now(), secretCode: code, arenaId: 'heart_garden' } as T;
    }

    if (endpoint === '/rooms/join') {
      const body = options.body ? JSON.parse(options.body as string) : {};
      const code = (body.code || 'LOVE-9B4A').toUpperCase();
      return { roomId: 'room_' + code.toLowerCase(), secretCode: code, arenaId: 'heart_garden' } as T;
    }

    if (endpoint === '/profile/history') {
      return { matches: [] } as T;
    }

    return {} as T;
  }

  // Auth APIs
  public async register(payload: {
    email: string;
    password: string;
    displayName: string;
    selectedFighter?: FighterId;
    avatarColor?: string;
  }) {
    const res = await this.request<{ token: string; user: UserProfile }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    this.setToken(res.token);
    return res;
  }

  public async login(payload: { email: string; password: string }) {
    const res = await this.request<{ token: string; user: UserProfile }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    this.setToken(res.token);
    return res;
  }

  public async getMe() {
    return this.request<{ user: UserProfile; unlocks: any[] }>('/auth/me');
  }

  public logout() {
    this.setToken(null);
  }

  // Room Management
  public async createRoom(arenaId: ArenaId = 'heart_garden') {
    return this.request<{ roomId: string; secretCode: string; arenaId: ArenaId }>('/rooms/create', {
      method: 'POST',
      body: JSON.stringify({ arenaId }),
    });
  }

  public async joinRoom(code: string) {
    return this.request<{ roomId: string; arenaId: ArenaId; secretCode: string }>('/rooms/join', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  // Match History
  public async getMatchHistory() {
    return this.request<{ matches: MatchRecord[] }>('/profile/history');
  }
}

export const api = new ApiService();
