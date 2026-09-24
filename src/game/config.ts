/**
 * NEON STAR DEFENDER - BALANCE & CONFIGURATION
 * Tweak any parameters here to customize gameplay, difficulty ramp, economy, and visuals.
 */

export const GAME_CONFIG = {
  // Canvas & Presentation
  CANVAS_VIRTUAL_WIDTH: 800,
  CANVAS_VIRTUAL_HEIGHT: 1000,
  FPS_TARGET: 60,

  // Player Baseline Stats
  PLAYER: {
    BASE_WIDTH: 52,
    BASE_HEIGHT: 48,
    BASE_SPEED: 700, // Pixels per second with keyboard
    SMOOTH_LERP: 0.22, // Mouse/touch smoothing factor (0.05 = heavy lag, 1.0 = instant)
    HITBOX_RADIUS: 20,
    INITIAL_LIVES: 3,
    MAX_LIVES_LIMIT: 5,
    INVULNERABLE_DURATION: 1.8, // Seconds of invincibility after hit
    BASE_FIRE_RATE: 4.5, // Shots per second
    BASE_DAMAGE: 5, // Base damage per bullet
    BASE_BULLET_COUNT: 1, // Starting bullets per volley
    BASE_BULLET_SPEED: 900,
    BASE_CRIT_CHANCE: 0.05, // 5% base crit
    CRIT_MULTIPLIER: 2.0,
    BASE_MAGNET_RADIUS: 45, // Base coin pickup radius
    ACTIVE_MAGNET_RADIUS: 450, // Radius when Magnet power-up is active
  },

  // Asteroid Generation & Scaling
  ASTEROID: {
    BASE_SPEED_MIN: 75,
    BASE_SPEED_MAX: 140,
    SPEED_SCALE_PER_LEVEL: 3.5, // Extra speed per level
    BASE_HP_MIN: 4,
    BASE_HP_MAX: 12,
    HP_SCALE_PER_LEVEL: 3.2,
    SPLIT_CHANCE: 0.35, // 35% of medium/large asteroids split on death
    MIN_SPLIT_SIZE: 42,
    SPAWN_INTERVAL_INITIAL: 1.4, // Seconds between asteroid spawns
    SPAWN_INTERVAL_MIN: 0.45,
    SPAWN_INTERVAL_DECREASE_PER_LEVEL: 0.035,
    SHAPES: ['polygon', 'hexagon', 'square'] as const,
  },

  // Boss Encounters (Every 5th Level: 5, 10, 15, 20, 25, 30...)
  BOSS: {
    BOSS_INTERVAL: 5,
    BASE_HP: 220,
    HP_MULTIPLIER_PER_TIER: 2.2,
    MOVE_SPEED: 120,
    ATTACK_COOLDOWN: 1.8, // Seconds between boss bullet volleys
    PROJECTILE_SPEED: 280,
    MINION_SPAWN_INTERVAL: 5.5,
    COIN_REWARD_BASE: 150,
  },

  // In-Run Power-Up Settings
  POWER_UPS: {
    BASE_DROP_CHANCE: 0.15, // 15% drop rate from destroyed asteroids
    FALL_SPEED: 130,
    SIZE: 28,
    DURATIONS: {
      DAMAGE_BOOST: 15.0, // Seconds
      RAPID_FIRE: 12.0,
      PIERCING: 10.0,
      MAGNET: 10.0,
      TIME_SLOW: 8.0,
    },
    DAMAGE_BOOST_MULTIPLIER: 0.30, // +30% per stack
    DAMAGE_BOOST_MAX_STACKS: 3,
    RAPID_FIRE_MULTIPLIER: 0.40, // +40% fire rate
    TIME_SLOW_FACTOR: 0.50, // Asteroids move at 50% speed
    MAX_MULTI_SHOT: 7, // Max bullets per volley in a single run
  },

  // Economy & Coins
  ECONOMY: {
    COIN_BASE_VALUE: 1,
    COIN_DROP_CHANCE: 0.70, // Chance for an asteroid to drop coins
    COIN_FALL_SPEED: 140,
    COIN_MAGNET_ACCEL: 850,
    LEVEL_CLEAR_BASE_COINS: 30,
    NO_DAMAGE_BONUS_PERCENT: 0.25, // +25% coins if cleared without taking damage
  },

  // Combo System
  COMBO: {
    TIMEOUT_SECONDS: 2.5,
    MAX_MULTIPLIER: 10,
  },

  // Juice & Feedback
  JUICE: {
    SHAKE_DURATION_DAMAGE: 0.35,
    SHAKE_INTENSITY_DAMAGE: 16,
    SHAKE_DURATION_EXPLODE: 0.18,
    SHAKE_INTENSITY_EXPLODE: 6,
    SHAKE_DURATION_NUKE: 0.6,
    SHAKE_INTENSITY_NUKE: 24,
    HIT_FLASH_DURATION: 0.08,
    SLOW_MO_DURATION_BOSS_KILL: 0.5,
    SLOW_MO_SCALE: 0.2,
  },

  // Levels
  LEVELS: {
    TOTAL_STORY_LEVELS: 30,
    TARGET_KILLS_BASE: 15,
    TARGET_KILLS_PER_LEVEL: 3,
  },
};

