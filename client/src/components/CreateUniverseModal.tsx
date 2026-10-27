import React, { useState } from 'react';
import { api } from '../services/api';
import { useUniverse } from '../context/UniverseContext';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Copy, Check, Share2, X, Loader2, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

interface CreateUniverseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUniverseCreated: (universeId: string) => void;
}

export const CreateUniverseModal: React.FC<CreateUniverseModalProps> = ({
  isOpen,
  onClose,
  onUniverseCreated,
}) => {
  const { refreshUserData } = useAuth();
  const [universeName, setUniverseName] = useState('');
  const [createdUniverse, setCreatedUniverse] = useState<{ id: string; name: string } | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!universeName.trim()) return;

    setError(null);
    setLoading(true);

    try {
      const res = await api.createUniverse(universeName.trim());
      setCreatedUniverse(res.universe);
      setInviteCode(res.inviteCode);
      await refreshUserData();

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ec4899', '#8a65d4', '#ffd166', '#38bdf8'],
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create universe.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCopyLink = () => {
    if (!inviteCode) return;
    const link = `${window.location.origin}?join=${inviteCode}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
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

        {!createdUniverse ? (
          <>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-600 to-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-lg border border-pink-300/40">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-2xl font-black text-white">Create Our Universe</h2>
              <p className="text-xs text-purple-300 mt-1">
                Name your private cosmic sanctuary for two
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-pink-900/40 border border-pink-500/40 text-xs text-pink-200">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-purple-200 uppercase tracking-wider mb-1">
                  Universe Name
                </label>
                <input
                  type="text"
                  required
                  value={universeName}
                  onChange={(e) => setUniverseName(e.target.value)}
                  placeholder="e.g. Lumina Haven or Stardust Valley"
                  className="w-full bg-slate-900/80 border border-purple-500/30 rounded-xl py-3 px-4 text-sm text-white placeholder-purple-400/50 focus:outline-none focus:border-pink-500 transition"
                />
              </div>

              <p className="text-xs text-purple-300/80">
                Your private universe will be created with an initial customizable island, a cozy home, and a secure code to invite your partner.
              </p>

              <button
                type="submit"
                disabled={loading}
                className="w-full cosmic-btn-primary flex items-center justify-center gap-2 mt-4 font-bold shadow-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Creating Sanctuary...</span>
                  </>
                ) : (
                  <span>Create Our Universe 🌌</span>
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-pink-500/20 border-2 border-pink-400 flex items-center justify-center mx-auto shadow-lg animate-pulse">
              <Sparkles className="w-8 h-8 text-pink-400" />
            </div>

            <div>
              <h3 className="text-2xl font-black text-white">Universe Created!</h3>
              <p className="text-sm text-pink-300 font-semibold mt-1">
                "{createdUniverse.name}"
              </p>
            </div>

            <p className="text-xs text-purple-200 leading-relaxed">
              Share this secret invitation code with your partner so they can join your private world.
            </p>

            {/* Invitation Code Display Box */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border-2 border-dashed border-pink-500/50 flex flex-col items-center gap-2">
              <span className="text-xs uppercase tracking-widest text-purple-400 font-bold">Partner Invite Code</span>
              <span className="text-3xl font-black tracking-widest text-starlight font-mono drop-shadow">
                {inviteCode}
              </span>
            </div>

            {/* Copy Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleCopyCode}
                className="py-2.5 px-3 rounded-xl bg-purple-900/50 border border-purple-400/40 hover:bg-purple-800/60 text-purple-100 text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCode ? 'Copied Code!' : 'Copy Code'}</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="py-2.5 px-3 rounded-xl bg-purple-900/50 border border-purple-400/40 hover:bg-purple-800/60 text-purple-100 text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                <span>{copiedLink ? 'Copied Link!' : 'Copy Link'}</span>
              </button>
            </div>

            {/* Enter Button */}
            <button
              onClick={() => {
                onClose();
                onUniverseCreated(createdUniverse.id);
              }}
              className="w-full cosmic-btn-primary flex items-center justify-center gap-2 font-bold shadow-lg py-3.5"
            >
              <span>Enter Our Universe Now</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
