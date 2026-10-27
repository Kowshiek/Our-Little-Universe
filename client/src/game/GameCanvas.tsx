import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PlanetScene } from './scenes/PlanetScene';
import { BossScene } from './scenes/BossScene';
import { useUniverse } from '../context/UniverseContext';
import { useAuth } from '../context/AuthContext';
import { socketService } from '../services/socket';

export interface GameCanvasHandle {
  setVirtualJoystick: (vector: { x: number; y: number }) => void;
  triggerAttack: () => void;
  switchScene: (sceneKey: 'PlanetScene' | 'BossScene') => void;
}

interface GameCanvasProps {
  onPortalPrompt?: () => void;
}

export const GameCanvas = forwardRef<GameCanvasHandle, GameCanvasProps>(({ onPortalPrompt }, ref) => {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);
  const currentSceneKeyRef = useRef<'PlanetScene' | 'BossScene'>('PlanetScene');

  const {
    gameData,
    partner,
    partnerOnline,
    activeStars,
    recentEmote,
    bossState,
    recordPlayerMove,
    attackBoss,
    claimReward,
  } = useUniverse();

  const { user } = useAuth();

  // Expose methods to mobile touch controls
  useImperativeHandle(ref, () => ({
    setVirtualJoystick: (vector: { x: number; y: number }) => {
      if (!phaserGameRef.current) return;
      const activeScene = phaserGameRef.current.scene.getScene(currentSceneKeyRef.current);
      if (activeScene && 'setVirtualJoystick' in activeScene) {
        (activeScene as any).setVirtualJoystick(vector);
      }
    },
    triggerAttack: () => {
      if (!phaserGameRef.current) return;
      const activeScene = phaserGameRef.current.scene.getScene(currentSceneKeyRef.current);
      if (activeScene && 'performAttack' in activeScene) {
        (activeScene as any).performAttack();
      }
    },
    switchScene: (targetScene: 'PlanetScene' | 'BossScene') => {
      if (!phaserGameRef.current) return;
      const current = phaserGameRef.current.scene.getScene(currentSceneKeyRef.current);
      if (current) {
        current.scene.stop();
        phaserGameRef.current.scene.start(targetScene);
        currentSceneKeyRef.current = targetScene;
      }
    },
  }));

  // Initialize Phaser Game instance
  useEffect(() => {
    if (!gameContainerRef.current) return;

    const initialX = gameData?.player.lastSafeX || 400;
    const initialY = gameData?.player.lastSafeY || 350;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: gameContainerRef.current,
      width: 960,
      height: 600,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false,
        },
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      backgroundColor: '#0b081d',
      scene: [BootScene, PlanetScene, BossScene],
    };

    const game = new Phaser.Game(config);
    phaserGameRef.current = game;

    // Send initial configuration to PlanetScene once ready
    game.events.once('ready', () => {
      const planetScene = game.scene.getScene('PlanetScene') as PlanetScene;
      if (planetScene) {
        planetScene.init({
          initialPlayerX: initialX,
          initialPlayerY: initialY,
          displayName: user?.displayName || 'Player',
          avatarColor: user?.avatarColor || '#ec4899',
          placedObjects: gameData?.placedObjects || [],
          activeStars: activeStars,
          portalUnlocked: !!gameData?.state.portalUnlocked,
          onPlayerMove: (x, y, safeX, safeY) => {
            recordPlayerMove(currentSceneKeyRef.current === 'BossScene' ? 'nebula_arena' : 'planet_lumina', x, y, safeX, safeY);
          },
          onCollectStar: (starId) => {
            socketService.collectStar(starId);
          },
          onInteractPortal: () => {
            if (onPortalPrompt) onPortalPrompt();
          },
          onAttack: (dmg) => {
            attackBoss(dmg);
          },
        });
      }
    });

    return () => {
      game.destroy(true);
      phaserGameRef.current = null;
    };
  }, []);

  // Sync Partner Updates into Phaser
  useEffect(() => {
    if (!phaserGameRef.current || !partner) return;
    const activeScene = phaserGameRef.current.scene.getScene(currentSceneKeyRef.current);
    if (activeScene && 'updatePartner' in activeScene) {
      (activeScene as any).updatePartner({
        x: partner.x,
        y: partner.y,
        isOnline: partnerOnline,
        displayName: partner.displayName,
        avatarColor: partner.avatarColor,
      });
    }
  }, [partner, partnerOnline]);

  // Sync Collectible Stars update
  useEffect(() => {
    if (!phaserGameRef.current || currentSceneKeyRef.current !== 'PlanetScene') return;
    const planetScene = phaserGameRef.current.scene.getScene('PlanetScene') as PlanetScene;
    if (planetScene && 'updateActiveStars' in planetScene) {
      planetScene.updateActiveStars(activeStars);
    }
  }, [activeStars]);

  // Sync Placed Decorations update
  useEffect(() => {
    if (!phaserGameRef.current || currentSceneKeyRef.current !== 'PlanetScene') return;
    const planetScene = phaserGameRef.current.scene.getScene('PlanetScene') as PlanetScene;
    if (planetScene && 'renderPlacedDecorations' in planetScene) {
      planetScene.renderPlacedDecorations(gameData?.placedObjects);
    }
  }, [gameData?.placedObjects]);

  // Sync Portal Status
  useEffect(() => {
    if (!phaserGameRef.current || currentSceneKeyRef.current !== 'PlanetScene') return;
    const planetScene = phaserGameRef.current.scene.getScene('PlanetScene') as PlanetScene;
    if (planetScene && 'updatePortalStatus' in planetScene) {
      planetScene.updatePortalStatus(!!gameData?.state.portalUnlocked);
    }
  }, [gameData?.state.portalUnlocked]);

  // Sync Boss Health in BossScene
  useEffect(() => {
    if (!phaserGameRef.current || currentSceneKeyRef.current !== 'BossScene' || !bossState) return;
    const bossScene = phaserGameRef.current.scene.getScene('BossScene') as BossScene;
    if (bossScene && 'updateBossHealth' in bossScene) {
      bossScene.updateBossHealth(bossState.health, bossState.maxHealth, bossState.phase);
    }
  }, [bossState]);

  // Sync Floating Emotes
  useEffect(() => {
    if (!phaserGameRef.current || !recentEmote) return;
    const activeScene = phaserGameRef.current.scene.getScene(currentSceneKeyRef.current);
    if (activeScene && 'showFloatingEmote' in activeScene) {
      (activeScene as any).showFloatingEmote(recentEmote.x, recentEmote.y, recentEmote.emote, recentEmote.displayName);
    }
  }, [recentEmote]);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden touch-none select-none">
      <div ref={gameContainerRef} className="w-full h-full max-w-5xl aspect-[16/10] shadow-2xl rounded-2xl overflow-hidden border border-purple-500/20" />
    </div>
  );
});