export interface UpgradeTier {
  id: string;
  name: string;
  description: string;
  maxLevel: number;
  baseCost: number;
  costMultiplier: number;
  unit: string;
  getValue: (level: number) => number;
  formatValue: (val: number) => string;
}

export const UPGRADES_LIST: UpgradeTier[] = [
  {
    id: 'bulletDamage',
    name: 'Plasma Amp',
    description: 'Increases bullet damage',
    maxLevel: 10,
    baseCost: 40,
    costMultiplier: 1.6,
    unit: 'DMG',
    getValue: (lvl) => GAME_CONFIG.PLAYER.BASE_DAMAGE + lvl * 2,
    formatValue: (val) => `${val}`,
  },
  {
    id: 'fireRate',
    name: 'Overclock Cannon',
    description: 'Increases fire rate (shots/sec)',
    maxLevel: 10,
    baseCost: 50,
    costMultiplier: 1.65,
    unit: 'Shots/s',
    getValue: (lvl) => +(GAME_CONFIG.PLAYER.BASE_FIRE_RATE * (1 + lvl * 0.12)).toFixed(1),
    formatValue: (val) => `${val}/s`,
  },
  {
    id: 'startingBullets',
    name: 'Volley Array',
    description: 'Increases starting bullet count per volley',
    maxLevel: 4, // 1 to 5
    baseCost: 150,
    costMultiplier: 2.4,
    unit: 'Bullets',
    getValue: (lvl) => GAME_CONFIG.PLAYER.BASE_BULLET_COUNT + lvl,
    formatValue: (val) => `${val}`,
  },
  {
    id: 'maxLives',
    name: 'Hull Plating',
    description: 'Increases maximum & starting lives',
    maxLevel: 2, // 3 to 5
    baseCost: 200,
    costMultiplier: 3.0,
    unit: 'Lives',
    getValue: (lvl) => GAME_CONFIG.PLAYER.INITIAL_LIVES + lvl,
    formatValue: (val) => `${val}`,
  },
  {
    id: 'coinMultiplier',
    name: 'Scrap Magnetizer',
    description: 'Boosts coin value drops from all asteroids',
    maxLevel: 8,
    baseCost: 60,
    costMultiplier: 1.7,
    unit: 'x',
    getValue: (lvl) => +(1 + lvl * 0.25).toFixed(2),
    formatValue: (val) => `${val}x`,
  },
  {
    id: 'powerupDuration',
    name: 'Chrono Capacitor',
    description: 'Extends temporary power-up durations',
    maxLevel: 6,
    baseCost: 75,
    costMultiplier: 1.75,
    unit: 'Bonus',
    getValue: (lvl) => +(lvl * 0.15).toFixed(2), // +15% per lvl
    formatValue: (val) => `+${Math.round(val * 100)}%`,
  },
  {
    id: 'powerupDropRate',
    name: 'Drop Catalyzer',
    description: 'Increases chance of power-ups dropping',
    maxLevel: 6,
    baseCost: 80,
    costMultiplier: 1.8,
    unit: 'Drop Rate',
    getValue: (lvl) => +(GAME_CONFIG.POWER_UPS.BASE_DROP_CHANCE + lvl * 0.025).toFixed(3),
    formatValue: (val) => `${Math.round(val * 100)}%`,
  },
  {
    id: 'moveSpeed',
    name: 'Ion Thrusters',
    description: 'Increases ship horizontal speed & responsiveness',
    maxLevel: 6,
    baseCost: 45,
    costMultiplier: 1.5,
    unit: 'Speed',
    getValue: (lvl) => Math.round(GAME_CONFIG.PLAYER.BASE_SPEED * (1 + lvl * 0.1)),
    formatValue: (val) => `${val}`,
  },
  {
    id: 'bulletSpeed',
    name: 'Hyper Velocity',
    description: 'Bullets travel faster to strike earlier',
    maxLevel: 6,
    baseCost: 40,
    costMultiplier: 1.5,
    unit: 'Speed',
    getValue: (lvl) => Math.round(GAME_CONFIG.PLAYER.BASE_BULLET_SPEED * (1 + lvl * 0.12)),
    formatValue: (val) => `${val}`,
  },
  {
    id: 'critChance',
    name: 'Targeting Matrix',
    description: 'Chance for bullets to deal 2x critical damage',
    maxLevel: 8,
    baseCost: 90,
    costMultiplier: 1.85,
    unit: 'Crit %',
    getValue: (lvl) => +(GAME_CONFIG.PLAYER.BASE_CRIT_CHANCE + lvl * 0.04).toFixed(2),
    formatValue: (val) => `${Math.round(val * 100)}%`,
  },
];

