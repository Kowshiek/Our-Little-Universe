// Re-export combat types for client
export type FighterId = 'heart_knight' | 'cupid_spark' | 'shadow_valentine' | 'crystal_rose';
export type ArenaId = 'heart_garden' | 'neon_city' | 'moonlight_arena';

export interface FighterStats {
  id: FighterId;
  name: string;
  title: string;
  description: string;
  specialName: string;
  specialDescription: string;
  color: string;
  themeColor: number;
  maxHealth: number;
  moveSpeed: number;
  jumpVelocity: number;
  lightDamage: number;
  heavyDamage: number;
  specialDamage: number;
  attackRange: number;
  lightCooldown: number;
  heavyCooldown: number;
}

export const FIGHTERS: Record<FighterId, FighterStats> = {
  heart_knight: {
    id: 'heart_knight',
    name: 'Heart Knight',
    title: 'Champion of Devotion',
    description: 'A noble armored crusader wielding a greatsword infused with burning starlight affection.',
    specialName: 'Heartwave Slash',
    specialDescription: 'Unleashes a sweeping crescent wave of pink cosmic energy that travels across the arena.',
    color: '#ff2a85',
    themeColor: 0xff2a85,
    maxHealth: 100,
    moveSpeed: 230,
    jumpVelocity: -430,
    lightDamage: 10,
    heavyDamage: 22,
    specialDamage: 38,
    attackRange: 65,
    lightCooldown: 300,
    heavyCooldown: 650,
  },
  cupid_spark: {
    id: 'cupid_spark',
    name: 'Cupid Spark',
    title: 'The Arrow of Destiny',
    description: 'A nimble celestial archer who darts around opponents and delivers lightning-fast heart strikes.',
    specialName: 'Love Arrow Volley',
    specialDescription: 'Fires a piercing golden starlight arrow that penetrates through defenses.',
    color: '#ffd166',
    themeColor: 0xffd166,
    maxHealth: 100,
    moveSpeed: 270,
    jumpVelocity: -460,
    lightDamage: 8,
    heavyDamage: 18,
    specialDamage: 34,
    attackRange: 80,
    lightCooldown: 240,
    heavyCooldown: 550,
  },
  shadow_valentine: {
    id: 'shadow_valentine',
    name: 'Shadow Valentine',
    title: 'The Enigmatic Rogue',
    description: 'Master of stealth and dark rose petals, striking with blazing speed and shadow clones.',
    specialName: 'Shadow Flurry',
    specialDescription: 'Vanishes and reappears behind the opponent with a rapid triple dagger assault.',
    color: '#a855f7',
    themeColor: 0xa855f7,
    maxHealth: 100,
    moveSpeed: 260,
    jumpVelocity: -450,
    lightDamage: 9,
    heavyDamage: 20,
    specialDamage: 36,
    attackRange: 55,
    lightCooldown: 260,
    heavyCooldown: 600,
  },
  crystal_rose: {
    id: 'crystal_rose',
    name: 'Crystal Rose',
    title: 'The Diamond Guardian',
    description: 'A steadfast defensive powerhouse protected by crystalline petals and thorny barricades.',
    specialName: 'Rose Thorn Eruption',
    specialDescription: 'Summons an eruption of razor-sharp crystal thorns that erupt from the arena floor.',
    color: '#38bdf8',
    themeColor: 0x38bdf8,
    maxHealth: 100,
    moveSpeed: 210,
    jumpVelocity: -410,
    lightDamage: 12,
    heavyDamage: 25,
    specialDamage: 40,
    attackRange: 60,
    lightCooldown: 340,
    heavyCooldown: 720,
  },
};

export interface ArenaConfig {
  id: ArenaId;
  name: string;
  theme: string;
  description: string;
  groundY: number;
  bgGradient: string;
}

export const ARENAS: Record<ArenaId, ArenaConfig> = {
  heart_garden: {
    id: 'heart_garden',
    name: 'Heart Garden',
    theme: 'Romantic Sanctuary',
    description: 'Ancient marble pillars adorned with blooming cherry blossom vines and floating petals.',
    groundY: 480,
    bgGradient: 'from-purple-950 via-pink-950 to-slate-950',
  },
  neon_city: {
    id: 'neon_city',
    name: 'Neon Love City',
    theme: 'Cyberpunk Metropolis',
    description: 'A rain-slicked neon skyscraper rooftop with holographic glowing hearts and electric vibes.',
    groundY: 480,
    bgGradient: 'from-blue-950 via-purple-950 to-fuchsia-950',
  },
  moonlight_arena: {
    id: 'moonlight_arena',
    name: 'Moonlight Arena',
    theme: 'Celestial Orbit',
    description: 'A floating crystalline fighting platform hovering beneath twin crescent moons.',
    groundY: 480,
    bgGradient: 'from-slate-950 via-indigo-950 to-purple-950',
  },
};

export type PlayerAction =
  | 'idle'
  | 'walk'
  | 'jump'
  | 'attack_light'
  | 'attack_heavy'
  | 'block'
  | 'dodge'
  | 'hit'
  | 'special';

export interface CombatantState {
  userId: string;
  displayName: string;
  fighterId: FighterId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isFacingLeft: boolean;
  health: number;
  maxHealth: number;
  energy: number;
  action: PlayerAction;
  isBlocking: boolean;
  isDodging: boolean;
  roundWins: number;
}
