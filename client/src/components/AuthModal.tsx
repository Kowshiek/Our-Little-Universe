import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Swords, Heart, Lock, Mail, User, X, Loader2, Shield } from 'lucide-react';
import { FighterId, FIGHTERS } from '../types/combat';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register';
  onSuccess?: () => void;
}

const AVATAR_COLORS = [
  { name: 'Neon Rose', hex: '#ff2a85' },
  { name: 'Electric Amethyst', hex: '#a855f7' },
  { name: 'Cyan Starlight', hex: '#38bdf8' },
  { name: 'Cupid Gold', hex: '#ffd166' },
  { name: 'Emerald Thorn', hex: '#10b981' },
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultMode = 'login',
  onSuccess,
}) => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedFighter, setSelectedFighter] = useState<FighterId>('heart_knight');
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0].hex);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await login({ email, password });
      } else {
        if (!displayName.trim()) {
          throw new Error('Please enter a combat name for your fighter');
        }
        await register({
          email,
          password,
          displayName: displayName.trim(),
          avatarColor: selectedColor,
          selectedFighter,
        });
      }
      onClose();
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-cosmic-darkest/90 backdrop-blur-md p-4 select-none animate-fadeIn">
      <div className="max-w-md w-full glass-panel rounded-3xl p-6 sm:p-8 relative border-2 border-pink-500/40 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-purple-300 hover:text-white p-2 rounded-full hover:bg-white/10 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-600 to-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-lg border border-pink-300/40">
            <Swords className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-black text-white font-game tracking-wide">
            {mode === 'login' ? 'Challenger Sign In' : 'Join Love Battle'}
          </h2>
          <p className="text-xs text-pink-300 mt-1 font-semibold tracking-wider uppercase">
            Two Hearts. One Arena. Endless Battles.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-slate-900/60 p-1 rounded-2xl border border-purple-500/20 mb-6">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); }}
            className={`flex-1 py-2 text-sm font-black rounded-xl transition uppercase tracking-wider ${
              mode === 'login' ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow' : 'text-purple-300 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(null); }}
            className={`flex-1 py-2 text-sm font-black rounded-xl transition uppercase tracking-wider ${
              mode === 'register' ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow' : 'text-purple-300 hover:text-white'
            }`}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-pink-900/40 border border-pink-500/40 text-xs text-pink-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-black text-purple-200 uppercase tracking-wider mb-1">
                Fighter Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 w-4 h-4 text-purple-400" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. HeartBreaker or SweetSlayer"
                  className="w-full bg-slate-900/80 border border-purple-500/30 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-purple-400/50 focus:outline-none focus:border-pink-500 transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-black text-purple-200 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-purple-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@lovebattle.com"
                className="w-full bg-slate-900/80 border border-purple-500/30 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-purple-400/50 focus:outline-none focus:border-pink-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-purple-200 uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-purple-400" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full bg-slate-900/80 border border-purple-500/30 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-purple-400/50 focus:outline-none focus:border-pink-500 transition"
              />
            </div>
          </div>

          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-black text-purple-200 uppercase tracking-wider mb-1.5">
                  Select Starting Fighter
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(FIGHTERS) as FighterId[]).map((fId) => {
                    const f = FIGHTERS[fId];
                    const isSelected = selectedFighter === fId;
                    return (
                      <button
                        key={fId}
                        type="button"
                        onClick={() => setSelectedFighter(fId)}
                        className={`p-2 rounded-xl border text-left flex items-center gap-2 transition ${
                          isSelected
                            ? 'bg-pink-600/30 border-pink-400 shadow-md shadow-pink-500/20'
                            : 'bg-slate-900/60 border-purple-500/20 hover:border-purple-400/40'
                        }`}
                      >
                        <div
                          style={{ backgroundColor: f.color }}
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow"
                        />
                        <div className="truncate">
                          <div className="text-xs font-black text-white truncate">{f.name}</div>
                          <div className="text-[10px] text-pink-300 truncate">{f.title}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-purple-200 uppercase tracking-wider mb-1.5">
                  Aura Accent Color
                </label>
                <div className="flex items-center justify-between gap-2">
                  {AVATAR_COLORS.map((col) => (
                    <button
                      key={col.hex}
                      type="button"
                      onClick={() => setSelectedColor(col.hex)}
                      style={{ backgroundColor: col.hex }}
                      title={col.name}
                      className={`w-8 h-8 rounded-full transition transform hover:scale-110 flex items-center justify-center ${
                        selectedColor === col.hex ? 'ring-4 ring-white shadow-lg scale-110' : 'opacity-70'
                      }`}
                    >
                      {selectedColor === col.hex && <Sparkles className="w-3.5 h-3.5 text-white drop-shadow" />}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 mt-4 shadow-lg shadow-pink-500/30 transition transform active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Entering Arena...</span>
              </>
            ) : mode === 'login' ? (
              <span>Sign In & Battle</span>
            ) : (
              <span>Create Fighter Account</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
