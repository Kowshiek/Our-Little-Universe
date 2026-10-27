import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, GameSaveData } from '../services/api';
import { socketService, RemotePartnerState, EmoteEvent, BossCombatState } from '../services/socket';
import { saveManager, SaveStatus } from '../services/saveManager';
import { connectivity, ConnectivityState } from '../services/connectivity';
import { useAuth } from './AuthContext';

interface UniverseContextType {
  activeUniverseId: string | null;
  gameData: GameSaveData | null;
  partner: RemotePartnerState | null;
  partnerOnline: boolean;
  saveStatus: SaveStatus;
  recentEmote: EmoteEvent | null;
  bossState: BossCombatState | null;
  activeStars: number[];
  isLoading: boolean;
  isReconnecting: boolean;
  connectivityState: ConnectivityState;
  enterUniverse: (universeId: string) => Promise<void>;
  leaveUniverse: () => Promise<void>;
  placeDecoration: (objectType: string, tileX: number, tileY: number, planetId?: string) => Promise<boolean>;
  removeDecoration: (objectId: string) => Promise<boolean>;
  purchaseItem: (itemType: string, cost: number) => Promise<boolean>;
  claimReward: (missionKey: string) => Promise<boolean>;
  sendEmote: (emote: string, x: number, y: number) => void;
  recordPlayerMove: (currentPlanet: string, x: number, y: number, safeX: number, safeY: number, health?: number, energy?: number) => void;
  attackBoss: (damage: number) => void;
  unlockPortal: () => void;
}

const UniverseContext = createContext<UniverseContextType | undefined>(undefined);

