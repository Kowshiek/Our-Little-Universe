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
    const isConnOk = await connectivity.checkBackendConnectivity();
    if (!isConnOk) {
      throw new Error("You're offline. Connect to the internet to play Love Battle.");
    }

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

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401) {
        this.setToken(null);
      }
      throw new Error(data.error || `Request failed with status ${response.status}`);
    }

    return data as T;
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
