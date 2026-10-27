import Phaser from 'phaser';
import { FighterId, ArenaId, FIGHTERS, PlayerAction } from '../../types/combat';
import { soundFX } from '../../services/soundFX';

export interface BattleSceneData {
  myUserId?: string;
  myFighterId?: FighterId;
  myDisplayName?: string;
  opponentUserId?: string;
  opponentFighterId?: FighterId;
  opponentDisplayName?: string;
  arenaId?: ArenaId;
  isTrainingMode?: boolean;
  onSendMove?: (data: any) => void;
  onPerformAttack?: (attackType: 'light' | 'heavy' | 'special') => void;
  onDamageDummy?: (dmg: number) => void;
}

export class BattleScene extends Phaser.Scene {
  private p1!: Phaser.Physics.Arcade.Sprite;
  private p2!: Phaser.Physics.Arcade.Sprite;
  private ground!: Phaser.Physics.Arcade.StaticGroup;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: {
    w: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    s: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
    j: Phaser.Input.Keyboard.Key; // Light
    k: Phaser.Input.Keyboard.Key; // Heavy
    l: Phaser.Input.Keyboard.Key; // Special
    shift: Phaser.Input.Keyboard.Key; // Dodge
  };

  private sceneData: BattleSceneData = {};
  private virtualMove = { x: 0, y: 0 };
  private moveTimer = 0;
  private lastAction: PlayerAction = 'idle';

  // Combat flags
  private isBlocking = false;
  private isDodging = false;
  private dodgeTimer = 0;
  private attackAnimTimer = 0;

  // Projectiles
  private projectiles!: Phaser.Physics.Arcade.Group;

  constructor() {
    super('BattleScene');
  }

  init(data: BattleSceneData) {
    this.sceneData = data;
  }

