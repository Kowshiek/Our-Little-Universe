import React, { useRef, useState } from 'react';
import { Shield, Zap, Sparkles, Wind, Smile, Flame, ArrowUp } from 'lucide-react';

interface MobileFightControlsProps {
  onMove: (vector: { x: number; y: number }) => void;
  onJump: () => void;
  onLightAttack: () => void;
  onHeavyAttack: () => void;
  onSpecial: () => void;
  onBlock: (active: boolean) => void;
  onDodge: () => void;
  onOpenEmotes: () => void;
  isSpecialReady?: boolean;
}

export const MobileFightControls: React.FC<MobileFightControlsProps> = ({
  onMove,
  onJump,
  onLightAttack,
  onHeavyAttack,
  onSpecial,
  onBlock,
  onDodge,
  onOpenEmotes,
  isSpecialReady = false,
}) => {
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const [stickPos, setStickPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const touchIdRef = useRef<number | null>(null);

  const vibrate = (ms = 15) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(ms);
      } catch (e) {}
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (touchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    touchIdRef.current = touch.identifier;
    setIsDragging(true);
    updateJoystick(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        updateJoystick(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
        break;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        touchIdRef.current = null;
        setIsDragging(false);
        setStickPos({ x: 0, y: 0 });
        onMove({ x: 0, y: 0 });
        break;
      }
    }
  };

  const updateJoystick = (clientX: number, clientY: number) => {
    if (!joystickBaseRef.current) return;
    const rect = joystickBaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const maxRadius = rect.width / 2 - 8;
    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);

    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }

    setStickPos({ x: dx, y: dy });
    onMove({ x: dx / maxRadius, y: dy / maxRadius });
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-30 select-none flex flex-col justify-end p-2 sm:p-5 pl-[calc(env(safe-area-inset-left,10px)+6px)] pr-[calc(env(safe-area-inset-right,10px)+6px)] pb-[calc(env(safe-area-inset-bottom,10px)+6px)]">
      <div className="flex items-end justify-between w-full">
        {/* Left Side: Joystick + Quick Jump Button */}
        <div className="flex items-end gap-3">
          {/* Virtual Thumbstick */}
          <div
            ref={joystickBaseRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            className="pointer-events-auto relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-slate-950/80 border-2 border-purple-500/50 backdrop-blur-md flex items-center justify-center shadow-2xl touch-none"
          >
            <div className="absolute inset-3 rounded-full border border-purple-400/20" />
            <div
              style={{
                transform: `translate(${stickPos.x}px, ${stickPos.y}px)`,
                transition: isDragging ? 'none' : 'transform 0.12s ease-out',
              }}
              className="w-12 h-12 rounded-full bg-gradient-to-tr from-pink-600 via-purple-600 to-indigo-600 border-2 border-white/60 shadow-lg flex items-center justify-center pointer-events-none"
            >
              <div className="w-3.5 h-3.5 rounded-full bg-white/80" />
            </div>
          </div>

          {/* Dedicated Easy Jump Button (Left Thumb) */}
          <button
            onClick={() => {
              vibrate(15);
              onJump();
            }}
            className="pointer-events-auto w-12 h-12 rounded-2xl bg-indigo-950/80 border-2 border-indigo-400/50 text-white flex flex-col items-center justify-center active:scale-90 shadow-lg backdrop-blur-md mb-2"
            title="Jump"
          >
            <ArrowUp className="w-6 h-6 text-indigo-300" />
            <span className="text-[7px] font-black uppercase tracking-wider text-indigo-200">JUMP</span>
          </button>
        </div>

        {/* Right Side: Arcade Fighting Buttons Cluster */}
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          {/* Secondary Utilities: Emotes & Dodge */}
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => {
                vibrate(10);
                onOpenEmotes();
              }}
              className="w-10 h-10 rounded-full bg-slate-900/80 border border-purple-400/40 text-purple-200 flex items-center justify-center active:scale-90 shadow-md backdrop-blur-sm"
              title="Emotes"
            >
              <Smile className="w-4 h-4 text-pink-400" />
            </button>

            <button
              onClick={() => {
                vibrate(22);
                onDodge();
              }}
              className="w-11 h-11 rounded-full bg-cyan-950/90 border-2 border-cyan-400/60 text-cyan-200 flex flex-col items-center justify-center active:scale-90 shadow-lg backdrop-blur-sm"
              title="Dodge"
            >
              <Wind className="w-5 h-5 text-cyan-300" />
              <span className="text-[6px] font-black tracking-widest text-cyan-300 uppercase">DODGE</span>
            </button>
          </div>

          {/* Main Action Buttons Grid: Block, Special, Light, Heavy */}
          <div className="grid grid-cols-2 gap-2.5 items-center">
            {/* Block Button (Hold to Guard) */}
            <button
              onTouchStart={() => {
                vibrate(15);
                onBlock(true);
              }}
              onTouchEnd={() => onBlock(false)}
              onMouseDown={() => onBlock(true)}
              onMouseUp={() => onBlock(false)}
              className="w-13 h-13 sm:w-15 sm:h-15 rounded-2xl bg-slate-900/90 border-2 border-indigo-400/50 text-indigo-200 flex flex-col items-center justify-center active:scale-90 active:bg-indigo-900/80 shadow-lg"
              title="Block (Hold to Guard 75%)"
            >
              <Shield className="w-6 h-6 text-indigo-300" />
              <span className="text-[8px] font-black tracking-widest uppercase text-indigo-200">BLOCK</span>
            </button>

            {/* Special Ultimate Button */}
            <button
              onClick={() => {
                vibrate(40);
                onSpecial();
              }}
              className={`w-13 h-13 sm:w-15 sm:h-15 rounded-2xl flex flex-col items-center justify-center active:scale-90 shadow-xl transition-all ${
                isSpecialReady
                  ? 'bg-gradient-to-tr from-pink-500 via-purple-600 to-amber-400 border-2 border-amber-300 animate-pulse scale-105 shadow-pink-500/50'
                  : 'bg-slate-900/80 border border-pink-500/30 opacity-70'
              }`}
              title="Heart Ultimate Special"
            >
              <Sparkles className="w-6 h-6 text-starlight" />
              <span className="text-[8px] font-black tracking-widest uppercase text-white">ULTIMATE</span>
            </button>

            {/* Light Attack / Auto-Combo Button (Easy Fighting!) */}
            <button
              onClick={() => {
                vibrate(15);
                onLightAttack();
              }}
              className="w-15 h-15 sm:w-17 sm:h-17 rounded-2xl bg-gradient-to-tr from-pink-600 via-rose-600 to-pink-500 border-2 border-pink-300 text-white flex flex-col items-center justify-center active:scale-90 shadow-xl shadow-pink-600/30"
              title="Light Attack (Tap for 3-Hit Combo)"
            >
              <Zap className="w-7 h-7 text-white fill-white" />
              <span className="text-[9px] font-black tracking-wider uppercase">LIGHT COMBO</span>
            </button>

            {/* Heavy Attack Button */}
            <button
              onClick={() => {
                vibrate(28);
                onHeavyAttack();
              }}
              className="w-15 h-15 sm:w-17 sm:h-17 rounded-2xl bg-gradient-to-tr from-rose-700 via-amber-600 to-orange-500 border-2 border-amber-300 text-white flex flex-col items-center justify-center active:scale-90 shadow-xl shadow-amber-600/30"
              title="Heavy Strike"
            >
              <Flame className="w-7 h-7 text-amber-200 fill-amber-200" />
              <span className="text-[9px] font-black tracking-wider uppercase">HEAVY SLAM</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
