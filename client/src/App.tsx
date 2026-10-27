import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './context/AuthContext';
import { useBattle } from './context/BattleContext';
import { socketService } from './services/socket';
import { roomSync } from './services/roomSync';
import { connectivity, ConnectivityState } from './services/connectivity';
import { LandingPage } from './components/LandingPage';
import { LobbyRoom } from './components/LobbyRoom';
import { ThreeBattleCanvas, ThreeBattleCanvasHandle } from './game/three/ThreeBattleCanvas';
import { BattleHUD } from './components/BattleHUD';
import { MobileFightControls } from './components/MobileFightControls';
import { AuthModal } from './components/AuthModal';
import { JoinBattleModal } from './components/JoinBattleModal';
import { FighterGalleryModal } from './components/FighterGalleryModal';
import { HowToPlayModal } from './components/HowToPlayModal';
import { InstallModal } from './components/InstallModal';
import { MatchResultsModal } from './components/MatchResultsModal';
import { OfflineOverlay } from './components/OfflineOverlay';
import { RotateLandscapePrompt } from './components/RotateLandscapePrompt';
import { Swords, ArrowLeft, Globe, Wifi, Maximize2 } from 'lucide-react';

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
    leaveRoom,
    startTrainingMode,
    exitTrainingMode,
  } = useBattle();

  const battleCanvasRef = useRef<ThreeBattleCanvasHandle>(null);

  // Modals state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [initialJoinCode, setInitialJoinCode] = useState('');
  const [rosterModalOpen, setRosterModalOpen] = useState(false);
  const [howToPlayModalOpen, setHowToPlayOpen] = useState(false);
  const [installModalOpen, setInstallOpen] = useState(false);
  const [backendConfigOpen, setBackendConfigOpen] = useState(false);

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

  // Hook combat visual events (Socket.IO + Cloud RoomSync) to 3D Canvas
  useEffect(() => {
    const unsubHit = socketService.on('combat_hit', (data: any) => {
      if (battleCanvasRef.current) {
        const text = data.blocked ? `BLOCKED -${data.damage}` : `-${data.damage}`;
        const color = data.blocked ? '#38bdf8' : data.attackType === 'special' ? '#ffd166' : '#ff2a85';
        battleCanvasRef.current.showHitEffect(data.victimX || 0, data.victimY || 1.2, text, color);
      }
    });

    const unsubClash = socketService.on('heart_clash_triggered', () => {
      battleCanvasRef.current?.triggerHeartClash();
    });

    const unsubSocketAttack = socketService.on('attack_triggered', (data: any) => {
      if (battleCanvasRef.current && data.userId !== user?.id) {
        battleCanvasRef.current.triggerOpponentAttack?.(data.attackType || 'light');
      }
    });

    const unsubSocketMove = socketService.on('opponent_moved', (data: any) => {
      if (battleCanvasRef.current && data.userId !== user?.id) {
        battleCanvasRef.current.setOpponentPosition?.(data.x, data.y, data.facing, data.animState);
      }
    });

    const unsubSyncAttack = roomSync.on('combat_attack', (data: any) => {
      if (battleCanvasRef.current && data.userId !== user?.id) {
        battleCanvasRef.current.triggerOpponentAttack?.(data.payload?.attackType || 'light');
      }
    });

    const unsubSyncMove = roomSync.on('combat_move', (data: any) => {
      if (battleCanvasRef.current && data.userId !== user?.id) {
        battleCanvasRef.current.setOpponentPosition?.(data.payload?.x, data.payload?.y, data.payload?.facing, data.payload?.animState);
      }
    });

    return () => {
      unsubHit();
      unsubClash();
      unsubSocketAttack();
      unsubSocketMove();
      unsubSyncAttack();
      unsubSyncMove();
    };
  }, [user]);

  // Create Private Battle Room (Automatic Instant Connection)
  const handleCreateBattle = () => {
    createPrivateRoom();
  };

  // Join Battle Room with code (Automatic Instant Join)
  const handleJoinBattle = () => {
    setJoinModalOpen(true);
  };

  // Start 3D Training Dojo (Instant Play, works offline & online!)
  const handleStartTraining = () => {
    setTrainingDummyHp(100);
    setTrainingDummyEnergy(0);
    setBackendConfigOpen(false);
    startTrainingMode();
  };

  // Handle training dummy damage
  const handleDamageDummy = (dmg: number) => {
    setTrainingDummyHp((prev) => {
      const nextHp = Math.max(0, prev - dmg);
      return nextHp;
    });
  };

  // Auth Loading
  if (isAuthLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-cosmic-darkest text-white select-none">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-pink-500 via-rose-600 to-indigo-600 flex items-center justify-center shadow-xl animate-pulse mb-4">
          <Swords className="w-8 h-8 text-white" />
        </div>
        <p className="text-sm font-black text-pink-300 tracking-widest font-game uppercase animate-pulse">
          Awakening 3D Love Battle Arena...
        </p>
      </div>
    );
  }

  // 1. IN MATCH / FIGHTING VIEW (Three.js 3D Battle Arena + Combat HUD + Touch Controls)
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
            className="px-3.5 py-2 rounded-xl bg-slate-900/80 border border-purple-500/30 text-purple-200 hover:text-white text-xs font-black flex items-center gap-1.5 transition shadow backdrop-blur-md"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isTrainingMode ? 'Exit 3D Dojo' : 'Forfeit'}</span>
          </button>
        </div>

        {/* Top Controls: 3D Badge + Fullscreen */}
        <div className="absolute top-3 right-3 z-30 pointer-events-auto flex items-center gap-2">
          <button
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen?.().catch(() => {});
              } else {
                document.exitFullscreen?.().catch(() => {});
              }
            }}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900/80 border border-purple-500/30 text-purple-200 hover:text-white text-xs font-black flex items-center gap-1 transition shadow backdrop-blur-md"
            title="Toggle Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5 text-pink-400" />
            <span className="hidden sm:inline">Fullscreen</span>
          </button>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-pink-500/30 text-pink-300 text-[11px] font-black uppercase tracking-wider backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Real-Time 3D Engine</span>
          </div>
        </div>

        {/* Arcade Combat HUD */}
        <BattleHUD
          p1Name={p1Data?.displayName || user?.displayName || 'Player 1'}
          p1Fighter={p1Data?.fighterId || myFighterId}
          p1Health={p1Health}
          p1Energy={p1Energy}
          p1Wins={p1Wins}
          p2Name={p2Data?.displayName || opponent?.displayName || (isTrainingMode ? '3D Training Dummy' : 'Challenger')}
          p2Fighter={p2Data?.fighterId || opponent?.fighterId || 'cupid_spark'}
          p2Health={p2Health}
          p2Energy={p2Energy}
          p2Wins={p2Wins}
          roundNumber={match?.roundNumber ?? 1}
          timerRemaining={match?.timerRemaining ?? 60}
          status={match?.status || 'fighting'}
          isTrainingMode={isTrainingMode}
        />

        {/* Real 3D Playable Three.js Canvas */}
        <ThreeBattleCanvas
          ref={battleCanvasRef}
          myUserId={user?.id}
          myFighterId={myFighterId}
          myDisplayName={user?.displayName || 'Fighter'}
          opponentUserId={opponent?.userId || (isTrainingMode ? 'dummy-bot' : undefined)}
          opponentFighterId={opponent?.fighterId || 'cupid_spark'}
          opponentDisplayName={opponent?.displayName || (isTrainingMode ? '3D Dummy' : 'Opponent')}
          arenaId={selectedArenaId}
          isTrainingMode={isTrainingMode}
          onSendMove={(data) => {
            socketService.sendMove(data);
            if (secretCode && user) {
              roomSync.sendAction(secretCode, user.id, 'combat_move', data);
            }
          }}
          onPerformAttack={(attackType) => {
            socketService.performAttack(attackType);
            if (secretCode && user) {
              roomSync.sendAction(secretCode, user.id, 'combat_attack', { attackType });
            }
          }}
          onDamageDummy={handleDamageDummy}
        />

        {/* Mobile Touch Screen Fighting Controls (Ergonomic Landscape Easy Fighting) */}
        <MobileFightControls
          onMove={(vector) => battleCanvasRef.current?.setVirtualJoystick(vector)}
          onJump={() => battleCanvasRef.current?.triggerJump()}
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

      {backendConfigOpen && (
        <OfflineOverlay
          isChecking={false}
          onRetry={() => connectivity.checkBackendConnectivity()}
          onStartTraining={handleStartTraining}
          onDismiss={() => setBackendConfigOpen(false)}
          message="Connect your Love Battle backend URL (e.g. Render/Railway URL) for 1v1 online couple multiplayer, or jump into the 3D Training Dojo right away!"
        />
      )}

      {/* Rotate Device to Landscape guidance overlay on mobile */}
      <RotateLandscapePrompt />
    </>
  );
};
