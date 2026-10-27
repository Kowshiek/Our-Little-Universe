import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './context/AuthContext';
import { useBattle } from './context/BattleContext';
import { socketService } from './services/socket';
import { connectivity, ConnectivityState } from './services/connectivity';
import { LandingPage } from './components/LandingPage';
import { LobbyRoom } from './components/LobbyRoom';
import { BattleCanvas, BattleCanvasHandle } from './game/BattleCanvas';
import { BattleHUD } from './components/BattleHUD';
import { MobileFightControls } from './components/MobileFightControls';
import { AuthModal } from './components/AuthModal';
import { JoinBattleModal } from './components/JoinBattleModal';
import { FighterGalleryModal } from './components/FighterGalleryModal';
import { HowToPlayModal } from './components/HowToPlayModal';
import { InstallModal } from './components/InstallModal';
import { MatchResultsModal } from './components/MatchResultsModal';
import { OfflineOverlay } from './components/OfflineOverlay';
import { Sparkles, Swords, ArrowLeft, Loader2 } from 'lucide-react';
import { FIGHTERS } from './types/combat';

export const App: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const {
    currentRoomId,
    secretCode,
    myFighterId,
    selectedArenaId,
    opponent,
    match,
    inMatch,
    isTrainingMode,
    matchWinner,
    createPrivateRoom,
    joinPrivateRoom,
    leaveRoom,
    startTrainingMode,
    exitTrainingMode,
  } = useBattle();

  const battleCanvasRef = useRef<BattleCanvasHandle>(null);

  // Modals state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [initialJoinCode, setInitialJoinCode] = useState('');
  const [rosterModalOpen, setRosterModalOpen] = useState(false);
  const [howToPlayModalOpen, setHowToPlayOpen] = useState(false);
  const [installModalOpen, setInstallOpen] = useState(false);

  // Local Training Dummy health & energy state
  const [trainingDummyHp, setTrainingDummyHp] = useState(100);
  const [trainingDummyEnergy, setTrainingDummyEnergy] = useState(0);

  // Connectivity monitoring
  const [connectivityState, setConnectivityState] = useState<ConnectivityState>(connectivity.getState());

  useEffect(() => {
    const unsub = connectivity.subscribe((state) => {
      setConnectivityState(state);
    });
    return unsub;
  }, []);

  // Handle invitation URL query param e.g. ?code=LOVE-8F4A or ?join=LOVE-8F4A
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('code') || params.get('join');
    if (codeParam) {
      const code = codeParam.toUpperCase();
      setInitialJoinCode(code);
      if (user) {
        setJoinModalOpen(true);
      } else {
        setAuthModalOpen(true);
      }
    }
  }, [user]);

  // Hook socket combat visual events to Phaser Canvas
  useEffect(() => {
    const unsubHit = socketService.on('combat_hit', (data: any) => {
      if (battleCanvasRef.current) {
        const text = data.blocked ? `BLOCKED -${data.damage}` : `-${data.damage}`;
        const color = data.blocked ? '#38bdf8' : data.attackType === 'special' ? '#ffd166' : '#ff2a85';
        battleCanvasRef.current.showHitEffect(data.victimX || 500, (data.victimY || 350) - 40, text, color);
      }
    });

    const unsubClash = socketService.on('heart_clash_triggered', () => {
      battleCanvasRef.current?.triggerHeartClash();
    });

    return () => {
      unsubHit();
      unsubClash();
    };
  }, []);

  // Create Private Battle Room
  const handleCreateBattle = () => {
    if (!user) {
      setAuthMode('register');
      setAuthModalOpen(true);
    } else {
      createPrivateRoom();
    }
  };

  // Join Battle Room with code
  const handleJoinBattle = () => {
    if (!user) {
      setAuthMode('login');
      setAuthModalOpen(true);
    } else {
      setJoinModalOpen(true);
    }
  };

  // Start Training Dojo
  const handleStartTraining = () => {
    setTrainingDummyHp(100);
    setTrainingDummyEnergy(0);
    startTrainingMode();
  };

  // Handle training dummy damage
  const handleDamageDummy = (dmg: number) => {
    setTrainingDummyHp((prev) => {
      const nextHp = Math.max(0, prev - dmg);
      battleCanvasRef.current?.showHitEffect(560, 360, `-${dmg}`, '#ffd166');
      return nextHp;
    });
  };

  // Strict Online-Only: If backend is completely unreachable, show OfflineOverlay
  if (!connectivityState.isBackendReachable && !inMatch && !currentRoomId) {
    return (
      <OfflineOverlay
        message={connectivityState.errorMessage || "Connect to the internet to enter Love Battle."}
        onRetry={() => connectivity.checkBackendConnectivity()}
      />
    );
  }

  // Auth Loading
  if (isAuthLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-cosmic-darkest text-white select-none">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-pink-500 via-rose-600 to-indigo-600 flex items-center justify-center shadow-xl animate-pulse mb-4">
          <Swords className="w-8 h-8 text-white" />
        </div>
        <p className="text-sm font-black text-pink-300 tracking-widest font-game uppercase animate-pulse">
          Awakening Love Battle Arena...
        </p>
      </div>
    );
  }

  // 1. IN MATCH / FIGHTING VIEW (Phaser 3 + Combat HUD + Touch Controls)
  if (inMatch) {
    const isP1 = match?.p1?.userId === user?.id || isTrainingMode;
    const p1Data = isP1 ? match?.p1 : match?.p2;
    const p2Data = isP1 ? match?.p2 : match?.p1;

    const p1Health = p1Data?.health ?? 100;
    const p1Energy = p1Data?.energy ?? 100;
    const p1Wins = p1Data?.roundWins ?? 0;

    const p2Health = isTrainingMode ? trainingDummyHp : (p2Data?.health ?? 100);
    const p2Energy = isTrainingMode ? trainingDummyEnergy : (p2Data?.energy ?? 0);
    const p2Wins = p2Data?.roundWins ?? 0;

    return (
      <div className="relative w-screen h-screen overflow-hidden bg-cosmic-darkest select-none">
        {/* Forfeit / Exit Match button */}
        <div className="absolute top-3 left-3 z-30 pointer-events-auto">
          <button
            onClick={() => {
              if (isTrainingMode) {
                exitTrainingMode();
              } else {
                if (window.confirm('Are you sure you want to exit the match?')) {
                  leaveRoom();
                }
              }
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-purple-500/30 text-purple-300 hover:text-white text-xs font-black flex items-center gap-1.5 transition shadow backdrop-blur-md"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{isTrainingMode ? 'Exit Dojo' : 'Forfeit'}</span>
          </button>
        </div>

        {/* Arcade Combat HUD */}
        <BattleHUD
          p1Name={p1Data?.displayName || user?.displayName || 'Player 1'}
          p1Fighter={p1Data?.fighterId || myFighterId}
          p1Health={p1Health}
          p1Energy={p1Energy}
          p1Wins={p1Wins}
          p2Name={p2Data?.displayName || opponent?.displayName || (isTrainingMode ? 'Training Dummy' : 'Challenger')}
          p2Fighter={p2Data?.fighterId || opponent?.fighterId || 'cupid_spark'}
          p2Health={p2Health}
          p2Energy={p2Energy}
          p2Wins={p2Wins}
          roundNumber={match?.roundNumber ?? 1}
          timerRemaining={match?.timerRemaining ?? 60}
          status={match?.status || 'fighting'}
          isTrainingMode={isTrainingMode}
        />

        {/* Phaser 3 Playable Canvas */}
        <BattleCanvas
          ref={battleCanvasRef}
          myUserId={user?.id}
          myFighterId={myFighterId}
          myDisplayName={user?.displayName || 'Fighter'}
          opponentUserId={opponent?.userId || (isTrainingMode ? 'dummy-bot' : undefined)}
          opponentFighterId={opponent?.fighterId || 'cupid_spark'}
          opponentDisplayName={opponent?.displayName || (isTrainingMode ? 'Training Dummy' : 'Opponent')}
          arenaId={selectedArenaId}
          isTrainingMode={isTrainingMode}
          onSendMove={(data) => socketService.sendMove(data)}
          onPerformAttack={(attackType) => socketService.performAttack(attackType)}
          onDamageDummy={handleDamageDummy}
        />

        {/* Mobile Touch Screen Fighting Controls */}
        <MobileFightControls
          onMove={(vector) => battleCanvasRef.current?.setVirtualJoystick(vector)}
          onLightAttack={() => battleCanvasRef.current?.triggerLightAttack()}
          onHeavyAttack={() => battleCanvasRef.current?.triggerHeavyAttack()}
          onSpecial={() => battleCanvasRef.current?.triggerSpecial()}
          onBlock={(active) => battleCanvasRef.current?.triggerBlock(active)}
          onDodge={() => battleCanvasRef.current?.triggerDodge()}
          onOpenEmotes={() => socketService.sendEmote('heart')}
          isSpecialReady={p1Energy >= 100}
        />

        {/* Match Results Modal (Victory / Defeat / Rematch) */}
        <MatchResultsModal
          isOpen={!!matchWinner || (isTrainingMode && trainingDummyHp <= 0)}
          onReturnToLobby={() => {
            if (isTrainingMode) {
              exitTrainingMode();
            } else {
              leaveRoom();
            }
          }}
        />
      </div>
    );
  }

  // 2. IN LOBBY ROOM VIEW (Fighter Selection, Arena Selection, Ready & Secret Code)
  if (currentRoomId) {
    return <LobbyRoom onBack={() => leaveRoom()} />;
  }

  // 3. LANDING PAGE VIEW
  return (
    <>
      <LandingPage
        onCreateBattle={handleCreateBattle}
        onJoinBattle={handleJoinBattle}
        onStartTraining={handleStartTraining}
        onOpenRoster={() => setRosterModalOpen(true)}
        onOpenHowToPlay={() => setHowToPlayOpen(true)}
        onOpenAuth={(mode) => {
          setAuthMode(mode);
          setAuthModalOpen(true);
        }}
        onOpenInstall={() => setInstallOpen(true)}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultMode={authMode}
        onSuccess={() => {
          if (initialJoinCode) {
            setJoinModalOpen(true);
          }
        }}
      />

      <JoinBattleModal
        isOpen={joinModalOpen}
        onClose={() => setJoinModalOpen(false)}
        initialCode={initialJoinCode}
      />

      <FighterGalleryModal
        isOpen={rosterModalOpen}
        onClose={() => setRosterModalOpen(false)}
      />

      <HowToPlayModal
        isOpen={howToPlayModalOpen}
        onClose={() => setHowToPlayOpen(false)}
      />

      <InstallModal
        isOpen={installModalOpen}
        onClose={() => setInstallOpen(false)}
      />
    </>
  );
};
