import { connectivity } from './connectivity';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarColor: string;
  avatarStyle: string;
}

export interface UniverseSummary {
  id: string;
  name: string;
  planetLevel: number;
  ownerId: string;
  role: string;
  joinedAt: string;
}

export interface GameSaveData {
  universe: {
    id: string;
    name: string;
    ownerId: string;
    planetLevel: number;
    theme: string;
    createdAt: string;
  };
  members: Array<{
    userId: string;
    role: string;
    joinedAt: string;
    displayName: string;
    avatarColor: string;
    avatarStyle: string;
  }>;
  state: {
    sharedStars: number;
    sharedCrystals: number;
    portalUnlocked: number;
    bossDefeated: number;
    storyProgress: string;
    version: number;
  };
  placedObjects: Array<{
    id: string;
    planetId: string;
    objectType: string;
    tileX: number;
    tileY: number;
    rotation: number;
    placedBy: string;
    placedAt: string;
  }>;
  inventory: Array<{
    id: string;
    itemType: string;
    quantity: number;
    isShared: number;
  }>;
  missions: Array<{
    missionKey: string;
    title: string;
    description: string;
    requiredCount: number;
    rewardType: string;
    rewardAmount: number;
    rewardItem?: string;
    status: 'in_progress' | 'completed' | 'claimed';
    progressCount: number;
    completedAt?: string;
    claimedAt?: string;
  }>;
  player: {
    currentPlanet: string;
    positionX: number;
    positionY: number;
    lastSafeX: number;
    lastSafeY: number;
    health: number;
    maxHealth: number;
    energy: number;
    maxEnergy: number;
    equippedOutfit: string;
  };
}

class ApiService {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('olu_auth_token');
    }
  }

  public setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('olu_auth_token', token);
    } else {
      localStorage.removeItem('olu_auth_token');
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // Strict connectivity check
    const isConnOk = await connectivity.checkBackendConnectivity();
    if (!isConnOk) {
      throw new Error("You're offline. Connect to the internet to enter Our Little Universe.");
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`/api${endpoint}`, {
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
    avatarColor?: string;
    avatarStyle?: string;
  }) {
    const res = await this.request<{ token: string; user: UserProfile }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    this.setToken(res.token);
    return res;
  }

  public async login(payload: { email: string; password: string }) {
    const res = await this.request<{ token: string; user: UserProfile; universes: UniverseSummary[] }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    this.setToken(res.token);
    return res;
  }

  public async getMe() {
    return this.request<{ user: UserProfile; universes: UniverseSummary[] }>('/auth/me');
  }

  public logout() {
    this.setToken(null);
  }

  // Universe APIs
  public async createUniverse(universeName: string) {
    return this.request<{
      universe: { id: string; name: string; ownerId: string; planetLevel: number };
      inviteCode: string;
    }>('/universe/create', {
      method: 'POST',
      body: JSON.stringify({ universeName }),
    });
  }

  public async joinUniverse(code: string) {
    return this.request<{ universeId: string; universeName: string; message: string }>('/universe/join', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  public async getInviteCode(universeId: string) {
    return this.request<{ code: string; createdAt: string; usesCount: number }>(`/universe/${universeId}/invite`);
  }

  public async rotateInviteCode(universeId: string) {
    return this.request<{ code: string }>(`/universe/${universeId}/invite/rotate`, {
      method: 'POST',
    });
  }

  // Game Persistence APIs
  public async loadGame(universeId: string): Promise<GameSaveData> {
    return this.request<GameSaveData>(`/game/load/${universeId}`);
  }

  public async savePlayer(universeId: string, playerState: Partial<GameSaveData['player']>) {
    return this.request<{ saved: boolean; lastSavedAt: string }>(`/game/save-player/${universeId}`, {
      method: 'POST',
      body: JSON.stringify(playerState),
    });
  }

  public async saveUniverse(universeId: string, universeState: Partial<GameSaveData['state']>) {
    return this.request<{ saved: boolean; version: number }>(`/game/save-universe/${universeId}`, {
      method: 'POST',
      body: JSON.stringify(universeState),
    });
  }

  public async placeObject(universeId: string, object: { objectType: string; tileX: number; tileY: number; planetId?: string }) {
    return this.request<{ success: boolean; placedObject: any }>(`/game/place-object/${universeId}`, {
      method: 'POST',
      body: JSON.stringify(object),
    });
  }

  public async removeObject(universeId: string, objectId: string) {
    return this.request<{ success: boolean; removedId: string }>(`/game/remove-object/${universeId}`, {
      method: 'POST',
      body: JSON.stringify({ objectId }),
    });
  }

  public async purchaseShopItem(universeId: string, itemType: string, cost: number) {
    return this.request<{ success: boolean; itemType: string; sharedStars: number }>(`/game/purchase/${universeId}`, {
      method: 'POST',
      body: JSON.stringify({ itemType, cost }),
    });
  }

  public async claimMissionReward(universeId: string, missionKey: string) {
    return this.request<{
      success: boolean;
      missionKey: string;
      rewardType: string;
      rewardAmount: number;
      rewardItem?: string;
      universeState: { sharedStars: number; sharedCrystals: number };
    }>(`/game/claim-mission/${universeId}`, {
      method: 'POST',
      body: JSON.stringify({ missionKey }),
    });
  }

  public async syncQueue(universeId: string, queue: any[]) {
    return this.request<{ syncedCount: number; results: any[] }>(`/game/sync-queue/${universeId}`, {
      method: 'POST',
      body: JSON.stringify({ queue }),
    });
  }
}

export const api = new ApiService();
