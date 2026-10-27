import Phaser from 'phaser';

export interface PlanetSceneData {
  onPlayerMove?: (x: number, y: number, safeX: number, safeY: number) => void;
  onCollectStar?: (starId: number) => void;
  onInteractPortal?: () => void;
  onAttack?: (damage: number) => void;
  onInteractObject?: (obj: any) => void;
  initialPlayerX?: number;
  initialPlayerY?: number;
  avatarColor?: string;
  displayName?: string;
  placedObjects?: any[];
  activeStars?: number[];
  portalUnlocked?: boolean;
}

export class PlanetScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private playerNameText!: Phaser.GameObjects.Text;
  private partnerSprite?: Phaser.Physics.Arcade.Sprite;
  private partnerNameText?: Phaser.GameObjects.Text;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    interact: Phaser.Input.Keyboard.Key;
    attack: Phaser.Input.Keyboard.Key;
  };

  private starsGroup!: Phaser.Physics.Arcade.StaticGroup;
  private placedObjectsGroup!: Phaser.GameObjects.Group;
  private portalSprite!: Phaser.GameObjects.Sprite;
  private portalGlow!: Phaser.GameObjects.Arc;
  private portalText!: Phaser.GameObjects.Text;

  private sceneData: PlanetSceneData = {};
  private virtualMoveVector = { x: 0, y: 0 };
  private lastSentPos = { x: 0, y: 0 };
  private safePosition = { x: 400, y: 350 };
  private moveTimer = 0;

  // Projectiles
  private projectiles!: Phaser.Physics.Arcade.Group;

  constructor() {
    super('PlanetScene');
  }

  init(data: PlanetSceneData) {
    this.sceneData = data;
    if (data.initialPlayerX && data.initialPlayerY) {
      this.safePosition = { x: data.initialPlayerX, y: data.initialPlayerY };
    }
  }

  create() {
    const worldWidth = 1200;
    const worldHeight = 900;
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

    // 1. Draw Starry Void Background
    for (let x = 0; x < worldWidth; x += 64) {
      for (let y = 0; y < worldHeight; y += 64) {
        this.add.image(x + 32, y + 32, 'tile_void').setDepth(0);
      }
    }

    // 2. Draw Floating Island Surface
    const islandStartX = 180;
    const islandStartY = 120;
    const islandWidth = 840;
    const islandHeight = 660;

    // Island rim / drop shadow
    const shadow = this.add.graphics();
    shadow.fillStyle(0x070414, 0.7);
    shadow.fillRoundedRect(islandStartX - 10, islandStartY + 20, islandWidth + 20, islandHeight + 20, 36);
    shadow.setDepth(1);

    // Island terrain
    for (let x = islandStartX; x < islandStartX + islandWidth; x += 64) {
      for (let y = islandStartY; y < islandStartY + islandHeight; y += 64) {
        this.add.image(x + 32, y + 32, 'tile_grass').setDepth(2);
      }
    }

    // 3. Island Edge Collision Boundaries
    const islandBounds = this.physics.add.staticGroup();
    // Top, bottom, left, right invisible barriers
    const topWall = this.add.zone(islandStartX + islandWidth / 2, islandStartY + 10, islandWidth, 20);
    const bottomWall = this.add.zone(islandStartX + islandWidth / 2, islandStartY + islandHeight - 10, islandWidth, 20);
    const leftWall = this.add.zone(islandStartX + 10, islandStartY + islandHeight / 2, 20, islandHeight);
    const rightWall = this.add.zone(islandStartX + islandWidth - 10, islandStartY + islandHeight / 2, 20, islandHeight);

    [topWall, bottomWall, leftWall, rightWall].forEach((wall) => {
      this.physics.add.existing(wall, true);
      islandBounds.add(wall);
    });

    // 4. Cozy Cottage (Home base)
    const cottage = this.physics.add.staticImage(400, 220, 'cottage').setDepth(10);
    cottage.setSize(80, 50).setOffset(8, 40);

    // 5. Ancient Portal (Eastern edge)
    this.portalGlow = this.add.circle(900, 450, 42, 0x8a65d4, 0.3).setDepth(8);
    this.tweens.add({
      targets: this.portalGlow,
      scaleX: 1.25,
      scaleY: 1.25,
      alpha: 0.6,
      yoyo: true,
      repeat: -1,
      duration: 1800,
    });

    this.portalSprite = this.add.sprite(900, 450, 'ancient_portal').setDepth(9);
    this.tweens.add({
      targets: this.portalSprite,
      angle: 360,
      repeat: -1,
      duration: 12000,
    });

    const portalStatusText = this.sceneData.portalUnlocked ? '✨ Stargate (OPEN)' : '🔒 Stargate (Locked)';
    this.portalText = this.add.text(900, 400, portalStatusText, {
      fontFamily: 'Nunito, sans-serif',
      fontSize: '12px',
      color: '#ffd166',
      stroke: '#140e36',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(11);

    // 6. Placed Objects Group
    this.placedObjectsGroup = this.add.group();
    this.renderPlacedDecorations();

    // 7. Collectible Stars
    this.starsGroup = this.physics.add.staticGroup();
    this.spawnStars();

    // 8. Projectiles group
    this.projectiles = this.physics.add.group({
      defaultKey: 'star_projectile',
      maxSize: 30,
    });

    // 9. Main Player Character
    const startX = this.sceneData.initialPlayerX || 400;
    const startY = this.sceneData.initialPlayerY || 350;

    this.player = this.physics.add.sprite(startX, startY, 'explorer_char').setDepth(20);
    this.player.setCollideWorldBounds(true);
    this.player.setSize(24, 20).setOffset(6, 22);

    // Apply avatar color tint
    if (this.sceneData.avatarColor) {
      const hexColor = parseInt(this.sceneData.avatarColor.replace('#', '0x'), 16);
      this.player.setTint(hexColor);
    }

    // Name tag
    this.playerNameText = this.add.text(startX, startY - 32, this.sceneData.displayName || 'Player', {
      fontFamily: 'Nunito, sans-serif',
      fontSize: '12px',
      color: '#ffffff',
      stroke: '#0b081d',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(25);

    // 10. Partner Sprite (Prepared for remote player)
    this.partnerSprite = this.physics.add.sprite(-100, -100, 'explorer_char').setDepth(19);
    this.partnerSprite.setVisible(false);
    this.partnerNameText = this.add.text(-100, -100, 'Partner', {
      fontFamily: 'Nunito, sans-serif',
      fontSize: '12px',
      color: '#fbcfe8',
      stroke: '#0b081d',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(24).setVisible(false);

    // 11. Collisions
    this.physics.add.collider(this.player, islandBounds);
    this.physics.add.collider(this.player, cottage);

    // Star collection overlap
    this.physics.add.overlap(this.player, this.starsGroup, (p, starObj) => {
      const star = starObj as Phaser.Physics.Arcade.Image;
      const starId = star.getData('starId');
      this.collectStar(star, starId);
    });

    // Portal overlap
    this.physics.add.overlap(this.player, this.portalSprite, () => {
      if (this.sceneData.onInteractPortal) {
        this.sceneData.onInteractPortal();
      }
    });

    // 12. Camera setup
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setZoom(1.15);

    // 13. Input setup
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

    // Spacebar attack trigger
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.performAttack();
    });

    // E key interact
    this.input.keyboard?.on('keydown-E', () => {
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, 900, 450) < 90) {
        this.sceneData.onInteractPortal?.();
      }
    });

    // Handle touch tap for mobile interaction
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.wasTouch) {
        // Check if tapped near portal
        const worldPoint = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
        if (Phaser.Math.Distance.Between(worldPoint.x, worldPoint.y, 900, 450) < 60) {
          this.sceneData.onInteractPortal?.();
        }
      }
    });
  }

  update(time: number, delta: number) {
    if (!this.player || !this.player.body) return;

    const speed = 190;
    let vx = 0;
    let vy = 0;

    // Keyboard inputs
    if (this.cursors.left.isDown || this.wasd?.left.isDown) vx -= 1;
    if (this.cursors.right.isDown || this.wasd?.right.isDown) vx += 1;
    if (this.cursors.up.isDown || this.wasd?.up.isDown) vy -= 1;
    if (this.cursors.down.isDown || this.wasd?.down.isDown) vy += 1;

    // Mobile Virtual Joystick inputs
    if (this.virtualMoveVector.x !== 0 || this.virtualMoveVector.y !== 0) {
      vx = this.virtualMoveVector.x;
      vy = this.virtualMoveVector.y;
    }

    // Normalize diagonal velocity
    if (vx !== 0 && vy !== 0) {
      const length = Math.hypot(vx, vy);
      vx /= length;
      vy /= length;
    }

    this.player.setVelocity(vx * speed, vy * speed);

    if (vx < 0) this.player.setFlipX(true);
    else if (vx > 0) this.player.setFlipX(false);

    // Update name tag position
    this.playerNameText.setPosition(this.player.x, this.player.y - 32);

    // Record safe coordinates when player is safely inside island
    if (
      this.player.x >= 220 &&
      this.player.x <= 980 &&
      this.player.y >= 160 &&
      this.player.y <= 740
    ) {
      this.safePosition = { x: this.player.x, y: this.player.y };
    }

    // Debounced movement broadcast
    this.moveTimer += delta;
    if (this.moveTimer > 60) {
      this.moveTimer = 0;
      const moved = Math.hypot(this.player.x - this.lastSentPos.x, this.player.y - this.lastSentPos.y) > 2;
      if (moved && this.sceneData.onPlayerMove) {
        this.lastSentPos = { x: this.player.x, y: this.player.y };
        this.sceneData.onPlayerMove(this.player.x, this.player.y, this.safePosition.x, this.safePosition.y);
      }
    }
  }

  public setVirtualJoystick(vector: { x: number; y: number }) {
    this.virtualMoveVector = vector;
  }

  public performAttack() {
    if (!this.player) return;

    // Spawn magical stardust projectile
    const proj = this.projectiles.get(this.player.x, this.player.y - 6);
    if (proj) {
      proj.setActive(true);
      proj.setVisible(true);
      proj.setDepth(22);
      const angle = this.player.flipX ? Math.PI : 0;
      proj.setVelocity(Math.cos(angle) * 350, Math.sin(angle) * 350);

      // Flash stardust glow
      this.tweens.add({
        targets: proj,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 200,
        yoyo: true,
      });

      // Auto destroy after 800ms
      this.time.delayedCall(800, () => {
        if (proj.active) {
          proj.setActive(false);
          proj.setVisible(false);
        }
      });

      this.sceneData.onAttack?.(20);
    }
  }

  private collectStar(star: Phaser.Physics.Arcade.Image, starId: number) {
    // Pop animation
    this.tweens.add({
      targets: star,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 250,
      onComplete: () => {
        star.destroy();
      },
    });

    // Notify listeners
    this.sceneData.onCollectStar?.(starId);
  }

  private spawnStars() {
    const starPositions = [
      { id: 1, x: 280, y: 380 },
      { id: 2, x: 550, y: 240 },
      { id: 3, x: 720, y: 320 },
      { id: 4, x: 380, y: 560 },
      { id: 5, x: 680, y: 580 },
    ];

    const activeList = this.sceneData.activeStars || [1, 2, 3, 4, 5];

    starPositions.forEach((pos) => {
      if (activeList.includes(pos.id)) {
        const star = this.starsGroup.create(pos.x, pos.y, 'magical_star') as Phaser.Physics.Arcade.Image;
        star.setData('starId', pos.id);
        star.setDepth(12);

        // Gentle floating animation
        this.tweens.add({
          targets: star,
          y: pos.y - 8,
          duration: 1400 + pos.id * 100,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    });
  }

  public updateActiveStars(activeIds: number[]) {
    this.starsGroup.getChildren().forEach((child) => {
      const star = child as Phaser.Physics.Arcade.Image;
      const starId = star.getData('starId');
      if (!activeIds.includes(starId)) {
        star.destroy();
      }
    });
  }

  public updatePortalStatus(unlocked: boolean) {
    if (this.portalText) {
      this.portalText.setText(unlocked ? '✨ Stargate (OPEN)' : '🔒 Stargate (Locked)');
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

    // Smooth lerp to target position to prevent jitter
    this.tweens.add({
      targets: [this.partnerSprite],
      x: data.x,
      y: data.y,
      duration: 80,
      ease: 'Linear',
    });

    this.partnerNameText.setPosition(data.x, data.y - 32);
  }

  public showFloatingEmote(x: number, y: number, emote: string, senderName: string) {
    const emoteMap: Record<string, string> = {
      heart: '💖',
      kiss: '💋',
      hug: '🤗',
      sparkle: '✨',
      wave: '👋',
      cheer: '🎉',
    };
    const icon = emoteMap[emote] || '💖';

    const text = this.add.text(x, y - 40, `${icon} ${senderName}`, {
      fontFamily: 'Nunito, sans-serif',
      fontSize: '16px',
      color: '#ffd166',
      stroke: '#140e36',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(35);

    this.tweens.add({
      targets: text,
      y: y - 85,
      alpha: 0,
      duration: 2500,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  public renderPlacedDecorations(placedObjects?: any[]) {
    const objects = placedObjects || this.sceneData.placedObjects || [];
    this.placedObjectsGroup.clear(true, true);

    objects.forEach((obj) => {
      const sprite = this.add.sprite(obj.tileX, obj.tileY, obj.objectType).setDepth(15);
      this.placedObjectsGroup.add(sprite);

      // Subtle float or animation for fountain and monument
      if (obj.objectType === 'heart_monument' || obj.objectType === 'star_fountain') {
        this.tweens.add({
          targets: sprite,
          y: obj.tileY - 4,
          duration: 1800,
          yoyo: true,
          repeat: -1,
        });
      }
    });
  }
}
