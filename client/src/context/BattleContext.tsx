import React, { createContext, useContext, useState, useEffect } from 'react';
import { socketService } from '../services/socket';
import { roomSync, RoomParticipant } from '../services/roomSync';
import { FighterId, ArenaId, FIGHTERS } from '../types/combat';
import { useAuth } from './AuthContext';
import confetti from 'canvas-confetti';

export interface OpponentData {
  userId: string;
  displayName: string;
  fighterId: FighterId;
  isReady: boolean;
  level: number;
  title: string;
}

interface BattleContextType {
  currentRoomId: string | null;
  secretCode: string | null;
  myRole: 'owner' | 'challenger';
  myFighterId: FighterId;
  selectedArenaId: ArenaId;
  myIsReady: boolean;
  opponent: OpponentData | null;
  match: any | null;
  inMatch: boolean;
  isTrainingMode: boolean;
  rematchVotes: number;
  roundWinner: string | null;
  matchWinner: string | null;
  error: string | null;
  clearError: () => void;
  createPrivateRoom: (arenaId?: ArenaId) => Promise<void>;
  joinPrivateRoom: (code: string) => Promise<void>;
  leaveRoom: () => void;
  chooseFighter: (fighterId: FighterId) => void;
  chooseArena: (arenaId: ArenaId) => void;
  toggleReady: () => void;
  startMatch: () => void;
  startTrainingMode: () => void;
  exitTrainingMode: () => void;
  voteRematch: () => void;
  sendEmote: (emote: string) => void;
  addAIPartnerBot: () => void;
}

const BattleContext = createContext<BattleContextType | undefined>(undefined);

