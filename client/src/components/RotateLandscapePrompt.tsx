import React, { useState, useEffect } from 'react';
import { Smartphone, RotateCw, Maximize2, X, Swords } from 'lucide-react';

export const RotateLandscapePrompt: React.FC = () => {
  const [isPortraitMobile, setIsPortraitMobile] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      if (typeof window === 'undefined') return;
      const isPortrait = window.innerHeight > window.innerWidth;
      const isMobileSize = window.innerWidth <= 900 || window.innerHeight <= 900;
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      setIsPortraitMobile(isPortrait && isMobileSize && isTouch);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!isPortraitMobile || dismissed) return null;

  const handleRequestLandscape = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen().catch(() => {});
      }
      if (screen.orientation && 'lock' in screen.orientation) {
        await (screen.orientation as any).lock('landscape').catch(() => {});
      }
    } catch (e) {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-cosmic-darkest/95 backdrop-blur-xl p-6 select-none animate-fadeIn">
      <div className="max-w-sm w-full glass-panel rounded-3xl p-6 text-center border-2 border-pink-500/50 shadow-2xl relative">
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-3 right-3 text-purple-300 hover:text-white p-2 rounded-full hover:bg-white/10 transition"
          title="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Rotating Phone Animation */}
        <div className="relative w-20 h-20 mx-auto mb-4 flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-pink-500/20 via-purple-600/30 to-indigo-600/20 animate-pulse border border-pink-400/30" />
          <Smartphone className="w-10 h-10 text-pink-400 animate-spin-slow transition-transform" />
          <RotateCw className="w-5 h-5 text-starlight absolute -top-1 -right-1 animate-spin" />
        </div>

        <h3 className="text-xl font-black text-white mb-2 font-game tracking-wide">
          ROTATE TO LANDSCAPE
        </h3>

        <p className="text-xs text-purple-200/90 leading-relaxed mb-6 font-medium">
          Turn your phone sideways for the best <span className="text-pink-300 font-bold">3D Arcade Fighting Experience</span> with widescreen camera tracking and dual-thumb combat controls.
        </p>

        <div className="space-y-2.5">
          <button
            onClick={handleRequestLandscape}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-pink-500/30 transition transform active:scale-95"
          >
            <Maximize2 className="w-4 h-4" />
            <span>Lock Landscape & Fullscreen</span>
          </button>

          <button
            onClick={() => setDismissed(true)}
            className="text-[11px] font-bold text-purple-400 hover:text-purple-200 transition py-1 block w-full"
          >
            Play in Portrait anyway
          </button>
        </div>
      </div>
    </div>
  );
};
