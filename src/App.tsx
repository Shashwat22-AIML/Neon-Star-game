/**
 * NEON STAR DEFENDER - MAIN APPLICATION & UI OVERLAYS
 * Responsive canvas host, synthwave HUD, shop, skins, achievements, and settings.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  ShoppingBag,
  Palette,
  Trophy,
  Settings as SettingsIcon,
  HelpCircle,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Zap,
  Shield,
  Crosshair,
  Award,
  ArrowRight,
  Check,
  Lock,
  Sparkles,
  Heart,
  Coins,
  ChevronLeft,
  X,
  Flame,
  Clock,
  Gauge,
  Magnet,
  Bomb,
  Radio,
} from 'lucide-react';
import { audio } from './game/audio';
import {
  ACHIEVEMENTS,
  GAME_CONFIG,
  SHIP_SKINS,
  UPGRADES_LIST,
} from './game/config';
import { GameEngine } from './game/engine';
import { saveManager } from './game/save';
import { GameScreen, LevelStats, POWER_UP_DEFS } from './game/types';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Screen Navigation
  const [screen, setScreen] = useState<GameScreen>('MENU');
  const [previousScreen, setPreviousScreen] = useState<GameScreen>('MENU');

  // Reactive State synced with Engine & SaveManager
  const [saveData, setSaveData] = useState(saveManager.getData());
  const [hudState, setHudState] = useState({
    lives: 3,
    maxLives: 3,
    score: 0,
    coins: 0,
    level: 1,
    currentKills: 0,
    targetKills: 15,
    combo: 0,
    comboTimer: 0,
    hasShield: false,
    activeBuffs: [] as { type: string; pct: number; label: string; icon: string; color: string }[],
    isBossActive: false,
    bossHp: 0,
    bossMaxHp: 1,
    fps: 60,
  });

  const [completedLevelStats, setCompletedLevelStats] = useState<LevelStats | null>(null);
  const [gameOverStats, setGameOverStats] = useState<{ score: number; level: number; coins: number } | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Synchronize state from GameEngine
  const syncFromEngine = () => {
    const engine = engineRef.current;
    if (!engine) return;

    const buffs: { type: string; pct: number; label: string; icon: string; color: string }[] = [];
    for (const [type, buff] of engine.activeBuffs.entries()) {
      const def = POWER_UP_DEFS[type];
      buffs.push({
        type,
        pct: Math.max(0, Math.min(1, buff.remainingTime / buff.totalDuration)),
        label: def.label,
        icon: def.icon,
        color: def.color,
      });
    }

    setHudState({
      lives: engine.lives,
      maxLives: engine.maxLives,
      score: engine.score,
      coins: engine.runCoinsEarned,
      level: engine.level,
      currentKills: engine.currentKills,
      targetKills: engine.targetKills,
      combo: engine.combo,
      comboTimer: engine.comboTimer,
      hasShield: engine.hasShield,
      activeBuffs: buffs,
      isBossActive: engine.isBossActive && !!engine.boss,
      bossHp: engine.boss?.hp || 0,
      bossMaxHp: engine.boss?.maxHp || 1,
      fps: engine.getFps(),
    });

    setSaveData({ ...saveManager.getData() });
  };

  // Initialize Canvas & Engine
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine(canvasRef.current);
    engineRef.current = engine;

    engine.onStateChange = () => {
      syncFromEngine();
    };

    engine.onLevelComplete = (stats) => {
      setCompletedLevelStats(stats);
      setScreen('LEVEL_COMPLETE');
      setSaveData({ ...saveManager.getData() });
    };

    engine.onGameOver = (stats) => {
      setGameOverStats(stats);
      setScreen('GAME_OVER');
      setSaveData({ ...saveManager.getData() });
    };

    const interval = setInterval(syncFromEngine, 100);

    return () => {
      clearInterval(interval);
      engine.stop();
    };
  }, []);

  // Handlers
  const handleStartGame = (startLevel: number = 1) => {
    audio.userInteracted();
    setScreen('PLAYING');
    if (engineRef.current) {
      engineRef.current.startLevel(startLevel);
      syncFromEngine();
    }
  };

  const handleNextLevel = () => {
    const nextLvl = (completedLevelStats?.level || 1) + 1;
    setCompletedLevelStats(null);
    handleStartGame(nextLvl);
  };

  const handleRetry = () => {
    setGameOverStats(null);
    handleStartGame(1);
  };

  const handlePause = () => {
    if (!engineRef.current) return;
    const isPaused = engineRef.current.togglePause();
    setScreen(isPaused ? 'PAUSED' : 'PLAYING');
  };

  const handleResume = () => {
    if (!engineRef.current) return;
    engineRef.current.setPaused(false);
    setScreen('PLAYING');
  };

  const handleQuitToMenu = () => {
    if (engineRef.current) {
      engineRef.current.stop();
      engineRef.current.clearTransientEntities();
    }
    setSaveData({ ...saveManager.getData() });
    setScreen('MENU');
  };

  const openModal = (target: GameScreen) => {
    audio.userInteracted();
    setPreviousScreen(screen);
    setScreen(target);
  };

  const closeModal = () => {
    if (previousScreen === 'PAUSED') {
      setScreen('PAUSED');
    } else if (previousScreen === 'LEVEL_COMPLETE') {
      setScreen('LEVEL_COMPLETE');
    } else {
      setScreen('MENU');
    }
  };

  const handleBuyUpgrade = (id: string) => {
    audio.userInteracted();
    const success = saveManager.buyUpgrade(id);
    if (success) {
      audio.playBuy();
      setSaveData({ ...saveManager.getData() });
    }
  };

  const handleUnlockOrEquipSkin = (skinId: string) => {
    audio.userInteracted();
    const isUnlocked = saveData.unlockedSkins.includes(skinId);
    if (isUnlocked) {
      saveManager.equipSkin(skinId);
      audio.playCoin();
      setSaveData({ ...saveManager.getData() });
    } else {
      const success = saveManager.unlockSkin(skinId);
      if (success) {
        audio.playBuy();
        saveManager.equipSkin(skinId);
        setSaveData({ ...saveManager.getData() });
      }
    }
  };

  const handleClaimAchievement = (id: string) => {
    audio.userInteracted();
    const success = saveManager.claimAchievement(id);
    if (success) {
      audio.playBuy();
      setSaveData({ ...saveManager.getData() });
    }
  };

  const handleResetSave = () => {
    saveManager.resetProgress();
    setSaveData(saveManager.getData());
    setResetConfirmOpen(false);
    audio.playGameOver();
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#04030a] text-slate-100 flex items-center justify-center font-sans select-none">
      {/* 60 FPS HTML5 Canvas */}
      <div className="relative w-full h-full max-w-[1000px] max-h-[100vh] aspect-[4/5] md:aspect-[3/4] flex items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full block cursor-crosshair touch-none"
        />

        {/* ----------------- IN-GAME HUD OVERLAY ----------------- */}
        {screen === 'PLAYING' && (
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 md:p-5">
            {/* Top Bar: Progress, Boss Bar, Lives & Coins */}
            <div className="w-full flex flex-col gap-2">
              <div className="flex items-center justify-between">
                {/* Lives & Shield */}
                <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 shadow-lg">
                  {Array.from({ length: hudState.maxLives }).map((_, i) => (
                    <Heart
                      key={i}
                      size={18}
                      className={`transition-all duration-300 ${
                        i < hudState.lives
                          ? 'fill-[#ff0055] text-[#ff0055] drop-shadow-[0_0_8px_rgba(255,0,85,0.7)]'
                          : 'fill-transparent text-white/20'
                      }`}
                    />
                  ))}
                  {hudState.hasShield && (
                    <div className="flex items-center gap-1 text-[#00e5ff] ml-1 pl-1.5 border-l border-white/20">
                      <Shield size={16} className="fill-[#00e5ff]/30 text-[#00e5ff] animate-pulse" />
                      <span className="text-xs font-bold font-arcade tracking-wider">GUARD</span>
                    </div>
                  )}
                </div>

                {/* Level / Sector Badge */}
                <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-xl border border-cyan-500/30 shadow-[0_0_15px_rgba(0,243,255,0.2)]">
                  <span className="text-xs text-cyan-400 font-semibold uppercase tracking-wider">Sector</span>
                  <span className="text-base font-bold font-arcade text-white glow-cyan">{hudState.level}</span>
                  {hudState.isBossActive && (
                    <span className="text-xs bg-red-500/20 text-red-400 font-bold px-1.5 py-0.5 rounded border border-red-500/40 animate-pulse">
                      BOSS
                    </span>
                  )}
                </div>

                {/* Coins & Pause Button */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-xl border border-yellow-500/20 text-yellow-400 shadow-md">
                    <Coins size={16} className="text-yellow-400 fill-yellow-400/30" />
                    <span className="text-sm font-bold font-arcade tabular-nums text-white">
                      {saveData.coins}
                    </span>
                  </div>

                  <button
                    onClick={handlePause}
                    className="pointer-events-auto p-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 hover:border-cyan-400/50 hover:bg-cyan-500/10 active:scale-95 transition-all text-slate-300 hover:text-white"
                    title="Pause (P or Esc)"
                  >
                    <Pause size={18} />
                  </button>
                </div>
              </div>

              {/* Boss Health Bar or Wave Progress Bar */}
              {hudState.isBossActive ? (
                <div className="w-full bg-black/60 backdrop-blur-md p-2 rounded-xl border border-red-500/40 shadow-[0_0_20px_rgba(255,0,85,0.25)]">
                  <div className="flex justify-between items-center text-xs font-bold mb-1 px-1">
                    <span className="text-red-400 flex items-center gap-1 tracking-wider">
                      <Radio size={13} className="animate-spin text-red-400" /> SECTOR MOTHERSHIP
                    </span>
                    <span className="text-white font-arcade tabular-nums">{hudState.bossHp} HP</span>
                  </div>
                  <div className="w-full h-3 bg-red-950/60 rounded-full overflow-hidden border border-red-500/30">
                    <div
                      className="h-full bg-gradient-to-r from-red-600 via-pink-500 to-red-400 transition-all duration-150 shadow-[0_0_12px_rgba(255,0,85,0.8)]"
                      style={{
                        width: `${Math.max(0, Math.min(100, (hudState.bossHp / hudState.bossMaxHp) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="w-full bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/10">
                  <div className="flex justify-between items-center text-[11px] font-semibold text-slate-300 mb-1">
                    <span>SECTOR CLEARANCE</span>
                    <span className="font-arcade text-cyan-300 tabular-nums">
                      {hudState.currentKills} / {hudState.targetKills}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800/80 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-400 transition-all duration-200 shadow-[0_0_8px_rgba(0,243,255,0.6)]"
                      style={{
                        width: `${Math.min(100, (hudState.currentKills / hudState.targetKills) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Active Power-up Buff Rings / Chips */}
              {hudState.activeBuffs.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {hudState.activeBuffs.map((buff) => (
                    <div
                      key={buff.type}
                      className="flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg border text-xs shadow-md animate-in fade-in zoom-in-95 duration-200"
                      style={{ borderColor: `${buff.color}60` }}
                    >
                      <span className="text-sm">{buff.icon}</span>
                      <span className="font-bold text-white tracking-wide">{buff.label}</span>
                      <div className="w-10 h-1.5 bg-white/10 rounded-full overflow-hidden ml-1">
                        <div
                          className="h-full rounded-full transition-all duration-100"
                          style={{
                            width: `${buff.pct * 100}%`,
                            backgroundColor: buff.color,
                            boxShadow: `0 0 8px ${buff.color}`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Middle Floating Combo Badge */}
            {hudState.combo > 1 && (
              <div className="self-center flex flex-col items-center bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-yellow-400/40 shadow-[0_0_20px_rgba(255,230,0,0.3)] animate-pulse">
                <div className="text-xl md:text-2xl font-black font-arcade text-yellow-300 glow-yellow tracking-wider">
                  {hudState.combo}x COMBO
                </div>
                <div className="w-24 h-1 bg-yellow-950 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-yellow-400 transition-all duration-75 shadow-[0_0_6px_#ffe600]"
                    style={{
                      width: `${(hudState.comboTimer / GAME_CONFIG.COMBO.TIMEOUT_SECONDS) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Bottom HUD: Score & FPS */}
            <div className="flex justify-between items-end">
              <div className="bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                <div className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">Score</div>
                <div className="text-lg font-bold font-arcade text-white tracking-wider tabular-nums">
                  {hudState.score.toLocaleString()}
                </div>
              </div>

              {saveData.settings.showFps && (
                <div className="bg-black/40 backdrop-blur-sm px-2 py-1 rounded text-[11px] font-mono text-cyan-400 border border-cyan-500/20">
                  {hudState.fps} FPS
                </div>
              )}
            </div>
          </div>
        )}

        {/* ----------------- MAIN MENU SCREEN ----------------- */}
        {screen === 'MENU' && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md flex flex-col items-center justify-between p-6 z-20">
            {/* Top Bar with Credits & Sound */}
            <div className="w-full flex justify-between items-center">
              <div className="flex items-center gap-2 text-xs text-cyan-300 font-semibold bg-cyan-950/40 px-3 py-1 rounded-lg border border-cyan-500/20">
                <Sparkles size={14} /> 60 FPS SYNTHWAVE SHOOTER
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-yellow-950/40 text-yellow-300 px-3 py-1 rounded-lg border border-yellow-500/30 text-xs font-bold font-arcade">
                  <Coins size={14} /> {saveData.coins}
                </div>
                <button
                  onClick={() => {
                    const isMuted = audio.toggleMute();
                    setSaveData({
                      ...saveData,
                      settings: { ...saveData.settings, musicVolume: isMuted ? 0 : 0.45 },
                    });
                  }}
                  className="p-2 rounded-lg bg-white/5 border border-white/10 hover:border-cyan-400 hover:text-cyan-300 text-slate-400 transition-all"
                  title="Toggle Audio"
                >
                  {audio.getSettings().isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
              </div>
            </div>

            {/* Animated Title & Hero Emblem */}
            <div className="flex flex-col items-center text-center my-auto">
              <div className="relative mb-3">
                <div className="w-20 h-20 rounded-full border-2 border-cyan-400/40 flex items-center justify-center shadow-[0_0_30px_rgba(0,243,255,0.4)] animate-pulse">
                  <div className="w-14 h-14 rounded-full border border-pink-500/60 flex items-center justify-center shadow-[0_0_20px_rgba(255,0,127,0.5)]">
                    <Crosshair size={32} className="text-cyan-300 animate-spin" style={{ animationDuration: '12s' }} />
                  </div>
                </div>
              </div>

              <h1 className="text-4xl md:text-6xl font-black font-arcade tracking-wider bg-gradient-to-b from-white via-cyan-200 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(0,243,255,0.6)]">
                NEON STAR
              </h1>
              <h2 className="text-2xl md:text-3xl font-black font-arcade tracking-widest text-pink-500 glow-magenta mt-1">
                DEFENDER
              </h2>

              <p className="text-xs md:text-sm text-slate-400 max-w-sm mt-3 font-medium">
                Destroy numbered asteroids, collect powerful battle cores, defeat mothership bosses, and supercharge your synth vessel.
              </p>

              {/* High Score / Best Level Info */}
              <div className="flex items-center gap-4 mt-5 text-xs text-slate-300 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                <div>
                  <span className="text-slate-400 mr-1">BEST SCORE:</span>
                  <span className="font-bold text-white font-arcade">{saveData.highScore.toLocaleString()}</span>
                </div>
                <div className="w-px h-3 bg-white/20" />
                <div>
                  <span className="text-slate-400 mr-1">MAX SECTOR:</span>
                  <span className="font-bold text-cyan-300 font-arcade">{saveData.highestLevelReached}</span>
                </div>
              </div>
            </div>

            {/* Menu Buttons Grid */}
            <div className="w-full max-w-sm flex flex-col gap-2.5">
              {completedLevelStats ? (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleNextLevel}
                    className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-black font-arcade text-base tracking-widest flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(0,255,102,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    <Play size={18} className="fill-black" />
                    <span>CONTINUE SECTOR {completedLevelStats.level + 1}</span>
                  </button>
                  <button
                    onClick={() => {
                      setCompletedLevelStats(null);
                      handleStartGame(1);
                    }}
                    className="w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-bold font-arcade text-xs tracking-wider transition-all"
                  >
                    START OVER (SECTOR 1)
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleStartGame(1)}
                  className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-black font-arcade text-lg tracking-widest flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(0,243,255,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <Play size={20} className="fill-white" />
                  <span>LAUNCH DEFENDER</span>
                </button>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => openModal('SHOP')}
                  className="py-2.5 px-4 rounded-xl bg-black/60 hover:bg-pink-950/40 border border-pink-500/30 hover:border-pink-500/70 text-slate-200 hover:text-pink-300 font-bold font-arcade text-xs tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <ShoppingBag size={16} className="text-pink-400" />
                  <span>UPGRADES</span>
                </button>

                <button
                  onClick={() => openModal('SKINS')}
                  className="py-2.5 px-4 rounded-xl bg-black/60 hover:bg-cyan-950/40 border border-cyan-500/30 hover:border-cyan-500/70 text-slate-200 hover:text-cyan-300 font-bold font-arcade text-xs tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Palette size={16} className="text-cyan-400" />
                  <span>VESSEL SKINS</span>
                </button>

                <button
                  onClick={() => openModal('ACHIEVEMENTS')}
                  className="py-2.5 px-4 rounded-xl bg-black/60 hover:bg-yellow-950/40 border border-yellow-500/30 hover:border-yellow-500/70 text-slate-200 hover:text-yellow-300 font-bold font-arcade text-xs tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Trophy size={16} className="text-yellow-400" />
                  <span>MEDALS</span>
                </button>

                <button
                  onClick={() => openModal('HOW_TO_PLAY')}
                  className="py-2.5 px-4 rounded-xl bg-black/60 hover:bg-slate-800/60 border border-white/10 hover:border-white/30 text-slate-200 hover:text-white font-bold font-arcade text-xs tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <HelpCircle size={16} className="text-slate-400" />
                  <span>MANUAL</span>
                </button>
              </div>

              <button
                onClick={() => openModal('SETTINGS')}
                className="py-2 px-4 rounded-lg text-xs text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
              >
                <SettingsIcon size={14} /> System Settings
              </button>
            </div>
          </div>
        )}

        {/* ----------------- PAUSE MENU ----------------- */}
        {screen === 'PAUSED' && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 z-20">
            <div className="w-full max-w-xs bg-slate-950/90 border border-cyan-500/40 p-6 rounded-2xl shadow-[0_0_30px_rgba(0,243,255,0.25)] flex flex-col items-center gap-4">
              <h2 className="text-2xl font-black font-arcade text-white tracking-widest glow-cyan">
                SYSTEM PAUSED
              </h2>

              <div className="w-full flex flex-col gap-2.5 mt-2">
                <button
                  onClick={handleResume}
                  className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-arcade text-sm tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,243,255,0.4)] active:scale-95 transition-all"
                >
                  <Play size={16} className="fill-black" /> RESUME MISSION
                </button>

                <button
                  onClick={() => openModal('SHOP')}
                  className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-bold font-arcade text-xs tracking-wider flex items-center justify-center gap-2 transition-all"
                >
                  <ShoppingBag size={15} className="text-pink-400" /> UPGRADE SHOP
                </button>

                <button
                  onClick={() => openModal('SETTINGS')}
                  className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-bold font-arcade text-xs tracking-wider flex items-center justify-center gap-2 transition-all"
                >
                  <SettingsIcon size={15} className="text-slate-400" /> SETTINGS
                </button>

                <button
                  onClick={handleQuitToMenu}
                  className="w-full py-2.5 rounded-xl bg-red-950/30 hover:bg-red-950/50 border border-red-500/30 text-red-300 font-bold font-arcade text-xs tracking-wider flex items-center justify-center gap-2 transition-all"
                >
                  <RotateCcw size={15} /> ABORT TO MENU
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- LEVEL COMPLETE SCREEN ----------------- */}
        {screen === 'LEVEL_COMPLETE' && completedLevelStats && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 z-20 animate-in fade-in duration-300">
            <div className="w-full max-w-sm bg-slate-950 border border-emerald-500/40 p-6 rounded-2xl shadow-[0_0_35px_rgba(0,255,102,0.3)] flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 mb-3 shadow-[0_0_20px_rgba(0,255,102,0.5)]">
                <Award size={32} />
              </div>

              <h2 className="text-2xl font-black font-arcade text-white tracking-widest">
                SECTOR {completedLevelStats.level}
              </h2>
              <span className="text-xs font-bold font-arcade text-emerald-400 tracking-wider mt-0.5">
                CLEARANCE COMPLETE
              </span>

              {/* Stats Table */}
              <div className="w-full bg-white/5 rounded-xl p-3.5 my-4 border border-white/10 flex flex-col gap-2 text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Asteroids Obliterated:</span>
                  <span className="font-bold text-white font-arcade">{completedLevelStats.asteroidsDestroyed}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Target Accuracy:</span>
                  <span className="font-bold text-cyan-300 font-arcade">
                    {completedLevelStats.shotsFired > 0
                      ? Math.round((completedLevelStats.shotsHit / completedLevelStats.shotsFired) * 100)
                      : 100}
                    %
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Sector Coins Gathered:</span>
                  <span className="font-bold text-yellow-400 font-arcade">+{completedLevelStats.coinsEarned}</span>
                </div>
                {!completedLevelStats.tookDamage && (
                  <div className="flex justify-between items-center text-emerald-300 bg-emerald-950/40 px-2 py-1 rounded border border-emerald-500/30">
                    <span className="font-bold">Flawless Shield Bonus:</span>
                    <span className="font-bold font-arcade">+25% Coins</span>
                  </div>
                )}
              </div>

              <div className="w-full flex flex-col gap-2.5">
                <button
                  onClick={handleNextLevel}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black font-arcade text-sm tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,255,102,0.4)] active:scale-95 transition-all"
                >
                  <span>PROCEED TO SECTOR {completedLevelStats.level + 1}</span>
                  <ArrowRight size={18} />
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => openModal('SHOP')}
                    className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-bold font-arcade text-xs tracking-wider flex items-center justify-center gap-1.5 transition-all"
                  >
                    <ShoppingBag size={14} className="text-pink-400" /> UPGRADE SHOP
                  </button>
                  <button
                    onClick={handleQuitToMenu}
                    className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-bold font-arcade text-xs tracking-wider flex items-center justify-center gap-1.5 transition-all"
                  >
                    MAIN MENU
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- GAME OVER SCREEN ----------------- */}
        {screen === 'GAME_OVER' && gameOverStats && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 z-20 animate-in fade-in duration-300">
            <div className="w-full max-w-sm bg-slate-950 border border-red-500/40 p-6 rounded-2xl shadow-[0_0_35px_rgba(255,0,85,0.3)] flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center text-red-500 mb-3 shadow-[0_0_20px_rgba(255,0,85,0.5)]">
                <Flame size={32} />
              </div>

              <h2 className="text-3xl font-black font-arcade text-red-500 glow-magenta tracking-widest">
                VESSEL LOST
              </h2>
              <span className="text-xs font-bold text-slate-400 tracking-wider mt-0.5">
                DEFENSE PROTOCOL TERMINATED
              </span>

              {/* Stats Table */}
              <div className="w-full bg-white/5 rounded-xl p-3.5 my-4 border border-white/10 flex flex-col gap-2 text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Final Score:</span>
                  <span className="font-bold text-white font-arcade text-sm">{gameOverStats.score.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Sector Reached:</span>
                  <span className="font-bold text-cyan-300 font-arcade">Sector {gameOverStats.level}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Coins Salvaged:</span>
                  <span className="font-bold text-yellow-400 font-arcade">+{gameOverStats.coins}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300 pt-1 border-t border-white/10">
                  <span>All-Time High Score:</span>
                  <span className="font-bold text-amber-300 font-arcade">{saveData.highScore.toLocaleString()}</span>
                </div>
              </div>

              <div className="w-full flex flex-col gap-2.5">
                <button
                  onClick={handleRetry}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-400 hover:to-pink-500 text-white font-black font-arcade text-sm tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,0,85,0.4)] active:scale-95 transition-all"
                >
                  <RotateCcw size={18} />
                  <span>REDEPLOY VESSEL</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => openModal('SHOP')}
                    className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-bold font-arcade text-xs tracking-wider flex items-center justify-center gap-1.5 transition-all"
                  >
                    <ShoppingBag size={14} className="text-pink-400" /> UPGRADE SHOP
                  </button>
                  <button
                    onClick={handleQuitToMenu}
                    className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-bold font-arcade text-xs tracking-wider flex items-center justify-center gap-1.5 transition-all"
                  >
                    MAIN MENU
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- PERMANENT UPGRADE SHOP ----------------- */}
        {screen === 'SHOP' && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-lg flex flex-col p-4 md:p-6 z-30 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <button
                onClick={closeModal}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
              >
                <ChevronLeft size={16} /> {previousScreen === 'LEVEL_COMPLETE' ? 'LEVEL STATS' : 'BACK'}
              </button>

              <div className="text-center">
                <h2 className="text-lg md:text-xl font-black font-arcade text-white tracking-wider glow-magenta">
                  ARMORY & UPGRADES
                </h2>
                <div className="text-[11px] text-slate-400 font-medium">Permanent synth vessel augmentations</div>
              </div>

              <div className="flex items-center gap-1.5 bg-yellow-950/40 text-yellow-300 px-3 py-1 rounded-lg border border-yellow-500/30 text-xs font-bold font-arcade">
                <Coins size={14} /> {saveData.coins}
              </div>
            </div>

            {/* Upgrades Scrollable Grid */}
            <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
              {UPGRADES_LIST.map((tier) => {
                const currentLevel = saveManager.getUpgradeLevel(tier.id);
                const isMax = currentLevel >= tier.maxLevel;
                const cost = saveManager.getUpgradeCost(tier.id);
                const canAfford = !isMax && saveData.coins >= cost;
                const currentVal = tier.getValue(currentLevel);
                const nextVal = isMax ? currentVal : tier.getValue(currentLevel + 1);

                return (
                  <div
                    key={tier.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-colors"
                  >
                    <div className="flex flex-col gap-0.5 max-w-[55%]">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white font-arcade tracking-wide">
                          {tier.name}
                        </span>
                        <span className="text-[10px] text-cyan-300 font-mono bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/30">
                          LVL {currentLevel}/{tier.maxLevel}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 leading-tight">{tier.description}</span>
                      <div className="flex items-center gap-2 text-xs font-mono font-semibold mt-1">
                        <span className="text-slate-300">{tier.formatValue(currentVal)}</span>
                        {!isMax && (
                          <>
                            <span className="text-cyan-400">→</span>
                            <span className="text-emerald-400">{tier.formatValue(nextVal)}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      disabled={isMax || !canAfford}
                      onClick={() => handleBuyUpgrade(tier.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold font-arcade tracking-wider flex items-center gap-1.5 transition-all ${
                        isMax
                          ? 'bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed'
                          : canAfford
                          ? 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white shadow-[0_0_15px_rgba(255,0,127,0.4)] active:scale-95'
                          : 'bg-white/5 text-slate-400 border border-white/10 cursor-not-allowed opacity-60'
                      }`}
                    >
                      {isMax ? (
                        <span>MAXED</span>
                      ) : (
                        <>
                          <Coins size={14} className="text-yellow-300" />
                          <span>{cost}</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
              {completedLevelStats ? (
                <>
                  <button
                    onClick={() => setScreen('LEVEL_COMPLETE')}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 font-bold font-arcade text-xs tracking-wider transition-all"
                  >
                    ← LEVEL STATS
                  </button>
                  <button
                    onClick={handleNextLevel}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black font-arcade text-xs tracking-wider flex items-center gap-1.5 shadow-[0_0_20px_rgba(0,255,102,0.4)] active:scale-95 transition-all"
                  >
                    <span>CONTINUE TO SECTOR {completedLevelStats.level + 1}</span>
                    <ArrowRight size={15} />
                  </button>
                </>
              ) : (
                <div className="w-full flex justify-end">
                  <button
                    onClick={closeModal}
                    className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-arcade text-xs tracking-wider"
                  >
                    DONE
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ----------------- SHIP SKINS SCREEN ----------------- */}
        {screen === 'SKINS' && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-lg flex flex-col p-4 md:p-6 z-30 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <button
                onClick={closeModal}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
              >
                <ChevronLeft size={16} /> BACK
              </button>

              <div className="text-center">
                <h2 className="text-lg md:text-xl font-black font-arcade text-white tracking-wider glow-cyan">
                  SHIP HANGAR & SKINS
                </h2>
                <div className="text-[11px] text-slate-400 font-medium">Cosmetic neon chassis and engine trails</div>
              </div>

              <div className="flex items-center gap-1.5 bg-yellow-950/40 text-yellow-300 px-3 py-1 rounded-lg border border-yellow-500/30 text-xs font-bold font-arcade">
                <Coins size={14} /> {saveData.coins}
              </div>
            </div>

            {/* Skins List */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
              {SHIP_SKINS.map((skin) => {
                const isUnlocked = saveData.unlockedSkins.includes(skin.id);
                const isEquipped = saveData.equippedSkinId === skin.id;
                const canAfford = saveData.coins >= skin.cost;

                return (
                  <div
                    key={skin.id}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                      isEquipped
                        ? 'bg-cyan-950/20 border-cyan-400 shadow-[0_0_20px_rgba(0,243,255,0.25)]'
                        : isUnlocked
                        ? 'bg-white/[0.03] border-white/10 hover:border-white/25'
                        : 'bg-black/40 border-white/5 opacity-80'
                    }`}
                  >
                    {/* Vessel Silhouette / Color Palette Preview */}
                    <div className="flex items-center gap-3.5">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center border shadow-md relative overflow-hidden"
                        style={{
                          backgroundColor: '#070914',
                          borderColor: skin.primaryColor,
                          boxShadow: `0 0 12px ${skin.primaryColor}50`,
                        }}
                      >
                        <div
                          className="w-6 h-6 rotate-45 border-2 rounded-sm"
                          style={{
                            borderColor: skin.primaryColor,
                            backgroundColor: `${skin.accentColor}40`,
                          }}
                        />
                        <div
                          className="absolute bottom-1 w-2.5 h-1.5 rounded-full"
                          style={{ backgroundColor: skin.engineColor }}
                        />
                      </div>

                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white font-arcade">{skin.name}</span>
                          {isEquipped && (
                            <span className="text-[10px] text-cyan-300 bg-cyan-950/80 px-1.5 py-0.2 rounded border border-cyan-500/40">
                              EQUIPPED
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 max-w-xs">{skin.description}</span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div>
                      {isEquipped ? (
                        <div className="px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 text-xs font-bold font-arcade flex items-center gap-1">
                          <Check size={14} /> ACTIVE
                        </div>
                      ) : isUnlocked ? (
                        <button
                          onClick={() => handleUnlockOrEquipSkin(skin.id)}
                          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-cyan-500 hover:text-black border border-white/20 text-white text-xs font-bold font-arcade tracking-wider transition-all"
                        >
                          EQUIP
                        </button>
                      ) : (
                        <button
                          disabled={!canAfford}
                          onClick={() => handleUnlockOrEquipSkin(skin.id)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold font-arcade tracking-wider flex items-center gap-1.5 transition-all ${
                            canAfford
                              ? 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-[0_0_15px_rgba(255,230,0,0.4)] active:scale-95'
                              : 'bg-white/5 text-slate-500 border border-white/10 cursor-not-allowed'
                          }`}
                        >
                          <Lock size={12} />
                          <Coins size={12} className="text-yellow-300" />
                          <span>{skin.cost}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button
                onClick={closeModal}
                className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-arcade text-xs tracking-wider"
              >
                DONE
              </button>
            </div>
          </div>
        )}

        {/* ----------------- ACHIEVEMENTS SCREEN ----------------- */}
        {screen === 'ACHIEVEMENTS' && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-lg flex flex-col p-4 md:p-6 z-30 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <button
                onClick={closeModal}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
              >
                <ChevronLeft size={16} /> BACK
              </button>

              <div className="text-center">
                <h2 className="text-lg md:text-xl font-black font-arcade text-white tracking-wider glow-yellow">
                  SERVICE MEDALS
                </h2>
                <div className="text-[11px] text-slate-400 font-medium">Earn coins by fulfilling combat milestones</div>
              </div>

              <div className="flex items-center gap-1.5 bg-yellow-950/40 text-yellow-300 px-3 py-1 rounded-lg border border-yellow-500/30 text-xs font-bold font-arcade">
                <Coins size={14} /> {saveData.coins}
              </div>
            </div>

            {/* Achievements List */}
            <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
              {ACHIEVEMENTS.map((ach) => {
                const isClaimed = saveData.claimedAchievements.includes(ach.id);
                const isUnlocked = ach.isUnlocked(saveData.stats);

                return (
                  <div
                    key={ach.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      isClaimed
                        ? 'bg-white/[0.02] border-white/5 opacity-60'
                        : isUnlocked
                        ? 'bg-yellow-950/20 border-yellow-500/50 shadow-[0_0_15px_rgba(255,230,0,0.15)]'
                        : 'bg-white/[0.03] border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                          isClaimed
                            ? 'border-emerald-500/30 text-emerald-400'
                            : isUnlocked
                            ? 'border-yellow-400 text-yellow-300 bg-yellow-950/40'
                            : 'border-white/10 text-slate-500'
                        }`}
                      >
                        <Trophy size={18} />
                      </div>

                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-white font-arcade tracking-wide">
                          {ach.title}
                        </span>
                        <span className="text-[11px] text-slate-400">{ach.description}</span>
                      </div>
                    </div>

                    <div>
                      {isClaimed ? (
                        <span className="text-xs font-mono text-slate-500 font-bold">CLAIMED</span>
                      ) : isUnlocked ? (
                        <button
                          onClick={() => handleClaimAchievement(ach.id)}
                          className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-black font-bold font-arcade text-xs tracking-wider flex items-center gap-1 shadow-[0_0_15px_rgba(255,230,0,0.5)] active:scale-95 transition-all"
                        >
                          <Coins size={13} /> CLAIM +{ach.rewardCoins}
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-yellow-400/80 font-mono font-bold bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                          <Coins size={12} /> {ach.rewardCoins}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button
                onClick={closeModal}
                className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-arcade text-xs tracking-wider"
              >
                DONE
              </button>
            </div>
          </div>
        )}

        {/* ----------------- HOW TO PLAY MODAL ----------------- */}
        {screen === 'HOW_TO_PLAY' && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-lg flex flex-col p-4 md:p-6 z-30 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <button
                onClick={closeModal}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
              >
                <ChevronLeft size={16} /> BACK
              </button>

              <div className="text-center">
                <h2 className="text-lg md:text-xl font-black font-arcade text-white tracking-wider glow-cyan">
                  TACTICAL MANUAL
                </h2>
                <div className="text-[11px] text-slate-400 font-medium">Defense protocols and core mechanics</div>
              </div>

              <div className="w-12" />
            </div>

            {/* Manual Content */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs pr-1">
              <div className="bg-white/[0.03] border border-white/10 p-3.5 rounded-xl">
                <h3 className="text-sm font-bold text-cyan-300 font-arcade mb-1 flex items-center gap-1.5">
                  <Crosshair size={16} /> SHIP CONTROLS & AUTO-FIRE
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  • <strong>Desktop:</strong> Move mouse horizontally across the screen, or use <strong>A / D</strong> or <strong>Left / Right Arrows</strong>.<br />
                  • <strong>Mobile / Tablet:</strong> Drag your finger smoothly across the bottom of the screen.<br />
                  • Your ship automatically fires plasma volleys upward at high frequency.
                </p>
              </div>

              <div className="bg-white/[0.03] border border-white/10 p-3.5 rounded-xl">
                <h3 className="text-sm font-bold text-yellow-300 font-arcade mb-1 flex items-center gap-1.5">
                  <Bomb size={16} /> NUMBERED ASTEROIDS & SPLITTING
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  • Asteroids display a number equal to their remaining HP.<br />
                  • Colors indicate toughness: <span className="text-emerald-400 font-bold">Green (Low)</span> → <span className="text-yellow-400 font-bold">Yellow (Mid)</span> → <span className="text-orange-500 font-bold">Red (Heavy)</span> → <span className="text-purple-400 font-bold">Purple (Boss Tier)</span>.<br />
                  • Certain medium/large asteroids <strong>SPLIT</strong> into 2 smaller child rocks upon death with divided HP.<br />
                  • Asteroids passing off the bottom screen despawn safely! You only lose a life if an asteroid directly collides with your ship.
                </p>
              </div>

              <div className="bg-white/[0.03] border border-white/10 p-3.5 rounded-xl">
                <h3 className="text-sm font-bold text-pink-400 font-arcade mb-1 flex items-center gap-1.5">
                  <Zap size={16} /> BATTLE CORES & POWER-UPS
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  <div className="flex items-center gap-2 bg-black/40 p-2 rounded-lg border border-white/5">
                    <span className="text-lg">⚡</span>
                    <div>
                      <strong className="text-red-400">Damage Boost:</strong> +30% bullet damage (stacks 3x).
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-black/40 p-2 rounded-lg border border-white/5">
                    <span className="text-lg">✦</span>
                    <div>
                      <strong className="text-cyan-400">Multi-Shot:</strong> +1 volley bullet (permanent for run).
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-black/40 p-2 rounded-lg border border-white/5">
                    <span className="text-lg">🔥</span>
                    <div>
                      <strong className="text-orange-400">Rapid Fire:</strong> +40% faster firing rate.
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-black/40 p-2 rounded-lg border border-white/5">
                    <span className="text-lg">🛡️</span>
                    <div>
                      <strong className="text-blue-400">Energy Shield:</strong> Absorbs 1 incoming lethal hit.
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-black/40 p-2 rounded-lg border border-white/5">
                    <span className="text-lg">🎯</span>
                    <div>
                      <strong className="text-yellow-400">Piercing:</strong> Bullets bore through 3 asteroids.
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-black/40 p-2 rounded-lg border border-white/5">
                    <span className="text-lg">🧲</span>
                    <div>
                      <strong className="text-purple-400">Magnet:</strong> Draws all coins directly to vessel.
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-black/40 p-2 rounded-lg border border-white/5">
                    <span className="text-lg">💥</span>
                    <div>
                      <strong className="text-white">Nuke Shockwave:</strong> Wipes all asteroids instantly.
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-black/40 p-2 rounded-lg border border-white/5">
                    <span className="text-lg">⏳</span>
                    <div>
                      <strong className="text-teal-400">Time Slow:</strong> Cuts asteroid speed by 50%.
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white/[0.03] border border-white/10 p-3.5 rounded-xl">
                <h3 className="text-sm font-bold text-red-400 font-arcade mb-1 flex items-center gap-1.5">
                  <Radio size={16} /> SECTOR MOTHERSHIP BOSSES
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  • Every 5th Sector (Level 5, 10, 15, 20, 25, 30...) summons a giant Mothership Boss.<br />
                  • Bosses shoot plasma bolts downward and deploy mini-escort rocks.<br />
                  • Defeating a boss yields massive coin rewards and unlocks the next sector tier!
                </p>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button
                onClick={closeModal}
                className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-arcade text-xs tracking-wider"
              >
                UNDERSTOOD
              </button>
            </div>
          </div>
        )}

        {/* ----------------- SETTINGS MODAL ----------------- */}
        {screen === 'SETTINGS' && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-lg flex flex-col p-4 md:p-6 z-30 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <button
                onClick={closeModal}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
              >
                <ChevronLeft size={16} /> BACK
              </button>

              <div className="text-center">
                <h2 className="text-lg md:text-xl font-black font-arcade text-white tracking-wider">
                  SYSTEM SETTINGS
                </h2>
                <div className="text-[11px] text-slate-400 font-medium">Audio, graphics, and gameplay toggles</div>
              </div>

              <div className="w-12" />
            </div>

            {/* Settings Options */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 text-xs">
              {/* Music Volume Slider */}
              <div className="bg-white/[0.03] border border-white/10 p-3.5 rounded-xl flex flex-col gap-2">
                <div className="flex justify-between items-center text-sm font-bold text-slate-200">
                  <span>Synthwave BGM Volume</span>
                  <span className="font-mono text-cyan-400">
                    {Math.round(saveData.settings.musicVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={saveData.settings.musicVolume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    audio.setMusicVolume(val);
                    saveManager.updateSettings({ musicVolume: val });
                    setSaveData({ ...saveManager.getData() });
                  }}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* SFX Volume Slider */}
              <div className="bg-white/[0.03] border border-white/10 p-3.5 rounded-xl flex flex-col gap-2">
                <div className="flex justify-between items-center text-sm font-bold text-slate-200">
                  <span>Sound Effects Volume</span>
                  <span className="font-mono text-cyan-400">
                    {Math.round(saveData.settings.sfxVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={saveData.settings.sfxVolume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    audio.setSfxVolume(val);
                    saveManager.updateSettings({ sfxVolume: val });
                    setSaveData({ ...saveManager.getData() });
                  }}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* Screen Shake Toggle */}
              <div className="bg-white/[0.03] border border-white/10 p-3.5 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-200">Screen Shake Feedback</div>
                  <div className="text-[11px] text-slate-400">Trauma shake on hits, explosions, and nukes</div>
                </div>
                <button
                  onClick={() => {
                    const next = !saveData.settings.screenShake;
                    saveManager.updateSettings({ screenShake: next });
                    setSaveData({ ...saveManager.getData() });
                  }}
                  className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                    saveData.settings.screenShake ? 'bg-cyan-500' : 'bg-white/20'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      saveData.settings.screenShake ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Particle Quality Toggle */}
              <div className="bg-white/[0.03] border border-white/10 p-3.5 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-200">High Density Particles</div>
                  <div className="text-[11px] text-slate-400">Full explosion sparks and thruster trails</div>
                </div>
                <button
                  onClick={() => {
                    const next = !saveData.settings.highParticles;
                    saveManager.updateSettings({ highParticles: next });
                    setSaveData({ ...saveManager.getData() });
                  }}
                  className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                    saveData.settings.highParticles ? 'bg-cyan-500' : 'bg-white/20'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      saveData.settings.highParticles ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Show FPS Toggle */}
              <div className="bg-white/[0.03] border border-white/10 p-3.5 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-200">Display 60 FPS Counter</div>
                  <div className="text-[11px] text-slate-400">Show live frame rendering rate in HUD</div>
                </div>
                <button
                  onClick={() => {
                    const next = !saveData.settings.showFps;
                    saveManager.updateSettings({ showFps: next });
                    setSaveData({ ...saveManager.getData() });
                  }}
                  className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                    saveData.settings.showFps ? 'bg-cyan-500' : 'bg-white/20'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      saveData.settings.showFps ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Reset Data Danger Zone */}
              <div className="bg-red-950/20 border border-red-500/30 p-3.5 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-red-400">Reset All Progress</div>
                  <div className="text-[11px] text-slate-400">Clears coins, upgrades, and high scores</div>
                </div>
                <button
                  onClick={() => setResetConfirmOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-red-900/40 hover:bg-red-900/70 border border-red-500/50 text-red-300 font-bold text-xs"
                >
                  RESET
                </button>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button
                onClick={closeModal}
                className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-arcade text-xs tracking-wider"
              >
                APPLY & CLOSE
              </button>
            </div>

            {/* Reset Confirmation Dialog */}
            {resetConfirmOpen && (
              <div className="absolute inset-0 bg-black/90 flex items-center justify-center p-6 z-40">
                <div className="bg-slate-950 border border-red-500 p-5 rounded-2xl max-w-xs text-center flex flex-col gap-3">
                  <h4 className="text-base font-bold text-red-400 font-arcade">PURGE SAVE DATA?</h4>
                  <p className="text-xs text-slate-300">
                    Are you sure you want to delete all saved coins, vessel upgrades, and achievements? This action cannot be reversed.
                  </p>
                  <div className="flex gap-2 justify-center mt-2">
                    <button
                      onClick={() => setResetConfirmOpen(false)}
                      className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-bold font-arcade"
                    >
                      CANCEL
                    </button>
                    <button
                      onClick={handleResetSave}
                      className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold font-arcade"
                    >
                      CONFIRM PURGE
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
