import * as THREE from 'three';
import { FighterId, ArenaId } from '../../types/combat';
import { ThreeFighter } from './ThreeFighter';
import { soundFX } from '../../services/soundFX';

export interface ArenaOptions {
  container: HTMLElement;
  myFighterId: FighterId;
  myDisplayName: string;
  opponentFighterId?: FighterId;
  opponentDisplayName?: string;
  arenaId: ArenaId;
  isTrainingMode?: boolean;
  onSendMove?: (data: any) => void;
  onPerformAttack?: (attackType: 'light' | 'heavy' | 'special') => void;
  onDamageDummy?: (dmg: number) => void;
}

interface Projectile3D {
  mesh: THREE.Mesh;
  direction: number; // 1 = right, -1 = left
  owner: 'p1' | 'p2';
  damage: number;
  speed: number;
  life: number;
}

interface Particle3D {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}

export class ThreeBattleArena {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private animFrameId: number | null = null;
  private clock: THREE.Clock;

  // Fighters
  public player1: ThreeFighter;
  public player2: ThreeFighter;

  // Arena & Lighting
  private arenaMesh!: THREE.Mesh;
  private neonRing!: THREE.Mesh;
  private pillars: THREE.Mesh[] = [];
  private starsParticleSystem!: THREE.Points;
  private dynamicPointLight!: THREE.PointLight;

  // Effects & Combat State
  private projectiles: Projectile3D[] = [];
  private particles: Particle3D[] = [];
  private cameraShake = 0;
  private clashActive = false;
  private clashMesh!: THREE.Mesh;

  // Callbacks
  private options: ArenaOptions;

  // Input states
  private keysPressed: { [key: string]: boolean } = {};
  private virtualJoystick = { x: 0, y: 0 };

  constructor(options: ArenaOptions) {
    this.options = options;
    this.container = options.container;
    this.clock = new THREE.Clock();

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060412);
    this.scene.fog = new THREE.FogExp2(0x0b0722, 0.025);

    // 2. Camera
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(46, aspect, 0.1, 1000);
    this.camera.position.set(0, 4.0, 13.5);

    // 3. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.container.appendChild(this.renderer.domElement);

    // 4. Build Environment & 3D Fighters
    this.buildLighting();
    this.build3DArena();
    this.buildStarfield();

    this.player1 = new ThreeFighter(options.myFighterId, true, options.myDisplayName);
    this.player2 = new ThreeFighter(options.opponentFighterId || 'cupid_spark', false, options.opponentDisplayName || 'Challenger');

    this.scene.add(this.player1.group);
    this.scene.add(this.player2.group);

    // 5. Heart Clash 3D Orb (Pre-created, initially invisible)
    const clashGeo = new THREE.SphereGeometry(2.2, 32, 32);
    const clashMat = new THREE.MeshBasicMaterial({
      color: 0xff2a85,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
    });
    this.clashMesh = new THREE.Mesh(clashGeo, clashMat);
    this.clashMesh.position.set(0, 2.2, 0);
    this.scene.add(this.clashMesh);

    // 6. Bind Event Listeners
    this.bindInputs();
    window.addEventListener('resize', this.onWindowResize);

