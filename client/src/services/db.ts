import Dexie, { Table } from 'dexie';

export interface LocalCheckpoint {
  id?: number;
  universeId: string;
  userId: string;
  currentPlanet: string;
  positionX: number;
  positionY: number;
  lastSafeX: number;
  lastSafeY: number;
  health: number;
  energy: number;
  saveVersion: number;
  timestamp: number;
}

export interface CachedProfile {
  userId: string;
  displayName: string;
  email: string;
  avatarColor: string;
  avatarStyle: string;
  cachedAt: number;
}

export interface PendingRecoveryAction {
  id?: number;
  universeId: string;
  type: 'SAVE_PLAYER' | 'PLACE_OBJECT' | 'REMOVE_OBJECT' | 'SYNC_CHECKPOINT';
  data: any;
  timestamp: number;
  synced: number; // 0 = pending, 1 = synced
}

export interface LocalSetting {
  key: string;
  value: any;
  updatedAt: number;
}

export class GameDatabase extends Dexie {
  checkpoints!: Table<LocalCheckpoint, number>;
  profiles!: Table<CachedProfile, string>;
  recoveryQueue!: Table<PendingRecoveryAction, number>;
  settings!: Table<LocalSetting, string>;

  constructor() {
    super('OurLittleUniverseDB');
    this.version(1).stores({
      checkpoints: '++id, universeId, userId, timestamp',
      profiles: 'userId, cachedAt',
      recoveryQueue: '++id, universeId, type, synced, timestamp',
      settings: 'key',
    });
  }
}

export const localDb = new GameDatabase();

// Request persistent storage on mobile devices where supported
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persist();
      console.log(`💾 Storage persistence status: ${isPersisted ? 'Persistent' : 'Best-effort'}`);
      if (navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        const usageMB = Math.round((estimate.usage || 0) / 1024 / 1024);
        const quotaMB = Math.round((estimate.quota || 0) / 1024 / 1024);
        console.log(`💾 Storage Quota: ${usageMB}MB used of ${quotaMB}MB`);
      }
      return isPersisted;
    } catch (e) {
      console.warn('Could not request persistent storage:', e);
      return false;
    }
  }
  return false;
}

// Helpers for checkpoints & recovery
export async function saveLocalCheckpoint(checkpoint: Omit<LocalCheckpoint, 'id' | 'timestamp'>) {
  try {
    await localDb.checkpoints.add({
      ...checkpoint,
      timestamp: Date.now(),
    });
    // Keep only last 5 checkpoints to conserve space
    const count = await localDb.checkpoints.count();
    if (count > 5) {
      const oldest = await localDb.checkpoints.orderBy('id').limit(count - 5).primaryKeys();
      await localDb.checkpoints.bulkDelete(oldest);
    }
  } catch (err) {
    console.warn('IndexedDB save checkpoint error:', err);
  }
}

export async function getLatestLocalCheckpoint(universeId: string, userId: string): Promise<LocalCheckpoint | undefined> {
  try {
    return await localDb.checkpoints
      .where('universeId')
      .equals(universeId)
      .and(item => item.userId === userId)
      .last();
  } catch (err) {
    console.warn('IndexedDB get checkpoint error:', err);
    return undefined;
  }
}

export async function addPendingRecoveryAction(universeId: string, type: PendingRecoveryAction['type'], data: any) {
  try {
    return await localDb.recoveryQueue.add({
      universeId,
      type,
      data,
      timestamp: Date.now(),
      synced: 0,
    });
  } catch (err) {
    console.warn('IndexedDB add recovery error:', err);
  }
}

export async function getPendingRecoveryActions(universeId: string): Promise<PendingRecoveryAction[]> {
  try {
    return await localDb.recoveryQueue
      .where('universeId')
      .equals(universeId)
      .and(item => item.synced === 0)
      .toArray();
  } catch (err) {
    return [];
  }
}

export async function clearSyncedRecoveryActions(ids: number[]) {
  try {
    await localDb.recoveryQueue.bulkDelete(ids);
  } catch (err) {
    console.warn('Clear recovery error:', err);
  }
}
