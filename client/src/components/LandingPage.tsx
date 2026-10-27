import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  Heart,
  KeyRound,
  Play,
  Download,
  Smartphone,
  ShieldCheck,
  Cloud,
  Gamepad2,
  Users,
} from 'lucide-react';

interface LandingPageProps {
  onCreateUniverse: () => void;
  onJoinUniverse: () => void;
  onContinueAdventure: (universeId: string) => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onOpenInstall: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onCreateUniverse,
  onJoinUniverse,
  onContinueAdventure,
  onOpenAuth,
  onOpenInstall,
}) => {
  const { user, universes } = useAuth();
  const latestUniverse = universes.length > 0 ? universes[0] : null;

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-between overflow-x-hidden cosmic-stars text-slate-100 p-4 sm:p-6 md:p-10 select-none">
      {/* Background celestial gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/3 w-[350px] h-[350px] bg-pink-500/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Navbar */}
      <header className="w-full max-w-6xl flex items-center justify-between relative z-10 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-indigo-600 flex items-center justify-center shadow-lg border border-pink-300/40">
            <Heart className="w-6 h-6 text-white fill-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-wide text-white font-game">
              Our Little Universe
            </h1>
            <p className="text-[10px] text-pink-300 font-semibold tracking-wider uppercase">
              Two Hearts. One Universe.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenInstall}
            className="px-3.5 py-2 rounded-2xl bg-slate-900/60 border border-purple-500/30 hover:border-pink-500 text-purple-200 hover:text-white text-xs font-bold transition flex items-center gap-1.5 shadow"
          >
            <Smartphone className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Install App</span>
          </button>

          {user ? (
            <div className="flex items-center gap-2 bg-slate-900/60 px-3.5 py-1.5 rounded-2xl border border-purple-500/30">
              <div
                style={{ backgroundColor: user.avatarColor }}
                className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold"
              >
                {user.displayName.slice(0, 1)}
              </div>
              <span className="text-xs font-bold text-white hidden sm:inline">{user.displayName}</span>
            </div>
          ) : (
            <button
              onClick={() => onOpenAuth('login')}
              className="px-4 py-2 rounded-2xl bg-slate-900/80 border border-pink-500/40 hover:bg-pink-950/40 text-pink-200 hover:text-white text-xs font-bold transition shadow"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="w-full max-w-4xl flex flex-col items-center text-center my-auto py-10 relative z-10">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-300 text-xs font-bold mb-6 backdrop-blur-md animate-pulse">
          <Sparkles className="w-3.5 h-3.5 text-starlight" />
          <span>Full-Stack Online Multiplayer Game for Couples</span>
        </div>

        <h2 className="text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tight leading-tight mb-4 drop-shadow-md">
          Explore a Private Cosmos <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-pink-400 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
            Hand in Hand.
          </span>
        </h2>

        <p className="max-w-2xl text-purple-200 text-base sm:text-lg leading-relaxed mb-10 font-medium">
          A cozy virtual home, a customizable cosmic planet, magical star collection,
          cooperative quests, and celestial boss fights designed exclusively for you and your partner.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md justify-center mb-12">
          {user && latestUniverse ? (
            <button
              onClick={() => onContinueAdventure(latestUniverse.id)}
              className="w-full cosmic-btn-primary flex items-center justify-center gap-2.5 text-base font-black py-4 shadow-xl"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>Continue Adventure ({latestUniverse.name})</span>
            </button>
          ) : (
            <>
              <button
                onClick={onCreateUniverse}
                className="w-full sm:w-auto flex-1 cosmic-btn-primary flex items-center justify-center gap-2 text-sm sm:text-base font-black py-3.5 shadow-xl"
              >
                <Sparkles className="w-5 h-5" />
                <span>Create Our Universe</span>
              </button>

              <button
                onClick={onJoinUniverse}
                className="w-full sm:w-auto flex-1 cosmic-btn-secondary flex items-center justify-center gap-2 text-sm sm:text-base font-black py-3.5 shadow-lg"
              >
                <KeyRound className="w-5 h-5 text-pink-400" />
                <span>Join Your Universe</span>
              </button>
            </>
          )}
        </div>

        {/* Core Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full text-left">
          <div className="p-4 rounded-2xl glass-panel-subtle border border-purple-500/20 hover:border-pink-500/40 transition">
            <Users className="w-6 h-6 text-pink-400 mb-2" />
            <h3 className="font-bold text-sm text-white mb-1">Private Sanctuary</h3>
            <p className="text-xs text-purple-300/90 leading-relaxed">
              Strict couple-only access. Protected by cryptographically secure invitation codes.
            </p>
          </div>

          <div className="p-4 rounded-2xl glass-panel-subtle border border-purple-500/20 hover:border-pink-500/40 transition">
            <Cloud className="w-6 h-6 text-cyan-400 mb-2" />
            <h3 className="font-bold text-sm text-white mb-1">Cloud Auto-Save</h3>
            <p className="text-xs text-purple-300/90 leading-relaxed">
              Every star, mission, and placed tree is automatically saved. Resume seamlessly upon reconnecting.
            </p>
          </div>

          <div className="p-4 rounded-2xl glass-panel-subtle border border-purple-500/20 hover:border-pink-500/40 transition">
            <Gamepad2 className="w-6 h-6 text-amber-300 mb-2" />
            <h3 className="font-bold text-sm text-white mb-1">Real-Time Co-Op</h3>
            <p className="text-xs text-purple-300/90 leading-relaxed">
              Synchronized movements, interactive cottage, starlight emotes, and shared boss battles.
            </p>
          </div>

          <div className="p-4 rounded-2xl glass-panel-subtle border border-purple-500/20 hover:border-pink-500/40 transition">
            <Smartphone className="w-6 h-6 text-emerald-400 mb-2" />
            <h3 className="font-bold text-sm text-white mb-1">Installable PWA</h3>
            <p className="text-xs text-purple-300/90 leading-relaxed">
              Play on Android or iPhone like a native app with responsive touch joystick controls.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl flex flex-col sm:flex-row items-center justify-between text-xs text-purple-400 pt-6 border-t border-purple-900/30 gap-2 relative z-10">
        <p>© 2026 Our Little Universe 🌌 • Two Hearts. One Universe.</p>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Strict Online-Only Integrity</span>
          </span>
        </div>
      </footer>
    </div>
  );
};