    // 7. Start Render Loop
    this.animate();
  }

  private buildLighting() {
    // Ambient Celestial Light
    const ambientLight = new THREE.AmbientLight(0x381d68, 1.4);
    this.scene.add(ambientLight);

    // Main Key Sunlight with Shadows
    const dirLight = new THREE.DirectionalLight(0xffffff, 2.4);
    dirLight.position.set(5, 14, 8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 30;
    dirLight.shadow.camera.left = -12;
    dirLight.shadow.camera.right = 12;
    dirLight.shadow.camera.top = 10;
    dirLight.shadow.camera.bottom = -4;
    this.scene.add(dirLight);

    // Romantic Pink Rim Light from beneath
    const pinkRim = new THREE.DirectionalLight(0xff2a85, 2.2);
    pinkRim.position.set(-6, -3, -6);
    this.scene.add(pinkRim);

    // Cyan Starlight Fill Light
    const cyanFill = new THREE.DirectionalLight(0x38bdf8, 1.6);
    cyanFill.position.set(6, 2, -5);
    this.scene.add(cyanFill);

    // Dynamic Point Light for Impact Flashes
    this.dynamicPointLight = new THREE.PointLight(0xff2a85, 0, 15);
    this.dynamicPointLight.position.set(0, 2, 2);
    this.scene.add(this.dynamicPointLight);
  }

  private build3DArena() {
    // Floating Cosmic Colosseum Platform
    const arenaGeo = new THREE.CylinderGeometry(10.5, 9.8, 1.2, 48);
    const arenaMat = new THREE.MeshStandardMaterial({
      color: 0x110c26,
      roughness: 0.25,
      metalness: 0.65,
    });
    this.arenaMesh = new THREE.Mesh(arenaGeo, arenaMat);
    this.arenaMesh.position.y = -0.6;
    this.arenaMesh.receiveShadow = true;
    this.scene.add(this.arenaMesh);

    // Glowing Neon Perimeter Ring
    const ringGeo = new THREE.TorusGeometry(10.3, 0.12, 16, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xff2a85,
      emissive: 0xff2a85,
      emissiveIntensity: 1.2,
      roughness: 0.1,
    });
    this.neonRing = new THREE.Mesh(ringGeo, ringMat);
    this.neonRing.rotation.x = Math.PI / 2;
    this.neonRing.position.y = 0.02;
    this.scene.add(this.neonRing);

    // Center Stage Glowing Heart Emblem
    const centerHeartGeo = new THREE.CircleGeometry(2.5, 32);
    const centerHeartMat = new THREE.MeshStandardMaterial({
      color: 0x24124a,
      emissive: 0xa855f7,
      emissiveIntensity: 0.4,
      roughness: 0.2,
    });
    const centerCircle = new THREE.Mesh(centerHeartGeo, centerHeartMat);
    centerCircle.rotation.x = -Math.PI / 2;
    centerCircle.position.y = 0.01;
    centerCircle.receiveShadow = true;
    this.scene.add(centerCircle);

    // Floating Cosmic Crystal Pillars
    const pillarGeo = new THREE.OctahedronGeometry(0.85, 0);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.7,
      roughness: 0.2,
      metalness: 0.8,
    });

    const angles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
    angles.forEach((ang) => {
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(Math.cos(ang) * 11.2, 1.8, Math.sin(ang) * 11.2);
      pillar.castShadow = true;
      this.pillars.push(pillar);
      this.scene.add(pillar);
    });
  }

  private buildStarfield() {
    const starCount = 1200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 120;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 80 + 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 120;

      // Color variation (pink, lavender, gold, cyan)
      const r = 0.7 + Math.random() * 0.3;
      const g = 0.4 + Math.random() * 0.4;
      const b = 0.8 + Math.random() * 0.2;
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    });

    this.starsParticleSystem = new THREE.Points(geometry, material);
    this.scene.add(this.starsParticleSystem);
  }

  // ==========================================
  // INPUT & COMBAT ACTIONS
  // ==========================================
  private bindInputs() {
    window.addEventListener('keydown', (e) => {
      this.keysPressed[e.code] = true;

      if (e.code === 'KeyJ') {
        this.triggerLightAttack();
      } else if (e.code === 'KeyK') {
        this.triggerHeavyAttack();
      } else if (e.code === 'KeyL') {
        this.triggerSpecial();
      } else if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        this.triggerBlock(true);
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        this.triggerDodge();
      } else if (e.code === 'KeyW' || e.code === 'ArrowUp' || e.code === 'Space') {
        if (this.player1.isGrounded) {
          this.player1.vy = 12.5;
          this.player1.isGrounded = false;
          this.player1.animState = 'jump';
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keysPressed[e.code] = false;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        this.triggerBlock(false);
      }
    });
  }

  public setVirtualJoystick(vector: { x: number; y: number }) {
    this.virtualJoystick = vector;
    if (vector.y > 0.5 && this.player1.isGrounded) {
      this.player1.vy = 12.5;
      this.player1.isGrounded = false;
      this.player1.animState = 'jump';
    }
  }

  public triggerLightAttack() {
    this.player1.triggerLightAttack();
    soundFX.playLightPunch();
    this.options.onPerformAttack?.('light');
    this.checkHit(this.player1, this.player2, 10, 'light');
  }

  public triggerHeavyAttack() {
    this.player1.triggerHeavyAttack();
    soundFX.playHeavyStrike();
    this.options.onPerformAttack?.('heavy');
    this.checkHit(this.player1, this.player2, 22, 'heavy');
  }

  public triggerSpecial() {
    if (this.player1.energy < 100) return;
    this.player1.energy = 0;
    this.player1.triggerSpecialAttack();
    soundFX.playSpecialBlast();
    this.options.onPerformAttack?.('special');
    this.spawnProjectile(this.player1, 'p1', 38);
  }

  public triggerBlock(active: boolean) {
    this.player1.setBlock(active);
    if (active) soundFX.playShieldBlock();
  }

  public triggerDodge() {
    this.player1.triggerDodge();
  }

  // ==========================================
  // HIT DETECTION & 3D COMBAT RESOLUTION
  // ==========================================
  private checkHit(attacker: ThreeFighter, defender: ThreeFighter, baseDmg: number, type: 'light' | 'heavy') {
    const dist = Math.abs(attacker.x - defender.x);
    const range = type === 'light' ? 2.2 : 2.6;

    const isFacing = (attacker.facing === 1 && defender.x > attacker.x) || (attacker.facing === -1 && defender.x < attacker.x);

    if (dist <= range && isFacing) {
      if (defender.isDodging) return; // Invulnerable

      const isBlocked = defender.isBlocking;
      const damage = isBlocked ? Math.round(baseDmg * 0.25) : baseDmg;

      defender.takeHit(damage, isBlocked);
      attacker.energy = Math.min(100, attacker.energy + (isBlocked ? 10 : 20));

      if (isBlocked) {
        soundFX.playShieldBlock();
      } else {
        if (type === 'heavy') {
          soundFX.playHeavyStrike();
          this.cameraShake = 0.35;
        } else {
          soundFX.playLightPunch();
          this.cameraShake = 0.12;
        }
      }

      this.spawnHitSparks(defender.x, defender.y + 1.2, isBlocked ? 0x38bdf8 : 0xff2a85);
      this.dynamicPointLight.color.setHex(isBlocked ? 0x38bdf8 : 0xff2a85);
      this.dynamicPointLight.intensity = 4.0;
      this.dynamicPointLight.position.set(defender.x, defender.y + 1.2, 0.5);

      if (this.options.isTrainingMode) {
        this.options.onDamageDummy?.(damage);
      }
    }
  }

  private spawnProjectile(ownerFighter: ThreeFighter, owner: 'p1' | 'p2', damage: number) {
    const heartGeo = new THREE.OctahedronGeometry(0.38, 1);
    const heartMat = new THREE.MeshStandardMaterial({
      color: ownerFighter.isPlayer1 ? 0xff2a85 : 0xffd166,
      emissive: ownerFighter.isPlayer1 ? 0xff2a85 : 0xffd166,
      emissiveIntensity: 1.5,
      roughness: 0.1,
    });
    const projMesh = new THREE.Mesh(heartGeo, heartMat);
    projMesh.position.set(ownerFighter.x + ownerFighter.facing * 0.8, ownerFighter.y + 1.3, 0);
    this.scene.add(projMesh);

    this.projectiles.push({
      mesh: projMesh,
      direction: ownerFighter.facing,
      owner,
      damage,
      speed: 16.0,
      life: 1.8,
    });
  }

  private spawnHitSparks(x: number, y: number, colorHex: number) {
    const count = 16;
    for (let i = 0; i < count; i++) {
      const geo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
      const mat = new THREE.MeshBasicMaterial({ color: colorHex, blending: THREE.AdditiveBlending });
      const p = new THREE.Mesh(geo, mat);
      p.position.set(x, y, 0);

      const angle = Math.random() * Math.PI * 2;
      const speed = 3.5 + Math.random() * 5.5;

      this.particles.push({
        mesh: p,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + 2.0,
        vz: (Math.random() - 0.5) * speed,
        life: 0,
        maxLife: 0.45,
      });

      this.scene.add(p);
    }
  }

  public triggerHeartClashVisual() {
    this.clashActive = true;
    soundFX.playHeartClash();
    this.cameraShake = 0.8;
    this.clashMesh.scale.set(1, 1, 1);
    (this.clashMesh.material as THREE.MeshBasicMaterial).opacity = 0.95;

    setTimeout(() => {
      this.clashActive = false;
    }, 1200);
  }

  // ==========================================
  // MAIN ANIMATION & RENDER LOOP
  // ==========================================
  private animate = () => {
    this.animFrameId = requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.05);

    // 1. Process Player 1 Inputs
    let moveX = 0;
    if (this.keysPressed['KeyA'] || this.keysPressed['ArrowLeft'] || this.virtualJoystick.x < -0.2) {
      moveX = -1;
    } else if (this.keysPressed['KeyD'] || this.keysPressed['ArrowRight'] || this.virtualJoystick.x > 0.2) {
      moveX = 1;
    }

    if (moveX !== 0 && this.player1.animState !== 'hit' && this.player1.animState !== 'knockdown' && !this.player1.isBlocking) {
      this.player1.vx = moveX * 6.5;
      this.player1.facing = moveX > 0 ? 1 : -1;
      if (this.player1.isGrounded && this.player1.animState !== 'light_attack' && this.player1.animState !== 'heavy_attack') {
        this.player1.animState = 'run';
      }
    } else if (this.player1.isGrounded && this.player1.animState === 'run') {
      this.player1.animState = 'idle';
    }

    // 2. Training Dummy AI Behavior
    if (this.options.isTrainingMode && this.player2.animState !== 'knockdown') {
      const dist = this.player1.x - this.player2.x;
      this.player2.facing = dist > 0 ? 1 : -1;

      // Gentle movement towards player if too far
      if (Math.abs(dist) > 3.2) {
        this.player2.vx = Math.sign(dist) * 2.8;
        this.player2.animState = 'run';
      } else {
        this.player2.vx = 0;
        this.player2.animState = 'idle';
      }

      // Periodically block or test attacks in training
      if (Math.random() < 0.008) {
        this.player2.triggerLightAttack();
        this.checkHit(this.player2, this.player1, 6, 'light');
      }
    }

    // 3. Update Fighters
    this.player1.update(delta);
    this.player2.update(delta);

    // 4. Update Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.mesh.position.x += p.direction * p.speed * delta;
      p.mesh.rotation.z += delta * 12;
      p.life -= delta;

      // Check collision with target
      const target = p.owner === 'p1' ? this.player2 : this.player1;
      const targetDist = Math.abs(p.mesh.position.x - target.x);

      if (targetDist < 1.2 && p.mesh.position.y > target.y && p.mesh.position.y < target.y + 2.0) {
        target.takeHit(p.damage, target.isBlocking);
        this.spawnHitSparks(target.x, target.y + 1.2, 0xffd166);
        this.cameraShake = 0.4;
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
        continue;
      }

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }

    // 5. Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life += delta;
      pt.mesh.position.x += pt.vx * delta;
      pt.mesh.position.y += pt.vy * delta;
      pt.mesh.position.z += pt.vz * delta;
      pt.vy -= 14.0 * delta; // Gravity

      const scale = Math.max(0, 1 - pt.life / pt.maxLife);
      pt.mesh.scale.set(scale, scale, scale);

      if (pt.life >= pt.maxLife) {
        this.scene.remove(pt.mesh);
        this.particles.splice(i, 1);
      }
    }

    // 6. Dynamic Camera Tracking & Shake
    const midX = (this.player1.x + this.player2.x) / 2;
    const fightersDist = Math.abs(this.player1.x - this.player2.x);
    const targetCamZ = Math.max(10.5, Math.min(18.0, 7.5 + fightersDist * 0.75));

    this.camera.position.x += (midX - this.camera.position.x) * 0.08;
    this.camera.position.z += (targetCamZ - this.camera.position.z) * 0.08;
    this.camera.position.y = 3.6 + (targetCamZ - 10.5) * 0.15;

    // Apply Camera Shake
    if (this.cameraShake > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.cameraShake;
      this.camera.position.y += (Math.random() - 0.5) * this.cameraShake;
      this.cameraShake = Math.max(0, this.cameraShake - delta * 2.2);
    }

    this.camera.lookAt(midX, 1.8, 0);

    // 7. Light decay
    if (this.dynamicPointLight.intensity > 0) {
      this.dynamicPointLight.intensity = Math.max(0, this.dynamicPointLight.intensity - delta * 12);
    }

    // 8. Heart Clash Animation
    if (this.clashActive) {
      const clashMat = this.clashMesh.material as THREE.MeshBasicMaterial;
      const s = 1.0 + Math.sin(this.clock.getElapsedTime() * 20) * 0.4;
      this.clashMesh.scale.set(s, s, s);
      clashMat.opacity = Math.max(0, clashMat.opacity - delta * 0.8);
    }

    // 9. Ambient environment motion (Pillars floating, stars drifting)
    const time = this.clock.getElapsedTime();
    this.pillars.forEach((p, idx) => {
      p.position.y = 1.8 + Math.sin(time * 1.5 + idx) * 0.35;
      p.rotation.x += delta * 0.5;
      p.rotation.y += delta * 0.8;
    });

    if (this.starsParticleSystem) {
      this.starsParticleSystem.rotation.y += delta * 0.015;
    }

    // 10. Render
    this.renderer.render(this.scene, this.camera);
  };

  private onWindowResize = () => {
    if (!this.container) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  public destroy() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    window.removeEventListener('resize', this.onWindowResize);
    if (this.renderer.domElement && this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
