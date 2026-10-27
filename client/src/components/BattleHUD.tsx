import React from 'react';
import { FighterId, FIGHTERS } from '../types/combat';
import { Heart, Sparkles, Shield, Flame } from 'lucide-react';

interface BattleHUDProps {
  p1Name: string;
  p1Fighter: FighterId;
  p1Health: number;
  p1Energy: number;
  p1Wins: number;
  p2Name: string;
  p2Fighter: FighterId;
  p2Health: number;
  p2Energy: number;
  p2Wins: number;
  roundNumber: number;
  timerRemaining: number;
  status: string;
  isTrainingMode?: boolean;
}

export const BattleHUD: React.FC<BattleHUDProps> = ({
  p1Name,
  p1Fighter,
  p1Health,
  p1Energy,
  p1Wins,
  p2Name,
  p2Fighter,
  p2Health,
  p2Energy,
  p2Wins,
  roundNumber,
  timerRemaining,
  status,
  isTrainingMode,
}) => {
  const p1Stats = FIGHTERS[p1Fighter] || FIGHTERS.heart_knight;
  const p2Stats = FIGHTERS[p2Fighter] || FIGHTERS.cupid_spark;

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-20 flex flex-col justify-between p-3 sm:p-5 pt-[calc(env(safe-area-inset-top,12px)+8px)]">
      {/* Top Arcade Fighter Header */}
      <div className="flex items-start justify-between w-full max-w-4xl mx-auto gap-2 sm:gap-4">
        {/* Player 1 Health & Name (Left) */}
        <div className="flex-1 flex flex-col items-start">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-black text-xs sm:text-sm text-white tracking-wider uppercase drop-shadow">
              {p1Name}
            </span>
            <span className="text-[10px] text-pink-300 font-bold bg-pink-950/60 px-1.5 py-0.5 rounded border border-pink-500/30">
              {p1Stats.name}
            </span>
            {/* Round Win Hearts */}
            <div className="flex items-center gap-1 ml-1">
              <Heart className={`w-3.5 h-3.5 ${p1Wins >= 1 ? 'text-pink-500 fill-pink-500 animate-pulse' : 'text-slate-700'}`} />
              <Heart className={`w-3.5 h-3.5 ${p1Wins >= 2 ? 'text-pink-500 fill-pink-500 animate-pulse' : 'text-slate-700'}`} />
            </div>
          </div>

          {/* Health Bar (Depletes right-to-left) */}
          <div className="w-full bg-slate-950/90 h-5 sm:h-6 rounded-l-md rounded-r-xl border-2 border-purple-400/40 overflow-hidden shadow-2xl relative p-0.5">
            <div
              style={{ width: `${Math.max(0, p1Health)}%` }}
              className="h-full bg-gradient-to-r from-rose-600 via-pink-500 to-amber-300 rounded-sm transition-all duration-150"
            />
            <span className="absolute right-2 top-0.5 text-[10px] font-black text-white drop-shadow">
              {Math.max(0, p1Health)} HP
            </span>
          </div>

          {/* Heart Energy Meter */}
          <div className="w-3/4 mt-1 bg-slate-950/80 h-2 sm:h-2.5 rounded-full border border-pink-500/30 overflow-hidden relative">
            <div
              style={{ width: `${p1Energy}%` }}
              className={`h-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 transition-all ${
                p1Energy >= 100 ? 'animate-pulse' : ''
              }`}
            />
          </div>
          {p1Energy >= 100 && (
            <span className="text-[9px] font-black tracking-widest text-pink-300 animate-bounce mt-0.5 flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-starlight" /> SPECIAL READY (L)
            </span>
          )}
        </div>

        {/* Center Round Timer & Round Name */}
        <div className="flex flex-col items-center justify-center flex-shrink-0 px-2 sm:px-4">
          <div className="w-14 sm:w-16 h-14 sm:h-16 rounded-2xl bg-gradient-to-b from-purple-900 to-slate-950 border-2 border-pink-500/60 shadow-xl flex items-center justify-center">
            <span className="font-mono text-2xl sm:text-3xl font-black text-starlight drop-shadow">
              {isTrainingMode ? '∞' : timerRemaining}
            </span>
          </div>
          <span className="text-[10px] sm:text-xs font-black tracking-widest text-pink-300 uppercase mt-1 drop-shadow">
            {isTrainingMode ? 'DOJO' : `ROUND ${roundNumber}`}
          </span>
        </div>

        {/* Player 2 Health & Name (Right) */}
        <div className="flex-1 flex flex-col items-end">
          <div className="flex items-center gap-2 mb-1">
            {/* Round Win Hearts */}
            <div className="flex items-center gap-1 mr-1">
              <Heart className={`w-3.5 h-3.5 ${p2Wins >= 2 ? 'text-pink-500 fill-pink-500 animate-pulse' : 'text-slate-700'}`} />
              <Heart className={`w-3.5 h-3.5 ${p2Wins >= 1 ? 'text-pink-500 fill-pink-500 animate-pulse' : 'text-slate-700'}`} />
            </div>
            <span className="text-[10px] text-cyan-300 font-bold bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/30">
              {p2Stats.name}
            </span>
            <span className="font-black text-xs sm:text-sm text-white tracking-wider uppercase drop-shadow">
              {p2Name}
            </span>
          </div>

          {/* Health Bar (Depletes left-to-right) */}
          <div className="w-full bg-slate-950/90 h-5 sm:h-6 rounded-r-md rounded-l-xl border-2 border-purple-400/40 overflow-hidden shadow-2xl relative p-0.5 flex justify-end">
            <div
              style={{ width: `${Math.max(0, p2Health)}%` }}
              className="h-full bg-gradient-to-l from-rose-600 via-pink-500 to-amber-300 rounded-sm transition-all duration-150"
            />
            <span className="absolute left-2 top-0.5 text-[10px] font-black text-white drop-shadow">
              {Math.max(0, p2Health)} HP
            </span>
          </div>

          {/* Heart Energy Meter */}
          <div className="w-3/4 mt-1 bg-slate-950/80 h-2 sm:h-2.5 rounded-full border border-cyan-500/30 overflow-hidden relative flex justify-end">
            <div
              style={{ width: `${p2Energy}%` }}
              className="h-full bg-gradient-to-l from-cyan-400 to-purple-500 transition-all"
            />
          </div>
          {p2Energy >= 100 && (
            <span className="text-[9px] font-black tracking-widest text-cyan-300 animate-bounce mt-0.5">
              SPECIAL CHARGED
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
