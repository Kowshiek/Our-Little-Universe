import * as THREE from 'three';
import { FighterId, FIGHTERS } from '../../types/combat';

export type FighterAnimState =
  | 'idle'
  | 'run'
  | 'jump'
  | 'light_attack'
  | 'heavy_attack'
  | 'special_attack'
  | 'block'
  | 'dodge'
  | 'hit'
  | 'knockdown'
  | 'victory';

export class ThreeFighter {
  public group: THREE.Group;
  public fighterId: FighterId;
  public isPlayer1: boolean;
  public displayName: string;

  // Transform & Physics
  public x = 0;
  public y = 0;
  public z = 0;
  public vx = 0;
  public vy = 0;
  public facing = 1; // 1 = right, -1 = left
  public isGrounded = true;

  // Combat State
  public health = 100;
  public maxHealth = 100;
  public energy = 0;
  public isBlocking = false;
  public isDodging = false;
  public animState: FighterAnimState = 'idle';

  // Animation Timers
  private animTimer = 0;
  private stateDuration = 0;
  private hitFlashTimer = 0;

  // Rig Hierarchy
  private hips: THREE.Group;
  private torso: THREE.Group;
  private head: THREE.Group;
  private leftArm: THREE.Group;
  private rightArm: THREE.Group;
  private leftLeg: THREE.Group;
  private rightLeg: THREE.Group;
  private weaponGroup: THREE.Group;
  private shieldMesh: THREE.Mesh;
  private slashTrailMesh: THREE.Mesh;
  private wingLeft?: THREE.Group;
  private wingRight?: THREE.Group;
  private orbitCrystals: THREE.Mesh[] = [];

  // Materials for flashing
  private primaryMaterial: THREE.MeshStandardMaterial;
  private accentMaterial: THREE.MeshStandardMaterial;
  private armorMaterial: THREE.MeshStandardMaterial;

