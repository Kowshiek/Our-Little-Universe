import React, { createContext, useContext, useState, useEffect } from 'react';
import { socketService } from '../services/socket';
import { FighterId, ArenaId, FIGHTERS } from '../types/combat';
import { useAuth } from './AuthContext';
import confetti from 'canvas-confetti';

interface OpponentData {
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
  createPrivateRoom: (arenaId?: ArenaId) => void;
  joinPrivateRoom: (code: string) => void;
  leaveRoom: () => void;
  chooseFighter: (fighterId: FighterId) => void;
  chooseArena: (arenaId: ArenaId) => void;
  toggleReady: () => void;
  startMatch: () => void;
  startTrainingMode: () => void;
  exitTrainingMode: () => void;
  voteRematch: () => void;
  sendEmote: (emote: string) => void;
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

  // Socket event listeners
  useEffect(() => {
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
    };
  }, [user]);

  const clearError = () => {
    setError(null);
  };

  const createPrivateRoom = (arenaId: ArenaId = 'heart_garden') => {
    setError(null);
    socketService.connect();
    socketService.createRoom(arenaId);
  };

  const joinPrivateRoom = (code: string) => {
    setError(null);
    socketService.connect();
    socketService.joinRoom(code);
  };

  const leaveRoom = () => {
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
  };

  const chooseArena = (arenaId: ArenaId) => {
    setSelectedArenaId(arenaId);
    socketService.selectArena(arenaId);
  };

  const toggleReady = () => {
    socketService.toggleReady();
  };

  const startMatch = () => {
    socketService.startMatch();
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
