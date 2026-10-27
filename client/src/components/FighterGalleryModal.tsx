import React, { useState } from 'react';
import { FighterId, FIGHTERS } from '../types/combat';
import { useBattle } from '../context/BattleContext';
import { Swords, Zap, Shield, Sparkles, X, Check } from 'lucide-react';

interface FighterGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FighterGalleryModal: React.FC<FighterGalleryModalProps> = ({ isOpen, onClose }) => {
  const { myFighterId, chooseFighter } = useBattle();
  const [selected, setSelected] = useState<FighterId>(myFighterId || 'heart_knight');

  if (!isOpen) return null;

  const current = FIGHTERS[selected];

  const handleSelect = () => {
    chooseFighter(selected);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-cosmic-darkest/90 backdrop-blur-md p-4 select-none animate-fadeIn">
      <div className="max-w-2xl w-full glass-panel rounded-3xl p-6 sm:p-8 relative border border-pink-500/40 shadow-2xl max-h-[88vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-purple-300 hover:text-white p-2 rounded-full hover:bg-white/10 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-600 to-indigo-600 flex items-center justify-center shadow-lg border border-pink-300/40">
            <Swords className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Fighter Roster</h2>
            <p className="text-xs text-purple-300">Choose your champion for the arena</p>
          </div>
        </div>

        {/* 4 Fighter Selector Tabs */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {(Object.keys(FIGHTERS) as FighterId[]).map((fId) => {
            const f = FIGHTERS[fId];
            const isTab = selected === fId;
            return (
              <button
                key={fId}
                onClick={() => setSelected(fId)}
                className={`py-2.5 px-2 rounded-2xl text-center font-bold text-xs transition flex flex-col items-center gap-1 ${
                  isTab
                    ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg border border-pink-300/50 scale-105'
                    : 'bg-slate-900/60 text-purple-300 hover:bg-slate-800'
                }`}
              >
                <span className="truncate max-w-full">{f.name}</span>
              </button>
            );
          })}
        </div>

        {/* Selected Fighter Details */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-purple-500/20 flex flex-col sm:flex-row items-center gap-5">
            <div
              style={{ borderColor: current.color }}
              className="w-24 h-24 rounded-3xl flex-shrink-0 flex items-center justify-center bg-gradient-to-tr from-purple-900 to-slate-900 border-2 shadow-xl"
            >
              <Swords className="w-12 h-12 text-white" />
            </div>

            <div className="text-center sm:text-left">
              <h3 className="text-2xl font-black text-white">{current.name}</h3>
              <p className="text-xs text-pink-400 font-bold uppercase tracking-wider">{current.title}</p>
              <p className="text-xs text-purple-200 mt-2 leading-relaxed">{current.description}</p>
            </div>
          </div>

          {/* Combat Statistics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-purple-500/20 text-center">
              <span className="text-[10px] text-purple-400 font-bold uppercase">Light DMG</span>
              <div className="text-lg font-black text-white">{current.lightDamage}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-purple-500/20 text-center">
              <span className="text-[10px] text-purple-400 font-bold uppercase">Heavy DMG</span>
              <div className="text-lg font-black text-white">{current.heavyDamage}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-purple-500/20 text-center">
              <span className="text-[10px] text-purple-400 font-bold uppercase">Speed</span>
              <div className="text-lg font-black text-cyan-300">{current.moveSpeed}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-purple-500/20 text-center">
              <span className="text-[10px] text-purple-400 font-bold uppercase">Range</span>
              <div className="text-lg font-black text-amber-300">{current.attackRange}px</div>
            </div>
          </div>

          {/* Special Ability Card */}
          <div className="p-4 rounded-2xl bg-pink-950/30 border border-pink-500/40">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="w-4 h-4 text-starlight" />
              <h4 className="font-black text-sm text-starlight">ULTIMATE: {current.specialName}</h4>
              <span className="text-[10px] font-bold text-pink-300 ml-auto">DMG: {current.specialDamage}</span>
            </div>
            <p className="text-xs text-purple-200 leading-relaxed">
              {current.specialDescription}
            </p>
          </div>
        </div>

        {/* Footer select button */}
        <div className="pt-4 border-t border-purple-900/30">
          <button
            onClick={handleSelect}
            className="w-full cosmic-btn-primary flex items-center justify-center gap-2 font-black py-3.5 shadow-xl text-sm"
          >
            {myFighterId === selected ? (
              <>
                <Check className="w-5 h-5" />
                <span>Selected as Active Fighter</span>
              </>
            ) : (
              <span>Equip {current.name}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