  constructor(fighterId: FighterId, isPlayer1: boolean, displayName: string) {
    this.fighterId = fighterId;
    this.isPlayer1 = isPlayer1;
    this.displayName = displayName;
    this.facing = isPlayer1 ? 1 : -1;
    this.x = isPlayer1 ? -4.5 : 4.5;

    const stats = FIGHTERS[fighterId] || FIGHTERS.heart_knight;
    this.maxHealth = stats.maxHealth;
    this.health = stats.maxHealth;

    this.group = new THREE.Group();

    // 1. Setup Fighter Materials
    const baseColor = new THREE.Color(stats.color);
    const accentHex = isPlayer1 ? 0xff2a85 : 0x38bdf8;

    this.primaryMaterial = new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: 0.35,
      metalness: 0.5,
      emissive: baseColor,
      emissiveIntensity: 0.2,
    });

    this.accentMaterial = new THREE.MeshStandardMaterial({
      color: accentHex,
      roughness: 0.2,
      metalness: 0.8,
      emissive: accentHex,
      emissiveIntensity: 0.4,
    });

    this.armorMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e1538,
      roughness: 0.3,
      metalness: 0.7,
    });

    // 2. Build 3D Humanoid Skeleton Rig
    this.hips = new THREE.Group();
    this.hips.position.y = 1.35;
    this.group.add(this.hips);

    // Pelvis
    const pelvisGeo = new THREE.CylinderGeometry(0.3, 0.25, 0.35, 8);
    const pelvisMesh = new THREE.Mesh(pelvisGeo, this.armorMaterial);
    pelvisMesh.castShadow = true;
    this.hips.add(pelvisMesh);

    // Torso / Chest
    this.torso = new THREE.Group();
    this.torso.position.y = 0.2;
    this.hips.add(this.torso);

    const chestGeo = new THREE.BoxGeometry(0.75, 0.75, 0.45);
    const chestMesh = new THREE.Mesh(chestGeo, this.primaryMaterial);
    chestMesh.position.y = 0.4;
    chestMesh.castShadow = true;
    this.torso.add(chestMesh);

    // Glowing Heart Crest on Chest
    const crestGeo = new THREE.OctahedronGeometry(0.18, 0);
    const crestMesh = new THREE.Mesh(crestGeo, this.accentMaterial);
    crestMesh.position.set(0, 0.42, 0.26);
    crestMesh.rotation.z = Math.PI / 4;
    this.torso.add(crestMesh);

    // Head
    this.head = new THREE.Group();
    this.head.position.y = 0.9;
    this.torso.add(this.head);

    const headGeo = new THREE.SphereGeometry(0.32, 16, 16);
    const headMesh = new THREE.Mesh(headGeo, new THREE.MeshStandardMaterial({ color: 0xffdbac, roughness: 0.6 }));
    headMesh.castShadow = true;
    this.head.add(headMesh);

    // Helmet / Hair Crown
    const crownGeo = new THREE.ConeGeometry(0.35, 0.3, 6);
    const crownMesh = new THREE.Mesh(crownGeo, this.armorMaterial);
    crownMesh.position.y = 0.25;
    this.head.add(crownMesh);

    // Shoulders & Arms
    const shoulderGeo = new THREE.SphereGeometry(0.2, 8, 8);

    // Left Arm
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.5, 0.65, 0);
    this.torso.add(this.leftArm);
    const leftShoulder = new THREE.Mesh(shoulderGeo, this.armorMaterial);
    this.leftArm.add(leftShoulder);

    const limbGeo = new THREE.CylinderGeometry(0.1, 0.09, 0.6, 8);
    limbGeo.translate(0, -0.3, 0);
    const leftArmMesh = new THREE.Mesh(limbGeo, this.primaryMaterial);
    leftArmMesh.castShadow = true;
    this.leftArm.add(leftArmMesh);

    // Right Arm (Weapon Arm)
    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.5, 0.65, 0);
    this.torso.add(this.rightArm);
    const rightShoulder = new THREE.Mesh(shoulderGeo, this.armorMaterial);
    this.rightArm.add(rightShoulder);

    const rightArmMesh = new THREE.Mesh(limbGeo, this.primaryMaterial);
    rightArmMesh.castShadow = true;
    this.rightArm.add(rightArmMesh);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.13, 0.1, 0.75, 8);
    legGeo.translate(0, -0.38, 0);

    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-0.25, -0.15, 0);
    this.hips.add(this.leftLeg);
    const leftLegMesh = new THREE.Mesh(legGeo, this.armorMaterial);
    leftLegMesh.castShadow = true;
    this.leftLeg.add(leftLegMesh);

    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(0.25, -0.15, 0);
    this.hips.add(this.rightLeg);
    const rightLegMesh = new THREE.Mesh(legGeo, this.armorMaterial);
    rightLegMesh.castShadow = true;
    this.rightLeg.add(rightLegMesh);

    // 3. Fighter-Specific Weapons and 3D Props
    this.weaponGroup = new THREE.Group();
    this.weaponGroup.position.set(0, -0.55, 0.1);
    this.rightArm.add(this.weaponGroup);
    this.buildFighterWeapon(fighterId);

    // 4. Glowing 3D Defense Shield Dome
    const shieldGeo = new THREE.SphereGeometry(1.4, 16, 16, 0, Math.PI);
    const shieldMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.0,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.8,
      roughness: 0.1,
      metalness: 0.9,
      wireframe: false,
    });
    this.shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    this.shieldMesh.position.set(0, 0.9, 0.3);
    this.shieldMesh.rotation.y = Math.PI / 2;
    this.group.add(this.shieldMesh);

    // 5. Slash Arc Trail
    const slashGeo = new THREE.TorusGeometry(1.6, 0.12, 6, 24, Math.PI * 0.75);
    const slashMat = new THREE.MeshBasicMaterial({
      color: accentHex,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
    });
    this.slashTrailMesh = new THREE.Mesh(slashGeo, slashMat);
    this.slashTrailMesh.rotation.x = Math.PI / 2;
    this.slashTrailMesh.position.set(0.5, 0.8, 0);
    this.group.add(this.slashTrailMesh);

    // Initial position & scale
    this.group.position.set(this.x, this.y, this.z);
    this.group.rotation.y = this.facing === 1 ? Math.PI / 2 : -Math.PI / 2;
  }

  /**
   * Procedural 3D Weapon Construction based on Fighter Archetype
   */
  private buildFighterWeapon(id: FighterId) {
    if (id === 'heart_knight') {
      // Massive Starlight Greatsword
      const bladeGeo = new THREE.BoxGeometry(0.18, 1.8, 0.06);
      bladeGeo.translate(0, 0.85, 0);
      const bladeMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xff2a85,
        emissiveIntensity: 0.7,
        metalness: 0.9,
        roughness: 0.1,
      });
      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      blade.castShadow = true;

      const guardGeo = new THREE.BoxGeometry(0.65, 0.12, 0.14);
      const guard = new THREE.Mesh(guardGeo, this.accentMaterial);

      const hiltGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.45);
      hiltGeo.translate(0, -0.22, 0);
      const hilt = new THREE.Mesh(hiltGeo, this.armorMaterial);

      this.weaponGroup.add(blade);
      this.weaponGroup.add(guard);
      this.weaponGroup.add(hilt);
      this.weaponGroup.rotation.x = Math.PI / 4;
    } else if (id === 'cupid_spark') {
      // Golden Celestial Starlight Bow & Back Wings
      const bowGeo = new THREE.TorusGeometry(0.7, 0.06, 8, 16, Math.PI);
      const bowMat = new THREE.MeshStandardMaterial({
        color: 0xffd166,
        emissive: 0xffd166,
        emissiveIntensity: 0.6,
        metalness: 0.8,
      });
      const bow = new THREE.Mesh(bowGeo, bowMat);
      bow.rotation.y = Math.PI / 2;
      this.weaponGroup.add(bow);

      // Back Wings
      this.wingLeft = new THREE.Group();
      this.wingRight = new THREE.Group();
      this.wingLeft.position.set(-0.2, 0.5, -0.25);
      this.wingRight.position.set(0.2, 0.5, -0.25);

      const wingGeo = new THREE.ConeGeometry(0.3, 1.0, 4);
      wingGeo.translate(0, 0.4, 0);
      const wingMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffd166,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.9,
      });
      const wingMeshL = new THREE.Mesh(wingGeo, wingMat);
      wingMeshL.rotation.z = -Math.PI / 3;
      const wingMeshR = new THREE.Mesh(wingGeo, wingMat);
      wingMeshR.rotation.z = Math.PI / 3;

      this.wingLeft.add(wingMeshL);
      this.wingRight.add(wingMeshR);
      this.torso.add(this.wingLeft);
      this.torso.add(this.wingRight);
    } else if (id === 'shadow_valentine') {
      // Dual Starlight Daggers
      const daggerGeo = new THREE.BoxGeometry(0.1, 0.85, 0.04);
      daggerGeo.translate(0, 0.35, 0);
      const daggerMat = new THREE.MeshStandardMaterial({
        color: 0xa855f7,
        emissive: 0x9333ea,
        emissiveIntensity: 0.8,
      });
      const dagger = new THREE.Mesh(daggerGeo, daggerMat);
      this.weaponGroup.add(dagger);

      // Flowing Dark Scarf
      const scarfGeo = new THREE.BoxGeometry(0.2, 1.1, 0.05);
      scarfGeo.translate(0, -0.5, -0.25);
      const scarf = new THREE.Mesh(scarfGeo, this.accentMaterial);
      scarf.rotation.x = -Math.PI / 6;
      this.torso.add(scarf);
    } else {
      // Crystal Rose: Crystal Staff & Orbiting Floating Shards
      const staffGeo = new THREE.CylinderGeometry(0.05, 0.04, 1.9);
      const staffMat = new THREE.MeshStandardMaterial({ color: 0x10b981, metalness: 0.8 });
      const staff = new THREE.Mesh(staffGeo, staffMat);
      staff.position.y = 0.4;

      const crystalGeo = new THREE.OctahedronGeometry(0.22, 0);
      const crystalMat = new THREE.MeshStandardMaterial({
        color: 0x34d399,
        emissive: 0x10b981,
        emissiveIntensity: 0.9,
      });
      const headCrystal = new THREE.Mesh(crystalGeo, crystalMat);
      headCrystal.position.y = 1.35;
      this.weaponGroup.add(staff);
      this.weaponGroup.add(headCrystal);

      // Orbiting shards
      for (let i = 0; i < 4; i++) {
        const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), crystalMat);
        this.orbitCrystals.push(shard);
        this.group.add(shard);
      }
    }
  }

  /**
   * Action Triggers
   */
  public triggerLightAttack() {
    if (this.animState === 'hit' || this.animState === 'knockdown') return;
    this.animState = 'light_attack';
    this.animTimer = 0;
    this.stateDuration = 0.32;
    (this.slashTrailMesh.material as THREE.MeshBasicMaterial).opacity = 0.9;
  }

  public triggerHeavyAttack() {
    if (this.animState === 'hit' || this.animState === 'knockdown') return;
    this.animState = 'heavy_attack';
    this.animTimer = 0;
    this.stateDuration = 0.55;
    (this.slashTrailMesh.material as THREE.MeshBasicMaterial).opacity = 1.0;
  }

  public triggerSpecialAttack() {
    this.animState = 'special_attack';
    this.animTimer = 0;
    this.stateDuration = 0.85;
    (this.slashTrailMesh.material as THREE.MeshBasicMaterial).opacity = 1.0;
  }

  public setBlock(active: boolean) {
    this.isBlocking = active;
    if (active && this.animState !== 'hit' && this.animState !== 'knockdown') {
      this.animState = 'block';
      (this.shieldMesh.material as THREE.MeshStandardMaterial).opacity = 0.55;
    } else if (!active && this.animState === 'block') {
      this.animState = 'idle';
      (this.shieldMesh.material as THREE.MeshStandardMaterial).opacity = 0.0;
    }
  }

  public triggerDodge() {
    this.animState = 'dodge';
    this.animTimer = 0;
    this.stateDuration = 0.4;
    this.isDodging = true;
    this.vx = -this.facing * 9.5;
  }

  public takeHit(damage: number, isBlocked: boolean) {
    this.health = Math.max(0, this.health - damage);
    this.hitFlashTimer = 0.2;

    if (this.health <= 0) {
      this.triggerKnockdown();
    } else if (!isBlocked) {
      this.animState = 'hit';
      this.animTimer = 0;
      this.stateDuration = 0.25;
      this.vx = -this.facing * 3.5;
    }
  }

  public triggerKnockdown() {
    this.animState = 'knockdown';
    this.animTimer = 0;
    this.stateDuration = 2.0;
  }

  /**
   * Per-Frame 3D Physics and Procedural Skeletal Animation Update
   */
  public update(delta: number) {
    this.animTimer += delta;

    // Hit flash decay
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= delta;
      this.primaryMaterial.emissiveIntensity = 1.5;
    } else {
      this.primaryMaterial.emissiveIntensity = 0.2;
    }

    // Slash trail fade
    const slashMat = this.slashTrailMesh.material as THREE.MeshBasicMaterial;
    if (slashMat.opacity > 0) {
      slashMat.opacity = Math.max(0, slashMat.opacity - delta * 3.5);
    }

    // Shield pulsing when active
    if (this.isBlocking) {
      const shieldMat = this.shieldMesh.material as THREE.MeshStandardMaterial;
      shieldMat.opacity = 0.45 + Math.sin(this.animTimer * 14) * 0.15;
    }

    // Orbiting crystals animation (Crystal Rose)
    if (this.orbitCrystals.length > 0) {
      const now = performance.now() * 0.003;
      this.orbitCrystals.forEach((shard, idx) => {
        const angle = now + (idx * Math.PI) / 2;
        shard.position.set(Math.cos(angle) * 1.2, 1.2 + Math.sin(now * 2 + idx) * 0.25, Math.sin(angle) * 1.2);
        shard.rotation.x += delta * 2;
        shard.rotation.y += delta * 3;
      });
    }

    // Wings gentle flutter (Cupid Spark)
    if (this.wingLeft && this.wingRight) {
      const wingFlap = Math.sin(this.animTimer * 8) * 0.25;
      this.wingLeft.rotation.y = -wingFlap;
      this.wingRight.rotation.y = wingFlap;
    }

    // 3D Physics Integration
    if (!this.isGrounded) {
      this.vy -= 26.0 * delta; // Gravity
      this.y += this.vy * delta;
      if (this.y <= 0) {
        this.y = 0;
        this.vy = 0;
        this.isGrounded = true;
        if (this.animState === 'jump') this.animState = 'idle';
      }
    }

    this.x += this.vx * delta;
    this.vx *= Math.pow(0.12, delta); // Friction

    // Arena boundary clamp (-8.0 to +8.0)
    this.x = Math.max(-8.0, Math.min(8.0, this.x));

    // Update group transform
    this.group.position.set(this.x, this.y, this.z);
    this.group.rotation.y = this.facing === 1 ? Math.PI / 2 : -Math.PI / 2;

    // Check temporary state expiration
    if (this.stateDuration > 0 && this.animTimer >= this.stateDuration) {
      if (this.animState === 'dodge') this.isDodging = false;
      if (this.animState !== 'knockdown' && this.animState !== 'block') {
        this.animState = 'idle';
      }
    }

    // ==========================================
    // PROCEDURAL SKELETAL JOINT ANIMATION ENGINE
    // ==========================================
    const t = this.animTimer;

    switch (this.animState) {
      case 'idle':
        // Breathing & stance sway
        this.torso.position.y = 0.2 + Math.sin(t * 3.5) * 0.03;
        this.head.rotation.x = Math.sin(t * 3.5) * 0.05;
        this.leftArm.rotation.x = Math.sin(t * 2.5) * 0.1;
        this.rightArm.rotation.x = -Math.sin(t * 2.5) * 0.1;
        this.leftLeg.rotation.x = 0;
        this.rightLeg.rotation.x = 0;
        this.weaponGroup.rotation.x = 0.3 + Math.sin(t * 3) * 0.05;
        break;

      case 'run':
        // Dynamic running stride
        this.leftLeg.rotation.x = Math.sin(t * 12) * 0.75;
        this.rightLeg.rotation.x = -Math.sin(t * 12) * 0.75;
        this.leftArm.rotation.x = -Math.sin(t * 12) * 0.8;
        this.rightArm.rotation.x = Math.sin(t * 12) * 0.8;
        this.torso.rotation.x = 0.18; // Leaning forward
        this.torso.position.y = 0.2 + Math.abs(Math.sin(t * 12)) * 0.08;
        break;

      case 'jump':
        // Aerial tuck
        this.leftLeg.rotation.x = 0.5;
        this.rightLeg.rotation.x = 0.3;
        this.leftArm.rotation.x = -0.9;
        this.rightArm.rotation.x = -0.9;
        this.torso.rotation.x = -0.1;
        break;

      case 'light_attack':
        // Fast horizontal slash arc
        const slashPhase = Math.min(1, t / 0.32);
        this.rightArm.rotation.x = -1.2 + slashPhase * 2.5;
        this.rightArm.rotation.y = 0.8 - slashPhase * 1.6;
        this.torso.rotation.y = -0.4 + slashPhase * 0.8;
        this.weaponGroup.rotation.z = -slashPhase * 2.2;
        break;

      case 'heavy_attack':
        // 2-Handed Overhead Slam
        const heavyPhase = Math.min(1, t / 0.55);
        if (heavyPhase < 0.45) {
          // Wind up
          this.rightArm.rotation.x = -2.2;
          this.leftArm.rotation.x = -2.0;
          this.torso.rotation.x = -0.3;
        } else {
          // Downward smash
          this.rightArm.rotation.x = 0.6;
          this.leftArm.rotation.x = 0.5;
          this.torso.rotation.x = 0.4;
          this.torso.position.y = 0.05;
        }
        break;

      case 'special_attack':
        // Floating Ultimate Surge
        this.torso.position.y = 0.5 + Math.sin(t * 8) * 0.1;
        this.rightArm.rotation.x = -1.57; // Point forward
        this.leftArm.rotation.x = -1.0;
        this.head.rotation.x = -0.3;
        break;

      case 'block':
        // Crossing arms defensive pose
        this.leftArm.rotation.set(-0.8, 0.4, 0.5);
        this.rightArm.rotation.set(-0.8, -0.4, -0.5);
        this.torso.rotation.x = 0.15;
        this.leftLeg.rotation.x = -0.2;
        this.rightLeg.rotation.x = 0.3;
        break;

      case 'dodge':
        // Phase shift / back flip
        this.torso.rotation.x = -0.6;
        this.leftArm.rotation.x = 1.0;
        this.rightArm.rotation.x = 1.0;
        break;

      case 'hit':
        // Hit stun recoil
        this.head.rotation.x = -0.5;
        this.torso.rotation.x = -0.4;
        this.torso.position.y = 0.1;
        this.leftArm.rotation.x = 0.8;
        this.rightArm.rotation.x = 0.8;
        break;

      case 'knockdown':
        // Collapse to ground
        this.hips.rotation.z = Math.min(Math.PI / 2, t * 4);
        this.hips.position.y = Math.max(0.2, 1.35 - t * 1.5);
        break;
    }
  }
}
