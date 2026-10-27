import React from 'react';
import { useBattle } from '../context/BattleContext';
import { useAuth } from '../context/AuthContext';
import { Trophy, RefreshCw, LogOut, Flame, Heart, Crown } from 'lucide-react';

interface MatchResultsModalProps {
  isOpen: boolean;
  onReturnToLobby: () => void;
}

export const MatchResultsModal: React.FC<MatchResultsModalProps> = ({
  isOpen,
  onReturnToLobby,
}) => {
  const { user } = useAuth();
  const { match, matchWinner, rematchVotes, voteRematch, isTrainingMode, exitTrainingMode } = useBattle();

  if (!isOpen || !match) return null;

  const isWinner = matchWinner === user?.id;
  const isDraw = matchWinner === null && !isTrainingMode;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-cosmic-darkest/95 backdrop-blur-xl p-4 select-none animate-fadeIn">
      <div className="max-w-md w-full glass-panel rounded-3xl p-6 sm:p-8 relative border-2 border-pink-500/50 shadow-2xl text-center">
        {/* Glow backdrop */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-pink-600/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-600/30 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-400 flex items-center justify-center mb-4 shadow-xl border-2 border-white/40">
            {isWinner ? (
              <Crown className="w-10 h-10 text-white fill-white animate-bounce" />
            ) : (
              <Flame className="w-10 h-10 text-white fill-white" />
            )}
          </div>

          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-1">
            {isTrainingMode ? 'TRAINING COMPLETE' : isWinner ? 'VICTORY! ❤️🔥' : isDraw ? 'DRAW MATCH' : 'DEFEAT'}
          </h2>

          <p className="text-xs text-pink-300 font-bold uppercase tracking-widest mb-6">
            {isWinner ? 'True Love Conquers All' : 'The Bond Remains Unbroken'}
          </p>

          {/* Score Box */}
          <div className="w-full p-4 rounded-2xl bg-slate-900/80 border border-purple-500/30 mb-6 flex items-center justify-around">
            <div>
              <span className="text-xs text-purple-300 font-bold block mb-1">You</span>
              <span className="text-3xl font-black text-white">{match.p1?.roundWins || 0}</span>
            </div>
            <div className="text-xl font-bold text-pink-400">VS</div>
            <div>
              <span className="text-xs text-purple-300 font-bold block mb-1">Partner</span>
              <span className="text-3xl font-black text-white">{match.p2?.roundWins || 0}</span>
            </div>
          </div>

          {/* Reward Notification */}
          {!isTrainingMode && (
            <div className="w-full p-3 rounded-2xl bg-purple-950/40 border border-purple-400/30 text-xs text-purple-200 mb-6 flex items-center justify-center gap-2">
              <Trophy className="w-4 h-4 text-starlight" />
              <span>Earned <strong>{isWinner ? '+150 EXP' : '+60 EXP'}</strong> & Title Progression</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="w-full space-y-3">
            {!isTrainingMode && (
              <button
                onClick={voteRematch}
                className="w-full cosmic-btn-primary flex items-center justify-center gap-2 text-base font-black py-3.5 shadow-xl"
              >
                <RefreshCw className="w-5 h-5" />
                <span>Rematch Vote ({rematchVotes} / 2)</span>
              </button>
            )}

            <button
              onClick={() => {
                if (isTrainingMode) {
                  exitTrainingMode();
                } else {
                  onReturnToLobby();
                }
              }}
              className="w-full py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-purple-500/30 text-purple-200 hover:text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              <span>Return to Lobby</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
