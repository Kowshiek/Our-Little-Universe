import React from 'react';
import { useAuth } from '../context/AuthContext';
import { FIGHTERS } from '../types/combat';
import {
  Swords,
  Heart,
  KeyRound,
  Play,
  Smartphone,
  Shield,
  Zap,
  BookOpen,
  Trophy,
  Sparkles,
  LogOut,
  Flame,
} from 'lucide-react';

interface LandingPageProps {
  onCreateBattle: () => void;
  onJoinBattle: () => void;
  onStartTraining: () => void;
  onOpenRoster: () => void;
  onOpenHowToPlay: () => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onOpenInstall: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onCreateBattle,
  onJoinBattle,
  onStartTraining,
  onOpenRoster,
  onOpenHowToPlay,
  onOpenAuth,
  onOpenInstall,
}) => {
  const { user, logout } = useAuth();
  const fighter = user?.selectedFighter ? FIGHTERS[user.selectedFighter] : FIGHTERS.heart_knight;

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-between overflow-x-hidden cosmic-stars text-slate-100 p-4 sm:p-6 md:p-10 select-none">
      {/* Background celestial & neon combat gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-600/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-rose-500/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Navbar */}
      <header className="w-full max-w-6xl flex items-center justify-between relative z-10 py-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-600 to-indigo-600 flex items-center justify-center shadow-lg border border-pink-300/40">
            <Swords className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-wide text-white font-game">
                LOVE BATTLE
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-pink-500/20 border border-pink-500/40 text-[10px] font-black text-pink-300 uppercase tracking-widest hidden sm:inline">
                PvP
              </span>
            </div>
            <p className="text-[10px] text-pink-300 font-bold tracking-widest uppercase">
              Fight For Love • Two Hearts. One Arena.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenHowToPlay}
            className="px-3.5 py-2 rounded-2xl bg-slate-900/70 border border-purple-500/30 hover:border-pink-500/50 text-purple-200 hover:text-white text-xs font-bold transition flex items-center gap-1.5 shadow"
          >
            <BookOpen className="w-4 h-4 text-pink-400" />
            <span className="hidden sm:inline">How to Play</span>
          </button>

          <button
            onClick={onOpenInstall}
            className="px-3.5 py-2 rounded-2xl bg-slate-900/70 border border-purple-500/30 hover:border-pink-500/50 text-purple-200 hover:text-white text-xs font-bold transition flex items-center gap-1.5 shadow"
          >
            <Smartphone className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Install PWA</span>
          </button>

          {user ? (
            <div className="flex items-center gap-2 bg-slate-900/80 px-3.5 py-1.5 rounded-2xl border border-pink-500/30 shadow">
              <div
                style={{ backgroundColor: user.avatarColor || fighter.color }}
                className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs font-black shadow"
              >
                {user.displayName.slice(0, 1)}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-black text-white leading-none">{user.displayName}</div>
                <div className="text-[10px] text-pink-300 font-bold leading-tight">
                  Lv.{user.level || 1} • {user.wins || 0}W / {user.losses || 0}L
                </div>
              </div>
              <button
                onClick={logout}
                className="p-1.5 text-purple-400 hover:text-rose-400 rounded-lg hover:bg-white/5 transition ml-1"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => onOpenAuth('login')}
              className="px-4 py-2 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-black uppercase tracking-wider transition shadow-lg shadow-pink-500/20 hover:brightness-110 active:scale-95"
            >
              Fighter Sign In
            </button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="w-full max-w-4xl flex flex-col items-center text-center my-auto py-8 relative z-10">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-300 text-xs font-black mb-6 backdrop-blur-md animate-pulse">
          <Flame className="w-4 h-4 text-rose-400 fill-rose-400" />
          <span>Real-Time Online Multiplayer 1v1 Fighting Game for Couples</span>
        </div>

        <h2 className="text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tight leading-tight mb-4 drop-shadow-lg">
          FIGHT FOR YOUR <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-pink-400 via-rose-300 to-purple-400 bg-clip-text text-transparent font-game">
            HEART & GLORY.
          </span>
        </h2>

        <p className="text-base sm:text-lg text-purple-200/90 max-w-2xl font-medium mb-8 leading-relaxed">
          Step into a private combat arena built for two. Pick your romantic fighter, execute lightning-fast combos, clash ultimate specials, and settle every couple debate with pure skill.
        </p>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md sm:max-w-none justify-center mb-8">
          <button
            onClick={onCreateBattle}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-black text-base uppercase tracking-wider flex items-center justify-center gap-3 shadow-xl shadow-pink-500/30 hover:shadow-pink-500/50 transition transform hover:-translate-y-0.5 active:scale-95"
          >
            <Swords className="w-5 h-5" />
            <span>Create Private Battle</span>
          </button>

          <button
            onClick={onJoinBattle}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-900/90 border-2 border-pink-500/50 hover:border-pink-400 text-white font-black text-base uppercase tracking-wider flex items-center justify-center gap-3 shadow-xl hover:bg-pink-950/30 transition transform hover:-translate-y-0.5 active:scale-95"
          >
            <KeyRound className="w-5 h-5 text-pink-400" />
            <span>Join With Code</span>
          </button>

          <button
            onClick={onStartTraining}
            className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-slate-900/70 border border-purple-500/40 hover:border-purple-400 text-purple-200 hover:text-white font-black text-base uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition transform hover:-translate-y-0.5 active:scale-95"
          >
            <Play className="w-5 h-5 text-emerald-400" />
            <span>Training Dojo</span>
          </button>
        </div>

        {/* Secondary Buttons: Roster & How to Play */}
        <div className="flex items-center gap-4">
          <button
            onClick={onOpenRoster}
            className="text-xs font-bold text-pink-300 hover:text-white flex items-center gap-1.5 transition underline-offset-4 hover:underline"
          >
            <Shield className="w-4 h-4 text-pink-400" />
            <span>View 4 Fighters Roster</span>
          </button>
          <span className="text-purple-500">•</span>
          <button
            onClick={onOpenHowToPlay}
            className="text-xs font-bold text-purple-300 hover:text-white flex items-center gap-1.5 transition underline-offset-4 hover:underline"
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Combos & Heart Clash Guide</span>
          </button>
        </div>
      </main>

      {/* Feature Highlights Grid */}
      <footer className="w-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 relative z-10 mt-6">
        <div className="glass-panel p-4 rounded-2xl border border-pink-500/20 text-left">
          <div className="w-8 h-8 rounded-xl bg-pink-500/20 flex items-center justify-center mb-2.5">
            <Swords className="w-4 h-4 text-pink-400" />
          </div>
          <h4 className="text-sm font-black text-white font-game mb-1">Authoritative Combat</h4>
          <p className="text-xs text-purple-200/80">
            60 FPS server-validated hits, blocking, dodges, and best-of-3 rounds.
          </p>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-purple-500/20 text-left">
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center mb-2.5">
            <Flame className="w-4 h-4 text-purple-400" />
          </div>
          <h4 className="text-sm font-black text-white font-game mb-1">Heart Clash System</h4>
          <p className="text-xs text-purple-200/80">
            Simultaneous specials trigger dramatic shockwaves and screen freezes.
          </p>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-indigo-500/20 text-left">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-2.5">
            <KeyRound className="w-4 h-4 text-indigo-400" />
          </div>
          <h4 className="text-sm font-black text-white font-game mb-1">Secret Code Rooms</h4>
          <p className="text-xs text-purple-200/80">
            One-click invite links or 6-digit codes for strictly 2-player private lobbies.
          </p>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-emerald-500/20 text-left">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-2.5">
            <Trophy className="w-4 h-4 text-emerald-400" />
          </div>
          <h4 className="text-sm font-black text-white font-game mb-1">Progression & Ranks</h4>
          <p className="text-xs text-purple-200/80">
            Earn EXP, level up your fighters, and unlock romantic battle titles.
          </p>
        </div>
      </footer>
    </div>
  );
};
