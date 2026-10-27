import React from 'react';
import { useUniverse } from '../context/UniverseContext';
import { Sparkles, Compass, X, ArrowRight, ShieldAlert } from 'lucide-react';
import confetti from 'canvas-confetti';

interface PortalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentScene: 'PlanetScene' | 'BossScene';
  onSwitchScene: (scene: 'PlanetScene' | 'BossScene') => void;
}

export const PortalDialog: React.FC<PortalDialogProps> = ({
  isOpen,
  onClose,
  currentScene,
  onSwitchScene,
}) => {
  const { gameData, unlockPortal } = useUniverse();

  if (!isOpen || !gameData) return null;

  const isUnlocked = !!gameData.state.portalUnlocked;

  const handleActivate = () => {
    unlockPortal();
    confetti({
      particleCount: 100,
      spread: 90,
      origin: { y: 0.6 },
      colors: ['#8a65d4', '#ec4899', '#38bdf8', '#ffd166'],
    });
  };

  const handleTravel = (target: 'PlanetScene' | 'BossScene') => {
    onSwitchScene(target);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-cosmic-darkest/90 backdrop-blur-md p-4 select-none animate-fadeIn">
      <div className="max-w-md w-full glass-panel rounded-3xl p-6 sm:p-8 relative border border-indigo-500/40 shadow-2xl text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-purple-300 hover:text-white p-2 rounded-full hover:bg-white/10 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center mx-auto mb-4 shadow-xl border border-pink-300/40 animate-pulse">
          <Compass className="w-8 h-8 text-white" />
        </div>

        {currentScene === 'PlanetScene' ? (
          <>
            <h3 className="text-2xl font-black text-white mb-2">Ancient Stargate Portal</h3>

            {!isUnlocked ? (
              <div className="space-y-4">
                <p className="text-xs text-purple-200 leading-relaxed">
                  The ancient celestial gateway is dormant. Awaken its starlight power to travel together to the Nebula Arena!
                </p>

                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-purple-500/30 text-xs text-amber-300 font-bold flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Cost to Awaken: FREE with Couple Synergy</span>
                </div>

                <button
                  onClick={handleActivate}
                  className="w-full cosmic-btn-primary flex items-center justify-center gap-2 font-bold shadow-lg py-3.5"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>Awaken Stargate 🌌</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-purple-200 leading-relaxed">
                  The Stargate is active! Step through the dimensional rift into the <strong>Nebula Arena</strong> to face the Starlight Golem boss together.
                </p>

                <div className="p-3 rounded-xl bg-pink-950/40 border border-pink-500/30 text-xs text-pink-200 flex items-center gap-2 text-left">
                  <ShieldAlert className="w-5 h-5 text-pink-400 flex-shrink-0" />
                  <span>Cooperate with your partner! Both players' stardust bursts damage the boss simultaneously.</span>
                </div>

                <button
                  onClick={() => handleTravel('BossScene')}
                  className="w-full cosmic-btn-primary flex items-center justify-center gap-2 font-bold shadow-lg py-3.5"
                >
                  <span>Enter Nebula Arena ⚔️</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <h3 className="text-2xl font-black text-white mb-2">Return Gateway</h3>
            <p className="text-xs text-purple-200 leading-relaxed">
              Step back through the portal to return safely to your cozy home on Lumina Island.
            </p>

            <button
              onClick={() => handleTravel('PlanetScene')}
              className="w-full cosmic-btn-primary flex items-center justify-center gap-2 font-bold shadow-lg py-3.5"
            >
              <span>Return to Lumina Island 🏡</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
