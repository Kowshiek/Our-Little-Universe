import React, { useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Heart, KeyRound, X, Loader2, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

interface JoinUniverseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoined: (universeId: string) => void;
  initialCode?: string;
}

export const JoinUniverseModal: React.FC<JoinUniverseModalProps> = ({
  isOpen,
  onClose,
  onJoined,
  initialCode = '',
}) => {
  const { refreshUserData } = useAuth();
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setError(null);
    setLoading(true);

    try {
      const res = await api.joinUniverse(code.trim());
      await refreshUserData();

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ec4899', '#8a65d4', '#ffd166', '#38bdf8'],
      });

      onClose();
      onJoined(res.universeId);
    } catch (err: any) {
      setError(err.message || 'Invalid or expired invitation code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-cosmic-darkest/90 backdrop-blur-md p-4 select-none animate-fadeIn">
      <div className="max-w-md w-full glass-panel rounded-3xl p-6 sm:p-8 relative border border-pink-500/30 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-purple-300 hover:text-white p-2 rounded-full hover:bg-white/10 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-500 to-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-lg border border-pink-300/40">
            <KeyRound className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-black text-white">Join Your Universe</h2>
          <p className="text-xs text-purple-300 mt-1">
            Enter the secret code given by your partner
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-pink-900/40 border border-pink-500/40 text-xs text-pink-200">
            {error}
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-purple-200 uppercase tracking-wider mb-1">
              Invitation Code
            </label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. LOVE-8F4A"
              className="w-full text-center font-mono tracking-widest text-lg font-bold bg-slate-900/80 border-2 border-purple-500/40 rounded-xl py-3 px-4 text-starlight placeholder-purple-400/40 focus:outline-none focus:border-pink-500 transition"
            />
          </div>

          <p className="text-xs text-purple-300/80 leading-relaxed">
            Once verified, you will immediately be added as the second heart in this universe. You can customize your astronaut and play together simultaneously in real-time.
          </p>

          <button
            type="submit"
            disabled={loading}
            className="w-full cosmic-btn-primary flex items-center justify-center gap-2 mt-4 font-bold shadow-lg py-3.5"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Validating Code...</span>
              </>
            ) : (
              <>
                <span>Enter Shared World</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
