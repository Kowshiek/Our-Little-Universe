import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    this.createProceduralTextures();
  }

  create() {
    this.scene.start('BattleScene');
  }

  private createProceduralTextures() {
    // -------------------------------------------------------------
    // 1. HEART KNIGHT SPRITES (Armored Crusader with Greatsword)
    // -------------------------------------------------------------
    // Idle (48x64)
    const hkIdle = this.make.graphics({ x: 0, y: 0 });
    hkIdle.fillStyle(0x0a061c, 0.4);
    hkIdle.fillEllipse(24, 60, 20, 6); // shadow
    // Body Armor (Silver-Pink)
    hkIdle.fillStyle(0x372352, 1);
    hkIdle.fillRoundedRect(14, 24, 20, 26, 4);
    hkIdle.fillStyle(0xff2a85, 1);
    hkIdle.fillCircle(24, 32, 6); // Glowing heart chestplate
    // Helmet
    hkIdle.fillStyle(0x4c3370, 1);
    hkIdle.fillRoundedRect(16, 10, 16, 16, 4);
    hkIdle.fillStyle(0xff2a85, 1);
    hkIdle.fillRect(18, 16, 12, 4); // Glowing pink visor slit
    // Wings on Helmet
    hkIdle.fillStyle(0xff70a6, 1);
    hkIdle.fillTriangle(14, 12, 10, 4, 16, 10);
    hkIdle.fillTriangle(34, 12, 38, 4, 32, 10);
    // Greatsword on back/hand
    hkIdle.fillStyle(0xe2e8f0, 1);
    hkIdle.fillRect(36, 14, 5, 34);
    hkIdle.fillStyle(0xff2a85, 1);
    hkIdle.fillCircle(38, 12, 4); // Heart pommel
    // Legs
    hkIdle.fillStyle(0x271740, 1);
    hkIdle.fillRect(16, 48, 6, 12);
    hkIdle.fillRect(26, 48, 6, 12);
    hkIdle.generateTexture('heart_knight_idle', 48, 64);
    hkIdle.destroy();

    // Attack (64x64)
    const hkAtk = this.make.graphics({ x: 0, y: 0 });
    hkAtk.fillStyle(0x0a061c, 0.4);
    hkAtk.fillEllipse(24, 60, 22, 6);
    hkAtk.fillStyle(0x372352, 1);
    hkAtk.fillRoundedRect(12, 24, 22, 26, 4);
    hkAtk.fillStyle(0xff2a85, 1);
    hkAtk.fillCircle(22, 32, 6);
    hkAtk.fillStyle(0x4c3370, 1);
    hkAtk.fillRoundedRect(15, 10, 16, 16, 4);
    hkAtk.fillStyle(0xff2a85, 1);
    hkAtk.fillRect(18, 16, 12, 4);
    // Sweeping Sword Arc (Forward Slash)
    hkAtk.lineStyle(4, 0xff2a85, 0.9);
    hkAtk.beginPath();
    hkAtk.arc(28, 30, 28, -Math.PI / 3, Math.PI / 4, false);
    hkAtk.strokePath();
    hkAtk.fillStyle(0xffffff, 1);
    hkAtk.fillRect(34, 24, 24, 6); // Blade thrust
    hkAtk.fillStyle(0x271740, 1);
    hkAtk.fillRect(12, 48, 8, 12);
    hkAtk.fillRect(24, 48, 8, 12);
    hkAtk.generateTexture('heart_knight_attack', 64, 64);
    hkAtk.destroy();

    // Block (48x64)
    const hkBlock = this.make.graphics({ x: 0, y: 0 });
    hkBlock.fillStyle(0x0a061c, 0.4);
    hkBlock.fillEllipse(24, 60, 20, 6);
    hkBlock.fillStyle(0x2d1c44, 1);
    hkBlock.fillRoundedRect(10, 26, 18, 24, 4);
    // Big Heart Shield in front
    hkBlock.fillStyle(0xff2a85, 1);
    hkBlock.fillCircle(28, 28, 10);
    hkBlock.fillCircle(38, 28, 10);
    hkBlock.fillTriangle(19, 31, 47, 31, 33, 50);
    hkBlock.lineStyle(2, 0xffffff, 0.8);
    hkBlock.strokeCircle(33, 35, 14);
    hkBlock.generateTexture('heart_knight_block', 48, 64);
    hkBlock.destroy();

    // Heartwave Projectile (36x24)
    const waveGfx = this.make.graphics({ x: 0, y: 0 });
    waveGfx.fillStyle(0xff2a85, 0.95);
    waveGfx.fillCircle(18, 12, 11);
    waveGfx.fillStyle(0xffffff, 1);
    waveGfx.fillCircle(22, 12, 6);
    waveGfx.lineStyle(3, 0xff70a6, 0.9);
    waveGfx.strokeCircle(18, 12, 11);
    waveGfx.generateTexture('heartwave_projectile', 36, 24);
    waveGfx.destroy();

    // -------------------------------------------------------------
    // 2. CUPID SPARK SPRITES (Golden Angelic Archer)
    // -------------------------------------------------------------
    // Idle (48x64)
    const csIdle = this.make.graphics({ x: 0, y: 0 });
    csIdle.fillStyle(0x0a061c, 0.4);
    csIdle.fillEllipse(24, 60, 18, 5);
    // Angel Wings
    csIdle.fillStyle(0xffffff, 0.85);
    csIdle.fillTriangle(14, 20, 4, 10, 14, 34);
    csIdle.fillTriangle(30, 20, 40, 10, 30, 34);
    // Golden Halo
    csIdle.lineStyle(2, 0xffd166, 1);
    csIdle.strokeCircle(24, 8, 8);
    // Body & Tunic (Gold/Cyan)
    csIdle.fillStyle(0xf1f5f9, 1);
    csIdle.fillRoundedRect(16, 22, 16, 26, 4);
    csIdle.fillStyle(0xffd166, 1);
    csIdle.fillRect(16, 34, 16, 4); // Golden sash
    // Head & Blonde Hair
    csIdle.fillStyle(0xffd166, 1);
    csIdle.fillCircle(24, 16, 8);
    // Heart Bow in hand
    csIdle.lineStyle(3, 0xffd166, 1);
    csIdle.beginPath();
    csIdle.arc(36, 28, 12, -Math.PI / 2, Math.PI / 2, false);
    csIdle.strokePath();
    csIdle.generateTexture('cupid_spark_idle', 48, 64);
    csIdle.destroy();

    // Attack (64x64)
    const csAtk = this.make.graphics({ x: 0, y: 0 });
    csAtk.fillStyle(0x0a061c, 0.4);
    csAtk.fillEllipse(24, 60, 20, 5);
    csAtk.fillStyle(0xffffff, 0.9);
    csAtk.fillTriangle(12, 18, 2, 8, 12, 34);
    csAtk.fillStyle(0xf1f5f9, 1);
    csAtk.fillRoundedRect(14, 22, 18, 26, 4);
    csAtk.fillStyle(0xffd166, 1);
    csAtk.fillCircle(22, 16, 8);
    // Drawn Bow & Arrow
    csAtk.lineStyle(3, 0xffd166, 1);
    csAtk.strokeCircle(36, 28, 12);
    csAtk.fillStyle(0x38bdf8, 1);
    csAtk.fillRect(30, 26, 28, 4); // Arrow shaft
    csAtk.fillStyle(0xff2a85, 1);
    csAtk.fillCircle(58, 28, 5); // Heart arrowhead
    csAtk.generateTexture('cupid_spark_attack', 64, 64);
    csAtk.destroy();

    // Block (48x64)
    const csBlock = this.make.graphics({ x: 0, y: 0 });
    csBlock.fillStyle(0x0a061c, 0.4);
    csBlock.fillEllipse(24, 60, 18, 5);
    csBlock.fillStyle(0xffffff, 0.95);
    // Wing Guard folded in front
    csBlock.fillRoundedRect(18, 14, 22, 38, 8);
    csBlock.lineStyle(2, 0xffd166, 0.9);
    csBlock.strokeRoundedRect(18, 14, 22, 38, 8);
    csBlock.generateTexture('cupid_spark_block', 48, 64);
    csBlock.destroy();

    // Love Arrow Projectile (32x16)
    const arrowGfx = this.make.graphics({ x: 0, y: 0 });
    arrowGfx.fillStyle(0xffd166, 1);
    arrowGfx.fillRect(2, 6, 22, 4);
    arrowGfx.fillStyle(0xff2a85, 1);
    arrowGfx.fillCircle(26, 8, 6);
    arrowGfx.fillStyle(0xffffff, 1);
    arrowGfx.fillCircle(28, 8, 2.5);
    arrowGfx.generateTexture('love_arrow_projectile', 32, 16);
    arrowGfx.destroy();

    // -------------------------------------------------------------
    // 3. SHADOW VALENTINE SPRITES (Enigmatic Violet Rogue)
    // -------------------------------------------------------------
    // Idle (48x64)
    const svIdle = this.make.graphics({ x: 0, y: 0 });
    svIdle.fillStyle(0x0a061c, 0.4);
    svIdle.fillEllipse(24, 60, 18, 5);
    // Flowing Violet Cloak
    svIdle.fillStyle(0x1e1035, 1);
    svIdle.fillRoundedRect(12, 18, 22, 36, 6);
    svIdle.fillStyle(0xa855f7, 0.8);
    svIdle.fillTriangle(14, 18, 6, 48, 14, 52); // Cloak tail
    // Masked Head
    svIdle.fillStyle(0x2d174d, 1);
    svIdle.fillCircle(24, 15, 8);
    svIdle.fillStyle(0xa855f7, 1);
    svIdle.fillRect(20, 13, 8, 3); // Violet eye visor
    // Dual Daggers
    svIdle.fillStyle(0xe2e8f0, 1);
    svIdle.fillRect(10, 30, 4, 16);
    svIdle.fillRect(34, 30, 4, 16);
    svIdle.fillStyle(0xff2a85, 1);
    svIdle.fillCircle(12, 28, 3);
    svIdle.fillCircle(36, 28, 3);
    svIdle.generateTexture('shadow_valentine_idle', 48, 64);
    svIdle.destroy();

    // Attack (64x64)
    const svAtk = this.make.graphics({ x: 0, y: 0 });
    svAtk.fillStyle(0x0a061c, 0.4);
    svAtk.fillEllipse(24, 60, 20, 5);
    svAtk.fillStyle(0x1e1035, 1);
    svAtk.fillRoundedRect(12, 18, 22, 36, 6);
    svAtk.fillStyle(0x2d174d, 1);
    svAtk.fillCircle(24, 15, 8);
    // Dagger X-Slash
    svAtk.lineStyle(4, 0xa855f7, 1);
    svAtk.beginPath();
    svAtk.moveTo(28, 16);
    svAtk.lineTo(54, 42);
    svAtk.moveTo(28, 42);
    svAtk.lineTo(54, 16);
    svAtk.strokePath();
    svAtk.generateTexture('shadow_valentine_attack', 64, 64);
    svAtk.destroy();

    // Block (48x64)
    const svBlock = this.make.graphics({ x: 0, y: 0 });
    svBlock.fillStyle(0x0a061c, 0.4);
    svBlock.fillEllipse(24, 60, 18, 5);
    svBlock.fillStyle(0x1e1035, 1);
    svBlock.fillRoundedRect(12, 20, 20, 34, 4);
    // Crossed Daggers
    svBlock.lineStyle(3, 0xa855f7, 1);
    svBlock.beginPath();
    svBlock.moveTo(20, 20);
    svBlock.lineTo(32, 40);
    svBlock.moveTo(32, 20);
    svBlock.lineTo(20, 40);
    svBlock.strokePath();
    svBlock.generateTexture('shadow_valentine_block', 48, 64);
    svBlock.destroy();

    // -------------------------------------------------------------
    // 4. CRYSTAL ROSE SPRITES (Diamond Guardian)
    // -------------------------------------------------------------
    // Idle (48x64)
    const crIdle = this.make.graphics({ x: 0, y: 0 });
    crIdle.fillStyle(0x0a061c, 0.4);
    crIdle.fillEllipse(24, 60, 20, 6);
    // Diamond Gown / Armor
    crIdle.fillStyle(0x0f2b48, 1);
    crIdle.fillRoundedRect(14, 22, 20, 30, 4);
    crIdle.fillStyle(0x38bdf8, 1);
    crIdle.fillCircle(24, 30, 6); // Cyan crystal gem
    // Crown with rose
    crIdle.fillStyle(0x38bdf8, 1);
    crIdle.fillCircle(24, 15, 8);
    crIdle.fillStyle(0x34d399, 1);
    crIdle.fillCircle(24, 8, 4); // Emerald rose bud
    // Crystal Rose Shield
    crIdle.fillStyle(0x38bdf8, 0.85);
    crIdle.fillTriangle(34, 20, 44, 32, 34, 44);
    crIdle.fillTriangle(34, 20, 24, 32, 34, 44);
    crIdle.generateTexture('crystal_rose_idle', 48, 64);
    crIdle.destroy();

    // Attack (64x64)
    const crAtk = this.make.graphics({ x: 0, y: 0 });
    crAtk.fillStyle(0x0a061c, 0.4);
    crAtk.fillEllipse(24, 60, 22, 6);
    crAtk.fillStyle(0x0f2b48, 1);
    crAtk.fillRoundedRect(14, 22, 20, 30, 4);
    crAtk.fillStyle(0x38bdf8, 1);
    crAtk.fillCircle(24, 15, 8);
    // Crystal Shield Slam & Spikes
    crAtk.fillStyle(0x38bdf8, 1);
    crAtk.fillRoundedRect(34, 18, 18, 28, 4);
    crAtk.fillTriangle(52, 22, 60, 26, 52, 30);
    crAtk.fillTriangle(52, 32, 60, 36, 52, 40);
    crAtk.generateTexture('crystal_rose_attack', 64, 64);
    crAtk.destroy();

    // Block (48x64)
    const crBlock = this.make.graphics({ x: 0, y: 0 });
    crBlock.fillStyle(0x0a061c, 0.4);
    crBlock.fillEllipse(24, 60, 22, 6);
    // Giant Full Diamond Barrier
    crBlock.fillStyle(0x38bdf8, 0.8);
    crBlock.fillRoundedRect(16, 10, 28, 48, 8);
    crBlock.lineStyle(3, 0xffffff, 0.9);
    crBlock.strokeRoundedRect(16, 10, 28, 48, 8);
    crBlock.generateTexture('crystal_rose_block', 48, 64);
    crBlock.destroy();

    // Thorn Eruption (48x36)
    const thornGfx = this.make.graphics({ x: 0, y: 0 });
    thornGfx.fillStyle(0x38bdf8, 0.95);
    thornGfx.fillTriangle(12, 36, 24, 2, 36, 36);
    thornGfx.fillTriangle(2, 36, 12, 12, 22, 36);
    thornGfx.fillTriangle(26, 36, 36, 12, 46, 36);
    thornGfx.generateTexture('thorn_projectile', 48, 36);
    thornGfx.destroy();

    // -------------------------------------------------------------
    // 5. ARENA BACKGROUND & PLATFORM TEXTURES
    // -------------------------------------------------------------
    // Ground Platform (960x40)
    const platGfx = this.make.graphics({ x: 0, y: 0 });
    platGfx.fillStyle(0x1a1036, 1);
    platGfx.fillRect(0, 0, 960, 40);
    platGfx.fillStyle(0xff2a85, 0.8);
    platGfx.fillRect(0, 0, 960, 3); // Neon pink rim
    platGfx.fillStyle(0x8a65d4, 0.4);
    for (let i = 0; i < 960; i += 32) {
      platGfx.fillRect(i, 8, 2, 24);
    }
    platGfx.generateTexture('arena_ground', 960, 40);
    platGfx.destroy();

    // Heart Clash Spark (40x40)
    const clashGfx = this.make.graphics({ x: 0, y: 0 });
    clashGfx.fillStyle(0xff2a85, 1);
    clashGfx.fillCircle(20, 20, 16);
    clashGfx.fillStyle(0xffffff, 1);
    clashGfx.fillCircle(20, 20, 8);
    clashGfx.generateTexture('spark_clash', 40, 40);
    clashGfx.destroy();

    console.log('❤️🔥 Love Battle procedural fighter textures generated.');
  }
}
