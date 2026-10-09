// ZzFX - Zuper Zound Effects Synthesizer using Web Audio API

class SoundFXManager {
  constructor() {
    this.ctx = null;
    this.volume = 0.5;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Micro procedural sound generator
  play(frequency = 440, type = 'square', duration = 0.1, decay = 0.1, pitchDecay = 0, noise = 0) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, now);
      if (pitchDecay !== 0) {
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(20, frequency + pitchDecay),
          now + duration
        );
      }

      gain.gain.setValueAtTime(this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration + decay);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + duration + decay);

      if (noise > 0) {
        this.playNoise(duration * 1.5, noise);
      }
    } catch (err) {
      // Audio autoplay may be blocked until first click
    }
  }

  playNoise(duration = 0.2, amount = 0.3) {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * amount;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(this.volume * 0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(now);
  }

  // Sound Library Presets
  shootSMG() {
    this.play(600, 'square', 0.04, 0.04, -350, 0.2);
  }

  shootShotgun() {
    this.play(250, 'sawtooth', 0.08, 0.1, -180, 0.6);
  }

  shootRocket() {
    this.play(180, 'triangle', 0.15, 0.15, 120, 0.4);
  }

  shootGrenade() {
    this.play(400, 'sine', 0.06, 0.08, -250, 0.1);
  }

  shootLaser() {
    this.play(1200, 'sawtooth', 0.08, 0.06, -800, 0.05);
  }

  shootNuke() {
    this.play(100, 'sawtooth', 0.4, 0.6, -80, 0.9);
  }

  explosion(scale = 1) {
    this.play(120 / scale, 'sawtooth', 0.15 * scale, 0.25 * scale, -80, 0.7 * scale);
  }

  tileHit() {
    this.play(800 + Math.random() * 400, 'square', 0.02, 0.03, -400, 0.1);
  }

  tileBreak() {
    this.play(300 + Math.random() * 200, 'triangle', 0.04, 0.06, -200, 0.3);
  }

  jump() {
    this.play(320, 'square', 0.06, 0.08, 300, 0);
  }

  doubleJump() {
    this.play(540, 'triangle', 0.08, 0.08, 450, 0);
  }

  jetpack() {
    this.play(90 + Math.random() * 30, 'sawtooth', 0.05, 0.05, 0, 0.25);
  }

  switchWeapon() {
    this.play(800, 'sine', 0.03, 0.03, 200, 0);
  }

  playerHurt() {
    this.play(160, 'sawtooth', 0.12, 0.15, -90, 0.5);
  }

  playerShieldDown() {
    this.play(600, 'sine', 0.1, 0.2, -400, 0.2);
  }

  playerDeath() {
    this.play(90, 'sawtooth', 0.4, 0.6, -60, 0.8);
  }

  enemyHit() {
    this.play(450 + Math.random() * 200, 'square', 0.03, 0.05, -150, 0.2);
  }

  enemyExplosion() {
    this.play(180, 'sawtooth', 0.12, 0.2, -100, 0.6);
  }

  environmentalKill() {
    // Two-tone comedic fall & splat chime
    this.play(520, 'triangle', 0.08, 0.08, -300, 0);
    setTimeout(() => {
      this.play(880, 'square', 0.12, 0.15, 200, 0.1);
    }, 90);
  }

  bossSiren() {
    // Air raid / siren warble
    this.play(700, 'sawtooth', 0.35, 0.15, 300, 0.2);
    setTimeout(() => {
      this.play(900, 'sawtooth', 0.35, 0.15, -300, 0.2);
    }, 320);
  }

  bossSlam() {
    this.play(75, 'sawtooth', 0.3, 0.5, -45, 0.95);
  }

  foodPickup() {
    this.play(587, 'sine', 0.06, 0.06, 290, 0);
    setTimeout(() => {
      this.play(880, 'sine', 0.08, 0.1, 400, 0);
    }, 70);
  }

  comboUp() {
    this.play(600 + Math.min(600, Math.random() * 300), 'triangle', 0.05, 0.05, 150, 0);
  }

  comboDrop() {
    this.play(260, 'sine', 0.1, 0.1, -120, 0);
  }
}

export const SoundFX = new SoundFXManager();

