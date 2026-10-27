import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { ThreeBattleArena } from './ThreeBattleArena';
import { FighterId, ArenaId } from '../../types/combat';

export interface ThreeBattleCanvasHandle {
  setVirtualJoystick: (vector: { x: number; y: number }) => void;
  triggerJump: () => void;
  triggerLightAttack: () => void;
  triggerHeavyAttack: () => void;
  triggerSpecial: () => void;
  triggerBlock: (active: boolean) => void;
  triggerDodge: () => void;
  showHitEffect: (x: number, y: number, text: string, color?: string) => void;
  triggerHeartClash: () => void;
}

interface ThreeBattleCanvasProps {
  myUserId?: string;
  myFighterId: FighterId;
  myDisplayName: string;
  opponentUserId?: string;
  opponentFighterId?: FighterId;
  opponentDisplayName?: string;
  arenaId: ArenaId;
  isTrainingMode?: boolean;
  onSendMove?: (data: any) => void;
  onPerformAttack?: (attackType: 'light' | 'heavy' | 'special') => void;
  onDamageDummy?: (dmg: number) => void;
}

export const ThreeBattleCanvas = forwardRef<ThreeBattleCanvasHandle, ThreeBattleCanvasProps>((props, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const arenaRef = useRef<ThreeBattleArena | null>(null);

  useImperativeHandle(ref, () => ({
    setVirtualJoystick: (vector) => {
      arenaRef.current?.setVirtualJoystick(vector);
    },
    triggerJump: () => {
      arenaRef.current?.triggerJump();
    },
    triggerLightAttack: () => {
      arenaRef.current?.triggerLightAttack();
    },
    triggerHeavyAttack: () => {
      arenaRef.current?.triggerHeavyAttack();
    },
    triggerSpecial: () => {
      arenaRef.current?.triggerSpecial();
    },
    triggerBlock: (active) => {
      arenaRef.current?.triggerBlock(active);
    },
    triggerDodge: () => {
      arenaRef.current?.triggerDodge();
    },
    showHitEffect: () => {
      // 3D hit particles are automatically managed inside ThreeBattleArena
    },
    triggerHeartClash: () => {
      arenaRef.current?.triggerHeartClashVisual();
    },
  }));

  useEffect(() => {
    if (!containerRef.current) return;

    const arena = new ThreeBattleArena({
      container: containerRef.current,
      myFighterId: props.myFighterId,
      myDisplayName: props.myDisplayName,
      opponentFighterId: props.opponentFighterId,
      opponentDisplayName: props.opponentDisplayName,
      arenaId: props.arenaId,
      isTrainingMode: props.isTrainingMode,
      onSendMove: props.onSendMove,
      onPerformAttack: props.onPerformAttack,
      onDamageDummy: props.onDamageDummy,
    });

    arenaRef.current = arena;

    return () => {
      arena.destroy();
      arenaRef.current = null;
    };
  }, [props.myFighterId, props.opponentFighterId, props.arenaId, props.isTrainingMode]);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden touch-none select-none bg-cosmic-darkest">
      <div
        ref={containerRef}
        className="w-full h-full max-w-7xl aspect-[16/9] shadow-2xl rounded-2xl overflow-hidden border border-purple-500/30 relative"
      />
    </div>
  );
});