export interface ShipSkin {
  id: string;
  name: string;
  cost: number;
  description: string;
  primaryColor: string;
  accentColor: string;
  engineColor: string;
  trailColor: string;
}

export const SHIP_SKINS: ShipSkin[] = [
  {
    id: 'striker',
    name: 'Neon Striker',
    cost: 0,
    description: 'Standard elite synth fighter with dual atmospheric wings.',
    primaryColor: '#00f3ff',
    accentColor: '#0066ff',
    engineColor: '#00ffff',
    trailColor: 'rgba(0, 243, 255, 0.4)',
  },
  {
    id: 'phoenix',
    name: 'Cyber Phoenix',
    cost: 250,
    description: 'Swept forward delta wings with high-temperature solar flare engines.',
    primaryColor: '#ff007f',
    accentColor: '#ffe600',
    engineColor: '#ff0055',
    trailColor: 'rgba(255, 0, 127, 0.45)',
  },
  {
    id: 'viper',
    name: 'Toxic Viper',
    cost: 500,
    description: 'Aggressive razor-edged interceptor glowing with bio-plasma.',
    primaryColor: '#00ff66',
    accentColor: '#39ff14',
    engineColor: '#00ffcc',
    trailColor: 'rgba(0, 255, 102, 0.45)',
  },
  {
    id: 'phantom',
    name: 'Void Phantom',
    cost: 900,
    description: 'Stealth crystalline frame harvested from deep singularity nebulas.',
    primaryColor: '#b026ff',
    accentColor: '#e056fd',
    engineColor: '#c0392b',
    trailColor: 'rgba(176, 38, 255, 0.5)',
  },
  {
    id: 'solar_apex',
    name: 'Solar Apex',
    cost: 1600,
    description: 'Golden vanguard vessel built with hyper-compressed fusion cores.',
    primaryColor: '#ffe600',
    accentColor: '#ff7700',
    engineColor: '#ff3300',
    trailColor: 'rgba(255, 230, 0, 0.55)',
  },
];

export interface Achievement {
  id: string;
  title: string;
  description: string;
  rewardCoins: number;
  isUnlocked: (stats: GameStats) => boolean;
}

export interface GameStats {
  totalAsteroidsDestroyed: number;
  totalCoinsEarned: number;
  highestLevelReached: number;
  bossesDefeated: number;
  maxCombo: number;
  powerUpsCollected: number;
  noDamageLevelBeaten: boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_blood',
    title: 'First Contact',
    description: 'Destroy your first asteroid block',
    rewardCoins: 25,
    isUnlocked: (s) => s.totalAsteroidsDestroyed >= 1,
  },
  {
    id: 'destroy_50',
    title: 'Asteroid Sweeper',
    description: 'Destroy 50 total asteroids',
    rewardCoins: 50,
    isUnlocked: (s) => s.totalAsteroidsDestroyed >= 50,
  },
  {
    id: 'destroy_250',
    title: 'Sector Cleaner',
    description: 'Destroy 250 total asteroids',
    rewardCoins: 150,
    isUnlocked: (s) => s.totalAsteroidsDestroyed >= 250,
  },
  {
    id: 'destroy_1000',
    title: 'Void Obliterator',
    description: 'Destroy 1,000 total asteroids',
    rewardCoins: 500,
    isUnlocked: (s) => s.totalAsteroidsDestroyed >= 1000,
  },
  {
    id: 'beat_boss_1',
    title: 'Mothership Down',
    description: 'Defeat your first Sector Boss (Level 5)',
    rewardCoins: 200,
    isUnlocked: (s) => s.bossesDefeated >= 1,
  },
  {
    id: 'reach_lvl_10',
    title: 'Deep In Orbit',
    description: 'Reach Level 10',
    rewardCoins: 300,
    isUnlocked: (s) => s.highestLevelReached >= 10,
  },
  {
    id: 'reach_lvl_30',
    title: 'Star Legend',
    description: 'Beat Level 30 & unlock Endless Mode',
    rewardCoins: 1000,
    isUnlocked: (s) => s.highestLevelReached > 30,
  },
  {
    id: 'combo_10',
    title: 'Rhythm of Destruction',
    description: 'Achieve a 10x Destruction Combo',
    rewardCoins: 150,
    isUnlocked: (s) => s.maxCombo >= 10,
  },
  {
    id: 'power_hoarder',
    title: 'Overcharged',
    description: 'Collect 25 power-ups in total',
    rewardCoins: 200,
    isUnlocked: (s) => s.powerUpsCollected >= 25,
  },
  {
    id: 'untouchable',
    title: 'Untouchable Ace',
    description: 'Complete any level without taking hull damage',
    rewardCoins: 250,
    isUnlocked: (s) => s.noDamageLevelBeaten,
  },
];
