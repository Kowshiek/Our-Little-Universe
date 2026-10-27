import React, { useState } from 'react';
import { WifiOff, RefreshCw, AlertTriangle, Play, Globe, Check, X } from 'lucide-react';
import { connectivity } from '../services/connectivity';
import { getBackendUrl, setBackendUrl } from '../config';

interface OfflineOverlayProps {
  isChecking?: boolean;
  onRetry?: () => void;
  onStartTraining?: () => void;
  onDismiss?: () => void;
  message?: string;
}

export const OfflineOverlay: React.FC<OfflineOverlayProps> = ({
  isChecking = false,
  onRetry,
  onStartTraining,
  onDismiss,
  message = "Love Battle backend server is connecting. You can configure your server URL or play Solo 3D Dojo right now!",
}) => {
  const [serverUrlInput, setServerUrlInput] = useState(getBackendUrl());
  const [showConfig, setShowConfig] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setBackendUrl(serverUrlInput.trim());
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
    await connectivity.checkBackendConnectivity();
    onRetry?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-cosmic-darkest/95 backdrop-blur-xl p-4 sm:p-6 select-none animate-fadeIn">
      <div className="max-w-md w-full glass-panel rounded-3xl p-6 sm:p-8 text-center border-2 border-pink-500/40 shadow-2xl relative overflow-hidden">
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 text-purple-300 hover:text-white p-2 rounded-full hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Glow backdrop */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-purple-600/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-pink-600/30 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-pink-500/10 border-2 border-pink-500/40 flex items-center justify-center mb-4 shadow-inner animate-pulse">
            <WifiOff className="w-8 h-8 text-pink-400" />
          </div>

          <h2 className="text-2xl font-black tracking-wide text-white mb-1.5 font-game">
            Arena Link Connecting ❤️🔥
          </h2>

          <p className="text-purple-200/90 text-xs sm:text-sm leading-relaxed mb-4 font-medium">
            {message}
          </p>

          {/* Quick Play Solo 3D Training Dojo Button */}
          {onStartTraining && (
            <button
              onClick={onStartTraining}
              className="w-full py-3.5 mb-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-600 to-indigo-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition transform active:scale-95"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Enter Solo 3D Training Dojo (Instant Play)</span>
            </button>
          )}

          {/* Reconnect Arena button */}
          <button
            onClick={() => {
              if (onRetry) {
                onRetry();
              } else {
                connectivity.checkBackendConnectivity();
              }
            }}
            disabled={isChecking}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-pink-500/25 transition transform active:scale-95 disabled:opacity-50 mb-3"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Checking Server Connection...' : 'Reconnect Online Arena'}</span>
          </button>

          {/* Backend URL Toggle */}
          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className="text-[11px] font-bold text-pink-300 hover:text-white flex items-center gap-1 transition underline-offset-4 hover:underline mb-2"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{showConfig ? 'Hide Server URL Settings' : 'Configure Backend Server URL'}</span>
          </button>

          {showConfig && (
            <form onSubmit={handleSaveUrl} className="w-full mt-2 p-3 rounded-2xl bg-slate-900/90 border border-purple-500/30 text-left">
              <label className="block text-[11px] font-bold text-purple-300 uppercase tracking-wider mb-1">
                Backend Server URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={serverUrlInput}
                  onChange={(e) => setServerUrlInput(e.target.value)}
                  placeholder="https://your-backend.onrender.com"
                  className="flex-1 text-xs bg-black/60 border border-purple-500/40 rounded-xl px-3 py-2 text-white placeholder-purple-400/40 focus:outline-none focus:border-pink-500 font-mono"
                />
                <button
                  type="submit"
                  className="px-3 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-black shrink-0 transition"
                >
                  {savedSuccess ? <Check className="w-4 h-4 text-emerald-300" /> : 'Save'}
                </button>
              </div>
              <p className="text-[10px] text-purple-400 mt-1">
                Defaults to same origin or Render/Railway websocket backend.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
