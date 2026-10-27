import React from 'react';
import { useUniverse } from '../context/UniverseContext';
import { useAuth } from '../context/AuthContext';
import {
  Heart,
  Star,
  Gem,
  Trophy,
  Hammer,
  Settings,
  Smile,
  Cloud,
  CloudUpload,
  AlertCircle,
  Users,
  Compass,
} from 'lucide-react';

interface HUDProps {
  onOpenQuests: () => void;
  onOpenWorkshop: () => void;
  onOpenSettings: () => void;
  onOpenEmotes: () => void;
  onOpenPortal: () => void;
  currentScene: 'PlanetScene' | 'BossScene';
}

export const HUD: React.FC<HUDProps> = ({
  onOpenQuests,
  onOpenWorkshop,
  onOpenSettings,
  onOpenEmotes,
  onOpenPortal,
  currentScene,
}) => {
  const { gameData, partner, partnerOnline, saveStatus } = useUniverse();
  const { user } = useAuth();

  if (!gameData) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-20 select-none flex flex-col justify-between p-3 sm:p-4 pt-[calc(env(safe-area-inset-top,12px)+12px)]">
      {/* Top Header Row */}
      <div className="flex items-start justify-between w-full gap-2">
        {/* Left: Player Profile & Health/Energy */}
        <div className="pointer-events-auto flex items-center gap-2.5 glass-panel rounded-2xl p-2 sm:p-2.5 border border-pink-500/20 shadow-lg">
          {/* Avatar Icon */}
          <div
            style={{ backgroundColor: user?.avatarColor || '#ec4899' }}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow border border-white/40"
          >
            {user?.displayName.slice(0, 2).toUpperCase() || 'ME'}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xs text-white tracking-wide">
                {user?.displayName}
              </span>
              <span className="text-[10px] text-pink-300 font-semibold">
                {currentScene === 'PlanetScene' ? 'Lumina Island' : 'Nebula Arena'}
              </span>
            </div>

            {/* Health Bar */}
            <div className="w-24 sm:w-28 bg-slate-950/80 rounded-full h-2 overflow-hidden border border-rose-500/30">
              <div
                style={{ width: `${gameData.player.health}%` }}
                className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full"
              />
            </div>
          </div>
        </div>

        {/* Center: Shared Cosmic Currency & Cloud Sync */}
        <div className="pointer-events-auto flex items-center gap-2 glass-panel rounded-2xl px-3 py-1.5 border border-purple-500/20 shadow-lg">
          {/* Stars */}
          <div className="flex items-center gap-1.5">
            <Star className="w-4 h-4 text-amber-300 fill-amber-300 animate-pulse" />
            <span className="font-black text-xs sm:text-sm text-starlight">
              {gameData.state.sharedStars}
            </span>
          </div>

          <div className="w-px h-4 bg-purple-500/30 mx-0.5" />

          {/* Crystals */}
          <div className="flex items-center gap-1.5">
            <Gem className="w-3.5 h-3.5 text-cyan-300 fill-cyan-300" />
            <span className="font-black text-xs sm:text-sm text-cyan-200">
              {gameData.state.sharedCrystals}
            </span>
          </div>

          <div className="w-px h-4 bg-purple-500/30 mx-0.5" />

          {/* Cloud Save Sync Status */}
          <div
            title={`Cloud Save: ${saveStatus}`}
            className="flex items-center gap-1 text-[11px] text-purple-300 font-semibold"
          >
            {saveStatus === 'saving' || saveStatus === 'syncing' ? (
              <span className="flex items-center gap-1 text-amber-300">
                <CloudUpload className="w-3.5 h-3.5 animate-bounce" />
                <span className="hidden md:inline">Syncing...</span>
              </span>
            ) : saveStatus === 'error' ? (
              <span className="flex items-center gap-1 text-rose-400">
                <AlertCircle className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Saved locally</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-400">
                <Cloud className="w-3.5 h-3.5 fill-emerald-400/20" />
                <span className="hidden md:inline">Cloud Saved</span>
              </span>
            )}
          </div>
        </div>

        {/* Right: Partner Presence & Action Menu */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Partner status badge */}
          {partner && (
            <div className="glass-panel rounded-2xl p-2 border border-purple-500/20 shadow-lg flex items-center gap-2">
              <div
                style={{ backgroundColor: partner.avatarColor }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow"
              >
                {partner.displayName.slice(0, 1).toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <div className="text-[11px] font-bold text-white truncate max-w-[80px]">
                  {partner.displayName}
                </div>
                <div className="flex items-center gap-1 text-[9px]">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      partnerOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                    }`}
                  />
                  <span className={partnerOnline ? 'text-emerald-300' : 'text-slate-400'}>
                    {partnerOnline ? 'Together' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Quick HUD Buttons */}
          <div className="glass-panel rounded-2xl p-1.5 border border-purple-500/20 shadow-lg flex items-center gap-1">
            <button
              onClick={onOpenQuests}
              className="p-2 rounded-xl text-purple-200 hover:text-white hover:bg-white/10 transition relative"
              title="Couple Missions"
            >
              <Trophy className="w-5 h-5 text-amber-300" />
            </button>

            <button
              onClick={onOpenWorkshop}
              className="p-2 rounded-xl text-purple-200 hover:text-white hover:bg-white/10 transition"
              title="Planet Workshop"
            >
              <Hammer className="w-5 h-5 text-pink-400" />
            </button>

            <button
              onClick={onOpenPortal}
              className="p-2 rounded-xl text-purple-200 hover:text-white hover:bg-white/10 transition"
              title="Stargate Gateway"
            >
              <Compass className="w-5 h-5 text-cyan-300" />
            </button>

            <button
              onClick={onOpenSettings}
              className="p-2 rounded-xl text-purple-200 hover:text-white hover:bg-white/10 transition"
              title="Settings"
            >
              <Settings className="w-5 h-5 text-purple-300" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
