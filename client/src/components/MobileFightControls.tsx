import React, { useRef, useState } from 'react';
import { Shield, Zap, Sparkles, Wind, Smile, Flame } from 'lucide-react';

interface MobileFightControlsProps {
  onMove: (vector: { x: number; y: number }) => void;
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
    <div className="absolute inset-0 pointer-events-none z-30 select-none flex flex-col justify-end p-3 sm:p-5 pb-[calc(env(safe-area-inset-bottom,12px)+8px)]">
      <div className="flex items-end justify-between w-full">
        {/* Left: Directional Movement Thumbstick */}
        <div
          ref={joystickBaseRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          className="pointer-events-auto relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-slate-950/70 border-2 border-purple-500/40 backdrop-blur-md flex items-center justify-center shadow-2xl"
        >
          <div className="absolute inset-3 rounded-full border border-purple-400/20" />
          <div
            style={{
              transform: `translate(${stickPos.x}px, ${stickPos.y}px)`,
              transition: isDragging ? 'none' : 'transform 0.12s ease-out',
            }}
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-pink-600 via-purple-600 to-indigo-600 border border-white/50 shadow-lg flex items-center justify-center"
          >
            <div className="w-3.5 h-3.5 rounded-full bg-white/70" />
          </div>
        </div>

        {/* Right: Arcade Fighting Buttons Cluster */}
        <div className="pointer-events-auto flex flex-col items-end gap-2.5">
          {/* Secondary Actions: Emote & Dodge */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => { vibrate(12); onOpenEmotes(); }}
              className="w-11 h-11 rounded-full bg-slate-900/80 border border-purple-400/40 text-purple-200 flex items-center justify-center active:scale-90 shadow-md backdrop-blur-sm"
              title="Emotes"
            >
              <Smile className="w-5 h-5 text-pink-400" />
            </button>

            <button
              onClick={() => { vibrate(20); onDodge(); }}
              className="w-11 h-11 rounded-full bg-cyan-950/80 border border-cyan-400/50 text-cyan-200 flex items-center justify-center active:scale-90 shadow-md backdrop-blur-sm"
              title="Dodge (Shift)"
            >
              <Wind className="w-5 h-5 text-cyan-300" />
            </button>
          </div>

          {/* Primary Action Buttons: Block, Light, Heavy, Special */}
          <div className="grid grid-cols-2 gap-2.5 items-center">
            {/* Block Button (Hold to Guard) */}
            <button
              onTouchStart={() => { vibrate(15); onBlock(true); }}
              onTouchEnd={() => onBlock(false)}
              onMouseDown={() => onBlock(true)}
              onMouseUp={() => onBlock(false)}
              className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-slate-900/90 border-2 border-purple-400/50 text-purple-200 flex flex-col items-center justify-center active:scale-90 active:bg-purple-900 shadow-lg"
              title="Block (Hold)"
            >
              <Shield className="w-6 h-6 text-indigo-300" />
              <span className="text-[8px] font-black tracking-widest uppercase text-indigo-200">BLOCK</span>
            </button>

            {/* Special Ultimate Button */}
            <button
              onClick={() => { vibrate(35); onSpecial(); }}
              className={`w-13 h-13 sm:w-14 sm:h-14 rounded-2xl flex flex-col items-center justify-center active:scale-90 shadow-xl transition-all ${
                isSpecialReady
                  ? 'bg-gradient-to-tr from-pink-500 via-purple-600 to-amber-400 border-2 border-amber-300 animate-pulse scale-105'
                  : 'bg-slate-900/80 border border-pink-500/30 opacity-75'
              }`}
              title="Heart Special (L)"
            >
              <Sparkles className="w-6 h-6 text-starlight" />
              <span className="text-[8px] font-black tracking-widest uppercase text-white">SPECIAL</span>
            </button>

            {/* Light Attack */}
            <button
              onClick={() => { vibrate(18); onLightAttack(); }}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-pink-600 to-rose-600 border-2 border-pink-300/50 text-white flex flex-col items-center justify-center active:scale-90 shadow-xl"
              title="Light Attack (J)"
            >
              <Zap className="w-7 h-7 text-white fill-white" />
              <span className="text-[9px] font-black tracking-wider uppercase">LIGHT (J)</span>
            </button>

            {/* Heavy Attack */}
            <button
              onClick={() => { vibrate(25); onHeavyAttack(); }}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-rose-700 to-amber-600 border-2 border-amber-300/60 text-white flex flex-col items-center justify-center active:scale-90 shadow-xl"
              title="Heavy Attack (K)"
            >
              <Flame className="w-7 h-7 text-amber-200 fill-amber-200" />
              <span className="text-[9px] font-black tracking-wider uppercase">HEAVY (K)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
