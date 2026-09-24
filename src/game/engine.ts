/**
 * NEON STAR DEFENDER - CORE CANVAS GAME ENGINE
 * 60 FPS delta-time simulation, object pooling, procedural synthwave graphics & juice.
 */

import { audio } from './audio';
import { GAME_CONFIG, SHIP_SKINS, UPGRADES_LIST } from './config';
import { saveManager } from './save';
import {
  ActiveBuff,
  AsteroidEntity,
  AsteroidShape,
  BossBullet,
  BossEntity,
  BulletEntity,
  CoinEntity,
  FloatingTextEntity,
  LevelStats,
  ParticleEntity,
  PowerUpEntity,
  PowerUpType,
  ShootingStar,
  Star,
} from './types';

export class GameEngine {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;

  // Screen & Dimensions
  public width: number = 800;
  public height: number = 1000;
  public dpr: number = 1;

  // Loop & Timing
  private lastTime: number = 0;
  private animFrameId: number | null = null;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private slowMoTimer: number = 0;
  private fps: number = 60;
  private frameCount: number = 0;
  private fpsTimer: number = 0;

  // Level & Game State
  public level: number = 1;
  public score: number = 0;
  public runCoinsEarned: number = 0;
  public lives: number = 3;
  public maxLives: number = 3;
  public targetKills: number = 15;
  public currentKills: number = 0;
  public isLevelComplete: boolean = false;
  public isGameOver: boolean = false;
  public isBossLevel: boolean = false;
  public isBossActive: boolean = false;
  public bossWarningTimer: number = 0;

  // Level Stats for End Screen
  public levelStats: LevelStats = {
    level: 1,
    asteroidsDestroyed: 0,
    shotsFired: 0,
    shotsHit: 0,
    coinsEarned: 0,
    tookDamage: false,
    isBossLevel: false,
  };

  // Player State
  public playerX: number = 400;
  public playerY: number = 900;
  public targetPlayerX: number = 400;
  public playerVx: number = 0;
  public invulnerableTimer: number = 0;
  public hasShield: boolean = false;
  public shootTimer: number = 0;
  public runMultiShotBonus: number = 0; // Permanent for this run from Multi-shot drops
  public activeBuffs: Map<PowerUpType, ActiveBuff> = new Map();

  // Input State
  private keysPressed: Record<string, boolean> = {};
  private isPointerDown: boolean = false;

  // Entities & Object Pools
  private bulletPool: BulletEntity[] = [];
  private particlePool: ParticleEntity[] = [];
  private floatingTextPool: FloatingTextEntity[] = [];
  private asteroids: AsteroidEntity[] = [];
  private coins: CoinEntity[] = [];
  private powerUps: PowerUpEntity[] = [];
  private bossBullets: BossBullet[] = [];
  public boss: BossEntity | null = null;

  // Spawner Timers
  private asteroidSpawnTimer: number = 0;
  private nextAsteroidId: number = 1;

  // Combo System
  public combo: number = 0;
  public comboTimer: number = 0;

  // Juice & Feedback
  private screenShakeTime: number = 0;
  private screenShakeIntensity: number = 0;
  private nukeFlashTimer: number = 0;

  // Background Starfield
  private stars: Star[] = [];
  private shootingStars: ShootingStar[] = [];
  private shootingStarTimer: number = 0;

  // External UI Event Callbacks
  public onStateChange?: () => void;
  public onLevelComplete?: (stats: LevelStats) => void;
  public onGameOver?: (stats: { score: number; level: number; coins: number }) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Could not get 2D context');
    this.ctx = context;

