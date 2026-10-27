import React, { useState, useEffect } from 'react';
import { useBattle } from '../context/BattleContext';
import { KeyRound, X, Swords, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

interface JoinBattleModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCode?: string;
}

export const JoinBattleModal: React.FC<JoinBattleModalProps> = ({
  isOpen,
  onClose,
  initialCode = '',
}) => {
  const { joinPrivateRoom, currentRoomId, error, clearError } = useBattle();
  const [code, setCode] = useState(initialCode);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (initialCode) {
      setCode(initialCode.toUpperCase());
    }
  }, [initialCode]);

  useEffect(() => {
    // If successfully joined a room, close modal
    if (currentRoomId && isOpen) {
      setSubmitting(false);
      onClose();
    }
  }, [currentRoomId, isOpen, onClose]);

  useEffect(() => {
    if (error) {
      setSubmitting(false);
    }
  }, [error]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (!clean) {
      setLocalError('Please enter a secret battle code');
      return;
    }

    setLocalError(null);
    clearError();
    setSubmitting(true);
    joinPrivateRoom(clean);
  };

  const displayError = localError || error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-cosmic-darkest/90 backdrop-blur-md p-4 select-none animate-fadeIn">
      <div className="max-w-md w-full glass-panel rounded-3xl p-6 sm:p-8 relative border-2 border-pink-500/40 shadow-2xl">
        <button
          onClick={() => {
            clearError();
            onClose();
          }}
          className="absolute top-4 right-4 text-purple-300 hover:text-white p-2 rounded-full hover:bg-white/10 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-600 to-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-lg border border-pink-300/40 animate-pulse">
            <Swords className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-black text-white font-game tracking-wide">Enter The Arena</h2>
          <p className="text-xs text-pink-300 mt-1 font-medium">
            Enter the secret battle code shared by your partner
          </p>
        </div>

        {displayError && (
          <div className="mb-4 p-3.5 rounded-2xl bg-pink-950/60 border border-pink-500/50 text-xs text-pink-200 flex items-center gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 text-pink-400 shrink-0" />
            <span>{displayError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-black text-purple-200 uppercase tracking-widest mb-1.5">
              Secret Battle Code
            </label>
            <div className="relative">
              <input
                type="text"
                autoFocus
                required
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setLocalError(null);
                  if (error) clearError();
                }}
                placeholder="e.g. LOVE-8F4A"
                className="w-full text-center font-mono tracking-widest text-xl font-black bg-slate-900/90 border-2 border-purple-500/50 rounded-2xl py-3.5 px-4 text-starlight placeholder-purple-500/40 focus:outline-none focus:border-pink-500 transition shadow-inner"
              />
              <KeyRound className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400/50 pointer-events-none" />
            </div>
          </div>

          <p className="text-[11px] text-purple-300/80 leading-relaxed text-center">
            Once connected, you will join your partner's 1v1 battle lobby in real-time. Pick your fighter and fight for love!
          </p>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-pink-500/30 transition transform active:scale-95 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Connecting To Arena...</span>
              </>
            ) : (
              <>
                <span>Join Battle Room</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
