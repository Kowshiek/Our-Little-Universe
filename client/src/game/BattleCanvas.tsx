import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { BattleScene } from './scenes/BattleScene';
import { FighterId, ArenaId } from '../types/combat';

export interface BattleCanvasHandle {
  setVirtualJoystick: (vector: { x: number; y: number }) => void;
  triggerLightAttack: () => void;
  triggerHeavyAttack: () => void;
  triggerSpecial: () => void;
  triggerBlock: (active: boolean) => void;
  triggerDodge: () => void;
  showHitEffect: (x: number, y: number, text: string, color?: string) => void;
  triggerHeartClash: () => void;
}

interface BattleCanvasProps {
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

export const BattleCanvas = forwardRef<BattleCanvasHandle, BattleCanvasProps>((props, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  // Expose methods to touch controller
  useImperativeHandle(ref, () => ({
    setVirtualJoystick: (vector: { x: number; y: number }) => {
      const scene = gameRef.current?.scene.getScene('BattleScene') as BattleScene;
      scene?.setVirtualJoystick(vector);
    },
    triggerLightAttack: () => {
      const scene = gameRef.current?.scene.getScene('BattleScene') as BattleScene;
      scene?.triggerLightAttack();
    },
    triggerHeavyAttack: () => {
      const scene = gameRef.current?.scene.getScene('BattleScene') as BattleScene;
      scene?.triggerHeavyAttack();
    },
    triggerSpecial: () => {
      const scene = gameRef.current?.scene.getScene('BattleScene') as BattleScene;
      scene?.triggerSpecial();
    },
    triggerBlock: (active: boolean) => {
      const scene = gameRef.current?.scene.getScene('BattleScene') as BattleScene;
      scene?.triggerBlock(active);
    },
    triggerDodge: () => {
      const scene = gameRef.current?.scene.getScene('BattleScene') as BattleScene;
      scene?.triggerDodge();
    },
    showHitEffect: (x: number, y: number, text: string, color?: string) => {
      const scene = gameRef.current?.scene.getScene('BattleScene') as BattleScene;
      scene?.showDamageText(x, y, text, color);
    },
    triggerHeartClash: () => {
      const scene = gameRef.current?.scene.getScene('BattleScene') as BattleScene;
      scene?.triggerHeartClashVisual();
    },
  }));

  // Initialize Phaser
  useEffect(() => {
    if (!containerRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 960,
      height: 540,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 900 },
          debug: false,
        },
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      backgroundColor: '#0a061c',
      scene: [BootScene, BattleScene],
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    game.events.once('ready', () => {
      const battleScene = game.scene.getScene('BattleScene') as BattleScene;
      if (battleScene) {
        battleScene.init({
          myUserId: props.myUserId,
          myFighterId: props.myFighterId,
          myDisplayName: props.myDisplayName,
          opponentUserId: props.opponentUserId,
          opponentFighterId: props.opponentFighterId,
          opponentDisplayName: props.opponentDisplayName,
          arenaId: props.arenaId,
          isTrainingMode: props.isTrainingMode,
          onSendMove: props.onSendMove,
          onPerformAttack: props.onPerformAttack,
          onDamageDummy: props.onDamageDummy,
        });
      }
    });

    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden touch-none select-none">
      <div
        ref={containerRef}
        className="w-full h-full max-w-5xl aspect-[16/9] shadow-2xl rounded-2xl overflow-hidden border border-purple-500/30"
      />
    </div>
  );
});