export const BattleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [secretCode, setSecretCode] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<'owner' | 'challenger'>('owner');
  const [myFighterId, setMyFighterId] = useState<FighterId>(user?.selectedFighter || 'heart_knight');
  const [selectedArenaId, setSelectedArenaId] = useState<ArenaId>('heart_garden');
  const [myIsReady, setMyIsReady] = useState<boolean>(false);
  const [opponent, setOpponent] = useState<OpponentData | null>(null);

  const [match, setMatch] = useState<any | null>(null);
  const [inMatch, setInMatch] = useState<boolean>(false);
  const [isTrainingMode, setIsTrainingMode] = useState<boolean>(false);
  const [rematchVotes, setRematchVotes] = useState<number>(0);
  const [roundWinner, setRoundWinner] = useState<string | null>(null);
  const [matchWinner, setMatchWinner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.selectedFighter) {
      setMyFighterId(user.selectedFighter);
    }
    if (user) {
      socketService.connect();
    }
  }, [user]);

  // Dual-Layer Event Listeners (Socket.IO + Cloud RoomSync)
  useEffect(() => {
    // 1. Socket.IO Listeners
    const unsubError = socketService.on('error', (data) => {
      setError(data.message || 'Battle room error');
    });

    const unsubCreated = socketService.on('room_created', (data) => {
      setError(null);
      setCurrentRoomId(data.roomId);
      setSecretCode(data.secretCode);
      setSelectedArenaId(data.arenaId);
      setMyRole('owner');
      setMyIsReady(false);
      setOpponent(null);
    });

    const unsubJoined = socketService.on('room_joined', (data) => {
      setError(null);
      setCurrentRoomId(data.roomId);
      setSelectedArenaId(data.arenaId);
      setMyRole(data.role);
      setMyIsReady(false);
      if (data.opponent) {
        setOpponent(data.opponent);
      }
    });

    const unsubOppJoined = socketService.on('opponent_joined', (data) => {
      setOpponent(data.opponent);
    });

    const unsubOppLeft = socketService.on('opponent_left', () => {
      setOpponent(null);
      setInMatch(false);
      setMatch(null);
    });

    const unsubFighter = socketService.on('fighter_selected', (data) => {
      if (data.userId === user?.id) {
        setMyFighterId(data.fighterId);
      } else {
        setOpponent((prev) => (prev ? { ...prev, fighterId: data.fighterId } : null));
      }
    });

    const unsubArena = socketService.on('arena_selected', (data) => {
      setSelectedArenaId(data.arenaId);
    });

    const unsubReady = socketService.on('ready_toggled', (data) => {
      if (data.userId === user?.id) {
        setMyIsReady(data.isReady);
      } else {
        setOpponent((prev) => (prev ? { ...prev, isReady: data.isReady } : null));
      }
    });

    const unsubMatchStarted = socketService.on('match_started', (data) => {
      setMatch(data.match);
      setInMatch(true);
      setRoundWinner(null);
      setMatchWinner(null);
      setRematchVotes(0);
    });

    const unsubRoundOver = (data: any) => {
      setRoundWinner(data.roundWinner);
      if (data.matchOver) {
        setMatchWinner(data.matchWinner);
        if (data.matchWinner === user?.id) {
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#ff2a85', '#ffd166', '#a855f7', '#38bdf8'],
          });
        }
      }
    };
    const unsubRound = socketService.on('round_over', unsubRoundOver);

    const unsubNextRound = socketService.on('round_started', (data) => {
      setMatch(data.match);
      setRoundWinner(null);
    });

    const unsubRestarted = socketService.on('match_restarted', (data) => {
      setMatch(data.match);
      setRoundWinner(null);
      setMatchWinner(null);
      setRematchVotes(0);
    });

    const unsubRematchVoted = socketService.on('rematch_voted', (data) => {
      setRematchVotes(data.votesCount);
    });

    // 2. Cloud RoomSync Listeners (Guarantees cross-device match on Vercel)
    const unsubSyncOppJoined = roomSync.on('opponent_joined', (data) => {
      console.log('⚔️ [BattleContext] Partner joined via Cloud Sync:', data.opponent);
      setOpponent(data.opponent);
    });

    const unsubSyncOppLeft = roomSync.on('opponent_left', () => {
      setOpponent(null);
    });

    const unsubSyncReady = roomSync.on('ready_toggled', (data) => {
      if (data.userId === user?.id) {
        setMyIsReady(data.isReady);
      } else {
        setOpponent((prev) => (prev ? { ...prev, isReady: data.isReady } : null));
      }
    });

    const unsubSyncFighter = roomSync.on('fighter_selected', (data) => {
      if (data.userId === user?.id) {
        setMyFighterId(data.fighterId);
      } else {
        setOpponent((prev) => (prev ? { ...prev, fighterId: data.fighterId } : null));
      }
    });

    const unsubSyncArena = roomSync.on('arena_selected', (data) => {
      setSelectedArenaId(data.arenaId);
    });

    const unsubSyncMatchStarted = roomSync.on('match_started', (data) => {
      console.log('⚔️ [BattleContext] Match started via Cloud Sync');
      setMatch(data.match);
      setInMatch(true);
      setRoundWinner(null);
      setMatchWinner(null);
      setRematchVotes(0);
    });

    return () => {
      unsubError();
      unsubCreated();
      unsubJoined();
      unsubOppJoined();
      unsubOppLeft();
      unsubFighter();
      unsubArena();
      unsubReady();
      unsubMatchStarted();
      unsubRound();
      unsubNextRound();
      unsubRestarted();
      unsubRematchVoted();

      unsubSyncOppJoined();
      unsubSyncOppLeft();
      unsubSyncReady();
      unsubSyncFighter();
      unsubSyncArena();
      unsubSyncMatchStarted();
    };
  }, [user]);

  const clearError = () => {
    setError(null);
  };

  /**
   * Create Private Battle Room
   */
  const createPrivateRoom = async (arenaId: ArenaId = 'heart_garden') => {
    setError(null);
    socketService.connect();
    socketService.createRoom(arenaId);

    const currentUser = user || {
      id: 'user_' + Math.random().toString(36).substring(2, 8),
      displayName: 'Heart Fighter',
      selectedFighter: myFighterId,
      level: 1,
      title: 'Passionate Challenger',
    };

    try {
      const room = await roomSync.createRoom(currentUser, arenaId);
      setCurrentRoomId(room.roomId);
      setSecretCode(room.secretCode || room.code);
      setSelectedArenaId(room.arenaId);
      setMyRole('owner');
      setMyIsReady(false);
      setOpponent(null);

      // Start active cloud heartbeat polling so Mobile's join is detected instantly on PC!
      roomSync.startHeartbeat(room.secretCode || room.code, currentUser.id, (updatedRoom) => {
        if (updatedRoom.opponent) {
          setOpponent((prev) => {
            if (
              !prev ||
              prev.userId !== updatedRoom.opponent!.userId ||
              prev.isReady !== updatedRoom.opponent!.isReady ||
              prev.fighterId !== updatedRoom.opponent!.fighterId
            ) {
              return updatedRoom.opponent;
            }
            return prev;
          });
        }
      });
    } catch (e) {
      console.warn('createPrivateRoom error:', e);
    }
  };

  /**
   * Join Private Room by Secret Code
   */
  const joinPrivateRoom = async (code: string) => {
    setError(null);
    const clean = code.trim().toUpperCase();
    socketService.connect();
    socketService.joinRoom(clean);

    const currentUser = user || {
      id: 'user_' + Math.random().toString(36).substring(2, 8),
      displayName: 'Partner (Lover)',
      selectedFighter: myFighterId,
      level: 1,
      title: 'Passionate Challenger',
    };

    try {
      const room = await roomSync.joinRoom(clean, currentUser);
      setCurrentRoomId(room.roomId);
      setSecretCode(clean);
      setSelectedArenaId(room.arenaId || 'heart_garden');
      setMyRole('challenger');
      setMyIsReady(false);

      if (room.owner) {
        setOpponent({
          userId: room.owner.userId,
          displayName: room.owner.displayName,
          fighterId: room.owner.fighterId,
          isReady: room.owner.isReady,
          level: room.owner.level,
          title: room.owner.title,
        });
      }

      // Start active cloud heartbeat polling so Mobile stays in sync with Owner
      roomSync.startHeartbeat(clean, currentUser.id, (updatedRoom) => {
        if (updatedRoom.owner) {
          setOpponent((prev) => {
            if (
              !prev ||
              prev.userId !== updatedRoom.owner.userId ||
              prev.isReady !== updatedRoom.owner.isReady ||
              prev.fighterId !== updatedRoom.owner.fighterId
            ) {
              return {
                userId: updatedRoom.owner.userId,
                displayName: updatedRoom.owner.displayName,
                fighterId: updatedRoom.owner.fighterId,
                isReady: updatedRoom.owner.isReady,
                level: updatedRoom.owner.level,
                title: updatedRoom.owner.title,
              };
            }
            return prev;
          });
        }
        if (updatedRoom.status === 'fighting' || updatedRoom.match) {
          setInMatch(true);
          setMatch(updatedRoom.match);
        }
      });
    } catch (e) {
      console.warn('joinPrivateRoom error:', e);
    }
  };

  const leaveRoom = () => {
    roomSync.stopHeartbeat();
    socketService.disconnect();
    setCurrentRoomId(null);
    setSecretCode(null);
    setOpponent(null);
    setInMatch(false);
    setMatch(null);
  };

  const chooseFighter = (fighterId: FighterId) => {
    setMyFighterId(fighterId);
    socketService.selectFighter(fighterId);
    if (secretCode && user) {
      roomSync.sendAction(secretCode, user.id, 'select_fighter', { fighterId });
    }
  };

  const chooseArena = (arenaId: ArenaId) => {
    setSelectedArenaId(arenaId);
    socketService.selectArena(arenaId);
    if (secretCode && user) {
      roomSync.sendAction(secretCode, user.id, 'select_arena', { arenaId });
    }
  };

  const toggleReady = () => {
    const nextReady = !myIsReady;
    setMyIsReady(nextReady);
    socketService.toggleReady();
    if (secretCode && user) {
      roomSync.sendAction(secretCode, user.id, 'ready', { isReady: nextReady });
    }
  };

  const startMatch = () => {
    socketService.startMatch();
    const matchObj = {
      matchId: 'match-' + Date.now(),
      p1: {
        userId: user?.id || 'p1',
        displayName: user?.displayName || 'Host',
        fighterId: myFighterId,
        health: 100,
        energy: 100,
        roundWins: 0,
      },
      p2: {
        userId: opponent?.userId || 'p2',
        displayName: opponent?.displayName || 'Challenger',
        fighterId: opponent?.fighterId || 'cupid_spark',
        health: 100,
        energy: 0,
        roundWins: 0,
      },
      roundNumber: 1,
      timerRemaining: 60,
      status: 'fighting',
    };

    if (secretCode && user) {
      roomSync.sendAction(secretCode, user.id, 'start_match', { match: matchObj });
    }

    setMatch(matchObj);
    setInMatch(true);
  };

  const addAIPartnerBot = () => {
    setOpponent({
      userId: 'partner_ai',
      displayName: 'Cosmic Cupid [AI]',
      fighterId: 'cupid_spark',
      isReady: true,
      level: 2,
      title: 'Romantic AI Bot',
    });
  };

  const startTrainingMode = () => {
    setIsTrainingMode(true);
    setInMatch(true);
    setMatch({
      matchId: 'training-match',
      p1: { health: 100, energy: 100, roundWins: 0 },
      p2: { health: 100, energy: 0, roundWins: 0 },
      roundNumber: 1,
      timerRemaining: 99,
    });
  };

  const exitTrainingMode = () => {
    setIsTrainingMode(false);
    setInMatch(false);
    setMatch(null);
  };

  const voteRematch = () => {
    socketService.voteRematch();
    if (secretCode && user) {
      roomSync.sendAction(secretCode, user.id, 'rematch');
    }
  };

  const sendEmote = (emote: string) => {
    socketService.sendEmote(emote);
  };

  return (
    <BattleContext.Provider
      value={{
        currentRoomId,
        secretCode,
        myRole,
        myFighterId,
        selectedArenaId,
        myIsReady,
        opponent,
        match,
        inMatch,
        isTrainingMode,
        rematchVotes,
        roundWinner,
        matchWinner,
        error,
        clearError,
        createPrivateRoom,
        joinPrivateRoom,
        leaveRoom,
        chooseFighter,
        chooseArena,
        toggleReady,
        startMatch,
        startTrainingMode,
        exitTrainingMode,
        voteRematch,
        sendEmote,
        addAIPartnerBot,
      }}
    >
      {children}
    </BattleContext.Provider>
  );
};

export const useBattle = () => {
  const ctx = useContext(BattleContext);
  if (!ctx) throw new Error('useBattle must be used within BattleProvider');
  return ctx;
};
