import React, { useRef, useState, useEffect } from 'react';
import { Sword, Hand, Smile, Hammer } from 'lucide-react';

interface MobileControlsProps {
  onMove: (vector: { x: number; y: number }) => void;
  onAttack: () => void;
  onInteract: () => void;
  onOpenEmotes: () => void;
  onOpenBuildMode: () => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  onMove,
  onAttack,
  onInteract,
  onOpenEmotes,
  onOpenBuildMode,
}) => {
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const joystickStickRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [stickPos, setStickPos] = useState({ x: 0, y: 0 });
  const touchIdRef = useRef<number | null>(null);

  const triggerVibrate = (ms = 15) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(ms);
      } catch (e) {
        // Ignore vibration errors if blocked
      }
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

    const maxRadius = rect.width / 2 - 10;
    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const distance = Math.hypot(dx, dy);

    if (distance > maxRadius) {
      dx = (dx / distance) * maxRadius;
      dy = (dy / distance) * maxRadius;
    }

    setStickPos({ x: dx, y: dy });
    onMove({ x: dx / maxRadius, y: dy / maxRadius });
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-30 select-none flex flex-col justify-end p-4 md:p-6 pb-[calc(env(safe-area-inset-bottom,16px)+16px)]">
      <div className="flex items-end justify-between w-full">
        {/* Virtual Movement Joystick */}
        <div
          ref={joystickBaseRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          className="pointer-events-auto relative w-32 h-32 rounded-full bg-slate-900/60 border-2 border-purple-500/30 backdrop-blur-md flex items-center justify-center shadow-lg active:border-pink-500/50"
        >
          {/* Outer ring guidelines */}
          <div className="absolute inset-4 rounded-full border border-purple-400/20" />
          {/* Thumb stick */}
          <div
            ref={joystickStickRef}
            style={{
              transform: `translate(${stickPos.x}px, ${stickPos.y}px)`,
              transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            }}
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-pink-500 to-indigo-600 shadow-md border border-white/40 flex items-center justify-center"
          >
            <div className="w-4 h-4 rounded-full bg-white/60" />
          </div>
        </div>

        {/* Action Buttons cluster */}
        <div className="pointer-events-auto flex flex-col items-end gap-3">
          {/* Secondary Action row: Emote & Build */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                triggerVibrate(15);
                onOpenEmotes();
              }}
              className="w-12 h-12 rounded-full bg-slate-800/80 border border-purple-400/40 text-purple-200 flex items-center justify-center active:scale-90 shadow-md backdrop-blur-sm"
              aria-label="Send Emote"
            >
              <Smile className="w-6 h-6 text-pink-400" />
            </button>
            <button
              onClick={() => {
                triggerVibrate(15);
                onOpenBuildMode();
              }}
              className="w-12 h-12 rounded-full bg-slate-800/80 border border-purple-400/40 text-purple-200 flex items-center justify-center active:scale-90 shadow-md backdrop-blur-sm"
              aria-label="Build Mode"
            >
              <Hammer className="w-6 h-6 text-amber-300" />
            </button>
          </div>

          {/* Primary Action row: Interact & Attack */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                triggerVibrate(20);
                onInteract();
              }}
              className="w-14 h-14 rounded-full bg-purple-900/80 border border-indigo-400/50 text-indigo-200 flex items-center justify-center active:scale-90 shadow-lg backdrop-blur-sm"
              aria-label="Interact"
            >
              <Hand className="w-7 h-7 text-cyan-300" />
            </button>
            <button
              onClick={() => {
                triggerVibrate(25);
                onAttack();
              }}
              className="w-16 h-16 rounded-full bg-gradient-to-tr from-pink-600 to-purple-600 border-2 border-pink-300/60 text-white flex items-center justify-center active:scale-90 shadow-xl"
              aria-label="Attack"
            >
              <Sword className="w-8 h-8 text-white drop-shadow" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
