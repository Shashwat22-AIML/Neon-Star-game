/**
 * NEON STAR DEFENDER - SAVE & PERSISTENCE MANAGER
 * Wraps localStorage access in safe try/catch with automatic in-memory fallback.
 */

import { ACHIEVEMENTS, GameStats, SHIP_SKINS, UPGRADES_LIST } from './config';

export interface UserSettings {
  musicVolume: number;
  sfxVolume: number;
  screenShake: boolean;
  highParticles: boolean;
  showFps: boolean;
}

export interface SaveData {
  coins: number;
  highScore: number;
  highestLevelReached: number;
  equippedSkinId: string;
  unlockedSkins: string[];
  upgrades: Record<string, number>;
  claimedAchievements: string[];
  stats: GameStats;
  settings: UserSettings;
}

const STORAGE_KEY = 'neon_star_defender_save_v1';

const DEFAULT_SAVE_DATA: SaveData = {
  coins: 0,
  highScore: 0,
  highestLevelReached: 1,
  equippedSkinId: 'striker',
  unlockedSkins: ['striker'],
  upgrades: {
    bulletDamage: 0,
    fireRate: 0,
    startingBullets: 0,
    maxLives: 0,
    coinMultiplier: 0,
    powerupDuration: 0,
    powerupDropRate: 0,
    moveSpeed: 0,
    bulletSpeed: 0,
    critChance: 0,
  },
  claimedAchievements: [],
  stats: {
    totalAsteroidsDestroyed: 0,
    totalCoinsEarned: 0,
    highestLevelReached: 1,
    bossesDefeated: 0,
    maxCombo: 0,
    powerUpsCollected: 0,
    noDamageLevelBeaten: false,
  },
  settings: {
    musicVolume: 0.45,
    sfxVolume: 0.75,
    screenShake: true,
    highParticles: true,
    showFps: false,
  },
};

class SaveManager {
  private data: SaveData;

  constructor() {
    this.data = this.load();
  }

  public getData(): SaveData {
    return this.data;
  }

  private load(): SaveData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_SAVE_DATA,
          ...parsed,
          upgrades: { ...DEFAULT_SAVE_DATA.upgrades, ...(parsed.upgrades || {}) },
          stats: { ...DEFAULT_SAVE_DATA.stats, ...(parsed.stats || {}) },
          settings: { ...DEFAULT_SAVE_DATA.settings, ...(parsed.settings || {}) },
          unlockedSkins: parsed.unlockedSkins || ['striker'],
          claimedAchievements: parsed.claimedAchievements || [],
        };
      }
    } catch {
      // In-memory fallback
    }
    return JSON.parse(JSON.stringify(DEFAULT_SAVE_DATA));
  }

  public save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // Fallback
    }
  }

  public resetProgress(): SaveData {
    this.data = JSON.parse(JSON.stringify(DEFAULT_SAVE_DATA));
    this.save();
    return this.data;
  }

  public addCoins(amount: number) {
    if (amount <= 0) return;
    this.data.coins += amount;
    this.data.stats.totalCoinsEarned += amount;
    this.save();
  }

  public spendCoins(amount: number): boolean {
    if (this.data.coins >= amount) {
      this.data.coins -= amount;
      this.save();
      return true;
    }
    return false;
  }

  public getUpgradeLevel(id: string): number {
    return this.data.upgrades[id] || 0;
  }

  public getUpgradeCost(id: string): number {
    const tier = UPGRADES_LIST.find((u) => u.id === id);
    if (!tier) return 999999;
    const currentLevel = this.getUpgradeLevel(id);
    if (currentLevel >= tier.maxLevel) return -1; // Maxed out
    return Math.round(tier.baseCost * Math.pow(tier.costMultiplier, currentLevel));
  }

  public buyUpgrade(id: string): boolean {
    const cost = this.getUpgradeCost(id);
    if (cost < 0 || this.data.coins < cost) return false;

    this.spendCoins(cost);
    this.data.upgrades[id] = (this.data.upgrades[id] || 0) + 1;
    this.save();
    return true;
  }

  public unlockSkin(skinId: string): boolean {
    const skin = SHIP_SKINS.find((s) => s.id === skinId);
    if (!skin || this.data.unlockedSkins.includes(skinId)) return false;
    if (this.data.coins < skin.cost) return false;

    this.spendCoins(skin.cost);
    this.data.unlockedSkins.push(skinId);
    this.save();
    return true;
  }

  public equipSkin(skinId: string): boolean {
    if (this.data.unlockedSkins.includes(skinId)) {
      this.data.equippedSkinId = skinId;
      this.save();
      return true;
    }
    return false;
  }

  public updateScoreAndLevel(score: number, level: number) {
    if (score > this.data.highScore) {
      this.data.highScore = score;
    }
    if (level > this.data.highestLevelReached) {
      this.data.highestLevelReached = level;
      this.data.stats.highestLevelReached = level;
    }
    this.save();
  }

  public updateStats(delta: Partial<GameStats>) {
    if (delta.totalAsteroidsDestroyed) {
      this.data.stats.totalAsteroidsDestroyed += delta.totalAsteroidsDestroyed;
    }
    if (delta.bossesDefeated) {
      this.data.stats.bossesDefeated += delta.bossesDefeated;
    }
    if (delta.maxCombo && delta.maxCombo > this.data.stats.maxCombo) {
      this.data.stats.maxCombo = delta.maxCombo;
    }
    if (delta.powerUpsCollected) {
      this.data.stats.powerUpsCollected += delta.powerUpsCollected;
    }
    if (delta.noDamageLevelBeaten) {
      this.data.stats.noDamageLevelBeaten = true;
    }
    this.save();
  }

  public claimAchievement(id: string): boolean {
    if (this.data.claimedAchievements.includes(id)) return false;
    const ach = ACHIEVEMENTS.find((a) => a.id === id);
    if (!ach || !ach.isUnlocked(this.data.stats)) return false;

    this.data.claimedAchievements.push(id);
    this.addCoins(ach.rewardCoins);
    this.save();
    return true;
  }

  public updateSettings(partial: Partial<UserSettings>) {
    this.data.settings = { ...this.data.settings, ...partial };
    this.save();
  }
}

export const saveManager = new SaveManager();
