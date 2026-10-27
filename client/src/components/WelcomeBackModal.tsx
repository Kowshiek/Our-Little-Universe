import React, { useEffect, useState } from 'react';
import { Sparkles, Heart } from 'lucide-react';

interface WelcomeBackModalProps {
  universeName: string;
  partnerName?: string;
  onDismiss: () => void;
}

export const WelcomeBackModal: React.FC<WelcomeBackModalProps> = ({
  universeName,
  partnerName,
  onDismiss,
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, 4000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!visible) return null;

  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 pointer-events-auto animate-bounce select-none">
      <div className="glass-panel px-6 py-3.5 rounded-2xl border border-pink-400/50 shadow-2xl flex items-center gap-3 bg-cosmic-dark/95 backdrop-blur-md">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500 to-indigo-600 flex items-center justify-center shadow">
          <Heart className="w-5 h-5 text-white fill-white" />
        </div>
        <div>
          <h4 className="font-black text-sm text-white flex items-center gap-1.5">
            <span>Welcome Back to {universeName} 🌌</span>
          </h4>
          <p className="text-[11px] text-pink-200">
            {partnerName ? `Shared with ${partnerName}` : 'Restored from last confirmed checkpoint'}
          </p>
        </div>
      </div>
    </div>
  );
};
