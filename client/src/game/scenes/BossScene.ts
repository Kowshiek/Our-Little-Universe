import Phaser from 'phaser';

export interface BossSceneData {
  onAttack?: (damage: number) => void;
  onReturnToIsland?: () => void;
  initialPlayerX?: number;
  initialPlayerY?: number;
  avatarColor?: string;
  displayName?: string;
  bossState?: {
    health: number;
    maxHealth: number;
    phase: number;
    isAlive: boolean;
  };
}

export class BossScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private playerNameText!: Phaser.GameObjects.Text;
  private partnerSprite?: Phaser.Physics.Arcade.Sprite;
  private partnerNameText?: Phaser.GameObjects.Text;
  private bossSprite!: Phaser.Physics.Arcade.Sprite;
  private bossHealthBarBg!: Phaser.GameObjects.Rectangle;
  private bossHealthBarFill!: Phaser.GameObjects.Rectangle;
  private bossHealthText!: Phaser.GameObjects.Text;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    interact: Phaser.Input.Keyboard.Key;
    attack: Phaser.Input.Keyboard.Key;
  };

  private projectiles!: Phaser.Physics.Arcade.Group;
  private returnPortal!: Phaser.GameObjects.Sprite;
  private sceneData: BossSceneData = {};
  private virtualMoveVector = { x: 0, y: 0 };
  private currentBossHealth = 300;
  private maxBossHealth = 300;

  constructor() {
    super('BossScene');
  }

  init(data: BossSceneData) {
    this.sceneData = data;
    if (data.bossState) {
      this.currentBossHealth = data.bossState.health;
      this.maxBossHealth = data.bossState.maxHealth;
    }
  }

  create() {
    const arenaWidth = 1000;
    const arenaHeight = 800;
    this.physics.world.setBounds(0, 0, arenaWidth, arenaHeight);

    // 1. Cosmic Void Floor
    for (let x = 0; x < arenaWidth; x += 64) {
      for (let y = 0; y < arenaHeight; y += 64) {
        this.add.image(x + 32, y + 32, 'tile_void').setDepth(0);
      }
    }

    // 2. Glowing Nebula Arena Ring
    const arenaGlow = this.add.circle(500, 400, 320, 0xec4899, 0.08).setDepth(1);
    const arenaRing = this.add.circle(500, 400, 310, 0x140e36, 0.85).setDepth(2);
    const arenaBorder = this.add.graphics().setDepth(3);
    arenaBorder.lineStyle(4, 0x8a65d4, 0.8);
    arenaBorder.strokeCircle(500, 400, 310);
    arenaBorder.lineStyle(2, 0xf472b6, 0.6);
    arenaBorder.strokeCircle(500, 400, 240);

    // 3. Return Portal (South edge)
    this.returnPortal = this.add.sprite(500, 680, 'ancient_portal').setDepth(9);
    this.tweens.add({
      targets: this.returnPortal,
      angle: 360,
      repeat: -1,
      duration: 12000,
    });
    this.add.text(500, 630, '🌌 Return to Lumina Island', {
      fontFamily: 'Nunito, sans-serif',
      fontSize: '12px',
      color: '#ffd166',
      stroke: '#140e36',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10);

    // 4. Starlight Golem Boss
    this.bossSprite = this.physics.add.sprite(500, 320, 'starlight_golem').setDepth(15);
    this.bossSprite.setImmovable(true);
    this.bossSprite.setSize(70, 80).setOffset(13, 20);

    // Floating breathing animation
    this.tweens.add({
      targets: this.bossSprite,
      y: 310,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Boss Name & Health Bar
    this.add.text(500, 200, '👑 STARLIGHT GOLEM - CELESTIAL GUARDIAN', {
      fontFamily: 'Nunito, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ffd166',
      stroke: '#0b081d',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(25);

    this.bossHealthBarBg = this.add.rectangle(500, 225, 260, 14, 0x1e164f).setDepth(25);
    this.bossHealthBarFill = this.add.rectangle(500, 225, 256, 10, 0xec4899).setDepth(26);
    this.bossHealthText = this.add.text(500, 225, `${this.currentBossHealth} / ${this.maxBossHealth} HP`, {
      fontFamily: 'Nunito, sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(27);

    // 5. Projectiles Group
    this.projectiles = this.physics.add.group({
      defaultKey: 'star_projectile',
      maxSize: 30,
    });

    // 6. Player
    this.player = this.physics.add.sprite(500, 580, 'explorer_char').setDepth(20);
    this.player.setCollideWorldBounds(true);
    this.player.setSize(24, 20).setOffset(6, 22);

    if (this.sceneData.avatarColor) {
      const hex = parseInt(this.sceneData.avatarColor.replace('#', '0x'), 16);
      this.player.setTint(hex);
    }

    this.playerNameText = this.add.text(500, 548, this.sceneData.displayName || 'Player', {
      fontFamily: 'Nunito, sans-serif',
      fontSize: '12px',
      color: '#ffffff',
      stroke: '#0b081d',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(25);

    // Partner Sprite
    this.partnerSprite = this.physics.add.sprite(-100, -100, 'explorer_char').setDepth(19);
    this.partnerSprite.setVisible(false);
    this.partnerNameText = this.add.text(-100, -100, 'Partner', {
      fontFamily: 'Nunito, sans-serif',
      fontSize: '12px',
      color: '#fbcfe8',
      stroke: '#0b081d',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(24).setVisible(false);

    // Projectile hits Boss
    this.physics.add.overlap(this.projectiles, this.bossSprite, (bossObj, projObj) => {
      const proj = projObj as Phaser.Physics.Arcade.Image;
      if (proj.active) {
        proj.setActive(false);
        proj.setVisible(false);

        // Flash boss hit
        this.tweens.add({
          targets: this.bossSprite,
          alpha: 0.5,
          duration: 80,
          yoyo: true,
          repeat: 1,
        });

        // Trigger authoritative attack event
        this.sceneData.onAttack?.(25);
      }
    });

    // Return Portal overlap
    this.physics.add.overlap(this.player, this.returnPortal, () => {
      this.sceneData.onReturnToIsland?.();
    });

    // Camera
    this.cameras.main.setBounds(0, 0, arenaWidth, arenaHeight);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setZoom(1.1);

    // Inputs
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = {
        up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        interact: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
        attack: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      };
    }

    this.input.keyboard?.on('keydown-SPACE', () => {
      this.performAttack();
    });
  }

  update(time: number, delta: number) {
    if (!this.player || !this.player.body) return;

    const speed = 190;
    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown || this.wasd?.left.isDown) vx -= 1;
    if (this.cursors.right.isDown || this.wasd?.right.isDown) vx += 1;
    if (this.cursors.up.isDown || this.wasd?.up.isDown) vy -= 1;
    if (this.cursors.down.isDown || this.wasd?.down.isDown) vy += 1;

    if (this.virtualMoveVector.x !== 0 || this.virtualMoveVector.y !== 0) {
      vx = this.virtualMoveVector.x;
      vy = this.virtualMoveVector.y;
    }

    if (vx !== 0 && vy !== 0) {
      const len = Math.hypot(vx, vy);
      vx /= len;
      vy /= len;
    }

    this.player.setVelocity(vx * speed, vy * speed);

    if (vx < 0) this.player.setFlipX(true);
    else if (vx > 0) this.player.setFlipX(false);

    this.playerNameText.setPosition(this.player.x, this.player.y - 32);
  }

  public setVirtualJoystick(vector: { x: number; y: number }) {
    this.virtualMoveVector = vector;
  }

  public performAttack() {
    if (!this.player) return;

    // Aim towards boss
    const dx = this.bossSprite.x - this.player.x;
    const dy = this.bossSprite.y - this.player.y;
    const angle = Math.atan2(dy, dx);

    const proj = this.projectiles.get(this.player.x, this.player.y - 8);
    if (proj) {
      proj.setActive(true);
      proj.setVisible(true);
      proj.setDepth(22);
      proj.setVelocity(Math.cos(angle) * 450, Math.sin(angle) * 450);

      this.time.delayedCall(1200, () => {
        if (proj.active) {
          proj.setActive(false);
          proj.setVisible(false);
        }
      });
    }
  }

  public updateBossHealth(health: number, maxHealth = 300, phase = 1) {
    this.currentBossHealth = Math.max(0, health);
    const pct = Math.max(0, this.currentBossHealth / maxHealth);
    this.bossHealthBarFill.width = 256 * pct;
    this.bossHealthText.setText(`${this.currentBossHealth} / ${maxHealth} HP (Phase ${phase})`);

    if (health <= 0) {
      // Boss defeat death animation
      this.tweens.add({
        targets: this.bossSprite,
        scaleX: 1.4,
        scaleY: 1.4,
        alpha: 0,
        angle: 180,
        duration: 1500,
        ease: 'Cubic.easeOut',
      });
    }
  }

  public updatePartner(data: {
    x: number;
    y: number;
    isOnline: boolean;
    displayName: string;
    avatarColor?: string;
  }) {
    if (!this.partnerSprite || !this.partnerNameText) return;

    if (!data.isOnline) {
      this.partnerSprite.setVisible(false);
      this.partnerNameText.setVisible(false);
      return;
    }

    this.partnerSprite.setVisible(true);
    this.partnerNameText.setVisible(true);
    this.partnerNameText.setText(data.displayName);

    if (data.avatarColor) {
      const hex = parseInt(data.avatarColor.replace('#', '0x'), 16);
      this.partnerSprite.setTint(hex);
    }

    this.partnerSprite.setPosition(data.x, data.y);
    this.partnerNameText.setPosition(data.x, data.y - 32);
  }
}
