import React from 'react';
import { WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { connectivity } from '../services/connectivity';

interface OfflineOverlayProps {
  isChecking?: boolean;
  onRetry?: () => void;
  message?: string;
}

export const OfflineOverlay: React.FC<OfflineOverlayProps> = ({
  isChecking = false,
  onRetry,
  message = "You're offline. Connect to the internet to play Love Battle.",
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-cosmic-darkest/95 backdrop-blur-xl p-6 select-none animate-fadeIn">
      <div className="max-w-md w-full glass-panel rounded-3xl p-8 text-center border-2 border-pink-500/40 shadow-2xl relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-purple-600/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-pink-600/30 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-pink-500/10 border-2 border-pink-500/40 flex items-center justify-center mb-6 shadow-inner animate-pulse">
            <WifiOff className="w-10 h-10 text-pink-400" />
          </div>

          <h2 className="text-2xl font-black tracking-wide text-white mb-2 font-game">
            Battle Connection Required ❤️🔥
          </h2>

          <p className="text-purple-200/90 text-sm leading-relaxed mb-6 font-medium">
            {message}
          </p>

          <div className="w-full p-3.5 rounded-2xl bg-slate-900/60 border border-purple-500/20 text-xs text-purple-300 flex items-center gap-2 mb-6 text-left">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Love Battle is an online multiplayer fighting arena. Real-time internet connection is required for authoritative hit validation and couple match sync.</span>
          </div>

          <button
            onClick={() => {
              if (onRetry) {
                onRetry();
              } else {
                connectivity.checkBackendConnectivity();
              }
            }}
            disabled={isChecking}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-pink-500/30 transition transform active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Checking Connection...' : 'Reconnect Arena'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
