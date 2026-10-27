import React from 'react';
import { HelpCircle, X, Zap, Shield, Sparkles, Wind, Flame, Swords } from 'lucide-react';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-cosmic-darkest/90 backdrop-blur-md p-4 select-none animate-fadeIn">
      <div className="max-w-lg w-full glass-panel rounded-3xl p-6 sm:p-8 relative border border-pink-500/40 shadow-2xl max-h-[85vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-purple-300 hover:text-white p-2 rounded-full hover:bg-white/10 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-indigo-600 flex items-center justify-center shadow-lg border border-pink-300/40">
            <HelpCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">How to Fight</h2>
            <p className="text-xs text-purple-300">Master the romantic arcade arena</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs text-purple-200">
          {/* Controls Table */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-purple-500/20 space-y-2.5">
            <h3 className="font-bold text-white text-sm mb-2 flex items-center gap-1.5">
              <Swords className="w-4 h-4 text-pink-400" />
              <span>Combat Controls</span>
            </h3>

            <div className="flex items-center justify-between py-1 border-b border-purple-500/10">
              <span className="font-semibold text-white">Move Left / Right</span>
              <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-pink-300 font-bold">A / D or Thumbstick</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-purple-500/10">
              <span className="font-semibold text-white">Jump</span>
              <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-pink-300 font-bold">W / Space</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-purple-500/10">
              <span className="font-semibold text-white">Light Attack (Fast Combo)</span>
              <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-starlight font-bold">J key / LIGHT</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-purple-500/10">
              <span className="font-semibold text-white">Heavy Attack (Crushing Blow)</span>
              <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-amber-300 font-bold">K key / HEAVY</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-purple-500/10">
              <span className="font-semibold text-white">Heart Special (Ultimate)</span>
              <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-pink-400 font-bold">L key / SPECIAL</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-purple-500/10">
              <span className="font-semibold text-white">Block (Guard 75% Damage)</span>
              <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-indigo-300 font-bold">Hold S / BLOCK</span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="font-semibold text-white">Dodge (Invulnerable Dash)</span>
              <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-cyan-300 font-bold">Shift / DODGE</span>
            </div>
          </div>

          {/* Unique Mechanics */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-purple-500/20 space-y-2">
            <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Heart Energy & Clash</span>
            </h3>
            <p className="leading-relaxed">
              • <strong>Heart Energy</strong>: Landing attacks builds your meter up to 100%. Once full, unleash your champion's ultimate special ability!
            </p>
            <p className="leading-relaxed">
              • <strong>Heart Clash</strong>: If both lovers trigger their special moves at nearly the same instant, a screen-shattering Heart Clash is unleashed!
            </p>
            <p className="leading-relaxed">
              • <strong>Best of 3 Rounds</strong>: 60-second timer per round. First fighter to claim 2 rounds wins the match!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