    this.initPools();
    this.initStarfield();
    this.setupEventListeners();
    this.resize();
  }

  // --- OBJECT POOLING INITIALIZATION ---

  private initPools() {
    // 300 bullets
    for (let i = 0; i < 300; i++) {
      this.bulletPool.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        radius: 4,
        damage: 1,
        isCrit: false,
        piercesLeft: 0,
        color: '#00f3ff',
      });
    }

    // 500 particles
    for (let i = 0; i < 500; i++) {
      this.particlePool.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 3,
        color: '#ffffff',
        alpha: 1,
        life: 0,
        maxLife: 1,
        shape: 'circle',
      });
    }

    // 100 floating damage numbers
    for (let i = 0; i < 100; i++) {
      this.floatingTextPool.push({
        active: false,
        x: 0,
        y: 0,
        text: '',
        color: '#ffffff',
        size: 16,
        alpha: 1,
        life: 0,
        maxLife: 0.6,
        isCrit: false,
      });
    }
  }

  private initStarfield() {
    this.stars = [];
    const starCount = 180;
    const colors = ['#ffffff', '#aae7ff', '#ffc4eb', '#a8ffb2'];

    for (let i = 0; i < starCount; i++) {
      const layer = (i % 3) + 1; // 1 = far, 2 = mid, 3 = near
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: layer === 3 ? 2.2 : layer === 2 ? 1.5 : 1.0,
        speed: layer * 35 + Math.random() * 15,
        brightness: 0.3 + Math.random() * 0.7,
        twinklePhase: Math.random() * Math.PI * 2,
        layer,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  // --- LIFECYCLE & INPUT ---

  public resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2 for perf
    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);

    this.ctx.resetTransform?.();
    this.ctx.scale(this.dpr, this.dpr);

    // Keep player in bounds after resize
    this.playerY = this.height - 75;
    this.playerX = Math.max(40, Math.min(this.width - 40, this.playerX));
    this.targetPlayerX = this.playerX;
  }

  private setupEventListeners() {
    window.addEventListener('resize', () => this.resize());

    // Keyboard controls
    window.addEventListener('keydown', (e) => {
      this.keysPressed[e.code] = true;
      if (e.code === 'KeyP' || e.code === 'Escape') {
        this.togglePause();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keysPressed[e.code] = false;
    });

    // Mouse & Touch Controls
    const handlePointerMove = (clientX: number) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      this.targetPlayerX = Math.max(30, Math.min(this.width - 30, x));
    };

    this.canvas.addEventListener('mousedown', (e) => {
      this.isPointerDown = true;
      audio.userInteracted();
      handlePointerMove(e.clientX);
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isPointerDown || !('ontouchstart' in window)) {
        handlePointerMove(e.clientX);
      }
    });

    window.addEventListener('mouseup', () => {
      this.isPointerDown = false;
    });

    // Touch handlers
    this.canvas.addEventListener(
      'touchstart',
      (e) => {
        if (e.touches.length > 0) {
          audio.userInteracted();
          handlePointerMove(e.touches[0].clientX);
        }
      },
      { passive: true }
    );

    this.canvas.addEventListener(
      'touchmove',
      (e) => {
        if (e.touches.length > 0) {
          handlePointerMove(e.touches[0].clientX);
        }
      },
      { passive: true }
    );
  }

  // --- GAME START & RUN CONTROLS ---

  public startLevel(lvl: number = 1) {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    this.level = lvl;
    this.isLevelComplete = false;
    this.isGameOver = false;
    this.isPaused = false;
    this.currentKills = 0;
    this.shootTimer = 0;
    this.asteroidSpawnTimer = 0.4;
    this.combo = 0;
    this.comboTimer = 0;
    this.boss = null;
    this.isBossActive = false;
    this.screenShakeTime = 0;
    this.nukeFlashTimer = 0;
    this.slowMoTimer = 0;
    this.invulnerableTimer = 0;

    // Check if boss level (every 5th level)
    this.isBossLevel = this.level % GAME_CONFIG.BOSS.BOSS_INTERVAL === 0;
    if (this.isBossLevel) {
      this.targetKills = 1; // Killing boss clears level
      this.bossWarningTimer = 2.5; // Warning siren delay
      audio.playBossWarning();
    } else {
      this.targetKills =
        GAME_CONFIG.LEVELS.TARGET_KILLS_BASE +
        (this.level - 1) * GAME_CONFIG.LEVELS.TARGET_KILLS_PER_LEVEL;
    }

    // Load upgrade stats
    const save = saveManager.getData();
    const maxLivesUpgrade = saveManager.getUpgradeLevel('maxLives');
    const maxLivesTier = UPGRADES_LIST.find((u) => u.id === 'maxLives');
    const oldMaxLives = this.maxLives;
    this.maxLives = maxLivesTier ? maxLivesTier.getValue(maxLivesUpgrade) : 3;

    // Reset lives if new run or preserve if level transition
    if (lvl === 1 || this.lives <= 0) {
      this.lives = this.maxLives;
      this.score = 0;
      this.runCoinsEarned = 0;
      this.runMultiShotBonus = 0;
    } else {
      // Continuing into next sector: if player purchased extra maxLives in shop, grant the increase!
      if (this.maxLives > oldMaxLives) {
        this.lives += (this.maxLives - oldMaxLives);
      }
      this.lives = Math.min(this.maxLives, Math.max(1, this.lives));
    }

    this.levelStats = {
      level: this.level,
      asteroidsDestroyed: 0,
      shotsFired: 0,
      shotsHit: 0,
      coinsEarned: 0,
      tookDamage: false,
      isBossLevel: this.isBossLevel,
    };

    // Clean active entities
    this.clearTransientEntities();

    this.isRunning = true;
    this.lastTime = performance.now();

    this.animFrameId = requestAnimationFrame(this.loop);

    audio.startMusic();
    this.onStateChange?.();
  }

  public clearTransientEntities() {
    this.asteroids = [];
    this.coins = [];
    this.powerUps = [];
    this.bossBullets = [];
    this.boss = null;
    this.activeBuffs.clear();
    this.hasShield = false;

    // Deactivate pools
    for (const b of this.bulletPool) b.active = false;
    for (const p of this.particlePool) p.active = false;
    for (const t of this.floatingTextPool) t.active = false;
  }

  public togglePause(): boolean {
    if (this.isGameOver || this.isLevelComplete) return this.isPaused;
    this.isPaused = !this.isPaused;
    this.onStateChange?.();
    return this.isPaused;
  }

  public setPaused(p: boolean) {
    this.isPaused = p;
    this.onStateChange?.();
  }

  public stop() {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    audio.stopMusic();
  }

  // --- MAIN SIMULATION LOOP ---

  private loop = (currentTime: number) => {
    if (!this.isRunning) {
      this.animFrameId = null;
      return;
    }

    let dt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Cap delta time to prevent tunneling after tab switch
    if (dt > 0.1) dt = 0.1;

    // FPS calculation
    this.frameCount++;
    this.fpsTimer += dt;
    if (this.fpsTimer >= 0.5) {
      this.fps = Math.round(this.frameCount / this.fpsTimer);
      this.frameCount = 0;
      this.fpsTimer = 0;
    }

    // Apply slow-mo if active
    let simDt = dt;
    if (this.slowMoTimer > 0) {
      this.slowMoTimer -= dt;
      simDt *= GAME_CONFIG.JUICE.SLOW_MO_SCALE;
    }

    if (!this.isPaused) {
      this.update(simDt, dt);
    }

    this.render();

    if (this.isRunning) {
      this.animFrameId = requestAnimationFrame(this.loop);
    } else {
      this.animFrameId = null;
    }
  };

  // --- UPDATE LOGIC ---

  private update(dt: number, rawDt: number) {
    // Screen shake decay (uses rawDt so camera decay isn't slowed down)
    if (this.screenShakeTime > 0) {
      this.screenShakeTime -= rawDt;
    }
    if (this.nukeFlashTimer > 0) {
      this.nukeFlashTimer -= rawDt;
    }

    // Update starfield background
    this.updateStarfield(dt);

    // Update Timers & Buffs
    this.updateBuffs(dt);
    this.updateCombo(dt);

    // Update Player Movement & Auto-fire
    this.updatePlayer(dt);

    // Spawn & Update Boss
    if (this.isBossLevel) {
      this.updateBossFlow(dt);
    } else {
      this.updateAsteroidSpawner(dt);
    }

    // Update Entities
    this.updateBullets(dt);
    this.updateAsteroids(dt);
    this.updateBossBullets(dt);
    this.updatePowerUps(dt);
    this.updateCoins(dt);
    this.updateParticles(dt);
    this.updateFloatingTexts(dt);

    // Check Collisions
    this.checkCollisions();

    // Check Level Complete condition
    if (!this.isLevelComplete && !this.isGameOver) {
      if (this.isBossLevel) {
        if (this.boss && this.boss.hp <= 0) {
          this.triggerLevelComplete();
        }
      } else if (this.currentKills >= this.targetKills && this.asteroids.length === 0) {
        this.triggerLevelComplete();
      }
    }
  }

  // --- STARFIELD ---

  private updateStarfield(dt: number) {
    const timeSlowBuff = this.activeBuffs.has('TIME_SLOW');
    const speedMult = timeSlowBuff ? 0.6 : 1.0;

    for (const star of this.stars) {
      star.y += star.speed * speedMult * dt;
      star.twinklePhase += dt * 3;
      if (star.y > this.height) {
        star.y = -5;
        star.x = Math.random() * this.width;
      }
    }

    // Shooting stars
    this.shootingStarTimer -= dt;
    if (this.shootingStarTimer <= 0) {
      this.shootingStarTimer = 3.5 + Math.random() * 5.0;
      this.shootingStars.push({
        active: true,
        x: Math.random() * this.width * 0.8,
        y: -10,
        vx: 300 + Math.random() * 200,
        vy: 450 + Math.random() * 300,
        length: 40 + Math.random() * 35,
        alpha: 1.0,
      });
    }

    for (let i = this.shootingStars.length - 1; i >= 0; i--) {
      const ss = this.shootingStars[i];
      ss.x += ss.vx * dt;
      ss.y += ss.vy * dt;
      ss.alpha -= dt * 1.5;
      if (ss.alpha <= 0 || ss.y > this.height || ss.x > this.width) {
        this.shootingStars.splice(i, 1);
      }
    }
  }

  // --- BUFFS & COMBO ---

  private updateBuffs(dt: number) {
    for (const [type, buff] of this.activeBuffs.entries()) {
      buff.remainingTime -= dt;
      if (buff.remainingTime <= 0) {
        this.activeBuffs.delete(type);
      }
    }

    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
    }
  }

  private updateCombo(dt: number) {
    if (this.combo > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
        this.comboTimer = 0;
        this.onStateChange?.();
      }
    }
  }

  public registerKill() {
    this.currentKills++;
    this.levelStats.asteroidsDestroyed++;
    this.combo++;
    this.comboTimer = GAME_CONFIG.COMBO.TIMEOUT_SECONDS;
    audio.playCombo(this.combo);

    // Check stats
    saveManager.updateStats({
      totalAsteroidsDestroyed: 1,
      maxCombo: this.combo,
    });
  }

  // --- PLAYER MOVEMENT & SHOOTING ---

  private updatePlayer(dt: number) {
    const moveSpeedUpgrade = saveManager.getUpgradeLevel('moveSpeed');
    const moveSpeedTier = UPGRADES_LIST.find((u) => u.id === 'moveSpeed');
    const speed = moveSpeedTier
      ? moveSpeedTier.getValue(moveSpeedUpgrade)
      : GAME_CONFIG.PLAYER.BASE_SPEED;

    // Keyboard input
    let keyDir = 0;
    if (this.keysPressed['ArrowLeft'] || this.keysPressed['KeyA']) keyDir -= 1;
    if (this.keysPressed['ArrowRight'] || this.keysPressed['KeyD']) keyDir += 1;

    if (keyDir !== 0) {
      this.playerX += keyDir * speed * dt;
      this.targetPlayerX = this.playerX;
    } else {
      // Smooth lerp toward mouse/touch target
      const lerpFactor = 1 - Math.pow(1 - GAME_CONFIG.PLAYER.SMOOTH_LERP, dt * 60);
      const dx = this.targetPlayerX - this.playerX;
      this.playerX += dx * lerpFactor;
    }

    // Clamp inside canvas bounds
    const halfWidth = GAME_CONFIG.PLAYER.BASE_WIDTH / 2;
    this.playerX = Math.max(halfWidth + 10, Math.min(this.width - halfWidth - 10, this.playerX));

    // Engine exhaust particles
    if (Math.random() < 0.6) {
      this.spawnExhaustParticle(this.playerX - 12, this.playerY + 20);
      this.spawnExhaustParticle(this.playerX + 12, this.playerY + 20);
    }

    // Auto-firing bullets
    this.updateFiring(dt);
  }

  private updateFiring(dt: number) {
    const fireRateUpgrade = saveManager.getUpgradeLevel('fireRate');
    const fireRateTier = UPGRADES_LIST.find((u) => u.id === 'fireRate');
    let shotsPerSec = fireRateTier
      ? fireRateTier.getValue(fireRateUpgrade)
      : GAME_CONFIG.PLAYER.BASE_FIRE_RATE;

    if (this.activeBuffs.has('RAPID_FIRE')) {
      shotsPerSec *= 1 + GAME_CONFIG.POWER_UPS.RAPID_FIRE_MULTIPLIER;
    }

    const fireInterval = 1 / shotsPerSec;
    this.shootTimer += dt;

    if (this.shootTimer >= fireInterval) {
      this.shootTimer -= fireInterval;
      this.fireVolley();
    }
  }

  private fireVolley() {
    const startingBulletsUpgrade = saveManager.getUpgradeLevel('startingBullets');
    const startingBulletsTier = UPGRADES_LIST.find((u) => u.id === 'startingBullets');
    const baseBulletCount = startingBulletsTier
      ? startingBulletsTier.getValue(startingBulletsUpgrade)
      : GAME_CONFIG.PLAYER.BASE_BULLET_COUNT;

    // Run multi-shot bonus (max 7)
    const totalBullets = Math.min(
      GAME_CONFIG.POWER_UPS.MAX_MULTI_SHOT,
      baseBulletCount + this.runMultiShotBonus
    );

    // Damage stat calculation
    const damageUpgrade = saveManager.getUpgradeLevel('bulletDamage');
    const damageTier = UPGRADES_LIST.find((u) => u.id === 'bulletDamage');
    let baseDmg = damageTier
      ? damageTier.getValue(damageUpgrade)
      : GAME_CONFIG.PLAYER.BASE_DAMAGE;

    const damageBuff = this.activeBuffs.get('DAMAGE_BOOST');
    if (damageBuff) {
      const stacks = damageBuff.stacks || 1;
      baseDmg *= 1 + GAME_CONFIG.POWER_UPS.DAMAGE_BOOST_MULTIPLIER * stacks;
    }

    // Crit chance
    const critUpgrade = saveManager.getUpgradeLevel('critChance');
    const critTier = UPGRADES_LIST.find((u) => u.id === 'critChance');
    const critChance = critTier
      ? critTier.getValue(critUpgrade)
      : GAME_CONFIG.PLAYER.BASE_CRIT_CHANCE;

    // Bullet speed
    const bulletSpeedUpgrade = saveManager.getUpgradeLevel('bulletSpeed');
    const bulletSpeedTier = UPGRADES_LIST.find((u) => u.id === 'bulletSpeed');
    const bSpeed = bulletSpeedTier
      ? bulletSpeedTier.getValue(bulletSpeedUpgrade)
      : GAME_CONFIG.PLAYER.BASE_BULLET_SPEED;

    const pierces = this.activeBuffs.has('PIERCING') ? 3 : 0;

    // Fan-out angle calculation
    const maxSpread = Math.min(32, (totalBullets - 1) * 7); // Spread angle in degrees
    const stepAngle = totalBullets > 1 ? (maxSpread * 2) / (totalBullets - 1) : 0;

    // Equipped skin color
    const skin = SHIP_SKINS.find((s) => s.id === saveManager.getData().equippedSkinId) || SHIP_SKINS[0];

    for (let i = 0; i < totalBullets; i++) {
      const angleDeg = totalBullets === 1 ? 0 : -maxSpread + i * stepAngle;
      const angleRad = (angleDeg * Math.PI) / 180;

      const isCrit = Math.random() < critChance;
      const finalDmg = isCrit
        ? Math.round(baseDmg * GAME_CONFIG.PLAYER.CRIT_MULTIPLIER)
        : Math.round(baseDmg);

      const vx = Math.sin(angleRad) * bSpeed;
      const vy = -Math.cos(angleRad) * bSpeed;

      // Spawn bullet from pool
      this.spawnBullet(
        this.playerX + (totalBullets > 1 ? (i - (totalBullets - 1) / 2) * 6 : 0),
        this.playerY - 26,
        vx,
        vy,
        finalDmg,
        isCrit,
        pierces,
        isCrit ? '#ffe600' : skin.primaryColor
      );

      this.levelStats.shotsFired++;
    }

    audio.playShoot(1.0 + (totalBullets - 1) * 0.05);
  }

  private spawnBullet(
    x: number,
    y: number,
    vx: number,
    vy: number,
    damage: number,
    isCrit: boolean,
    pierces: number,
    color: string
  ) {
    const bullet = this.bulletPool.find((b) => !b.active);
    if (!bullet) return;

    bullet.active = true;
    bullet.x = x;
    bullet.y = y;
    bullet.vx = vx;
    bullet.vy = vy;
    bullet.radius = isCrit ? 6 : 4;
    bullet.damage = damage;
    bullet.isCrit = isCrit;
    bullet.piercesLeft = pierces;
    bullet.color = color;
  }

  private updateBullets(dt: number) {
    for (const b of this.bulletPool) {
      if (!b.active) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // Deactivate if offscreen
      if (b.y < -30 || b.x < -20 || b.x > this.width + 20) {
        b.active = false;
      }
    }
  }

  // --- ASTEROIDS SPAWNER & UPDATE ---

  private updateAsteroidSpawner(dt: number) {
    if (this.currentKills >= this.targetKills) return;

    this.asteroidSpawnTimer -= dt;
    if (this.asteroidSpawnTimer <= 0) {
      const interval = Math.max(
        GAME_CONFIG.ASTEROID.SPAWN_INTERVAL_MIN,
        GAME_CONFIG.ASTEROID.SPAWN_INTERVAL_INITIAL -
          this.level * GAME_CONFIG.ASTEROID.SPAWN_INTERVAL_DECREASE_PER_LEVEL
      );
      this.asteroidSpawnTimer = interval;

      this.spawnRandomAsteroid();
    }
  }

  private spawnRandomAsteroid() {
    const shape =
      GAME_CONFIG.ASTEROID.SHAPES[
        Math.floor(Math.random() * GAME_CONFIG.ASTEROID.SHAPES.length)
      ];

    // HP scales with level and randomness
    const baseHp =
      GAME_CONFIG.ASTEROID.BASE_HP_MIN +
      Math.floor(Math.random() * (GAME_CONFIG.ASTEROID.BASE_HP_MAX - GAME_CONFIG.ASTEROID.BASE_HP_MIN));
    const hp = Math.round(baseHp + this.level * GAME_CONFIG.ASTEROID.HP_SCALE_PER_LEVEL);

    // Size correlates with HP
    const radius = Math.min(54, Math.max(24, 20 + Math.sqrt(hp) * 4.2));

    const speed =
      GAME_CONFIG.ASTEROID.BASE_SPEED_MIN +
      Math.random() * (GAME_CONFIG.ASTEROID.BASE_SPEED_MAX - GAME_CONFIG.ASTEROID.BASE_SPEED_MIN) +
      this.level * GAME_CONFIG.ASTEROID.SPEED_SCALE_PER_LEVEL;

    const x = radius + Math.random() * (this.width - radius * 2);
    const y = -radius - 10;

    // Jittered vertex offsets for irregular rocks
    const vertexOffsets: number[] = [];
    const numVertices = shape === 'polygon' ? 8 : 6;
    for (let i = 0; i < numVertices; i++) {
      vertexOffsets.push(0.75 + Math.random() * 0.45);
    }

    const canSplit =
      radius >= GAME_CONFIG.ASTEROID.MIN_SPLIT_SIZE &&
      Math.random() < GAME_CONFIG.ASTEROID.SPLIT_CHANCE;

    this.asteroids.push({
      id: this.nextAsteroidId++,
      active: true,
      x,
      y,
      vx: (Math.random() - 0.5) * 35,
      vy: speed,
      width: radius * 2,
      height: radius * 2,
      radius,
      hp,
      maxHp: hp,
      shape,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 1.5,
      vertexOffsets,
      hitFlashTimer: 0,
      canSplit,
      isBoss: false,
      isMinion: false,
    });
  }

  private updateAsteroids(dt: number) {
    const isSlowed = this.activeBuffs.has('TIME_SLOW');
    const speedFactor = isSlowed ? GAME_CONFIG.POWER_UPS.TIME_SLOW_FACTOR : 1.0;

    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      const ast = this.asteroids[i];
      if (!ast.active) {
        this.asteroids.splice(i, 1);
        continue;
      }

      ast.x += ast.vx * speedFactor * dt;
      ast.y += ast.vy * speedFactor * dt;
      ast.rotation += ast.rotSpeed * speedFactor * dt;

      if (ast.hitFlashTimer > 0) {
        ast.hitFlashTimer -= dt;
      }

      // Bounce lightly off side walls
      if (ast.x - ast.radius < 0) {
        ast.x = ast.radius;
        ast.vx = Math.abs(ast.vx);
      } else if (ast.x + ast.radius > this.width) {
        ast.x = this.width - ast.radius;
        ast.vx = -Math.abs(ast.vx);
      }

      // Reached bottom: despawn harmlessly without damaging the player
      if (ast.y - ast.radius > this.height) {
        this.asteroids.splice(i, 1);
      }
    }
  }

  // --- BOSS LOGIC ---

  private updateBossFlow(dt: number) {
    if (this.bossWarningTimer > 0) {
      this.bossWarningTimer -= dt;
      if (this.bossWarningTimer <= 0) {
        this.spawnBoss();
      }
      return;
    }

    if (!this.boss || !this.boss.active) return;

    const boss = this.boss;
    boss.x += boss.vx * dt;
    boss.glowPulse += dt * 4;

    if (boss.hitFlashTimer > 0) {
      boss.hitFlashTimer -= dt;
    }

    // Ping-pong across top
    const margin = boss.width / 2 + 20;
    if (boss.x < margin) {
      boss.x = margin;
      boss.vx = Math.abs(boss.vx);
    } else if (boss.x > this.width - margin) {
      boss.x = this.width - margin;
      boss.vx = -Math.abs(boss.vx);
    }

    // Boss bullet volley attack
    boss.attackTimer -= dt;
    if (boss.attackTimer <= 0) {
      boss.attackTimer = GAME_CONFIG.BOSS.ATTACK_COOLDOWN;
      this.fireBossAttack();
    }

    // Boss minion spawn
    boss.minionTimer -= dt;
    if (boss.minionTimer <= 0) {
      boss.minionTimer = GAME_CONFIG.BOSS.MINION_SPAWN_INTERVAL;
      this.spawnBossMinion(boss.x - 45);
      this.spawnBossMinion(boss.x + 45);
    }
  }

  private spawnBoss() {
    this.isBossActive = true;
    const tier = Math.floor(this.level / GAME_CONFIG.BOSS.BOSS_INTERVAL);
    const hp = Math.round(
      GAME_CONFIG.BOSS.BASE_HP * Math.pow(GAME_CONFIG.BOSS.HP_MULTIPLIER_PER_TIER, tier - 1)
    );

    this.boss = {
      active: true,
      x: this.width / 2,
      y: 130,
      vx: GAME_CONFIG.BOSS.MOVE_SPEED,
      width: 150,
      height: 90,
      hp,
      maxHp: hp,
      phase: 1,
      attackTimer: 1.5,
      minionTimer: 4.0,
      hitFlashTimer: 0,
      glowPulse: 0,
    };
  }

  private fireBossAttack() {
    if (!this.boss) return;
    const bSpeed = GAME_CONFIG.BOSS.PROJECTILE_SPEED;

    // 3 spread plasma spheres aimed downward
    const angles = [-25, 0, 25];
    for (const deg of angles) {
      const rad = (deg * Math.PI) / 180;
      this.bossBullets.push({
        active: true,
        x: this.boss.x,
        y: this.boss.y + 40,
        vx: Math.sin(rad) * bSpeed,
        vy: Math.cos(rad) * bSpeed,
        radius: 7,
        color: '#ff0055',
      });
    }
    audio.playLaser(0.6);
  }

  private spawnBossMinion(x: number) {
    const radius = 22;
    this.asteroids.push({
      id: this.nextAsteroidId++,
      active: true,
      x,
      y: (this.boss ? this.boss.y + 50 : 150),
      vx: (Math.random() - 0.5) * 60,
      vy: 110,
      width: radius * 2,
      height: radius * 2,
      radius,
      hp: Math.round(8 + this.level * 1.5),
      maxHp: Math.round(8 + this.level * 1.5),
      shape: 'hexagon',
      rotation: 0,
      rotSpeed: 2,
      vertexOffsets: [1, 1, 1, 1, 1, 1],
      hitFlashTimer: 0,
      canSplit: false,
      isBoss: false,
      isMinion: true,
    });
  }

  private updateBossBullets(dt: number) {
    for (let i = this.bossBullets.length - 1; i >= 0; i--) {
      const bb = this.bossBullets[i];
      bb.x += bb.vx * dt;
      bb.y += bb.vy * dt;

      // Collide with player
      const dx = bb.x - this.playerX;
      const dy = bb.y - this.playerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < bb.radius + GAME_CONFIG.PLAYER.HITBOX_RADIUS) {
        this.bossBullets.splice(i, 1);
        this.damagePlayer();
        continue;
      }

      // Offscreen
      if (bb.y > this.height + 20 || bb.x < -20 || bb.x > this.width + 20) {
        this.bossBullets.splice(i, 1);
      }
    }
  }

  // --- POWER-UPS & COINS ---

  private updatePowerUps(dt: number) {
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const p = this.powerUps[i];
      p.y += GAME_CONFIG.POWER_UPS.FALL_SPEED * dt;
      p.pulseTimer += dt * 5;

      // Collision with player
      const dx = p.x - this.playerX;
      const dy = p.y - this.playerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < p.radius + GAME_CONFIG.PLAYER.BASE_WIDTH / 2) {
        this.collectPowerUp(p.type);
        this.powerUps.splice(i, 1);
        continue;
      }

      if (p.y > this.height + 30) {
        this.powerUps.splice(i, 1);
      }
    }
  }

  private collectPowerUp(type: PowerUpType) {
    audio.playPowerup();
    saveManager.updateStats({ powerUpsCollected: 1 });

    const durUpgrade = saveManager.getUpgradeLevel('powerupDuration');
    const durTier = UPGRADES_LIST.find((u) => u.id === 'powerupDuration');
    const bonusDurPct = durTier ? durTier.getValue(durUpgrade) : 0;
    const durMult = 1 + bonusDurPct;

    switch (type) {
      case 'DAMAGE_BOOST': {
        const existing = this.activeBuffs.get('DAMAGE_BOOST');
        const stacks = existing
          ? Math.min(GAME_CONFIG.POWER_UPS.DAMAGE_BOOST_MAX_STACKS, (existing.stacks || 1) + 1)
          : 1;
        const total = GAME_CONFIG.POWER_UPS.DURATIONS.DAMAGE_BOOST * durMult;
        this.activeBuffs.set('DAMAGE_BOOST', {
          type,
          remainingTime: total,
          totalDuration: total,
          stacks,
        });
        this.spawnFloatingText(this.playerX, this.playerY - 40, `DAMAGE x${stacks}!`, '#ff0055', 20, true);
        break;
      }
      case 'MULTI_SHOT': {
        this.runMultiShotBonus++;
        this.spawnFloatingText(this.playerX, this.playerY - 40, '+1 VOLLEY!', '#00f3ff', 20, true);
        break;
      }
      case 'RAPID_FIRE': {
        const total = GAME_CONFIG.POWER_UPS.DURATIONS.RAPID_FIRE * durMult;
        this.activeBuffs.set('RAPID_FIRE', {
          type,
          remainingTime: total,
          totalDuration: total,
        });
        this.spawnFloatingText(this.playerX, this.playerY - 40, 'RAPID FIRE!', '#ff9900', 20, true);
        break;
      }
      case 'SHIELD': {
        this.hasShield = true;
        this.spawnFloatingText(this.playerX, this.playerY - 40, 'SHIELD ON!', '#00e5ff', 20, true);
        break;
      }
      case 'PIERCING': {
        const total = GAME_CONFIG.POWER_UPS.DURATIONS.PIERCING * durMult;
        this.activeBuffs.set('PIERCING', {
          type,
          remainingTime: total,
          totalDuration: total,
        });
        this.spawnFloatingText(this.playerX, this.playerY - 40, 'PIERCING SHOTS!', '#ffe600', 20, true);
        break;
      }
      case 'MAGNET': {
        const total = GAME_CONFIG.POWER_UPS.DURATIONS.MAGNET * durMult;
        this.activeBuffs.set('MAGNET', {
          type,
          remainingTime: total,
          totalDuration: total,
        });
        this.spawnFloatingText(this.playerX, this.playerY - 40, 'MAGNET!', '#b026ff', 20, true);
        break;
      }
      case 'NUKE': {
        this.triggerNuke();
        break;
      }
      case 'TIME_SLOW': {
        const total = GAME_CONFIG.POWER_UPS.DURATIONS.TIME_SLOW * durMult;
        this.activeBuffs.set('TIME_SLOW', {
          type,
          remainingTime: total,
          totalDuration: total,
        });
        this.spawnFloatingText(this.playerX, this.playerY - 40, 'TIME SLOW!', '#00ffcc', 20, true);
        break;
      }
      case 'HEALTH': {
        if (this.lives < this.maxLives) {
          this.lives++;
        }
        this.spawnFloatingText(this.playerX, this.playerY - 40, '+1 LIFE!', '#00ff66', 20, true);
        break;
      }
    }

    this.onStateChange?.();
  }

  private triggerNuke() {
    audio.playNuke();
    this.nukeFlashTimer = 0.5;
    this.triggerScreenShake(GAME_CONFIG.JUICE.SHAKE_DURATION_NUKE, GAME_CONFIG.JUICE.SHAKE_INTENSITY_NUKE);

    // Destroy all normal asteroids on screen
    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      const ast = this.asteroids[i];
      this.explodeAsteroid(ast);
    }
    this.asteroids = [];

    // Damage boss if present
    if (this.boss && this.boss.active) {
      const dmg = Math.round(this.boss.maxHp * 0.25);
      this.boss.hp -= dmg;
      this.spawnFloatingText(this.boss.x, this.boss.y, `-${dmg}`, '#ffffff', 28, true);
    }
  }

  private updateCoins(dt: number) {
    const hasMagnet = this.activeBuffs.has('MAGNET');
    const magnetRadius = hasMagnet
      ? GAME_CONFIG.PLAYER.ACTIVE_MAGNET_RADIUS
      : GAME_CONFIG.PLAYER.BASE_MAGNET_RADIUS;

    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      c.spinAngle += dt * 6;

      const dx = this.playerX - c.x;
      const dy = this.playerY - c.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < magnetRadius) {
        // Accelerate magnetically toward ship
        const pullFactor = hasMagnet ? 12.0 : 6.0;
        c.vx += (dx / dist) * GAME_CONFIG.ECONOMY.COIN_MAGNET_ACCEL * dt * pullFactor;
        c.vy += (dy / dist) * GAME_CONFIG.ECONOMY.COIN_MAGNET_ACCEL * dt * pullFactor;
      } else {
        c.vy = GAME_CONFIG.ECONOMY.COIN_FALL_SPEED;
        c.vx *= 0.95;
      }

      c.x += c.vx * dt;
      c.y += c.vy * dt;

      // Collect coin
      if (dist < c.radius + GAME_CONFIG.PLAYER.BASE_WIDTH / 2) {
        this.collectCoin(c.value);
        this.coins.splice(i, 1);
        continue;
      }

      // Discard off bottom
      if (c.y > this.height + 25) {
        this.coins.splice(i, 1);
      }
    }
  }

  private collectCoin(val: number) {
    audio.playCoin();
    const multiplier = 1 + (this.combo > 1 ? (this.combo - 1) * 0.1 : 0);
    const earned = Math.max(1, Math.round(val * multiplier));
    this.runCoinsEarned += earned;
    this.levelStats.coinsEarned += earned;
    saveManager.addCoins(earned);
    this.onStateChange?.();
  }

  // --- PARTICLES & FLOATING TEXTS ---

  private spawnExhaustParticle(x: number, y: number) {
    const p = this.particlePool.find((part) => !part.active);
    if (!p) return;

    const skin = SHIP_SKINS.find((s) => s.id === saveManager.getData().equippedSkinId) || SHIP_SKINS[0];

    p.active = true;
    p.x = x + (Math.random() - 0.5) * 6;
    p.y = y;
    p.vx = (Math.random() - 0.5) * 20;
    p.vy = 80 + Math.random() * 80;
    p.size = 2 + Math.random() * 3;
    p.color = skin.engineColor;
    p.alpha = 0.8;
    p.life = 0;
    p.maxLife = 0.25 + Math.random() * 0.15;
    p.shape = 'circle';
  }

  public spawnExplosion(x: number, y: number, color: string, count: number = 24) {
    const isHighPerf = saveManager.getData().settings.highParticles;
    const actualCount = isHighPerf ? count : Math.floor(count * 0.5);

    for (let i = 0; i < actualCount; i++) {
      const p = this.particlePool.find((part) => !part.active);
      if (!p) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 260;

      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.size = 2 + Math.random() * 4;
      p.color = color;
      p.alpha = 1.0;
      p.life = 0;
      p.maxLife = 0.35 + Math.random() * 0.45;
      p.shape = Math.random() < 0.3 ? 'spark' : 'circle';
    }
  }

  private updateParticles(dt: number) {
    for (const p of this.particlePool) {
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.alpha = 1 - p.life / p.maxLife;
    }
  }

  public spawnFloatingText(
    x: number,
    y: number,
    text: string,
    color: string = '#ffffff',
    size: number = 16,
    isCrit: boolean = false
  ) {
    const ft = this.floatingTextPool.find((t) => !t.active);
    if (!ft) return;

    ft.active = true;
    ft.x = x + (Math.random() - 0.5) * 14;
    ft.y = y;
    ft.text = text;
    ft.color = color;
    ft.size = size;
    ft.alpha = 1.0;
    ft.life = 0;
    ft.maxLife = isCrit ? 0.85 : 0.5;
    ft.isCrit = isCrit;
  }

  private updateFloatingTexts(dt: number) {
    for (const ft of this.floatingTextPool) {
      if (!ft.active) continue;
      ft.life += dt;
      if (ft.life >= ft.maxLife) {
        ft.active = false;
        continue;
      }
      ft.y -= 55 * dt;
      ft.alpha = 1 - ft.life / ft.maxLife;
    }
  }

  // --- COLLISION DETECTION ---

  private checkCollisions() {
    // 1. Bullets vs Asteroids
    for (const b of this.bulletPool) {
      if (!b.active) continue;

      for (let i = this.asteroids.length - 1; i >= 0; i--) {
        const ast = this.asteroids[i];
        if (!ast.active) continue;

        const dx = b.x - ast.x;
        const dy = b.y - ast.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < b.radius + ast.radius) {
          // Hit detected!
          this.levelStats.shotsHit++;
          ast.hp -= b.damage;
          ast.hitFlashTimer = GAME_CONFIG.JUICE.HIT_FLASH_DURATION;
          this.score += b.damage * 10;

          audio.playHit(b.isCrit);
          this.spawnFloatingText(
            b.x,
            b.y - 10,
            `${b.damage}${b.isCrit ? '!' : ''}`,
            b.isCrit ? '#ffe600' : '#ffffff',
            b.isCrit ? 22 : 15,
            b.isCrit
          );

          // Piercing logic
          if (b.piercesLeft > 0) {
            b.piercesLeft--;
          } else {
            b.active = false;
          }

          // Check asteroid destroyed
          if (ast.hp <= 0) {
            this.explodeAsteroid(ast);
            this.asteroids.splice(i, 1);
          }

          if (!b.active) break;
        }
      }

      // Bullets vs Boss
      if (b.active && this.boss && this.boss.active) {
        const boss = this.boss;
        const halfW = boss.width / 2;
        const halfH = boss.height / 2;

        if (
          b.x >= boss.x - halfW &&
          b.x <= boss.x + halfW &&
          b.y >= boss.y - halfH &&
          b.y <= boss.y + halfH
        ) {
          this.levelStats.shotsHit++;
          boss.hp -= b.damage;
          boss.hitFlashTimer = GAME_CONFIG.JUICE.HIT_FLASH_DURATION;
          this.score += b.damage * 15;

          audio.playHit(b.isCrit);
          this.spawnFloatingText(
            b.x,
            b.y - 10,
            `${b.damage}${b.isCrit ? '!' : ''}`,
            b.isCrit ? '#ffe600' : '#ffffff',
            b.isCrit ? 24 : 16,
            b.isCrit
          );

          b.active = false;

          if (boss.hp <= 0) {
            this.explodeBoss();
          }
        }
      }
    }

    // 2. Asteroids vs Player Ship
    if (this.invulnerableTimer <= 0) {
      for (let i = this.asteroids.length - 1; i >= 0; i--) {
        const ast = this.asteroids[i];
        if (!ast.active) continue;

        const dx = this.playerX - ast.x;
        const dy = this.playerY - ast.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < ast.radius + GAME_CONFIG.PLAYER.HITBOX_RADIUS) {
          this.explodeAsteroid(ast);
          this.asteroids.splice(i, 1);
          this.damagePlayer();
          break;
        }
      }
    }
  }

  // --- ASTEROID DESTRUCTION & SPLITTING ---

  private explodeAsteroid(ast: AsteroidEntity) {
    const color = this.getAsteroidColor(ast.hp, ast.maxHp);
    this.spawnExplosion(ast.x, ast.y, color, ast.radius > 35 ? 32 : 18);
    audio.playExplosion(ast.radius > 40);
    this.triggerScreenShake(GAME_CONFIG.JUICE.SHAKE_DURATION_EXPLODE, GAME_CONFIG.JUICE.SHAKE_INTENSITY_EXPLODE);

    this.registerKill();

    // Check Splitting Mechanic
    if (ast.canSplit && ast.radius >= GAME_CONFIG.ASTEROID.MIN_SPLIT_SIZE) {
      this.splitAsteroid(ast);
    }

    // Drop Coins
    const coinMultUpgrade = saveManager.getUpgradeLevel('coinMultiplier');
    const coinMultTier = UPGRADES_LIST.find((u) => u.id === 'coinMultiplier');
    const coinMultiplier = coinMultTier ? coinMultTier.getValue(coinMultUpgrade) : 1;

    const coinVal = Math.max(1, Math.round((ast.maxHp / 4) * coinMultiplier));
    this.coins.push({
      active: true,
      x: ast.x,
      y: ast.y,
      vx: (Math.random() - 0.5) * 70,
      vy: -50,
      value: coinVal,
      radius: 8,
      spinAngle: 0,
      lifeTimer: 0,
    });

    // Drop Power-Up
    const dropUpgrade = saveManager.getUpgradeLevel('powerupDropRate');
    const dropTier = UPGRADES_LIST.find((u) => u.id === 'powerupDropRate');
    const dropChance = dropTier ? dropTier.getValue(dropUpgrade) : GAME_CONFIG.POWER_UPS.BASE_DROP_CHANCE;

    if (Math.random() < dropChance) {
      this.spawnRandomPowerUp(ast.x, ast.y);
    }
  }

  private splitAsteroid(parent: AsteroidEntity) {
    const childRadius = parent.radius * 0.65;
    const childHp = Math.max(2, Math.floor(parent.maxHp / 2));

    const offsets = [-childRadius - 5, childRadius + 5];
    for (let i = 0; i < 2; i++) {
      this.asteroids.push({
        id: this.nextAsteroidId++,
        active: true,
        x: parent.x + offsets[i],
        y: parent.y,
        vx: (i === 0 ? -1 : 1) * (60 + Math.random() * 40),
        vy: parent.vy * 0.9,
        width: childRadius * 2,
        height: childRadius * 2,
        radius: childRadius,
        hp: childHp,
        maxHp: childHp,
        shape: parent.shape,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 2.5,
        vertexOffsets: parent.vertexOffsets,
        hitFlashTimer: 0,
        canSplit: false, // Child asteroids do not split again
        isBoss: false,
        isMinion: false,
      });
    }
  }

  private spawnRandomPowerUp(x: number, y: number) {
    const types: PowerUpType[] = [
      'DAMAGE_BOOST',
      'MULTI_SHOT',
      'RAPID_FIRE',
      'SHIELD',
      'PIERCING',
      'MAGNET',
      'NUKE',
      'TIME_SLOW',
      'HEALTH',
    ];
    const type = types[Math.floor(Math.random() * types.length)];

    this.powerUps.push({
      active: true,
      x,
      y,
      vy: GAME_CONFIG.POWER_UPS.FALL_SPEED,
      type,
      radius: GAME_CONFIG.POWER_UPS.SIZE / 2,
      pulseTimer: 0,
    });
  }

  // --- BOSS DESTRUCTION ---

  private explodeBoss() {
    if (!this.boss) return;
    this.boss.active = false;
    audio.playExplosion(true);
    this.slowMoTimer = GAME_CONFIG.JUICE.SLOW_MO_DURATION_BOSS_KILL;
    this.triggerScreenShake(0.8, 28);

    // Giant explosion and coin shower
    this.spawnExplosion(this.boss.x, this.boss.y, '#ff007f', 80);
    this.spawnExplosion(this.boss.x - 30, this.boss.y + 20, '#00f3ff', 60);
    this.spawnExplosion(this.boss.x + 30, this.boss.y + 20, '#ffe600', 60);

    // Drop 12 big coin clusters
    for (let i = 0; i < 12; i++) {
      this.coins.push({
        active: true,
        x: this.boss.x + (Math.random() - 0.5) * 100,
        y: this.boss.y + (Math.random() - 0.5) * 50,
        vx: (Math.random() - 0.5) * 220,
        vy: -120 - Math.random() * 80,
        value: Math.round(GAME_CONFIG.BOSS.COIN_REWARD_BASE / 10),
        radius: 10,
        spinAngle: 0,
        lifeTimer: 0,
      });
    }

    saveManager.updateStats({ bossesDefeated: 1 });
  }

  // --- PLAYER DAMAGE & GAME OVER ---

  public damagePlayer() {
    if (this.invulnerableTimer > 0) return;

    if (this.hasShield) {
      this.hasShield = false;
      this.invulnerableTimer = 0.8;
      audio.playShieldPop();
      this.spawnFloatingText(this.playerX, this.playerY - 30, 'SHIELD BROKEN!', '#00e5ff', 20, true);
      this.triggerScreenShake(0.25, 8);
      this.onStateChange?.();
      return;
    }

    this.lives--;
    this.levelStats.tookDamage = true;
    this.invulnerableTimer = GAME_CONFIG.PLAYER.INVULNERABLE_DURATION;
    audio.playPlayerDamaged();
    this.triggerScreenShake(GAME_CONFIG.JUICE.SHAKE_DURATION_DAMAGE, GAME_CONFIG.JUICE.SHAKE_INTENSITY_DAMAGE);
    this.spawnExplosion(this.playerX, this.playerY, '#ff0055', 30);

    if (this.lives <= 0) {
      this.triggerGameOver();
    } else {
      this.onStateChange?.();
    }
  }

  private triggerGameOver() {
    this.isGameOver = true;
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    audio.playGameOver();
    audio.stopMusic();

    saveManager.updateScoreAndLevel(this.score, this.level);

    this.onGameOver?.({
      score: this.score,
      level: this.level,
      coins: this.runCoinsEarned,
    });
    this.onStateChange?.();
  }

  private triggerLevelComplete() {
    this.isLevelComplete = true;
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    audio.playLevelComplete();
    audio.stopMusic();

    // Calculate level completion bonus
    let bonusCoins = GAME_CONFIG.ECONOMY.LEVEL_CLEAR_BASE_COINS + this.level * 5;
    if (!this.levelStats.tookDamage) {
      bonusCoins = Math.round(bonusCoins * (1 + GAME_CONFIG.ECONOMY.NO_DAMAGE_BONUS_PERCENT));
      saveManager.updateStats({ noDamageLevelBeaten: true });
    }

    this.runCoinsEarned += bonusCoins;
    this.levelStats.coinsEarned += bonusCoins;
    saveManager.addCoins(bonusCoins);

    saveManager.updateScoreAndLevel(this.score, this.level + 1);

    this.onLevelComplete?.(this.levelStats);
    this.onStateChange?.();
  }

  public triggerScreenShake(duration: number, intensity: number) {
    if (!saveManager.getData().settings.screenShake) return;
    this.screenShakeTime = duration;
    this.screenShakeIntensity = intensity;
  }

  // --- RENDERING ---

  private render() {
    const ctx = this.ctx;

    // Apply Screen Shake
    ctx.save();
    if (this.screenShakeTime > 0) {
      const shakeX = (Math.random() - 0.5) * this.screenShakeIntensity * 2;
      const shakeY = (Math.random() - 0.5) * this.screenShakeIntensity * 2;
      ctx.translate(shakeX, shakeY);
    }

    // 1. Dark Space Background & Nebulas
    this.renderBackground(ctx);

    // 2. Stars & Shooting Stars
    this.renderStarfield(ctx);

    // 3. Coins
    this.renderCoins(ctx);

    // 4. Power-Up items
    this.renderPowerUps(ctx);

    // 5. Boss
    if (this.boss && this.boss.active) {
      this.renderBoss(ctx, this.boss);
    }
    this.renderBossBullets(ctx);

    // 6. Asteroids
    this.renderAsteroids(ctx);

    // 7. Bullets
    this.renderBullets(ctx);

    // 8. Player Ship & Shield
    this.renderPlayer(ctx);

    // 9. Particles
    this.renderParticles(ctx);

    // 10. Floating Damage Numbers
    this.renderFloatingTexts(ctx);

    // 11. Fullscreen Nuke Shockwave Flash
    if (this.nukeFlashTimer > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${this.nukeFlashTimer * 1.8})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // 12. Boss Warning Banner Overlay
    if (this.bossWarningTimer > 0) {
      this.renderBossWarningBanner(ctx);
    }

    ctx.restore();
  }

  private renderBackground(ctx: CanvasRenderingContext2D) {
    // Deep synthwave black-indigo gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, this.height);
    bgGrad.addColorStop(0, '#04030a');
    bgGrad.addColorStop(0.5, '#070517');
    bgGrad.addColorStop(1, '#09081e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Subtle ambient purple/cyan nebula glow
    const radGrad = ctx.createRadialGradient(
      this.width * 0.3,
      this.height * 0.4,
      50,
      this.width * 0.3,
      this.height * 0.4,
      350
    );
    radGrad.addColorStop(0, 'rgba(176, 38, 255, 0.08)');
    radGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    const radGrad2 = ctx.createRadialGradient(
      this.width * 0.8,
      this.height * 0.7,
      40,
      this.width * 0.8,
      this.height * 0.7,
      300
    );
    radGrad2.addColorStop(0, 'rgba(0, 243, 255, 0.06)');
    radGrad2.addColorStop(1, 'transparent');
    ctx.fillStyle = radGrad2;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  private renderStarfield(ctx: CanvasRenderingContext2D) {
    ctx.save();
    for (const star of this.stars) {
      const alpha = star.brightness * (0.6 + 0.4 * Math.sin(star.twinklePhase));
      ctx.fillStyle = star.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Shooting stars
    for (const ss of this.shootingStars) {
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = ss.alpha;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(ss.x, ss.y);
      ctx.lineTo(ss.x - (ss.vx / 500) * ss.length, ss.y - (ss.vy / 500) * ss.length);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  private renderPlayer(ctx: CanvasRenderingContext2D) {
    // Invulnerability flicker
    if (this.invulnerableTimer > 0 && Math.floor(performance.now() / 60) % 2 === 0) {
      return;
    }

    ctx.save();
    ctx.translate(this.playerX, this.playerY);

    const skin = SHIP_SKINS.find((s) => s.id === saveManager.getData().equippedSkinId) || SHIP_SKINS[0];

    // Engine thrust glow
    const thrusterHeight = 12 + Math.random() * 8;
    ctx.fillStyle = skin.engineColor;
    ctx.shadowColor = skin.engineColor;
    ctx.shadowBlur = 12;

    // Dual thrusters
    ctx.beginPath();
    ctx.moveTo(-14, 18);
    ctx.lineTo(-10, 18 + thrusterHeight);
    ctx.lineTo(-6, 18);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(6, 18);
    ctx.lineTo(10, 18 + thrusterHeight);
    ctx.lineTo(14, 18);
    ctx.closePath();
    ctx.fill();

    // Main Ship Hull (Sleek futuristic interceptor)
    ctx.shadowColor = skin.primaryColor;
    ctx.shadowBlur = 14;
    ctx.strokeStyle = skin.primaryColor;
    ctx.lineWidth = 2.4;

    const hullGrad = ctx.createLinearGradient(0, -26, 0, 18);
    hullGrad.addColorStop(0, '#101525');
    hullGrad.addColorStop(1, '#050710');
    ctx.fillStyle = hullGrad;

    ctx.beginPath();
    ctx.moveTo(0, -26); // Nose
    ctx.lineTo(12, -4); // Right forward wing joint
    ctx.lineTo(26, 14); // Right wing tip
    ctx.lineTo(14, 18); // Right engine mount
    ctx.lineTo(0, 12); // Engine center notch
    ctx.lineTo(-14, 18); // Left engine mount
    ctx.lineTo(-26, 14); // Left wing tip
    ctx.lineTo(-12, -4); // Left forward wing joint
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Wing accent inlays
    ctx.strokeStyle = skin.accentColor;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-8, 2);
    ctx.lineTo(-20, 12);
    ctx.moveTo(8, 2);
    ctx.lineTo(20, 12);
    ctx.stroke();

    // Glowing Cockpit Canopy
    const canopyGrad = ctx.createLinearGradient(0, -16, 0, 2);
    canopyGrad.addColorStop(0, skin.primaryColor);
    canopyGrad.addColorStop(1, '#ffffff');
    ctx.fillStyle = canopyGrad;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.ellipse(0, -6, 4.5, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Shield Bubble if active
    if (this.hasShield) {
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 18;
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2.2;
      ctx.fillStyle = 'rgba(0, 229, 255, 0.12)';

      ctx.beginPath();
      ctx.arc(0, 0, 36, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Pulsing energy ring
      ctx.lineWidth = 1.0;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(0, 0, 32 + Math.sin(performance.now() * 0.008) * 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  private renderAsteroids(ctx: CanvasRenderingContext2D) {
    ctx.save();
    for (const ast of this.asteroids) {
      ctx.save();
      ctx.translate(ast.x, ast.y);
      ctx.rotate(ast.rotation);

      const color = this.getAsteroidColor(ast.hp, ast.maxHp);
      const isWhiteFlash = ast.hitFlashTimer > 0;

      ctx.shadowColor = isWhiteFlash ? '#ffffff' : color;
      ctx.shadowBlur = isWhiteFlash ? 20 : 12;
      ctx.strokeStyle = isWhiteFlash ? '#ffffff' : color;
      ctx.lineWidth = 2.5;

      // Dark futuristic core with subtle tinted fill
      ctx.fillStyle = isWhiteFlash ? '#ffffff' : '#080a14';

      ctx.beginPath();
      if (ast.shape === 'square') {
        const half = ast.radius;
        ctx.roundRect
          ? ctx.roundRect(-half, -half, half * 2, half * 2, 6)
          : ctx.rect(-half, -half, half * 2, half * 2);
      } else if (ast.shape === 'hexagon') {
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const px = Math.cos(angle) * ast.radius;
          const py = Math.sin(angle) * ast.radius;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
      } else {
        // Irregular polygon rock
        const numVerts = ast.vertexOffsets.length;
        for (let i = 0; i < numVerts; i++) {
          const angle = (i * Math.PI * 2) / numVerts;
          const r = ast.radius * ast.vertexOffsets[i];
          const px = Math.cos(angle) * r;
          const py = Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
      }
      ctx.fill();
      ctx.stroke();

      // Bold centered HP number (keep upright by unrotating context)
      ctx.restore();

      ctx.save();
      ctx.translate(ast.x, ast.y);
      ctx.font = `bold ${Math.max(12, Math.round(ast.radius * 0.65))}px 'Orbitron', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Outline for maximum legibility against background
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#000000';
      ctx.strokeText(`${ast.hp}`, 0, 0);

      ctx.fillStyle = isWhiteFlash ? '#000000' : '#ffffff';
      ctx.fillText(`${ast.hp}`, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  private getAsteroidColor(hp: number, maxHp: number): string {
    // Relative to level HP: Green (low) -> Yellow (mid) -> Orange/Red (high) -> Purple (boss tier)
    if (hp > 140) return '#b026ff'; // Purple
    if (hp > 60) return '#ff3300'; // Red/Orange
    if (hp > 22) return '#ffe600'; // Yellow
    return '#00ff66'; // Green
  }

  private renderBoss(ctx: CanvasRenderingContext2D, boss: BossEntity) {
    ctx.save();
    ctx.translate(boss.x, boss.y);

    const isWhiteFlash = boss.hitFlashTimer > 0;
    const baseColor = isWhiteFlash ? '#ffffff' : '#ff007f';

    ctx.shadowColor = baseColor;
    ctx.shadowBlur = 24;
    ctx.strokeStyle = baseColor;
    ctx.lineWidth = 3;

    // Boss Hull
    const halfW = boss.width / 2;
    const halfH = boss.height / 2;

    const bossGrad = ctx.createLinearGradient(0, -halfH, 0, halfH);
    bossGrad.addColorStop(0, '#24081b');
    bossGrad.addColorStop(1, '#0c0209');
    ctx.fillStyle = isWhiteFlash ? '#ffffff' : bossGrad;

    ctx.beginPath();
    ctx.moveTo(0, halfH); // Downward central cannon
    ctx.lineTo(30, 20);
    ctx.lineTo(halfW, 10);
    ctx.lineTo(halfW - 20, -halfH);
    ctx.lineTo(0, -halfH + 15);
    ctx.lineTo(-halfW + 20, -halfH);
    ctx.lineTo(-halfW, 10);
    ctx.lineTo(-30, 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glowing core reactor in center
    const corePulse = Math.sin(boss.glowPulse) * 4;
    ctx.fillStyle = isWhiteFlash ? '#000000' : '#00f3ff';
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(0, 0, 16 + corePulse, 0, Math.PI * 2);
    ctx.fill();

    // Bold Boss HP text
    ctx.font = `bold 22px 'Orbitron', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#000000';
    ctx.strokeText(`${boss.hp}`, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${boss.hp}`, 0, 0);

    ctx.restore();
  }

  private renderBossBullets(ctx: CanvasRenderingContext2D) {
    ctx.save();
    for (const bb of this.bossBullets) {
      ctx.shadowColor = bb.color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = bb.color;
      ctx.beginPath();
      ctx.arc(bb.x, bb.y, bb.radius, 0, Math.PI * 2);
      ctx.fill();

      // White hot core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(bb.x, bb.y, bb.radius * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private renderBossWarningBanner(ctx: CanvasRenderingContext2D) {
    ctx.save();
    const alpha = (Math.sin(performance.now() * 0.012) + 1) / 2;
    ctx.fillStyle = `rgba(255, 0, 85, ${0.25 * alpha})`;
    ctx.fillRect(0, this.height * 0.35, this.width, 90);

    ctx.font = `900 28px 'Orbitron', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ff0055';
    ctx.shadowColor = '#ff0055';
    ctx.shadowBlur = 20;
    ctx.fillText('⚠ WARNING: SECTOR BOSS DETECTED ⚠', this.width / 2, this.height * 0.35 + 45);
    ctx.restore();
  }

  private renderBullets(ctx: CanvasRenderingContext2D) {
    ctx.save();
    for (const b of this.bulletPool) {
      if (!b.active) continue;

      ctx.shadowColor = b.color;
      ctx.shadowBlur = b.isCrit ? 16 : 8;
      ctx.fillStyle = b.color;

      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();

      // Bullet trail
      ctx.strokeStyle = b.color;
      ctx.lineWidth = b.radius * 1.2;
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - b.vx * 0.018, b.y - b.vy * 0.018);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }
    ctx.restore();
  }

  private renderCoins(ctx: CanvasRenderingContext2D) {
    ctx.save();
    for (const c of this.coins) {
      ctx.save();
      ctx.translate(c.x, c.y);

      const scaleX = Math.cos(c.spinAngle);
      ctx.scale(scaleX, 1);

      ctx.shadowColor = '#ffe600';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#ffe600';
      ctx.beginPath();
      ctx.arc(0, 0, c.radius, 0, Math.PI * 2);
      ctx.fill();

      // Inner coin rim
      ctx.strokeStyle = '#ff9900';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, c.radius * 0.65, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }
    ctx.restore();
  }

  private renderPowerUps(ctx: CanvasRenderingContext2D) {
    ctx.save();
    for (const p of this.powerUps) {
      ctx.save();
      ctx.translate(p.x, p.y);

      const pulse = 1 + Math.sin(p.pulseTimer) * 0.12;
      ctx.scale(pulse, pulse);

      const color = this.getPowerUpColor(p.type);

      // Outer glow circle
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.fillStyle = '#060a14';

      ctx.beginPath();
      ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Icon symbol
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(this.getPowerUpIcon(p.type), 0, 0);

      ctx.restore();
    }
    ctx.restore();
  }

  private getPowerUpColor(type: PowerUpType): string {
    switch (type) {
      case 'DAMAGE_BOOST':
        return '#ff0055';
      case 'MULTI_SHOT':
        return '#00f3ff';
      case 'RAPID_FIRE':
        return '#ff9900';
      case 'SHIELD':
        return '#00e5ff';
      case 'PIERCING':
        return '#ffe600';
      case 'MAGNET':
        return '#b026ff';
      case 'NUKE':
        return '#ffffff';
      case 'TIME_SLOW':
        return '#00ffcc';
      case 'HEALTH':
        return '#00ff66';
      default:
        return '#ffffff';
    }
  }

  private getPowerUpIcon(type: PowerUpType): string {
    switch (type) {
      case 'DAMAGE_BOOST':
        return '⚡';
      case 'MULTI_SHOT':
        return '+3';
      case 'RAPID_FIRE':
        return '🔥';
      case 'SHIELD':
        return '🛡️';
      case 'PIERCING':
        return '🎯';
      case 'MAGNET':
        return '🧲';
      case 'NUKE':
        return '💥';
      case 'TIME_SLOW':
        return '⏳';
      case 'HEALTH':
        return '❤️';
      default:
        return '★';
    }
  }

  private renderParticles(ctx: CanvasRenderingContext2D) {
    ctx.save();
    for (const p of this.particlePool) {
      if (!p.active) continue;

      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;

      ctx.beginPath();
      if (p.shape === 'spark') {
        ctx.rect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      } else {
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      }
      ctx.fill();
    }
    ctx.restore();
  }

  private renderFloatingTexts(ctx: CanvasRenderingContext2D) {
    ctx.save();
    for (const ft of this.floatingTextPool) {
      if (!ft.active) continue;

      ctx.globalAlpha = ft.alpha;
      ctx.font = `bold ${ft.size}px 'Orbitron', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Drop shadow outline
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#000000';
      ctx.strokeText(ft.text, ft.x, ft.y);

      ctx.fillStyle = ft.color;
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = ft.isCrit ? 12 : 4;
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.restore();
  }

  public getFps() {
    return this.fps;
  }
}
