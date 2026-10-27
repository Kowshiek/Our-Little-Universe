import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Heart, Lock, Mail, User, X, Loader2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register';
  onSuccess?: () => void;
}

const AVATAR_COLORS = [
  { name: 'Starlight Pink', hex: '#ec4899' },
  { name: 'Cosmic Lavender', hex: '#8a65d4' },
  { name: 'Celestial Cyan', hex: '#38bdf8' },
  { name: 'Star Gold', hex: '#ffd166' },
  { name: 'Nebula Emerald', hex: '#34d399' },
  { name: 'Midnight Violet', hex: '#a855f7' },
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
          throw new Error('Please enter a display name for your explorer');
        }
        await register({
          email,
          password,
          displayName: displayName.trim(),
          avatarColor: selectedColor,
          avatarStyle: 'starlight',
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
      <div className="max-w-md w-full glass-panel rounded-3xl p-6 sm:p-8 relative border border-pink-500/30 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-purple-300 hover:text-white p-2 rounded-full hover:bg-white/10 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-500 to-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-lg border border-pink-300/40">
            <Heart className="w-8 h-8 text-white fill-white" />
          </div>
          <h2 className="text-2xl font-black text-white">
            {mode === 'login' ? 'Welcome Back Explorer' : 'Create Your Account'}
          </h2>
          <p className="text-xs text-purple-300 mt-1">
            Two Hearts. One Universe.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-slate-900/60 p-1 rounded-2xl border border-purple-500/20 mb-6">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); }}
            className={`flex-1 py-2 text-sm font-bold rounded-xl transition ${
              mode === 'login' ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow' : 'text-purple-300 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(null); }}
            className={`flex-1 py-2 text-sm font-bold rounded-xl transition ${
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
              <label className="block text-xs font-bold text-purple-200 uppercase tracking-wider mb-1">
                Display Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 w-4 h-4 text-purple-400" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Luna or Orion"
                  className="w-full bg-slate-900/80 border border-purple-500/30 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-purple-400/50 focus:outline-none focus:border-pink-500 transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-purple-200 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-purple-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@cosmic.com"
                className="w-full bg-slate-900/80 border border-purple-500/30 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-purple-400/50 focus:outline-none focus:border-pink-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-purple-200 uppercase tracking-wider mb-1">
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
            <div>
              <label className="block text-xs font-bold text-purple-200 uppercase tracking-wider mb-2">
                Choose Astronaut Suit Color
              </label>
              <div className="flex items-center justify-between gap-2">
                {AVATAR_COLORS.map((col) => (
                  <button
                    key={col.hex}
                    type="button"
                    onClick={() => setSelectedColor(col.hex)}
                    style={{ backgroundColor: col.hex }}
                    title={col.name}
                    className={`w-9 h-9 rounded-full transition transform hover:scale-110 flex items-center justify-center ${
                      selectedColor === col.hex ? 'ring-4 ring-white shadow-lg scale-110' : 'opacity-80'
                    }`}
                  >
                    {selectedColor === col.hex && <Sparkles className="w-4 h-4 text-white drop-shadow" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full cosmic-btn-primary flex items-center justify-center gap-2 mt-4 font-bold shadow-lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : mode === 'login' ? (
              <span>Enter Universe</span>
            ) : (
              <span>Begin Journey</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