  create() {
    const width = 960;
    const height = 540;
    this.physics.world.setBounds(0, 0, width, height);

    // 1. Draw Arena Background based on arenaId
    this.createArenaBackground(width, height);

    // 2. Ground Platform (solid physics)
    this.ground = this.physics.add.staticGroup();
    const groundSprite = this.ground.create(width / 2, 500, 'arena_ground') as Phaser.Physics.Arcade.Sprite;
    groundSprite.setDepth(5).refreshBody();

    // 3. Projectiles Group
    this.projectiles = this.physics.add.group({
      defaultKey: 'heartwave_projectile',
      maxSize: 20,
    });

    // 4. Setup Fighters
    const p1Fighter = this.sceneData.myFighterId || 'heart_knight';
    const p2Fighter = this.sceneData.opponentFighterId || (this.sceneData.isTrainingMode ? 'crystal_rose' : 'cupid_spark');

    // Player 1 (Left)
    this.p1 = this.physics.add.sprite(260, 420, `${p1Fighter}_idle`).setDepth(10);
    this.p1.setCollideWorldBounds(true);
    this.p1.setSize(32, 54).setOffset(8, 8);

    // Player 2 / Opponent / Training Dummy (Right)
    this.p2 = this.physics.add.sprite(700, 420, `${p2Fighter}_idle`).setDepth(10);
    this.p2.setCollideWorldBounds(true);
    this.p2.setSize(32, 54).setOffset(8, 8);
    this.p2.setFlipX(true);

    // Colliders with ground
    this.physics.add.collider(this.p1, this.ground);
    this.physics.add.collider(this.p2, this.ground);

    // Camera
    this.cameras.main.setBounds(0, 0, width, height);

    // 5. Input Controls
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keys = {
        w: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        a: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        s: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        d: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        j: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J),
        k: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K),
        l: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L),
        shift: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
      };

      // Attacks Keydown
      this.keys.j.on('down', () => this.triggerLightAttack());
      this.keys.k.on('down', () => this.triggerHeavyAttack());
      this.keys.l.on('down', () => this.triggerSpecial());
      this.keys.shift.on('down', () => this.triggerDodge());
    }
  }

  update(time: number, delta: number) {
    if (!this.p1 || !this.p1.body) return;

    const fighterStats = FIGHTERS[this.sceneData.myFighterId || 'heart_knight'];
    const onFloor = this.p1.body.blocked.down || this.p1.body.touching.down;

    // Handle Attack Animation Recovery
    if (this.attackAnimTimer > 0) {
      this.attackAnimTimer -= delta;
      if (this.attackAnimTimer <= 0) {
        this.p1.setTexture(`${this.sceneData.myFighterId || 'heart_knight'}_idle`);
        this.lastAction = 'idle';
      }
    }

    // Handle Dodge Timer
    if (this.isDodging) {
      this.dodgeTimer -= delta;
      if (this.dodgeTimer <= 0) {
        this.isDodging = false;
        this.p1.setAlpha(1);
      }
    }

    // Check Blocking (Holding S or Down)
    const blockKeyDown = this.keys?.s.isDown || this.cursors?.down.isDown;
    if (blockKeyDown && onFloor && !this.isDodging) {
      if (!this.isBlocking) {
        this.isBlocking = true;
        this.lastAction = 'block';
        this.p1.setTexture(`${this.sceneData.myFighterId || 'heart_knight'}_block`);
      }
      this.p1.setVelocityX(0);
      return;
    } else if (this.isBlocking) {
      this.isBlocking = false;
      this.p1.setTexture(`${this.sceneData.myFighterId || 'heart_knight'}_idle`);
      this.lastAction = 'idle';
    }

    // Movement Input
    let vx = 0;
    if (this.keys?.a.isDown || this.cursors?.left.isDown) vx -= 1;
    if (this.keys?.d.isDown || this.cursors?.right.isDown) vx += 1;

    // Virtual Joystick Movement
    if (this.virtualMove.x !== 0) {
      vx = this.virtualMove.x;
    }

    // Apply Velocity
    const speed = this.isDodging ? fighterStats.moveSpeed * 1.6 : fighterStats.moveSpeed;
    this.p1.setVelocityX(vx * speed);

    // Jump Input
    const jumpRequested = this.keys?.w.isDown || this.cursors?.up.isDown || this.virtualMove.y < -0.5;
    if (jumpRequested && onFloor && !this.isBlocking) {
      this.p1.setVelocityY(fighterStats.jumpVelocity);
      this.lastAction = 'jump';
    }

    // Auto-orient facing towards opponent unless moving backwards
    if (vx !== 0) {
      this.p1.setFlipX(vx < 0);
    } else if (this.p2) {
      this.p1.setFlipX(this.p1.x > this.p2.x);
    }

    // Broadcast movement updates to multiplayer server
    this.moveTimer += delta;
    if (this.moveTimer > 45) {
      this.moveTimer = 0;
      this.sceneData.onSendMove?.({
        x: Math.round(this.p1.x),
        y: Math.round(this.p1.y),
        vx: Math.round(this.p1.body.velocity.x),
        vy: Math.round(this.p1.body.velocity.y),
        isFacingLeft: this.p1.flipX,
        action: this.lastAction,
        isBlocking: this.isBlocking,
        isDodging: this.isDodging,
      });
    }

    // Training Dummy AI / auto behavior
    if (this.sceneData.isTrainingMode && this.p2) {
      this.p2.setFlipX(this.p2.x < this.p1.x);
    }
  }

  // Mobile Controller Hook
  public setVirtualJoystick(vector: { x: number; y: number }) {
    this.virtualMove = vector;
  }

  public triggerLightAttack() {
    if (this.isBlocking || this.isDodging || this.attackAnimTimer > 0) return;

    soundFX.playLightAttack();
    const myFighter = this.sceneData.myFighterId || 'heart_knight';
    this.p1.setTexture(`${myFighter}_attack`);
    this.attackAnimTimer = 220;
    this.lastAction = 'attack_light';

    if (this.sceneData.isTrainingMode) {
      this.handleTrainingHit(FIGHTERS[myFighter].lightDamage);
    } else {
      this.sceneData.onPerformAttack?.('light');
    }
  }

  public triggerHeavyAttack() {
    if (this.isBlocking || this.isDodging || this.attackAnimTimer > 0) return;

    soundFX.playHeavyAttack();
    const myFighter = this.sceneData.myFighterId || 'heart_knight';
    this.p1.setTexture(`${myFighter}_attack`);
    this.attackAnimTimer = 350;
    this.lastAction = 'attack_heavy';

    if (this.sceneData.isTrainingMode) {
      this.handleTrainingHit(FIGHTERS[myFighter].heavyDamage);
    } else {
      this.sceneData.onPerformAttack?.('heavy');
    }
  }

  public triggerSpecial() {
    if (this.isBlocking || this.isDodging) return;

    soundFX.playSpecialAttack();
    const myFighter = this.sceneData.myFighterId || 'heart_knight';
    this.p1.setTexture(`${myFighter}_attack`);
    this.attackAnimTimer = 450;
    this.lastAction = 'special';

    // Spawn special projectile traveling towards opponent
    this.spawnSpecialProjectile(this.p1.x, this.p1.y, this.p1.flipX, myFighter);

    if (this.sceneData.isTrainingMode) {
      this.handleTrainingHit(FIGHTERS[myFighter].specialDamage);
    } else {
      this.sceneData.onPerformAttack?.('special');
    }
  }

  public triggerBlock(active: boolean) {
    this.isBlocking = active;
    const myFighter = this.sceneData.myFighterId || 'heart_knight';
    if (active) {
      soundFX.playBlock();
      this.p1.setTexture(`${myFighter}_block`);
      this.lastAction = 'block';
    } else {
      this.p1.setTexture(`${myFighter}_idle`);
      this.lastAction = 'idle';
    }
  }

  public triggerDodge() {
    if (this.isDodging || this.isBlocking) return;

    this.isDodging = true;
    this.dodgeTimer = 280; // 280ms invulnerability window
    this.lastAction = 'dodge';
    this.p1.setAlpha(0.4); // Visual dodge ghosting

    // Quick burst forward or away
    const dir = this.p1.flipX ? -1 : 1;
    this.p1.setVelocityX(dir * 420);
  }

  // Handle Training Mode Dummy Hit
  private handleTrainingHit(damage: number) {
    const dist = Phaser.Math.Distance.Between(this.p1.x, this.p1.y, this.p2.x, this.p2.y);
    if (dist < 110) {
      // Flash dummy
      this.tweens.add({
        targets: this.p2,
        alpha: 0.3,
        duration: 80,
        yoyo: true,
        repeat: 1,
      });

      this.showDamageText(this.p2.x, this.p2.y, `-${damage}`, '#ff2a85');
      this.sceneData.onDamageDummy?.(damage);
    }
  }

  private spawnSpecialProjectile(x: number, y: number, flipX: boolean, fighterId: FighterId) {
    const projKey = fighterId === 'cupid_spark' ? 'love_arrow_projectile' :
                    fighterId === 'crystal_rose' ? 'thorn_projectile' : 'heartwave_projectile';

    const proj = this.physics.add.sprite(x + (flipX ? -30 : 30), y - 10, projKey);
    proj.setDepth(15);
    proj.setFlipX(flipX);

    const speed = flipX ? -550 : 550;
    proj.setVelocityX(speed);

    // Destroy after 1.2s
    this.time.delayedCall(1200, () => {
      proj.destroy();
    });
  }

  // Show floating damage or status text
  public showDamageText(x: number, y: number, text: string, color = '#ff2a85') {
    const txt = this.add.text(x, y - 45, text, {
      fontFamily: 'Nunito, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color,
      stroke: '#0b081d',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(30);

    this.tweens.add({
      targets: txt,
      y: y - 85,
      alpha: 0,
      duration: 850,
      ease: 'Cubic.easeOut',
      onComplete: () => txt.destroy(),
    });
  }

  // Heart Clash Dramatic Showdown Sequence
  public triggerHeartClashVisual() {
    soundFX.playHeartClash();

    // Camera shake
    this.cameras.main.shake(400, 0.015);

    // Flash central starlight burst
    const burst = this.add.sprite(480, 420, 'spark_clash').setDepth(25);
    burst.setScale(0.5);

    this.tweens.add({
      targets: burst,
      scaleX: 3.5,
      scaleY: 3.5,
      alpha: 0,
      duration: 650,
      ease: 'Cubic.easeOut',
      onComplete: () => burst.destroy(),
    });

    // Display "HEART CLASH!" banner
    const clashText = this.add.text(480, 240, '💥 HEART CLASH! 💥', {
      fontFamily: 'Nunito, sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#ffd166',
      stroke: '#ff2a85',
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(35);

    this.tweens.add({
      targets: clashText,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0,
      duration: 1200,
      ease: 'Bounce.easeOut',
      onComplete: () => clashText.destroy(),
    });
  }

  // Sync Opponent Movement from Socket
  public updateOpponent(data: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    isFacingLeft: boolean;
    action: PlayerAction;
    isBlocking?: boolean;
    isDodging?: boolean;
  }) {
    if (!this.p2 || !this.p2.body) return;

    this.p2.setFlipX(data.isFacingLeft);

    const opponentFighter = this.sceneData.opponentFighterId || 'cupid_spark';

    if (data.isBlocking) {
      this.p2.setTexture(`${opponentFighter}_block`);
    } else if (data.action === 'attack_light' || data.action === 'attack_heavy' || data.action === 'special') {
      this.p2.setTexture(`${opponentFighter}_attack`);
    } else {
      this.p2.setTexture(`${opponentFighter}_idle`);
    }

    this.p2.setAlpha(data.isDodging ? 0.4 : 1);

    // Smooth lerp to prevent network jitter
    this.tweens.add({
      targets: this.p2,
      x: data.x,
      y: data.y,
      duration: 60,
      ease: 'Linear',
    });
  }

  // Create Background for selected Arena
  private createArenaBackground(width: number, height: number) {
    const arenaId = this.sceneData.arenaId || 'heart_garden';
    const bgGfx = this.add.graphics();

    if (arenaId === 'heart_garden') {
      // Midnight Purple & Pink Sanctuary
      bgGfx.fillGradientStyle(0x19082e, 0x19082e, 0x3d1440, 0x3d1440, 1);
      bgGfx.fillRect(0, 0, width, height);

      // Distant marble arches
      bgGfx.lineStyle(4, 0xff70a6, 0.25);
      bgGfx.strokeCircle(240, 360, 120);
      bgGfx.strokeCircle(720, 360, 120);

      // Floating sakura petals
      for (let i = 0; i < 24; i++) {
        const petal = this.add.circle(
          Phaser.Math.Between(40, width - 40),
          Phaser.Math.Between(40, height - 80),
          Phaser.Math.Between(2, 4),
          0xff70a6,
          0.6
        ).setDepth(2);

        this.tweens.add({
          targets: petal,
          y: petal.y + 120,
          x: petal.x + Phaser.Math.Between(-40, 40),
          duration: Phaser.Math.Between(4000, 7000),
          repeat: -1,
          yoyo: true,
        });
      }
    } else if (arenaId === 'neon_city') {
      // Cyberpunk Neon Sky & Grid
      bgGfx.fillGradientStyle(0x0a061c, 0x0a061c, 0x1e123a, 0x1e123a, 1);
      bgGfx.fillRect(0, 0, width, height);

      // Neon horizon grid lines
      bgGfx.lineStyle(2, 0x38bdf8, 0.4);
      for (let y = 320; y < 480; y += 24) {
        bgGfx.lineBetween(0, y, width, y);
      }
      for (let x = 0; x < width; x += 64) {
        bgGfx.lineBetween(x, 320, x, 480);
      }

      // Neon Heart Hologram Billboard in center
      const neonHeart = this.add.text(width / 2, 160, '❤️', { fontSize: '64px' })
        .setOrigin(0.5)
        .setDepth(2)
        .setAlpha(0.7);

      this.tweens.add({
        targets: neonHeart,
        scaleX: 1.15,
        scaleY: 1.15,
        alpha: 0.9,
        duration: 1200,
        yoyo: true,
        repeat: -1,
      });
    } else {
      // Moonlight Celestial Arena
      bgGfx.fillGradientStyle(0x050410, 0x050410, 0x140e36, 0x140e36, 1);
      bgGfx.fillRect(0, 0, width, height);

      // Twin Crescent Moons
      const moon1 = this.add.circle(300, 140, 42, 0xffd166, 0.85).setDepth(2);
      this.add.circle(312, 134, 38, 0x050410).setDepth(2);

      const moon2 = this.add.circle(680, 160, 32, 0x38bdf8, 0.85).setDepth(2);
      this.add.circle(690, 154, 28, 0x050410).setDepth(2);
    }
  }
}
