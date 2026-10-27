import React from 'react';
import { useUniverse } from '../context/UniverseContext';
import { X, Heart } from 'lucide-react';

interface EmotePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerPos?: { x: number; y: number };
}

const EMOTES = [
  { key: 'heart', label: 'Love Heart', icon: '💖' },
  { key: 'kiss', label: 'Cosmic Kiss', icon: '💋' },
  { key: 'hug', label: 'Warm Hug', icon: '🤗' },
  { key: 'sparkle', label: 'Sparkles', icon: '✨' },
  { key: 'dance', label: 'Moon Dance', icon: '💃' },
  { key: 'cheer', label: 'Celebrate', icon: '🎉' },
  { key: 'wave', label: 'Hello', icon: '👋' },
];

export const EmotePickerModal: React.FC<EmotePickerModalProps> = ({
  isOpen,
  onClose,
  playerPos = { x: 400, y: 350 },
}) => {
  const { sendEmote } = useUniverse();

  if (!isOpen) return null;

  const handleSelectEmote = (emoteKey: string) => {
    sendEmote(emoteKey, playerPos.x, playerPos.y);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-cosmic-darkest/80 backdrop-blur-sm p-4 select-none animate-fadeIn">
      <div className="max-w-sm w-full glass-panel rounded-3xl p-6 relative border border-pink-500/30 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-purple-300 hover:text-white p-2 rounded-full hover:bg-white/10 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <Heart className="w-5 h-5 text-pink-400 fill-pink-400 animate-pulse" />
          <h3 className="font-bold text-lg text-white">Couple Emotes</h3>
        </div>

        <p className="text-xs text-purple-300 mb-4">
          Send a floating reaction directly over your character to your partner!
        </p>

        <div className="grid grid-cols-4 gap-3">
          {EMOTES.map((em) => (
            <button
              key={em.key}
              onClick={() => handleSelectEmote(em.key)}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-900/60 border border-purple-500/20 hover:border-pink-500 hover:bg-pink-950/30 transition transform hover:scale-110 active:scale-95 group"
            >
              <span className="text-3xl mb-1 group-hover:scale-125 transition transform">
                {em.icon}
              </span>
              <span className="text-[10px] text-purple-300 font-semibold truncate max-w-full">
                {em.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
