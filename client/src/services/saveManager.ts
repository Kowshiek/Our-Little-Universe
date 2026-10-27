import { api, GameSaveData } from './api';
import { saveLocalCheckpoint, addPendingRecoveryAction, getPendingRecoveryActions, clearSyncedRecoveryActions } from './db';

export type SaveStatus = 'saved' | 'saving' | 'error' | 'syncing';

class SaveManager {
  private universeId: string | null = null;
  private userId: string | null = null;
  private saveDebounceTimer: any = null;
  private pendingPlayerState: Partial<GameSaveData['player']> | null = null;
  private saveStatus: SaveStatus = 'saved';
  private statusListeners: Set<(status: SaveStatus) => void> = new Set();

  public init(universeId: string, userId: string) {
    this.universeId = universeId;
    this.userId = userId;
  }

  public getStatus(): SaveStatus {
    return this.saveStatus;
  }

  public onStatusChange(callback: (status: SaveStatus) => void): () => void {
    this.statusListeners.add(callback);
    callback(this.saveStatus);
    return () => this.statusListeners.delete(callback);
  }

  private setStatus(status: SaveStatus) {
    this.saveStatus = status;
    this.statusListeners.forEach((fn) => fn(status));
  }

  /**
   * Queue and debounce player position / state save (e.g. while walking)
   */
  public recordPlayerPosition(currentPlanet: string, x: number, y: number, safeX: number, safeY: number, health = 100, energy = 100) {
    if (!this.universeId || !this.userId) return;

    this.pendingPlayerState = {
      currentPlanet,
      positionX: Math.round(x),
      positionY: Math.round(y),
      lastSafeX: Math.round(safeX),
      lastSafeY: Math.round(safeY),
      health,
      energy,
    };

    // Also persist local checkpoint to IndexedDB for device recovery
    saveLocalCheckpoint({
      universeId: this.universeId,
      userId: this.userId,
      currentPlanet,
      positionX: Math.round(x),
      positionY: Math.round(y),
      lastSafeX: Math.round(safeX),
      lastSafeY: Math.round(safeY),
      health,
      energy,
      saveVersion: Date.now(),
    });

    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }

    // Debounce save to cloud every 3.5 seconds
    this.saveDebounceTimer = setTimeout(() => {
      this.flushPlayerState();
    }, 3500);
  }

  /**
   * Force flush player state to cloud database immediately
   */
  public async flushPlayerState() {
    if (!this.universeId || !this.pendingPlayerState) return;

    const toSave = { ...this.pendingPlayerState };
    this.pendingPlayerState = null;
    this.setStatus('saving');

    try {
      await api.savePlayer(this.universeId, toSave);
      this.setStatus('saved');
    } catch (err: any) {
      console.warn('Save player state to cloud failed, queueing for recovery:', err);
      this.setStatus('error');
      // Queue in IndexedDB for automatic recovery
      if (this.universeId) {
        await addPendingRecoveryAction(this.universeId, 'SAVE_PLAYER', toSave);
      }
    }
  }

  /**
   * Reconcile any pending local actions with cloud database
   */
  public async reconcilePendingQueue() {
    if (!this.universeId) return;

    try {
      const pending = await getPendingRecoveryActions(this.universeId);
      if (pending.length === 0) return;

      this.setStatus('syncing');
      console.log(`🔄 Reconciling ${pending.length} pending local changes with cloud...`);

      const res = await api.syncQueue(this.universeId, pending);
      const syncedIds = pending.map((p) => p.id!).filter(Boolean);
      await clearSyncedRecoveryActions(syncedIds);

      this.setStatus('saved');
      console.log(`✅ Synced ${res.syncedCount} changes successfully.`);
    } catch (err) {
      console.warn('Error during pending queue reconciliation:', err);
      this.setStatus('saved');
    }
  }
}

export const saveManager = new SaveManager();
