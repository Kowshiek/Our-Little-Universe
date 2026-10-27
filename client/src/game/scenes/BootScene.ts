import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Generate all vector and canvas textures procedurally for zero asset-loading lag
    this.createProceduralTextures();
  }

  create() {
    this.scene.start('PlanetScene');
  }

  private createProceduralTextures() {
    // 1. Cosmic Grass Tile (64x64)
    const grassGfx = this.make.graphics({ x: 0, y: 0 });
    grassGfx.fillStyle(0x27174e, 1);
    grassGfx.fillRect(0, 0, 64, 64);
    // Add subtle stardust speckles
    grassGfx.fillStyle(0x3e2675, 1);
    grassGfx.fillRect(8, 12, 4, 4);
    grassGfx.fillRect(40, 36, 4, 4);
    grassGfx.fillRect(24, 52, 4, 4);
    grassGfx.fillStyle(0xa78bfa, 0.4);
    grassGfx.fillCircle(18, 20, 2);
    grassGfx.fillCircle(50, 48, 2);
    grassGfx.generateTexture('tile_grass', 64, 64);
    grassGfx.destroy();

    // 2. Cosmic Void / Water Tile (64x64)
    const voidGfx = this.make.graphics({ x: 0, y: 0 });
    voidGfx.fillStyle(0x0a061c, 1);
    voidGfx.fillRect(0, 0, 64, 64);
    voidGfx.fillStyle(0x1a103c, 0.6);
    voidGfx.fillCircle(32, 32, 24);
    voidGfx.fillStyle(0x38bdf8, 0.3);
    voidGfx.fillCircle(20, 20, 1.5);
    voidGfx.fillCircle(45, 40, 2);
    voidGfx.generateTexture('tile_void', 64, 64);
    voidGfx.destroy();

    // 3. Cute Celestial Cottage (96x96)
    const homeGfx = this.make.graphics({ x: 0, y: 0 });
    // House base
    homeGfx.fillStyle(0x3b256d, 1);
    homeGfx.fillRoundedRect(16, 36, 64, 52, 6);
    // Roof (Cosmic Pink)
    homeGfx.fillStyle(0xec4899, 1);
    homeGfx.fillTriangle(10, 38, 48, 8, 86, 38);
    // Roof trim
    homeGfx.lineStyle(3, 0xf472b6, 1);
    homeGfx.strokeTriangle(10, 38, 48, 8, 86, 38);
    // Door
    homeGfx.fillStyle(0x1e123a, 1);
    homeGfx.fillRoundedRect(38, 54, 20, 34, 4);
    // Door knob (Gold)
    homeGfx.fillStyle(0xffd166, 1);
    homeGfx.fillCircle(54, 72, 2.5);
    // Glowing Windows
    homeGfx.fillStyle(0xfff3b0, 0.9);
    homeGfx.fillRoundedRect(22, 48, 12, 14, 2);
    homeGfx.fillRoundedRect(62, 48, 12, 14, 2);
    // Chimney with heart puff
    homeGfx.fillStyle(0x4c2f8a, 1);
    homeGfx.fillRect(66, 14, 10, 18);
    homeGfx.fillStyle(0xfbcfe8, 0.8);
    homeGfx.fillCircle(71, 8, 4);
    homeGfx.fillCircle(74, 3, 3);
    homeGfx.generateTexture('cottage', 96, 96);
    homeGfx.destroy();

    // 4. Cherry Blossom Tree (64x80)
    const treeGfx = this.make.graphics({ x: 0, y: 0 });
    // Trunk
    treeGfx.fillStyle(0x382218, 1);
    treeGfx.fillRect(28, 44, 8, 32);
    // Foliage clusters (Pink lavender clouds)
    treeGfx.fillStyle(0xf472b6, 0.95);
    treeGfx.fillCircle(32, 28, 22);
    treeGfx.fillStyle(0xfbcfe8, 0.9);
    treeGfx.fillCircle(22, 34, 16);
    treeGfx.fillCircle(42, 34, 16);
    treeGfx.fillStyle(0xffe4e6, 0.95);
    treeGfx.fillCircle(32, 20, 14);
    treeGfx.generateTexture('cherry_blossom', 64, 80);
    treeGfx.destroy();

    // 5. Starlight Lamp (32x56)
    const lampGfx = this.make.graphics({ x: 0, y: 0 });
    lampGfx.fillStyle(0x4a3b68, 1);
    lampGfx.fillRect(14, 20, 4, 34);
    lampGfx.fillCircle(16, 54, 6);
    // Glowing Lantern head
    lampGfx.fillStyle(0xffd166, 1);
    lampGfx.fillCircle(16, 16, 10);
    lampGfx.fillStyle(0xffffff, 0.8);
    lampGfx.fillCircle(16, 16, 5);
    lampGfx.generateTexture('crystal_lamp', 32, 56);
    lampGfx.destroy();

    // 6. Wooden Love Bench (48x32)
    const benchGfx = this.make.graphics({ x: 0, y: 0 });
    benchGfx.fillStyle(0x5c3a21, 1);
    benchGfx.fillRoundedRect(4, 10, 40, 12, 3); // seat
    benchGfx.fillRect(8, 22, 4, 8); // legs
    benchGfx.fillRect(36, 22, 4, 8);
    // Heart backrest
    benchGfx.fillStyle(0x784c28, 1);
    benchGfx.fillRect(6, 4, 36, 6);
    benchGfx.fillStyle(0xf472b6, 1);
    benchGfx.fillCircle(24, 7, 3);
    benchGfx.generateTexture('wooden_bench', 48, 32);
    benchGfx.destroy();

    // 7. Star Fountain (56x56)
    const fountGfx = this.make.graphics({ x: 0, y: 0 });
    fountGfx.fillStyle(0x473b6b, 1);
    fountGfx.fillCircle(28, 32, 24);
    fountGfx.fillStyle(0x38bdf8, 0.85); // glowing water
    fountGfx.fillCircle(28, 32, 18);
    // Center star pedestal
    fountGfx.fillStyle(0xffd166, 1);
    fountGfx.fillCircle(28, 32, 7);
    fountGfx.generateTexture('star_fountain', 56, 56);
    fountGfx.destroy();

    // 8. Cosmic Flower (24x24)
    const flowerGfx = this.make.graphics({ x: 0, y: 0 });
    flowerGfx.fillStyle(0x34d399, 1);
    flowerGfx.fillRect(11, 14, 2, 8);
    flowerGfx.fillStyle(0xf472b6, 1);
    flowerGfx.fillCircle(12, 10, 6);
    flowerGfx.fillStyle(0xffd166, 1);
    flowerGfx.fillCircle(12, 10, 2.5);
    flowerGfx.generateTexture('cosmic_flower', 24, 24);
    flowerGfx.destroy();

    // 9. Heart Monument (64x72)
    const monuGfx = this.make.graphics({ x: 0, y: 0 });
    monuGfx.fillStyle(0x3b2a5c, 1);
    monuGfx.fillRoundedRect(12, 48, 40, 20, 4); // pedestal
    // Golden wings / base
    monuGfx.fillStyle(0xffd166, 1);
    monuGfx.fillCircle(32, 46, 8);
    // Glowing cosmic heart gem
    monuGfx.fillStyle(0xec4899, 1);
    monuGfx.fillCircle(24, 24, 12);
    monuGfx.fillCircle(40, 24, 12);
    monuGfx.fillTriangle(13, 27, 51, 27, 32, 44);
    monuGfx.generateTexture('heart_monument', 64, 72);
    monuGfx.destroy();

    // 10. Ancient Stargate Portal (72x72)
    const portalGfx = this.make.graphics({ x: 0, y: 0 });
    portalGfx.fillStyle(0x1e143f, 1);
    portalGfx.fillCircle(36, 36, 32);
    portalGfx.lineStyle(4, 0x8a65d4, 1);
    portalGfx.strokeCircle(36, 36, 30);
    portalGfx.lineStyle(2, 0x38bdf8, 0.8);
    portalGfx.strokeCircle(36, 36, 22);
    portalGfx.fillStyle(0x6366f1, 0.85);
    portalGfx.fillCircle(36, 36, 16);
    portalGfx.fillStyle(0xffffff, 0.95);
    portalGfx.fillCircle(36, 36, 5);
    portalGfx.generateTexture('ancient_portal', 72, 72);
    portalGfx.destroy();

    // 11. Collectible Magical Star (32x32)
    const starGfx = this.make.graphics({ x: 0, y: 0 });
    starGfx.fillStyle(0xffd166, 1);
    // Draw 5-pointed star
    const points = [];
    for (let i = 0; i < 10; i++) {
      const radius = i % 2 === 0 ? 14 : 6;
      const angle = (i * Math.PI) / 5 - Math.PI / 2;
      points.push(16 + radius * Math.cos(angle), 16 + radius * Math.sin(angle));
    }
    starGfx.fillPoints(points, true);
    starGfx.fillStyle(0xffffff, 0.9);
    starGfx.fillCircle(16, 16, 3.5);
    starGfx.generateTexture('magical_star', 32, 32);
    starGfx.destroy();

    // 12. Explorer Character Sprite (36x44)
    const charGfx = this.make.graphics({ x: 0, y: 0 });
    // Shadow
    charGfx.fillStyle(0x0a061c, 0.4);
    charGfx.fillEllipse(18, 41, 14, 5);
    // Body (White space suit)
    charGfx.fillStyle(0xe2e8f0, 1);
    charGfx.fillRoundedRect(8, 16, 20, 22, 6);
    // Backpack (Oxygen tank / jetpack)
    charGfx.fillStyle(0x94a3b8, 1);
    charGfx.fillRoundedRect(3, 18, 5, 14, 2);
    // Helmet (Cute round helmet)
    charGfx.fillStyle(0xf8fafc, 1);
    charGfx.fillCircle(18, 14, 11);
    // Visor (Shiny dark indigo)
    charGfx.fillStyle(0x1e1b4b, 1);
    charGfx.fillRoundedRect(11, 9, 14, 8, 3);
    // Visor reflection (cyan gleam)
    charGfx.fillStyle(0x38bdf8, 0.9);
    charGfx.fillCircle(14, 12, 1.8);
    // Feet
    charGfx.fillStyle(0x64748b, 1);
    charGfx.fillRoundedRect(9, 36, 7, 6, 2);
    charGfx.fillRoundedRect(20, 36, 7, 6, 2);
    charGfx.generateTexture('explorer_char', 36, 44);
    charGfx.destroy();

    // 13. Starlight Golem Boss (96x110)
    const bossGfx = this.make.graphics({ x: 0, y: 0 });
    // Shadow
    bossGfx.fillStyle(0x0a061c, 0.5);
    bossGfx.fillEllipse(48, 102, 36, 10);
    // Stone Body
    bossGfx.fillStyle(0x2d224d, 1);
    bossGfx.fillRoundedRect(22, 30, 52, 58, 12);
    // Glowing Core (Celestial heart)
    bossGfx.fillStyle(0xf472b6, 1);
    bossGfx.fillCircle(48, 56, 14);
    bossGfx.fillStyle(0xffffff, 0.9);
    bossGfx.fillCircle(48, 56, 6);
    // Stone Shoulders & Fists
    bossGfx.fillStyle(0x433270, 1);
    bossGfx.fillCircle(16, 42, 14);
    bossGfx.fillCircle(80, 42, 14);
    bossGfx.fillCircle(14, 76, 12);
    bossGfx.fillCircle(82, 76, 12);
    // Head & Glowing Eyes
    bossGfx.fillStyle(0x382961, 1);
    bossGfx.fillRoundedRect(30, 10, 36, 24, 6);
    bossGfx.fillStyle(0xffd166, 1);
    bossGfx.fillCircle(40, 20, 3);
    bossGfx.fillCircle(56, 20, 3);
    // Celestial Horns / Crown
    bossGfx.fillStyle(0x8a65d4, 1);
    bossGfx.fillTriangle(32, 12, 36, 2, 40, 12);
    bossGfx.fillTriangle(56, 12, 60, 2, 64, 12);
    bossGfx.generateTexture('starlight_golem', 96, 110);
    bossGfx.destroy();

    // 14. Attack projectile / stardust bullet (16x16)
    const projGfx = this.make.graphics({ x: 0, y: 0 });
    projGfx.fillStyle(0xf472b6, 1);
    projGfx.fillCircle(8, 8, 6);
    projGfx.fillStyle(0xffffff, 1);
    projGfx.fillCircle(8, 8, 3);
    projGfx.generateTexture('star_projectile', 16, 16);
    projGfx.destroy();

    console.log('🌌 Procedural textures generated in BootScene');
  }
}
