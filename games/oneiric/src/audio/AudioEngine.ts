// ONEIRIC — Procedural Web Audio synthesis engine
// All sound is generated at runtime via the Web Audio API. No external audio files.

import type { AudioConfig } from '../types';

interface DroneNodes {
  osc1: OscillatorNode;
  osc2: OscillatorNode;
  filter: BiquadFilterNode;
  gain: GainNode;
}

interface TotemNodes {
  osc: OscillatorNode;
  modulator: OscillatorNode;
  ringGain: GainNode;
  gain: GainNode;
}

const DEFAULT_CONFIG: AudioConfig = {
  masterVolume: 0.6,
  muted: false,
};

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private config: AudioConfig = { ...DEFAULT_CONFIG };
  private volume: number = DEFAULT_CONFIG.masterVolume;

  // Sustained node references (for cleanup / crossfade)
  private drone: DroneNodes | null = null;
  private totem: TotemNodes | null = null;
  private limboInterval: number | null = null;

  // One-time gesture listeners for autoplay policy resume
  private gestureHandler: ((e: Event) => void) | null = null;

  // ---- Lifecycle ----

  constructor() {
    // AudioContext is created lazily in init() after a user gesture.
  }

  init(): void {
    if (this.ctx) return;
    const Ctor: typeof AudioContext =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctor();

    // Limiter / compressor on the master bus to prevent clipping when
    // multiple layers (drone + SFX + totem) stack simultaneously.
    this.limiter = this.ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -6;
    this.limiter.knee.value = 6;
    this.limiter.ratio.value = 12;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.25;

    this.master = this.ctx.createGain();
    this.master.gain.value = this.config.muted ? 0 : this.volume;
    this.master.connect(this.limiter);
    this.limiter.connect(this.ctx.destination);

    // Autoplay policy: AudioContext starts in "suspended" state on most
    // browsers. It must be resumed *within* a user-gesture event handler.
    // Since our game loop polls input state (wasPressed) rather than
    // acting directly inside the keydown listener, a resume called from
    // the loop would be rejected. Register one-time gesture listeners that
    // resume the context directly inside the event handler.
    this.resumeOnFirstGesture();
  }

  /**
   * Registers one-time listeners for the first user interaction (keydown,
   * pointerdown, mousedown, or touchstart) and resumes the AudioContext
   * inside that handler — satisfying the browser autoplay policy.
   */
  private resumeOnFirstGesture(): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const handler = (e: Event): void => {
      void e; // unused but confirms this is an event handler
      if (ctx.state === 'suspended') {
        void ctx.resume();
      }
      // Clean up all one-time listeners after the first gesture.
      window.removeEventListener('keydown', handler);
      window.removeEventListener('pointerdown', handler);
      window.removeEventListener('mousedown', handler);
      window.removeEventListener('touchstart', handler);
      this.gestureHandler = null;
    };
    this.gestureHandler = handler;
    window.addEventListener('keydown', handler, { once: false });
    window.addEventListener('pointerdown', handler, { once: false });
    window.addEventListener('mousedown', handler, { once: false });
    window.addEventListener('touchstart', handler, { once: false });
  }

  private ensureCtx(): AudioContext | null {
    if (!this.ctx) {
      // Lazily init if possible; otherwise no-op.
      this.init();
    }
    return this.ctx;
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.ctx && this.master && !this.config.muted) {
      this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  setMuted(m: boolean): void {
    this.config.muted = m;
    if (this.ctx && this.master) {
      const target = m ? 0 : this.volume;
      this.master.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
    }
  }

  suspend(): void {
    if (this.ctx) {
      void this.ctx.suspend();
    }
  }

  resume(): void {
    if (this.ctx) {
      void this.ctx.resume();
    }
  }

  destroy(): void {
    this.stopDrone();
    this.stopTotemSpin();
    this.stopLimbo();
    // Remove one-time gesture listeners if still pending.
    if (this.gestureHandler) {
      window.removeEventListener('keydown', this.gestureHandler);
      window.removeEventListener('pointerdown', this.gestureHandler);
      window.removeEventListener('mousedown', this.gestureHandler);
      window.removeEventListener('touchstart', this.gestureHandler);
      this.gestureHandler = null;
    }
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
    this.master = null;
    this.limiter = null;
  }

  // ---- Ambient drones ----

  startDrone(hz: number, type: OscillatorType = 'sine'): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this.master) return;
    this.stopDrone();

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    osc1.type = type;
    osc1.frequency.value = hz;
    osc2.type = type;
    osc2.frequency.value = hz * 1.005; // slight detune for richness

    filter.type = 'lowpass';
    filter.frequency.value = hz * 4;

    // Fade in over 50ms to avoid a startup click.
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.05);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);

    osc1.start();
    osc2.start();

    this.drone = { osc1, osc2, filter, gain };
  }

  stopDrone(): void {
    if (!this.drone) return;
    const { osc1, osc2, filter, gain } = this.drone;
    const ctx = this.ctx;
    this.drone = null; // clear immediately so re-entry is safe

    if (ctx) {
      // Fade out over 50ms to avoid a stop click, then disconnect.
      const now = ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.05);
      window.setTimeout(() => {
        try {
          osc1.stop();
          osc2.stop();
        } catch {
          // already stopped
        }
        osc1.disconnect();
        osc2.disconnect();
        filter.disconnect();
        gain.disconnect();
      }, 60);
    } else {
      try {
        osc1.stop();
        osc2.stop();
      } catch {
        // already stopped
      }
      osc1.disconnect();
      osc2.disconnect();
      filter.disconnect();
      gain.disconnect();
    }
  }

  crossfadeDrone(hz: number, type: OscillatorType = 'sine'): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this.master) return;

    if (this.drone) {
      const old = this.drone;
      const now = ctx.currentTime;
      old.gain.gain.cancelScheduledValues(now);
      old.gain.gain.setValueAtTime(old.gain.gain.value, now);
      old.gain.gain.linearRampToValueAtTime(0, now + 0.5);
      // Stop after fade out completes.
      window.setTimeout(() => {
        try {
          old.osc1.stop();
          old.osc2.stop();
        } catch {
          // already stopped
        }
        old.osc1.disconnect();
        old.osc2.disconnect();
        old.filter.disconnect();
        old.gain.disconnect();
      }, 600);
      this.drone = null;
    }

    // Start new drone with a fade-in.
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    osc1.type = type;
    osc1.frequency.value = hz;
    osc2.type = type;
    osc2.frequency.value = hz * 1.005;

    filter.type = 'lowpass';
    filter.frequency.value = hz * 4;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.5);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);

    osc1.start();
    osc2.start();

    this.drone = { osc1, osc2, filter, gain };
  }

  // ---- SFX (one-shot procedural sounds) ----

  playKick(): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.3);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }

  playSeedPlant(): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;

    // The climax moment — three layered elements that swell together:
    // 1. Low rumble (sub-bass that grows)
    // 2. Ascending tone (rises in pitch — the "planting" feeling)
    // 3. Bright shimmer (high overtone that arrives at the peak)

    // --- Layer 1: Low rumble (50Hz sine, swells over 800ms) ---
    const rumble = ctx.createOscillator();
    const rumbleGain = ctx.createGain();
    rumble.type = 'sine';
    rumble.frequency.setValueAtTime(50, now);
    rumble.frequency.linearRampToValueAtTime(65, now + 0.8);
    rumbleGain.gain.setValueAtTime(0, now);
    rumbleGain.gain.linearRampToValueAtTime(0.35, now + 0.3);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    rumble.connect(rumbleGain);
    rumbleGain.connect(this.master);
    rumble.start(now);
    rumble.stop(now + 0.82);

    // --- Layer 2: Ascending tone (triangle, 220Hz -> 660Hz, 600ms) ---
    const ascend = ctx.createOscillator();
    const ascendGain = ctx.createGain();
    ascend.type = 'triangle';
    ascend.frequency.setValueAtTime(220, now);
    ascend.frequency.exponentialRampToValueAtTime(660, now + 0.6);
    ascendGain.gain.setValueAtTime(0, now);
    ascendGain.gain.linearRampToValueAtTime(0.2, now + 0.1);
    ascendGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    ascend.connect(ascendGain);
    ascendGain.connect(this.master);
    ascend.start(now);
    ascend.stop(now + 0.62);

    // --- Layer 3: Bright shimmer (sine, 1200Hz, delayed start at peak) ---
    const shimmer = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    shimmer.type = 'sine';
    shimmer.frequency.setValueAtTime(1200, now + 0.3);
    shimmer.frequency.linearRampToValueAtTime(1600, now + 0.7);
    shimmerGain.gain.setValueAtTime(0, now + 0.3);
    shimmerGain.gain.linearRampToValueAtTime(0.12, now + 0.35);
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(this.master);
    shimmer.start(now + 0.3);
    shimmer.stop(now + 0.72);

    rumble.onended = () => {
      rumble.disconnect();
      rumbleGain.disconnect();
    };
    ascend.onended = () => {
      ascend.disconnect();
      ascendGain.disconnect();
    };
    shimmer.onended = () => {
      shimmer.disconnect();
      shimmerGain.disconnect();
    };
  }

  playProjectionAlert(): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.value = 220;
    osc2.type = 'sawtooth';
    osc2.frequency.value = 233; // tritone dissonance

    filter.type = 'bandpass';
    filter.frequency.value = 226;
    filter.Q.value = 4;

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.15);
    osc2.stop(now + 0.15);

    osc1.onended = () => {
      osc1.disconnect();
      osc2.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }

  playHit(): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;

    // --- Layer 1: Bass thump (70Hz sine, fast attack, slow decay) ---
    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bass.type = 'sine';
    bass.frequency.setValueAtTime(70, now);
    bass.frequency.exponentialRampToValueAtTime(45, now + 0.2);
    // Fast attack: 2ms to peak, then exponential decay over 200ms.
    bassGain.gain.setValueAtTime(0, now);
    bassGain.gain.linearRampToValueAtTime(0.5, now + 0.002);
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    bass.connect(bassGain);
    bassGain.connect(this.master);
    bass.start(now);
    bass.stop(now + 0.22);

    // --- Layer 2: Harsh noise burst (bandpass, fast attack, 150ms decay) ---
    const buffer = this.createNoiseBuffer(ctx, 0.15);
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    filter.Q.value = 0.8;

    const gain = ctx.createGain();
    // Fast attack: 1ms to peak, then exponential decay.
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);

    source.start(now);
    source.stop(now + 0.15);

    bass.onended = () => {
      bass.disconnect();
      bassGain.disconnect();
    };
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }

  playFragmentPickup(): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;

    // Bright bell-like ping: fundamental + two harmonics, quick attack,
    // 150ms exponential decay.
    const osc = ctx.createOscillator();
    const harmonic = ctx.createOscillator();
    const shimmer = ctx.createOscillator();
    const gain = ctx.createGain();
    const harmGain = ctx.createGain();
    const shimmerGain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 880; // A5
    harmonic.type = 'sine';
    harmonic.frequency.value = 1760; // A6 — octave for brightness
    shimmer.type = 'sine';
    shimmer.frequency.value = 2640; // ~E7 — shimmer overtone

    // Fast attack (2ms), 150ms decay — short and bright.
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    harmGain.gain.setValueAtTime(0, now);
    harmGain.gain.linearRampToValueAtTime(0.15, now + 0.002);
    harmGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    shimmerGain.gain.setValueAtTime(0, now);
    shimmerGain.gain.linearRampToValueAtTime(0.06, now + 0.002);
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    harmonic.connect(harmGain);
    shimmer.connect(shimmerGain);
    gain.connect(this.master);
    harmGain.connect(this.master);
    shimmerGain.connect(this.master);

    osc.start(now);
    harmonic.start(now);
    shimmer.start(now);
    osc.stop(now + 0.16);
    harmonic.stop(now + 0.13);
    shimmer.stop(now + 0.11);

    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
      harmonic.disconnect();
      harmGain.disconnect();
      shimmer.disconnect();
      shimmerGain.disconnect();
    };
  }

  playTotemSpin(): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this.master) return;
    this.stopTotemSpin();

    const osc = ctx.createOscillator();
    const modulator = ctx.createOscillator();
    const ringGain = ctx.createGain();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.value = 440;

    modulator.type = 'sine';
    modulator.frequency.value = 50;
    ringGain.gain.value = 1;

    // Ring modulation: multiply carrier by modulator.
    osc.connect(ringGain);
    modulator.connect(ringGain.gain);

    // Fade in over 30ms to avoid click on start.
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.04, now + 0.03);

    ringGain.connect(gain);
    gain.connect(this.master);

    osc.start();
    modulator.start();

    this.totem = { osc, modulator, ringGain, gain };
  }

  stopTotemSpin(): void {
    if (!this.totem) return;
    const { osc, modulator, ringGain, gain } = this.totem;
    this.totem = null; // clear immediately so re-entry is safe
    const ctx = this.ctx;

    if (ctx) {
      // Fade out over 50ms to avoid click on stop.
      const now = ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.05);
      window.setTimeout(() => {
        try {
          osc.stop();
          modulator.stop();
        } catch {
          // already stopped
        }
        osc.disconnect();
        modulator.disconnect();
        ringGain.disconnect();
        gain.disconnect();
      }, 60);
    } else {
      try {
        osc.stop();
        modulator.stop();
      } catch {
        // already stopped
      }
      osc.disconnect();
      modulator.disconnect();
      ringGain.disconnect();
      gain.disconnect();
    }
  }

  playKickMiss(): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;

    // Dull thud — low triangle wave with lowpass-filtered noise.
    // Lower pitch than playHit to read as "missed / weak".

    // --- Layer 1: Low triangle thud (100Hz -> 60Hz) ---
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);
    // Fast attack (3ms), 150ms decay — dull and short.
    oscGain.gain.setValueAtTime(0, now);
    oscGain.gain.linearRampToValueAtTime(0.3, now + 0.003);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(oscGain);
    oscGain.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.17);

    // --- Layer 2: Lowpass noise for "dullness" body ---
    const buffer = this.createNoiseBuffer(ctx, 0.12);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 400; // muffled
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0, now);
    noiseGain.gain.linearRampToValueAtTime(0.15, now + 0.003);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    source.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.master);
    source.start(now);
    source.stop(now + 0.12);

    osc.onended = () => {
      osc.disconnect();
      oscGain.disconnect();
    };
    source.onended = () => {
      source.disconnect();
      noiseFilter.disconnect();
      noiseGain.disconnect();
    };
  }

  playKickHit(): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this.master) return;
    const master = this.master;
    const now = ctx.currentTime;

    // A satisfying "crack" — short high-frequency noise burst + descending pitch.

    // --- Layer 1: Noise crack (highpass, very short, 80ms) ---
    const buffer = this.createNoiseBuffer(ctx, 0.08);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 2000; // crisp, bright
    const noiseGain = ctx.createGain();
    // Fast attack (1ms), fast decay (80ms) — a sharp tick.
    noiseGain.gain.setValueAtTime(0, now);
    noiseGain.gain.linearRampToValueAtTime(0.35, now + 0.001);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    source.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(master);
    source.start(now);
    source.stop(now + 0.08);

    // --- Layer 2: Descending pitch (triangle, 400Hz -> 80Hz, 120ms) ---
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
    // Fast attack (2ms), 120ms decay.
    oscGain.gain.setValueAtTime(0, now);
    oscGain.gain.linearRampToValueAtTime(0.3, now + 0.002);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(oscGain);
    oscGain.connect(master);
    osc.start(now);
    osc.stop(now + 0.14);

    source.onended = () => {
      source.disconnect();
      noiseFilter.disconnect();
      noiseGain.disconnect();
    };
    osc.onended = () => {
      osc.disconnect();
      oscGain.disconnect();
    };
  }

  playDescend(): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;

    // Phase A+B: Low rumble that builds (0-1.5s)
    const rumble = ctx.createOscillator();
    const rumbleGain = ctx.createGain();
    rumble.type = 'sine';
    rumble.frequency.setValueAtTime(60, now);
    rumble.frequency.linearRampToValueAtTime(40, now + 1.5);
    rumbleGain.gain.setValueAtTime(0, now);
    rumbleGain.gain.linearRampToValueAtTime(0.25, now + 0.5);
    rumbleGain.gain.linearRampToValueAtTime(0.35, now + 1.2);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    rumble.connect(rumbleGain);
    rumbleGain.connect(this.master);
    rumble.start(now);
    rumble.stop(now + 1.5);

    // Phase C: Rising sweep as you fall (1.5-2.25s)
    const sweep = ctx.createOscillator();
    const sweepGain = ctx.createGain();
    sweep.type = 'sine';
    sweep.frequency.setValueAtTime(110, now + 1.5);
    sweep.frequency.exponentialRampToValueAtTime(880, now + 2.25);
    sweepGain.gain.setValueAtTime(0, now + 1.5);
    sweepGain.gain.linearRampToValueAtTime(0.2, now + 1.8);
    sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 2.25);
    sweep.connect(sweepGain);
    sweepGain.connect(this.master);
    sweep.start(now + 1.5);
    sweep.stop(now + 2.25);

    // Reverb-like delay on the rumble
    const delay = ctx.createDelay();
    const feedback = ctx.createGain();
    delay.delayTime.value = 0.25;
    feedback.gain.value = 0.35;
    rumbleGain.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(this.master);

    rumble.onended = () => {
      rumble.disconnect();
      rumbleGain.disconnect();
      delay.disconnect();
      feedback.disconnect();
    };
    sweep.onended = () => {
      sweep.disconnect();
      sweepGain.disconnect();
    };
  }

  playDescendImpact(): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;

    // --- Reverb tail: feedback delay network shared by bass + noise ---
    // A multi-tap delay with feedback creates a reverb-like tail.
    const reverbSend = ctx.createGain();
    reverbSend.gain.value = 0.5;

    const delay1 = ctx.createDelay();
    const delay2 = ctx.createDelay();
    const feedback = ctx.createGain();
    const reverbReturn = ctx.createGain();
    const reverbFilter = ctx.createBiquadFilter();

    delay1.delayTime.value = 0.07;
    delay2.delayTime.value = 0.13;
    feedback.gain.value = 0.45;
    reverbReturn.gain.value = 0.4;
    reverbFilter.type = 'lowpass';
    reverbFilter.frequency.value = 2500; // soften the reverb tail

    // Send -> delay1 -> delay2 -> feedback -> delay1 (loop)
    reverbSend.connect(delay1);
    delay1.connect(delay2);
    delay2.connect(feedback);
    feedback.connect(delay1);
    // Return path through lowpass filter
    delay1.connect(reverbFilter);
    delay2.connect(reverbFilter);
    reverbFilter.connect(reverbReturn);
    reverbReturn.connect(this.master);

    // --- Layer 1: Bass impact (70Hz sine, fast attack, 400ms decay) ---
    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bass.type = 'sine';
    bass.frequency.setValueAtTime(70, now);
    bass.frequency.exponentialRampToValueAtTime(30, now + 0.4);
    // Fast attack (2ms), slow decay (400ms) — heavy landing.
    bassGain.gain.setValueAtTime(0, now);
    bassGain.gain.linearRampToValueAtTime(0.5, now + 0.002);
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    bass.connect(bassGain);
    bassGain.connect(this.master);
    bassGain.connect(reverbSend); // send bass to reverb
    bass.start(now);
    bass.stop(now + 0.42);

    // --- Layer 2: High-frequency crack (noise burst, fast attack, 120ms) ---
    const noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.12), ctx.sampleRate);
    const noiseData = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * (1 - i / noiseData.length);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 2000;
    const noiseGain = ctx.createGain();
    // Fast attack (1ms), 120ms decay — sharp crack.
    noiseGain.gain.setValueAtTime(0, now);
    noiseGain.gain.linearRampToValueAtTime(0.2, now + 0.001);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.master);
    noise.start(now);
    noise.stop(now + 0.12);

    // --- Layer 3: Rising sweep that resolves on impact ("arriving") ---
    const sweep = ctx.createOscillator();
    const sweepGain = ctx.createGain();
    sweep.type = 'triangle';
    sweep.frequency.setValueAtTime(220, now);
    sweep.frequency.exponentialRampToValueAtTime(660, now + 0.3);
    sweepGain.gain.setValueAtTime(0, now);
    sweepGain.gain.linearRampToValueAtTime(0.2, now + 0.003);
    sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    sweep.connect(sweepGain);
    sweepGain.connect(this.master);
    sweep.start(now);
    sweep.stop(now + 0.42);

    // --- Cleanup: tear down reverb network after tail fades (~1.5s) ---
    const cleanupReverb = (): void => {
      reverbSend.disconnect();
      delay1.disconnect();
      delay2.disconnect();
      feedback.disconnect();
      reverbFilter.disconnect();
      reverbReturn.disconnect();
    };

    bass.onended = (): void => {
      bass.disconnect();
      bassGain.disconnect();
    };
    noise.onended = (): void => {
      noise.disconnect();
      noiseFilter.disconnect();
      noiseGain.disconnect();
    };
    sweep.onended = (): void => {
      sweep.disconnect();
      sweepGain.disconnect();
    };
    // Reverb tail outlasts the oscillators — clean up after it fades.
    window.setTimeout(cleanupReverb, 1600);
  }

  playWake(): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;

    // Stop all sustained layers.
    this.stopDrone();
    this.stopTotemSpin();
    this.stopLimbo();

    // Soft 220Hz sine fading over 2s.
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 220;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + 2.0);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }

  // ---- Limbo audio ----

  startLimbo(): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    this.stopLimbo();
    this.stopDrone();
    this.stopTotemSpin();

    const beat = (): void => {
      if (!this.ctx || !this.master) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(50, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(now);
      osc.stop(now + 0.1);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    };

    // Immediate first beat, then repeat every 1.5s.
    beat();
    this.limboInterval = window.setInterval(beat, 1500);
  }

  stopLimbo(): void {
    if (this.limboInterval !== null) {
      window.clearInterval(this.limboInterval);
      this.limboInterval = null;
    }
  }

  // ---- Cinematic SFX & Mechanics ----

  /**
   * Massive Inception-style sub-bass BRRRAAAM brass impact.
   * Multi-oscillator stacked saw + sub sine with steep lowpass sweep.
   */
  playBraaam(): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;
    const duration = 2.2;

    const baseFreq = 55; // A1 low brass
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(120, now + duration);
    filter.Q.value = 4.0;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(0.45, now + 0.05);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    // Stasis chord: fundamental + fifth + octave + sub
    const freqs = [baseFreq, baseFreq * 1.01, baseFreq * 1.498, baseFreq * 2.0];
    const oscs: OscillatorNode[] = [];

    for (const f of freqs) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.linearRampToValueAtTime(f * 0.96, now + duration);
      osc.connect(filter);
      osc.start(now);
      osc.stop(now + duration);
      oscs.push(osc);
    }

    // Heavy pure sub-bass sine
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(baseFreq * 0.5, now);
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.5, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    sub.connect(subGain);
    subGain.connect(masterGain);
    sub.start(now);
    sub.stop(now + duration);
    oscs.push(sub);

    filter.connect(masterGain);
    masterGain.connect(this.master);

    oscs[0].onended = () => {
      for (const o of oscs) o.disconnect();
      filter.disconnect();
      masterGain.disconnect();
      subGain.disconnect();
    };
  }

  /** Phase-dash whoosh sound for Lucid Surge (Space). */
  playLucidSurge(): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;

    const buffer = this.createNoiseBuffer(ctx, 0.35);
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(200, now);
    filter.frequency.exponentialRampToValueAtTime(2400, now + 0.15);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.35);
    filter.Q.value = 3.0;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);

    source.start(now);
    source.stop(now + 0.35);

    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }

  /** Resonant sonic ping for deploying an Echo Lure (F). */
  playEchoLure(): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.4);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(this.master);

    osc.start(now);
    osc.stop(now + 0.45);

    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }

  /** Ethereal chiming music-box resonance for memory objects (E). */
  playMemoryResonance(): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const noteTime = now + i * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0, noteTime);
      gain.gain.linearRampToValueAtTime(0.2, noteTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.6);

      osc.connect(gain);
      gain.connect(this.master!);

      osc.start(noteTime);
      osc.stop(noteTime + 0.65);

      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    });
  }

  /** Acoustic friction and clatter when the totem stops in reality. */
  playTotemClatter(): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;

    const buffer = this.createNoiseBuffer(ctx, 0.18);
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.18);
    filter.Q.value = 5.0;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);

    source.start(now);
    source.stop(now + 0.18);

    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }

  // ---- Helpers ----

  private createNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1; // white noise
    }
    return buffer;
  }
}
