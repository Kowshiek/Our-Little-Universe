import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './context/AuthContext';
import { useUniverse } from './context/UniverseContext';
import { LandingPage } from './components/LandingPage';
import { AuthModal } from './components/AuthModal';
import { CreateUniverseModal } from './components/CreateUniverseModal';
import { JoinUniverseModal } from './components/JoinUniverseModal';
import { GameCanvas, GameCanvasHandle } from './game/GameCanvas';
import { HUD } from './components/HUD';
import { MobileControls } from './components/MobileControls';
import { QuestTrackerModal } from './components/QuestTrackerModal';
import { CustomizationModal } from './components/CustomizationModal';
import { EmotePickerModal } from './components/EmotePickerModal';
import { SettingsModal } from './components/SettingsModal';
import { PortalDialog } from './components/PortalDialog';
import { InstallModal } from './components/InstallModal';
import { OfflineOverlay } from './components/OfflineOverlay';
import { WelcomeBackModal } from './components/WelcomeBackModal';
import { Sparkles, Loader2, ArrowLeft, Check, X } from 'lucide-react';

export const App: React.FC = () => {
  const { user, universes, isLoading: isAuthLoading } = useAuth();
  const {
    activeUniverseId,
    gameData,
    isLoading: isUniverseLoading,
    isReconnecting,
    connectivityState,
    enterUniverse,
    leaveUniverse,
    placeDecoration,
  } = useUniverse();

  const gameCanvasRef = useRef<GameCanvasHandle>(null);

  // Modals state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [initialJoinCode, setInitialJoinCode] = useState('');
  const [questsOpen, setQuestsOpen] = useState(false);
  const [workshopOpen, setWorkshopOpen] = useState(false);
  const [emotesOpen, setEmotesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [portalOpen, setPortalOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);

  // Scene state: 'PlanetScene' or 'BossScene'
  const [currentScene, setCurrentScene] = useState<'PlanetScene' | 'BossScene'>('PlanetScene');

  // Object Placement Mode
  const [placingItemType, setPlacingItemType] = useState<string | null>(null);

  // Handle invitation URL query param e.g. ?join=LOVE-8F4A
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');
    if (joinCode) {
      setInitialJoinCode(joinCode.toUpperCase());
      if (user) {
        setJoinModalOpen(true);
      } else {
        setAuthModalOpen(true);
      }
    }
  }, [user]);

  // Handle Create Universe button from landing page
  const handleCreateUniverse = () => {
    if (!user) {
      setAuthMode('register');
      setAuthModalOpen(true);
    } else {
      setCreateModalOpen(true);
    }
  };

  // Handle Join Universe button from landing page
  const handleJoinUniverse = () => {
    if (!user) {
      setAuthMode('login');
      setAuthModalOpen(true);
    } else {
      setJoinModalOpen(true);
    }
  };

  // Enter universe
  const handleEnterUniverse = async (universeId: string) => {
    try {
      await enterUniverse(universeId);
      setShowWelcomeBack(true);
      setCurrentScene('PlanetScene');
    } catch (err: any) {
      alert(err.message || 'Failed to enter universe');
    }
  };

  // Switch scene (e.g. from Portal)
  const handleSwitchScene = (target: 'PlanetScene' | 'BossScene') => {
    setCurrentScene(target);
    gameCanvasRef.current?.switchScene(target);
  };

  // Confirm placement of decoration at player's current location
  const handleConfirmPlacement = async () => {
    if (!placingItemType || !gameData) return;
    const posX = gameData.player.lastSafeX || 400;
    const posY = gameData.player.lastSafeY || 350;

    const ok = await placeDecoration(placingItemType, posX, posY, currentScene === 'BossScene' ? 'nebula_arena' : 'planet_lumina');
    if (ok) {
      setPlacingItemType(null);
    }
  };

  // Strict Online-Only: If backend is completely unreachable, show OfflineOverlay
  if (!connectivityState.isBackendReachable && !activeUniverseId) {
    return (
      <OfflineOverlay
        message={connectivityState.errorMessage || "You're offline. Connect to the internet to enter Our Little Universe."}
        onRetry={() => {}}
      />
    );
  }

  // Auth Loading
  if (isAuthLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-cosmic-darkest text-white select-none">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-pink-500 to-indigo-600 flex items-center justify-center shadow-xl animate-pulse mb-4">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <p className="text-sm font-bold text-pink-300 tracking-wide font-game animate-pulse">
          Awakening Celestial Connection...
        </p>
      </div>
    );
  }

  // Universe Loading / Entering screen
  if (isUniverseLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-cosmic-darkest text-white select-none p-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-pink-500 via-purple-600 to-indigo-600 flex items-center justify-center shadow-2xl mb-6 relative">
          <Loader2 className="w-10 h-10 text-white animate-spin" />
        </div>
        <h3 className="text-2xl font-black text-white mb-2 font-game">Restoring Your Universe...</h3>
        <p className="text-sm text-purple-200 max-w-sm font-medium">
          Loading cloud checkpoints, synchronizing island state, and establishing real-time couple link...
        </p>
      </div>
    );
  }

  // Main Active Game View
  if (activeUniverseId && gameData) {
    const partnerMember = gameData.members.find((m) => m.userId !== user?.id);

    return (
      <div className="relative w-screen h-screen overflow-hidden bg-cosmic-darkest select-none">
        {/* Reconnecting Overlay if network dropped during session */}
        {isReconnecting && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-cosmic-darkest/80 backdrop-blur-md select-none">
            <div className="glass-panel p-6 rounded-3xl flex items-center gap-4 border border-pink-500/40 shadow-2xl">
              <Loader2 className="w-8 h-8 text-pink-400 animate-spin" />
              <div>
                <h4 className="font-black text-white text-base">Reconnecting to Sanctuary...</h4>
                <p className="text-xs text-purple-200">Preserving local checkpoint safely</p>
              </div>
            </div>
          </div>
        )}

        {/* Welcome Back Notification */}
        {showWelcomeBack && (
          <WelcomeBackModal
            universeName={gameData.universe.name}
            partnerName={partnerMember?.displayName}
            onDismiss={() => setShowWelcomeBack(false)}
          />
        )}

        {/* HUD Overlay */}
        <HUD
          onOpenQuests={() => setQuestsOpen(true)}
          onOpenWorkshop={() => setWorkshopOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenEmotes={() => setEmotesOpen(true)}
          onOpenPortal={() => setPortalOpen(true)}
          currentScene={currentScene}
        />

        {/* Phaser 3 Playable Canvas */}
        <GameCanvas
          ref={gameCanvasRef}
          onPortalPrompt={() => setPortalOpen(true)}
        />

        {/* Placement Mode Banner */}
        {placingItemType && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-auto glass-panel px-6 py-3 rounded-2xl border border-pink-500/60 shadow-2xl flex items-center gap-4 bg-cosmic-dark/95">
            <div>
              <div className="text-xs font-bold text-white">Placing: {placingItemType.replace('_', ' ')}</div>
              <div className="text-[11px] text-pink-300">Move your astronaut to desired spot, then click confirm</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleConfirmPlacement}
                className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow"
              >
                <Check className="w-4 h-4" /> Place Here
              </button>
              <button
                onClick={() => setPlacingItemType(null)}
                className="p-2 rounded-xl bg-slate-800 text-purple-300 hover:text-white text-xs font-bold"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
            </div>
          </div>
        )}

        {/* Mobile Touch Controls */}
        <MobileControls
          onMove={(vector) => gameCanvasRef.current?.setVirtualJoystick(vector)}
          onAttack={() => gameCanvasRef.current?.triggerAttack()}
          onInteract={() => setPortalOpen(true)}
          onOpenEmotes={() => setEmotesOpen(true)}
          onOpenBuildMode={() => setWorkshopOpen(true)}
        />

        {/* Modals */}
        <QuestTrackerModal
          isOpen={questsOpen}
          onClose={() => setQuestsOpen(false)}
        />

        <CustomizationModal
          isOpen={workshopOpen}
          onClose={() => setWorkshopOpen(false)}
          onSelectPlacementItem={(item) => setPlacingItemType(item)}
        />

        <EmotePickerModal
          isOpen={emotesOpen}
          onClose={() => setEmotesOpen(false)}
          playerPos={{
            x: gameData.player.lastSafeX || 400,
            y: gameData.player.lastSafeY || 350,
          }}
        />

        <SettingsModal
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onOpenInstall={() => setInstallOpen(true)}
          onExitUniverse={() => leaveUniverse()}
        />

        <PortalDialog
          isOpen={portalOpen}
          onClose={() => setPortalOpen(false)}
          currentScene={currentScene}
          onSwitchScene={handleSwitchScene}
        />

        <InstallModal
          isOpen={installOpen}
          onClose={() => setInstallOpen(false)}
        />
      </div>
    );
  }

  // Otherwise, show Landing Page
  return (
    <>
      <LandingPage
        onCreateUniverse={handleCreateUniverse}
        onJoinUniverse={handleJoinUniverse}
        onContinueAdventure={handleEnterUniverse}
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

      <CreateUniverseModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onUniverseCreated={(id) => handleEnterUniverse(id)}
      />

      <JoinUniverseModal
        isOpen={joinModalOpen}
        onClose={() => setJoinModalOpen(false)}
        onJoined={(id) => handleEnterUniverse(id)}
        initialCode={initialJoinCode}
      />

      <InstallModal
        isOpen={installOpen}
        onClose={() => setInstallOpen(false)}
      />
    </>
  );
};
