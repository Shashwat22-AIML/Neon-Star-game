/**
 * NEON STAR DEFENDER - PROCEDURAL WEB AUDIO ENGINE
 * Zero external audio files: all SFX and synthwave background music are generated in real-time.
 */

class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  private isMuted: boolean = false;
  private sfxVolume: number = 0.75;
  private musicVolume: number = 0.45;

  private isMusicPlaying: boolean = false;
  private musicTimer: number | null = null;
  private musicStep: number = 0;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  private initContext(): boolean {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return false;
      this.ctx = new AudioContextClass();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1.0;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicVolume;
      this.musicGain.connect(this.masterGain);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return true;
  }

  public setSfxVolume(vol: number) {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    if (this.sfxGain) {
      this.sfxGain.gain.value = this.isMuted ? 0 : this.sfxVolume;
    }
  }

  public setMusicVolume(vol: number) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    if (this.musicGain) {
      this.musicGain.gain.value = this.isMuted ? 0 : this.musicVolume;
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 1.0, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  public getSettings() {
    return {
      isMuted: this.isMuted,
      sfxVolume: this.sfxVolume,
      musicVolume: this.musicVolume,
    };
  }

  public userInteracted() {
    this.initContext();
  }

  // --- SOUND EFFECTS ---

  public playShoot(pitchMod: number = 1.0) {
    if (this.isMuted || !this.initContext() || !this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      const startFreq = 880 * pitchMod;
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch {
      // Audio fallback silent
    }
  }

  public playLaser(pitchMod: number = 0.6) {
    if (this.isMuted || !this.initContext() || !this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      const startFreq = 420 * pitchMod;
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.16);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.16);
    } catch {
      // Ignored
    }
  }

  public playHit(isCrit: boolean = false) {
    if (this.isMuted || !this.initContext() || !this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = isCrit ? 'triangle' : 'square';
      const startFreq = isCrit ? 1400 : 480;
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + (isCrit ? 0.12 : 0.05));

      gain.gain.setValueAtTime(isCrit ? 0.35 : 0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (isCrit ? 0.12 : 0.05));

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + (isCrit ? 0.12 : 0.05));
    } catch {
      // Ignored
    }
  }

  public playExplosion(isBig: boolean = false) {
    if (this.isMuted || !this.initContext() || !this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      const duration = isBig ? 0.55 : 0.25;

      // Noise buffer for blast crunch
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(isBig ? 600 : 900, now);
      filter.frequency.exponentialRampToValueAtTime(40, now + duration);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(isBig ? 0.55 : 0.3, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      whiteNoise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.sfxGain);

      whiteNoise.start(now);

      // Deep sub-bass boom oscillator
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(isBig ? 130 : 90, now);
      subOsc.frequency.exponentialRampToValueAtTime(28, now + duration);

      subGain.gain.setValueAtTime(isBig ? 0.6 : 0.3, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      subOsc.connect(subGain);
      subGain.connect(this.sfxGain);

      subOsc.start(now);
      subOsc.stop(now + duration);
    } catch {
      // Ignored
    }
  }

  public playCoin() {
    if (this.isMuted || !this.initContext() || !this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, now); // B5
      osc.frequency.setValueAtTime(1318.51, now + 0.05); // E6

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.18);
    } catch {
      // Ignored
    }
  }

  public playPowerup() {
    if (this.isMuted || !this.initContext() || !this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        if (!this.ctx || !this.sfxGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = now + i * 0.06;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(t);
        osc.stop(t + 0.15);
      });
    } catch {
      // Ignored
    }
  }

  public playNuke() {
    if (this.isMuted || !this.initContext() || !this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.9);

      gain.gain.setValueAtTime(0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.9);

      this.playExplosion(true);
    } catch {
      // Ignored
    }
  }

  public playCombo(combo: number) {
    if (this.isMuted || !this.initContext() || !this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      const baseFreq = 440;
      const pitchShift = Math.min(12, combo) * 45;
      osc.frequency.setValueAtTime(baseFreq + pitchShift, now);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch {
      // Ignored
    }
  }

  public playShieldPop() {
    if (this.isMuted || !this.initContext() || !this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(650, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.22);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch {
      // Ignored
    }
  }

  public playPlayerDamaged() {
    if (this.isMuted || !this.initContext() || !this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(45, now + 0.35);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch {
      // Ignored
    }
  }

  public playBossWarning() {
    if (this.isMuted || !this.initContext() || !this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      for (let i = 0; i < 3; i++) {
        const t = now + i * 0.45;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(587.33, t); // D5
        osc.frequency.linearRampToValueAtTime(392.0, t + 0.3); // G4

        gain.gain.setValueAtTime(0.45, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(t);
        osc.stop(t + 0.35);
      }
    } catch {
      // Ignored
    }
  }

  public playBuy() {
    if (this.isMuted || !this.initContext() || !this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'triangle';
      osc2.type = 'sine';

      osc1.frequency.setValueAtTime(523.25, now);
      osc1.frequency.setValueAtTime(783.99, now + 0.08);

      osc2.frequency.setValueAtTime(1046.5, now + 0.08);

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.sfxGain);

      osc1.start(now);
      osc2.start(now + 0.08);
      osc1.stop(now + 0.3);
      osc2.stop(now + 0.3);
    } catch {
      // Ignored
    }
  }

  public playLevelComplete() {
    if (this.isMuted || !this.initContext() || !this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [440, 554.37, 659.25, 880, 1108.73]; // A major triumphant run
      notes.forEach((freq, idx) => {
        if (!this.ctx || !this.sfxGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = now + idx * 0.09;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.28, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + (idx === notes.length - 1 ? 0.6 : 0.2));

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(t);
        osc.stop(t + (idx === notes.length - 1 ? 0.6 : 0.2));
      });
    } catch {
      // Ignored
    }
  }

  public playGameOver() {
    if (this.isMuted || !this.initContext() || !this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      const chords = [392.0, 369.99, 329.63, 277.18]; // Melancholic synth descent
      chords.forEach((freq, idx) => {
        if (!this.ctx || !this.sfxGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = now + idx * 0.18;

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(t);
        osc.stop(t + 0.45);
      });
    } catch {
      // Ignored
    }
  }

  // --- PROCEDURAL SYNTHWAVE MUSIC LOOP ---

  public startMusic() {
    if (this.isMusicPlaying) return;
    if (!this.initContext()) return;

    this.isMusicPlaying = true;
    this.musicStep = 0;
    this.scheduleNextMusicBar();
  }

  public stopMusic() {
    this.isMusicPlaying = false;
    if (this.musicTimer !== null) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private scheduleNextMusicBar() {
    if (!this.isMusicPlaying || !this.ctx || !this.musicGain) return;

    try {
      // Classic synthwave 16th-note bassline pattern in A minor / F major / G major / E minor
      const roots = [110, 87.31, 98.0, 82.41]; // A2, F2, G2, E2
      const currentRoot = roots[Math.floor(this.musicStep / 16) % roots.length];

      const tempoBpm = 124;
      const stepDuration = 60 / tempoBpm / 4; // 16th note in seconds (~0.12s)

      const now = this.ctx.currentTime;

      for (let i = 0; i < 4; i++) {
        const noteTime = now + i * stepDuration;
        const isOctave = i % 2 === 1;
        const freq = isOctave ? currentRoot * 2 : currentRoot;

        // Bass synth
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, noteTime);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(650, noteTime);
        filter.frequency.exponentialRampToValueAtTime(180, noteTime + stepDuration);

        gain.gain.setValueAtTime(0.18, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + stepDuration * 0.95);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        osc.start(noteTime);
        osc.stop(noteTime + stepDuration);

        // Subtle pad chord on step 0
        if ((this.musicStep + i) % 16 === 0) {
          const padChord = [currentRoot * 2, currentRoot * 2.4, currentRoot * 3];
          padChord.forEach((chordFreq) => {
            if (!this.ctx || !this.musicGain) return;
            const padOsc = this.ctx.createOscillator();
            const padFilter = this.ctx.createBiquadFilter();
            const padGain = this.ctx.createGain();

            padOsc.type = 'triangle';
            padOsc.frequency.setValueAtTime(chordFreq, noteTime);

            padFilter.type = 'lowpass';
            padFilter.frequency.setValueAtTime(450, noteTime);

            padGain.gain.setValueAtTime(0.06, noteTime);
            padGain.gain.linearRampToValueAtTime(0.09, noteTime + 0.4);
            padGain.gain.exponentialRampToValueAtTime(0.001, noteTime + stepDuration * 15);

            padOsc.connect(padFilter);
            padFilter.connect(padGain);
            padGain.connect(this.musicGain);

            padOsc.start(noteTime);
            padOsc.stop(noteTime + stepDuration * 15);
          });
        }
      }

      this.musicStep += 4;
      const delayMs = stepDuration * 4 * 1000 - 25; // Pre-schedule slightly early
      this.musicTimer = window.setTimeout(() => {
        this.scheduleNextMusicBar();
      }, Math.max(10, delayMs));
    } catch {
      // Audio fallback safe recovery
      this.musicTimer = window.setTimeout(() => {
        if (this.isMusicPlaying) this.scheduleNextMusicBar();
      }, 500);
    }
  }
}

export const audio = new AudioManager();
