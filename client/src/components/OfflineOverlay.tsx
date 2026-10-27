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
  message = "You're offline. Connect to the internet to enter Our Little Universe.",
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-cosmic-darkest/95 backdrop-blur-xl p-6 select-none animate-fadeIn">
      <div className="max-w-md w-full glass-panel rounded-3xl p-8 text-center border border-pink-500/30 shadow-2xl relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-purple-600/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-pink-600/30 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-pink-500/10 border-2 border-pink-500/40 flex items-center justify-center mb-6 shadow-inner animate-pulse">
            <WifiOff className="w-10 h-10 text-pink-400" />
          </div>

          <h2 className="text-2xl font-black tracking-wide text-white mb-2 font-game">
            Connection Required 🌌
          </h2>

          <p className="text-purple-200/90 text-sm leading-relaxed mb-6 font-medium">
            {message}
          </p>

          <div className="w-full p-3 rounded-2xl bg-slate-900/60 border border-purple-500/20 text-xs text-purple-300 flex items-center gap-2 mb-6">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>Our Little Universe is an online-only shared adventure. Offline progress is strictly blocked to keep both hearts synchronized.</span>
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
            className="w-full cosmic-btn-primary flex items-center justify-center gap-2 text-base font-bold shadow-lg"
          >
            <RefreshCw className={`w-5 h-5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Checking Connection...' : 'Retry Connection'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
