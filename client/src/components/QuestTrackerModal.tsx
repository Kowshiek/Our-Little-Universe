import React from 'react';
import { useUniverse } from '../context/UniverseContext';
import { Sparkles, Trophy, CheckCircle, Clock, Gift, X, Star } from 'lucide-react';
import confetti from 'canvas-confetti';

interface QuestTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuestTrackerModal: React.FC<QuestTrackerModalProps> = ({ isOpen, onClose }) => {
  const { gameData, claimReward } = useUniverse();

  if (!isOpen || !gameData) return null;

  const handleClaim = async (missionKey: string) => {
    const success = await claimReward(missionKey);
    if (success) {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#ffd166', '#ec4899', '#8a65d4', '#38bdf8'],
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-cosmic-darkest/90 backdrop-blur-md p-4 select-none animate-fadeIn">
      <div className="max-w-lg w-full glass-panel rounded-3xl p-6 sm:p-8 relative border border-pink-500/30 shadow-2xl max-h-[85vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-purple-300 hover:text-white p-2 rounded-full hover:bg-white/10 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-pink-500 flex items-center justify-center shadow-lg border border-amber-300/40">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Couple Missions</h2>
            <p className="text-xs text-purple-300">Cooperative goals for two hearts</p>
          </div>
        </div>

        <div className="overflow-y-auto space-y-3.5 pr-1 flex-1">
          {gameData.missions.map((mission) => {
            const isCompleted = mission.status === 'completed' || mission.progressCount >= mission.requiredCount;
            const isClaimed = mission.status === 'claimed';

            return (
              <div
                key={mission.missionKey}
                className={`p-4 rounded-2xl border transition ${
                  isClaimed
                    ? 'bg-purple-950/20 border-purple-800/30 opacity-70'
                    : isCompleted
                    ? 'bg-pink-950/30 border-pink-500/50 shadow-md'
                    : 'bg-slate-900/60 border-purple-500/20'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {mission.missionKey === 'tutorial_stars' ? '⭐' :
                       mission.missionKey === 'explore_island' ? '🗺️' :
                       mission.missionKey === 'unlock_portal' ? '🌀' : '👑'}
                    </span>
                    <h3 className="font-bold text-sm text-white">{mission.title}</h3>
                  </div>

                  {isClaimed ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      <CheckCircle className="w-3 h-3" /> Completed
                    </span>
                  ) : isCompleted ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-500/40 animate-pulse">
                      <Gift className="w-3 h-3" /> Ready to Claim!
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-purple-300 bg-purple-950/50 px-2 py-0.5 rounded-full">
                      <Clock className="w-3 h-3" /> In Progress
                    </span>
                  )}
                </div>

                <p className="text-xs text-purple-200/90 mb-3 leading-relaxed">
                  {mission.description}
                </p>

                {/* Progress bar */}
                <div className="w-full bg-slate-950/60 rounded-full h-2 mb-3 overflow-hidden border border-purple-500/10">
                  <div
                    style={{ width: `${Math.min(100, (mission.progressCount / mission.requiredCount) * 100)}%` }}
                    className="h-full bg-gradient-to-r from-pink-500 to-amber-400 transition-all duration-500"
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <div className="flex items-center gap-2 text-purple-300">
                    <span>Reward:</span>
                    <span className="font-bold text-starlight flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-starlight" /> +{mission.rewardAmount} {mission.rewardType}
                    </span>
                    {mission.rewardItem && (
                      <span className="text-pink-300 font-medium">
                        + {mission.rewardItem.replace('_', ' ')}
                      </span>
                    )}
                  </div>

                  {isCompleted && !isClaimed && (
                    <button
                      onClick={() => handleClaim(mission.missionKey)}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-amber-500 hover:from-pink-400 hover:to-amber-400 text-white font-bold text-xs shadow-md transition transform hover:scale-105 active:scale-95"
                    >
                      Claim Reward 🎁
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