export const UniverseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [activeUniverseId, setActiveUniverseId] = useState<string | null>(null);
  const [gameData, setGameData] = useState<GameSaveData | null>(null);
  const [partner, setPartner] = useState<RemotePartnerState | null>(null);
  const [partnerOnline, setPartnerOnline] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [recentEmote, setRecentEmote] = useState<EmoteEvent | null>(null);
  const [bossState, setBossState] = useState<BossCombatState | null>(null);
  const [activeStars, setActiveStars] = useState<number[]>([1, 2, 3, 4, 5]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [connectivityState, setConnectivityState] = useState<ConnectivityState>(connectivity.getState());

  // Listen to connectivity changes
  useEffect(() => {
    const unsub = connectivity.subscribe((state) => {
      setConnectivityState(state);
      if (!state.isBackendReachable && activeUniverseId) {
        setIsReconnecting(true);
      } else if (state.isBackendReachable && isReconnecting) {
        setIsReconnecting(false);
        // Automatically re-sync and reload authoritative state upon reconnect
        if (activeUniverseId) {
          api.loadGame(activeUniverseId).then((data) => {
            setGameData(data);
            saveManager.reconcilePendingQueue();
          }).catch(console.error);
        }
      }
    });

    return () => unsub();
  }, [activeUniverseId, isReconnecting]);

  // Subscribe to save manager status
  useEffect(() => {
    const unsub = saveManager.onStatusChange((status) => {
      setSaveStatus(status);
    });
    return () => unsub();
  }, []);

  // Socket event listeners
  useEffect(() => {
    if (!activeUniverseId) return;

    const unsubUniverseJoined = socketService.on('universe_joined', (data) => {
      if (data.activeStars) setActiveStars(data.activeStars);
      if (data.bossState) setBossState(data.bossState);
    });

    const unsubPartnerStatus = socketService.on('partner_status', (data) => {
      setPartnerOnline(data.isOnline);
      if (data.partner) setPartner(data.partner);
    });

    const unsubPartnerMoved = socketService.on('partner_moved', (data) => {
      setPartner((prev) => ({
        ...(prev || {
          userId: data.userId,
          displayName: data.displayName,
          avatarColor: '#8a65d4',
          avatarStyle: 'starlight',
          isOnline: true,
        }),
        x: data.x,
        y: data.y,
        vx: data.vx,
        vy: data.vy,
        anim: data.anim,
        flipX: data.flipX,
        planetId: data.planetId,
        lastMovedAt: data.timestamp,
        isOnline: true,
      }));
    });

    const unsubEmote = socketService.on('emote_triggered', (data: EmoteEvent) => {
      setRecentEmote(data);
      setTimeout(() => {
        setRecentEmote((curr) => (curr?.timestamp === data.timestamp ? null : curr));
      }, 3000);
    });

    const unsubStar = socketService.on('star_collected', (data) => {
      setActiveStars((prev) => prev.filter((id) => id !== data.starId));
      setGameData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          state: {
            ...prev.state,
            sharedStars: data.sharedStars,
          },
          missions: prev.missions.map((m) =>
            m.missionKey === 'tutorial_stars' && data.missionUpdate
              ? { ...m, progressCount: data.missionUpdate.progressCount, status: data.missionUpdate.status }
              : m
          ),
        };
      });
    });

    const unsubBossDamage = socketService.on('boss_damaged', (data) => {
      setBossState({
        health: data.bossHealth,
        maxHealth: data.bossMaxHealth,
        phase: data.phase,
        isAlive: data.bossHealth > 0,
      });
    });

    const unsubBossDefeated = socketService.on('boss_defeated', (data) => {
      setBossState({
        health: 0,
        maxHealth: 300,
        phase: 2,
        isAlive: false,
      });
      setGameData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          state: {
            ...prev.state,
            bossDefeated: 1,
            sharedStars: prev.state.sharedStars + 100,
          },
          missions: prev.missions.map((m) =>
            m.missionKey === 'defeat_boss' ? { ...m, status: 'completed', progressCount: 1 } : m
          ),
        };
      });
    });

    const unsubPortal = socketService.on('portal_unlocked', () => {
      setGameData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          state: {
            ...prev.state,
            portalUnlocked: 1,
          },
          missions: prev.missions.map((m) =>
            m.missionKey === 'unlock_portal' ? { ...m, status: 'completed', progressCount: 1 } : m
          ),
        };
      });
    });

    const unsubObjectPlaced = socketService.on('object_placed', (placedObj) => {
      setGameData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          placedObjects: [...prev.placedObjects, placedObj],
        };
      });
    });

    const unsubObjectRemoved = socketService.on('object_removed', (data) => {
      setGameData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          placedObjects: prev.placedObjects.filter((o) => o.id !== data.objectId),
        };
      });
    });

    return () => {
      unsubUniverseJoined();
      unsubPartnerStatus();
      unsubPartnerMoved();
      unsubEmote();
      unsubStar();
      unsubBossDamage();
      unsubBossDefeated();
      unsubPortal();
      unsubObjectPlaced();
      unsubObjectRemoved();
    };
  }, [activeUniverseId]);

  const enterUniverse = async (universeId: string) => {
    if (!user) return;
    setIsLoading(true);

    try {
      // 1. Mandatory backend availability check
      const isOnline = await connectivity.checkBackendConnectivity();
      if (!isOnline) {
        throw new Error("You're offline. Connect to the internet to enter Our Little Universe.");
      }

      // 2. Load authoritative cloud database state
      const data = await api.loadGame(universeId);
      setGameData(data);
      setActiveUniverseId(universeId);

      // Check partner presence from members
      const partnerMember = data.members.find((m) => m.userId !== user.id);
      if (partnerMember) {
        setPartner({
          userId: partnerMember.userId,
          displayName: partnerMember.displayName,
          avatarColor: partnerMember.avatarColor,
          avatarStyle: partnerMember.avatarStyle,
          x: 440,
          y: 350,
          vx: 0,
          vy: 0,
          anim: 'idle',
          flipX: false,
          planetId: 'planet_lumina',
          isOnline: false,
          lastMovedAt: 0,
        });
      }

      // 3. Initialize save manager
      saveManager.init(universeId, user.id);

      // 4. Connect real-time socket
      socketService.connect(universeId);

      // 5. Reconcile any pending local recovery queue
      await saveManager.reconcilePendingQueue();
    } catch (err: any) {
      console.error('Enter universe error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const leaveUniverse = async () => {
    await saveManager.flushPlayerState();
    socketService.disconnect();
    setActiveUniverseId(null);
    setGameData(null);
    setPartner(null);
    setPartnerOnline(false);
  };

  const placeDecoration = async (objectType: string, tileX: number, tileY: number, planetId = 'planet_lumina') => {
    if (!activeUniverseId) return false;
    try {
      const res = await api.placeObject(activeUniverseId, { objectType, tileX, tileY, planetId });
      if (res.success) {
        setGameData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            placedObjects: [...prev.placedObjects, res.placedObject],
          };
        });
        socketService.notifyObjectPlaced(res.placedObject);
        return true;
      }
      return false;
    } catch (err: any) {
      alert(err.message || 'Failed to place decoration');
      return false;
    }
  };

  const removeDecoration = async (objectId: string) => {
    if (!activeUniverseId) return false;
    try {
      const res = await api.removeObject(activeUniverseId, objectId);
      if (res.success) {
        setGameData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            placedObjects: prev.placedObjects.filter((o) => o.id !== objectId),
          };
        });
        socketService.notifyObjectRemoved(objectId);
        return true;
      }
      return false;
    } catch (err: any) {
      alert(err.message || 'Failed to remove decoration');
      return false;
    }
  };

  const purchaseItem = async (itemType: string, cost: number) => {
    if (!activeUniverseId) return false;
    try {
      const res = await api.purchaseShopItem(activeUniverseId, itemType, cost);
      if (res.success) {
        setGameData((prev) => {
          if (!prev) return prev;
          const existing = prev.inventory.find((i) => i.itemType === itemType);
          const updatedInv = existing
            ? prev.inventory.map((i) => (i.itemType === itemType ? { ...i, quantity: i.quantity + 1 } : i))
            : [...prev.inventory, { id: `inv-${Date.now()}`, itemType, quantity: 1, isShared: 1 }];

          return {
            ...prev,
            state: {
              ...prev.state,
              sharedStars: res.sharedStars,
            },
            inventory: updatedInv,
          };
        });
        return true;
      }
      return false;
    } catch (err: any) {
      alert(err.message || 'Purchase failed');
      return false;
    }
  };

  const claimReward = async (missionKey: string) => {
    if (!activeUniverseId) return false;
    try {
      const res = await api.claimMissionReward(activeUniverseId, missionKey);
      if (res.success) {
        setGameData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            state: {
              ...prev.state,
              sharedStars: res.universeState.sharedStars,
              sharedCrystals: res.universeState.sharedCrystals,
            },
            missions: prev.missions.map((m) =>
              m.missionKey === missionKey ? { ...m, status: 'claimed' } : m
            ),
          };
        });
        return true;
      }
      return false;
    } catch (err: any) {
      alert(err.message || 'Claim reward failed');
      return false;
    }
  };

  const sendEmote = (emote: string, x: number, y: number) => {
    socketService.sendEmote(emote, x, y);
  };

  const recordPlayerMove = useCallback(
    (currentPlanet: string, x: number, y: number, safeX: number, safeY: number, health = 100, energy = 100) => {
      saveManager.recordPlayerPosition(currentPlanet, x, y, safeX, safeY, health, energy);
    },
    []
  );

  const attackBoss = (damage: number) => {
    socketService.attackBoss(damage);
  };

  const unlockPortal = () => {
    socketService.unlockPortal();
  };

  return (
    <UniverseContext.Provider
      value={{
        activeUniverseId,
        gameData,
        partner,
        partnerOnline,
        saveStatus,
        recentEmote,
        bossState,
        activeStars,
        isLoading,
        isReconnecting,
        connectivityState,
        enterUniverse,
        leaveUniverse,
        placeDecoration,
        removeDecoration,
        purchaseItem,
        claimReward,
        sendEmote,
        recordPlayerMove,
        attackBoss,
        unlockPortal,
      }}
    >
      {children}
    </UniverseContext.Provider>
  );
};

export const useUniverse = () => {
  const ctx = useContext(UniverseContext);
  if (!ctx) throw new Error('useUniverse must be used within UniverseProvider');
  return ctx;
};
