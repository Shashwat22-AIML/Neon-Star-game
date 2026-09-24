/**
 * NEON STAR DEFENDER - TYPE DEFINITIONS
 */

export type GameScreen = 
  | 'MENU'
  | 'PLAYING'
  | 'PAUSED'
  | 'LEVEL_COMPLETE'
  | 'GAME_OVER'
  | 'SHOP'
  | 'SKINS'
  | 'ACHIEVEMENTS'
  | 'SETTINGS'
  | 'HOW_TO_PLAY';

export type AsteroidShape = 'polygon' | 'hexagon' | 'square';

export type PowerUpType =
  | 'DAMAGE_BOOST'
  | 'MULTI_SHOT'
  | 'RAPID_FIRE'
  | 'SHIELD'
  | 'PIERCING'
  | 'MAGNET'
  | 'NUKE'
  | 'TIME_SLOW'
  | 'HEALTH';

export interface PowerUpConfigInfo {
  type: PowerUpType;
  label: string;
  icon: string;
  color: string;
  description: string;
  isBuff: boolean; // Temporary with timer vs instant effect
}

export const POWER_UP_DEFS: Record<PowerUpType, PowerUpConfigInfo> = {
  DAMAGE_BOOST: {
    type: 'DAMAGE_BOOST',
    label: 'Damage Amp',
    icon: '⚡',
    color: '#ff0055',
    description: '+30% bullet damage (stacks up to 3x)',
    isBuff: true,
  },
  MULTI_SHOT: {
    type: 'MULTI_SHOT',
    label: 'Multi-Shot',
    icon: '✦',
    color: '#00f3ff',
    description: '+1 bullet per volley (max 7, run-permanent)',
    isBuff: false,
  },
  RAPID_FIRE: {
    type: 'RAPID_FIRE',
    label: 'Rapid Fire',
    icon: '🔥',
    color: '#ff9900',
    description: '+40% fire rate',
    isBuff: true,
  },
  SHIELD: {
    type: 'SHIELD',
    label: 'Shield',
    icon: '🛡️',
    color: '#00e5ff',
    description: 'Absorbs 1 incoming hit',
    isBuff: false,
  },
  PIERCING: {
    type: 'PIERCING',
    label: 'Piercing',
    icon: '🎯',
    color: '#ffe600',
    description: 'Bullets penetrate up to 3 asteroids',
    isBuff: true,
  },
  MAGNET: {
    type: 'MAGNET',
    label: 'Magnet',
    icon: '🧲',
    color: '#b026ff',
    description: 'Draws all falling coins toward ship',
    isBuff: true,
  },
  NUKE: {
    type: 'NUKE',
    label: 'Nuke Shockwave',
    icon: '💥',
    color: '#ffffff',
    description: 'Obliterates all normal asteroids on screen',
    isBuff: false,
  },
  TIME_SLOW: {
    type: 'TIME_SLOW',
    label: 'Chrono Slow',
    icon: '⏳',
    color: '#00ffcc',
    description: 'Slows asteroid fall velocity by 50%',
    isBuff: true,
  },
  HEALTH: {
    type: 'HEALTH',
    label: 'Repair Core',
    icon: '❤️',
    color: '#00ff66',
    description: 'Restores 1 life (up to maximum)',
    isBuff: false,
  },
};

export interface ActiveBuff {
  type: PowerUpType;
  remainingTime: number;
  totalDuration: number;
  stacks?: number;
}

export interface AsteroidEntity {
  id: number;
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  radius: number;
  hp: number;
  maxHp: number;
  shape: AsteroidShape;
  rotation: number;
  rotSpeed: number;
  vertexOffsets: number[]; // For irregular rock shape
  hitFlashTimer: number;
  canSplit: boolean;
  isBoss: boolean;
  isMinion: boolean;
}

export interface BossEntity {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  phase: number;
  attackTimer: number;
  minionTimer: number;
  hitFlashTimer: number;
  glowPulse: number;
}

export interface BossBullet {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

export interface BulletEntity {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  isCrit: boolean;
  piercesLeft: number;
  color: string;
}

export interface CoinEntity {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  value: number;
  radius: number;
  spinAngle: number;
  lifeTimer: number;
}

export interface PowerUpEntity {
  active: boolean;
  x: number;
  y: number;
  vy: number;
  type: PowerUpType;
  radius: number;
  pulseTimer: number;
}

export interface ParticleEntity {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  shape?: 'circle' | 'line' | 'spark';
}

export interface FloatingTextEntity {
  active: boolean;
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  isCrit: boolean;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  brightness: number;
  twinklePhase: number;
  layer: number;
  color: string;
}

export interface ShootingStar {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  alpha: number;
}

export interface LevelStats {
  level: number;
  asteroidsDestroyed: number;
  shotsFired: number;
  shotsHit: number;
  coinsEarned: number;
  tookDamage: boolean;
  isBossLevel: boolean;
}
