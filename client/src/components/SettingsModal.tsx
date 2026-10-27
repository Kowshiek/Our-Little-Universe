import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUniverse } from '../context/UniverseContext';
import { api } from '../services/api';
import {
  Settings,
  Volume2,
  VolumeX,
  Smartphone,
  LogOut,
  KeyRound,
  RefreshCw,
  Copy,
  Check,
  X,
  Shield,
  Download,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenInstall: () => void;
  onExitUniverse: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenInstall,
  onExitUniverse,
}) => {
  const { user, logout } = useAuth();
  const { activeUniverseId, gameData } = useUniverse();

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isRotating, setIsRotating] = useState(false);

  useEffect(() => {
    if (isOpen && activeUniverseId) {
      api.getInviteCode(activeUniverseId)
        .then((res) => setInviteCode(res.code))
        .catch(() => setInviteCode(null));
    }
  }, [isOpen, activeUniverseId]);

  if (!isOpen) return null;

  const handleRotateCode = async () => {
    if (!activeUniverseId) return;
    setIsRotating(true);
    try {
      const res = await api.rotateInviteCode(activeUniverseId);
      setInviteCode(res.code);
    } catch (err: any) {
      alert(err.message || 'Failed to rotate code');
    } finally {
      setIsRotating(false);
    }
  };

  const handleCopy = () => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-cosmic-darkest/90 backdrop-blur-md p-4 select-none animate-fadeIn">
      <div className="max-w-md w-full glass-panel rounded-3xl p-6 sm:p-8 relative border border-pink-500/30 shadow-2xl max-h-[85vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-purple-300 hover:text-white p-2 rounded-full hover:bg-white/10 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg border border-purple-400/40">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Settings</h2>
            <p className="text-xs text-purple-300">Preferences & Sanctuary Management</p>
          </div>
        </div>

        <div className="overflow-y-auto space-y-5 pr-1 flex-1 text-sm text-purple-200">
          {/* Audio controls */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-purple-500/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {soundEnabled ? (
                <Volume2 className="w-5 h-5 text-pink-400" />
              ) : (
                <VolumeX className="w-5 h-5 text-purple-400" />
              )}
              <div>
                <h4 className="font-bold text-white text-sm">Cosmic Sounds</h4>
                <p className="text-xs text-purple-300">Background ambiance & effects</p>
              </div>
            </div>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                soundEnabled ? 'bg-pink-600' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  soundEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Invitation Management */}
          {activeUniverseId && inviteCode && (
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-purple-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  <KeyRound className="w-4 h-4 text-amber-300" />
                  <span>Partner Invitation Code</span>
                </div>
                <button
                  onClick={handleRotateCode}
                  disabled={isRotating}
                  className="text-xs text-purple-300 hover:text-white flex items-center gap-1 transition"
                  title="Rotate code"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRotating ? 'animate-spin' : ''}`} />
                  <span>Rotate</span>
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-purple-500/30 flex items-center justify-between font-mono text-starlight text-base font-bold">
                <span>{inviteCode}</span>
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-lg bg-purple-900/40 hover:bg-purple-800 text-purple-200 hover:text-white transition"
                >
                  {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-purple-400">
                Rotating the code invalidates previous unused codes while keeping existing partners safe.
              </p>
            </div>
          )}

          {/* Install PWA Option */}
          <button
            onClick={() => {
              onClose();
              onOpenInstall();
            }}
            className="w-full p-4 rounded-2xl bg-slate-900/60 border border-purple-500/20 hover:border-pink-500/40 flex items-center justify-between transition text-left"
          >
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-cyan-400" />
              <div>
                <h4 className="font-bold text-white text-sm">Install Mobile App</h4>
                <p className="text-xs text-purple-300">Play full-screen on Android or iOS</p>
              </div>
            </div>
            <Download className="w-4 h-4 text-purple-300" />
          </button>

          {/* Account Profile info */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-purple-500/20 space-y-1">
            <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">Signed In As</span>
            <div className="font-bold text-white text-sm">{user?.displayName}</div>
            <div className="text-xs text-purple-300">{user?.email}</div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 space-y-2">
            {activeUniverseId && (
              <button
                onClick={() => {
                  onClose();
                  onExitUniverse();
                }}
                className="w-full py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-purple-200 hover:text-white text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <span>Leave Universe to Sanctuary Hub</span>
              </button>
            )}

            <button
              onClick={() => {
                onClose();
                logout();
              }}
              className="w-full py-2.5 rounded-xl bg-rose-950/40 border border-rose-500/30 hover:bg-rose-900/60 text-rose-300 hover:text-white text-xs font-bold transition flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
