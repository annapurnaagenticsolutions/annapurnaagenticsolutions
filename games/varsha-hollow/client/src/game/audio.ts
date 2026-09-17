/**
 * Varsha Hollow — Layered Audio System
 * =====================================
 *
 * A fully procedural Web Audio presentation layer. No external files.
 * Extends the approach in `ambient.ts` with:
 *
 *  A. Stateful ambient rain bed (light / heavy / storm / clear)
 *  B. One-shot sound effects (choice, stat, slime, chapter, ending, prosperity)
 *  C. Evolving ambient music pad that shifts per story arc
 *
 * Everything starts on a user gesture (the existing sound toggle) and
 * respects the existing mute toggle. The module is self-contained and
 * exposes a single `createAudioEngine()` factory plus a handful of
 * effect functions. Integration instructions are in the final report.
 */

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type WeatherState = "light" | "heavy" | "storm" | "clear";

export type ArcName =
  | "Dry Shrine"
  | "Forty Roofs"
  | "Hollow Market"
  | "Moving Lights"
  | "Great Storm"
  | "Forgotten Channels";

export type AudioEngine = {
  /** Start the audio graph (call on first user gesture). */
  start(): void;
  /** True once the engine has been started. */
  readonly started: boolean;
  /** Mute / unmute the whole engine. Returns the new muted state. */
  toggleMute(): boolean;
  /** Set mute explicitly (useful for syncing with an external toggle). */
  setMute(muted: boolean): void;
  /** Current muted state. */
  readonly muted: boolean;
  /** Switch the rain bed to a new weather state. */
  setWeather(state: WeatherState): void;
  /** Switch the music pad to a new arc. */
  setArc(arc: ArcName): void;
  /** Tear everything down and close the AudioContext. */
  destroy(): void;

  /* ---- One-shot sound effects ---- */
  playChoiceAppear(): void;
  playChoiceSelect(): void;
  playStatIncrease(): void;
  playRelationshipIncrease(): void;
  playSlimeUnlock(): void;
  playChapterTransition(): void;
  playEndingReach(): void;
  playProsperityStageUp(): void;
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Create a short looping noise buffer (white noise). */
function createNoiseBuffer(ctx: AudioContext, seconds = 2): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

/** Create a looping noise source. */
function createNoiseSource(ctx: AudioContext, buffer: AudioBuffer): AudioBufferSourceNode {
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
}

/**
 * Map a weather state to ambient-bed parameters.
 *  - highGain / lowGain : relative loudness of the two rain bands
 *  - highFreq / lowFreq : filter cutoffs
 *  - rumbleGain         : low rumble layer (storm only)
 *  - bedGain            : overall rain bed level
 */
type WeatherParams = {
  highGain: number;
  lowGain: number;
  highFreq: number;
  lowFreq: number;
  rumbleGain: number;
  bedGain: number;
};

const WEATHER_PARAMS: Record<WeatherState, WeatherParams> = {
  light: { highGain: 0.72, lowGain: 0.48, highFreq: 1900, lowFreq: 480, rumbleGain: 0, bedGain: 0.035 },
  heavy: { highGain: 0.85, lowGain: 0.78, highFreq: 1500, lowFreq: 320, rumbleGain: 0, bedGain: 0.05 },
  storm: { highGain: 0.9, lowGain: 0.9, highFreq: 1200, lowFreq: 220, rumbleGain: 0.06, bedGain: 0.06 },
  clear: { highGain: 0.18, lowGain: 0.12, highFreq: 2400, lowFreq: 600, rumbleGain: 0, bedGain: 0.012 },
};

/**
 * Map a story arc to music-pad parameters.
 *  - root    : root frequency (Hz)
 *  - fifth   : whether to add a perfect fifth
 *  - detune  : cents of detune between the two pad oscillators
 *  - pulse   : whether to add a rhythmic amplitude pulse
 *  - minor   : use a minor third instead of a major third
 *  - rumble  : add a low rumble layer
 *  - delay   : add a feedback delay (reverb-like) for echoey feel
 *  - gain    : overall pad gain (kept very low — felt, not heard)
 */
type ArcParams = {
  root: number;
  fifth: boolean;
  detune: number;
  pulse: boolean;
  minor: boolean;
  rumble: boolean;
  delay: boolean;
  gain: number;
};

const ARC_PARAMS: Record<ArcName, ArcParams> = {
  "Dry Shrine": { root: 110, fifth: true, detune: 4, pulse: false, minor: false, rumble: false, delay: false, gain: 0.025 },
  "Forty Roofs": { root: 130, fifth: true, detune: 6, pulse: true, minor: false, rumble: false, delay: false, gain: 0.024 },
  "Hollow Market": { root: 146, fifth: true, detune: 8, pulse: true, minor: false, rumble: false, delay: false, gain: 0.026 },
  "Moving Lights": { root: 123, fifth: false, detune: 12, pulse: false, minor: true, rumble: false, delay: false, gain: 0.025 },
  "Great Storm": { root: 98, fifth: true, detune: 10, pulse: false, minor: true, rumble: true, delay: false, gain: 0.028 },
  "Forgotten Channels": { root: 87, fifth: true, detune: 7, pulse: false, minor: true, rumble: false, delay: true, gain: 0.024 },
};

/* ------------------------------------------------------------------ */
/* Engine factory                                                      */
/* ------------------------------------------------------------------ */

export function createAudioEngine(): AudioEngine {
  let ctx: AudioContext | null = null;
  let masterGain: GainNode | null = null;

  /* Ambient rain bed nodes */
  let rainOutput: GainNode | null = null;
  let highRainFilter: BiquadFilterNode | null = null;
  let lowRainFilter: BiquadFilterNode | null = null;
  let highRainSource: AudioBufferSourceNode | null = null;
  let lowRainSource: AudioBufferSourceNode | null = null;
  let rumbleSource: AudioBufferSourceNode | null = null;
  let rumbleFilter: BiquadFilterNode | null = null;
  let rumbleGain: GainNode | null = null;

  /* Music pad nodes */
  let padOutput: GainNode | null = null;
  let padOscA: OscillatorNode | null = null;
  let padOscB: OscillatorNode | null = null;
  let padThird: OscillatorNode | null = null;
  let padFifth: OscillatorNode | null = null;
  let padLfo: OscillatorNode | null = null;
  let padLfoGain: GainNode | null = null;
  let padRumbleOsc: OscillatorNode | null = null;
  let padRumbleGain: GainNode | null = null;
  let padDelay: DelayNode | null = null;
  let padFeedback: GainNode | null = null;
  let padDelayWet: GainNode | null = null;

  /* Bird chirp scheduler (clear weather) */
  let chirpTimer: number | null = null;

  /* Thunder scheduler (storm weather) */
  let thunderTimer: number | null = null;

  let started = false;
  let muted = false;
  let currentWeather: WeatherState = "light";
  let currentArc: ArcName = "Dry Shrine";

  /* ---------------------------------------------------------------- */
  /* Internal: build the audio graph                                  */
  /* ---------------------------------------------------------------- */

  function buildGraph(): void {
    if (!ctx || !masterGain) return;
    const now = ctx.currentTime;

    /* ---- Master bus ---- */
    masterGain.gain.value = 1;
    masterGain.connect(ctx.destination);

    /* ---- Ambient rain bed ---- */
    rainOutput = ctx.createGain();
    rainOutput.gain.value = 0.0001;
    rainOutput.connect(masterGain);

    const noiseBuffer = createNoiseBuffer(ctx, 2);

    highRainFilter = ctx.createBiquadFilter();
    highRainFilter.type = "bandpass";
    highRainFilter.frequency.value = WEATHER_PARAMS.light.highFreq;
    highRainFilter.Q.value = 0.55;

    lowRainFilter = ctx.createBiquadFilter();
    lowRainFilter.type = "lowpass";
    lowRainFilter.frequency.value = WEATHER_PARAMS.light.lowFreq;
    lowRainFilter.Q.value = 0.65;

    highRainSource = createNoiseSource(ctx, noiseBuffer);
    lowRainSource = createNoiseSource(ctx, noiseBuffer);
    highRainSource.connect(highRainFilter).connect(rainOutput);
    lowRainSource.connect(lowRainFilter).connect(rainOutput);
    highRainSource.start();
    lowRainSource.start();

    /* Low rumble layer (storm) — filtered low-frequency noise */
    rumbleFilter = ctx.createBiquadFilter();
    rumbleFilter.type = "lowpass";
    rumbleFilter.frequency.value = 90;
    rumbleFilter.Q.value = 0.4;

    rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 0.0001;

    rumbleSource = createNoiseSource(ctx, createNoiseBuffer(ctx, 4));
    rumbleSource.connect(rumbleFilter).connect(rumbleGain).connect(rainOutput);
    rumbleSource.start();

    /* Fade the rain bed in. */
    rainOutput.gain.setTargetAtTime(WEATHER_PARAMS.light.bedGain, now, 0.65);

    /* ---- Music pad ---- */
    buildPad();
  }

  function buildPad(): void {
    if (!ctx || !masterGain) return;
    const params = ARC_PARAMS[currentArc];

    /* Tear down any existing pad nodes. */
    teardownPad();

    padOutput = ctx.createGain();
    padOutput.gain.value = 0.0001;
    padOutput.connect(masterGain);

    /* Optional feedback delay for the "Forgotten Channels" echoey feel. */
    if (params.delay) {
      padDelay = ctx.createDelay(1.0);
      padDelay.delayTime.value = 0.38;
      padFeedback = ctx.createGain();
      padFeedback.gain.value = 0.42;
      padDelayWet = ctx.createGain();
      padDelayWet.gain.value = 0.5;
      padDelay.connect(padFeedback).connect(padDelay);
      padDelay.connect(padDelayWet).connect(padOutput);
      padOutput.connect(padDelay);
    }

    /* Two detuned root oscillators (sine/triangle blend). */
    padOscA = ctx.createOscillator();
    padOscA.type = "sine";
    padOscA.frequency.value = params.root;
    padOscA.detune.value = -params.detune / 2;

    padOscB = ctx.createOscillator();
    padOscB.type = "triangle";
    padOscB.frequency.value = params.root;
    padOscB.detune.value = params.detune / 2;

    /* Third (minor or major). */
    padThird = ctx.createOscillator();
    padThird.type = "sine";
    padThird.frequency.value = params.root * (params.minor ? 1.1895 : 1.2599); // minor/major third ratio

    /* Fifth. */
    padFifth = ctx.createOscillator();
    padFifth.type = "sine";
    padFifth.frequency.value = params.root * 1.5;

    const padOscGain = ctx.createGain();
    padOscGain.gain.value = 0.6;
    const thirdGain = ctx.createGain();
    thirdGain.gain.value = 0.25;
    const fifthGain = ctx.createGain();
    fifthGain.gain.value = params.fifth ? 0.2 : 0.0;

    padOscA.connect(padOscGain).connect(padOutput);
    padOscB.connect(padOscGain);
    padThird.connect(thirdGain).connect(padOutput);
    padFifth.connect(fifthGain).connect(padOutput);

    padOscA.start();
    padOscB.start();
    padThird.start();
    padFifth.start();

    /* Rhythmic amplitude pulse for "Forty Roofs" / "Hollow Market". */
    if (params.pulse) {
      padLfo = ctx.createOscillator();
      padLfo.type = "sine";
      padLfo.frequency.value = 0.28; // ~17 bpm — very slow work pulse
      padLfoGain = ctx.createGain();
      padLfoGain.gain.value = 0.012;
      padLfo.connect(padLfoGain).connect(padOutput.gain);
      padLfo.start();
    }

    /* Low rumble for "Great Storm". */
    if (params.rumble) {
      padRumbleOsc = ctx.createOscillator();
      padRumbleOsc.type = "sine";
      padRumbleOsc.frequency.value = params.root * 0.5;
      padRumbleGain = ctx.createGain();
      padRumbleGain.gain.value = 0.08;
      padRumbleOsc.connect(padRumbleGain).connect(padOutput);
      padRumbleOsc.start();
    }

    /* Fade the pad in gently. */
    const now = ctx.currentTime;
    padOutput.gain.setTargetAtTime(params.gain, now, 1.2);
  }

  function teardownPad(): void {
    const nodes = [padOscA, padOscB, padThird, padFifth, padLfo, padRumbleOsc];
    for (const node of nodes) {
      try {
        node?.stop();
      } catch {
        /* already stopped */
      }
    }
    padOscA = null;
    padOscB = null;
    padThird = null;
    padFifth = null;
    padLfo = null;
    padLfoGain = null;
    padRumbleOsc = null;
    padRumbleGain = null;
    padDelay = null;
    padFeedback = null;
    padDelayWet = null;
    padOutput = null;
  }

  /* ---------------------------------------------------------------- */
  /* Internal: weather transitions                                    */
  /* ---------------------------------------------------------------- */

  function applyWeather(state: WeatherState): void {
    if (!ctx || !rainOutput || !highRainFilter || !lowRainFilter || !rumbleGain) return;
    currentWeather = state;
    const params = WEATHER_PARAMS[state];
    const now = ctx.currentTime;
    const tau = 0.8;

    rainOutput.gain.setTargetAtTime(params.bedGain, now, tau);
    highRainFilter.frequency.setTargetAtTime(params.highFreq, now, tau);
    lowRainFilter.frequency.setTargetAtTime(params.lowFreq, now, tau);
    rumbleGain.gain.setTargetAtTime(params.rumbleGain, now, tau);

    /* Manage thunder scheduler. */
    if (thunderTimer !== null) {
      window.clearTimeout(thunderTimer);
      thunderTimer = null;
    }
    if (state === "storm") scheduleThunder();

    /* Manage bird-chirp scheduler. */
    if (chirpTimer !== null) {
      window.clearTimeout(chirpTimer);
      chirpTimer = null;
    }
    if (state === "clear") scheduleChirp();
  }

  /* ---------------------------------------------------------------- */
  /* Internal: procedural thunder (storm)                             */
  /* ---------------------------------------------------------------- */

  function scheduleThunder(): void {
    if (!ctx || currentWeather !== "storm") return;
    const delay = 4000 + Math.random() * 9000;
    thunderTimer = window.setTimeout(() => {
      playThunder();
      scheduleThunder();
    }, delay);
  }

  function playThunder(): void {
    if (!ctx || !masterGain || muted) return;
    const now = ctx.currentTime;
    const duration = 1.6 + Math.random() * 1.2;

    /* Low rumble burst. */
    const burst = ctx.createBufferSource();
    burst.buffer = createNoiseBuffer(ctx, duration);
    burst.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(180, now);
    filter.frequency.exponentialRampToValueAtTime(60, now + duration);

    const gain = ctx.createGain();
    const peak = 0.12 + Math.random() * 0.08;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    burst.connect(filter).connect(gain).connect(masterGain);
    burst.start(now);
    burst.stop(now + duration + 0.1);
  }

  /* ---------------------------------------------------------------- */
  /* Internal: synthesized bird chirps (clear weather)                */
  /* ---------------------------------------------------------------- */

  function scheduleChirp(): void {
    if (!ctx || currentWeather !== "clear") return;
    const delay = 3000 + Math.random() * 6000;
    chirpTimer = window.setTimeout(() => {
      playChirp();
      scheduleChirp();
    }, delay);
  }

  function playChirp(): void {
    if (!ctx || !masterGain || muted) return;
    const now = ctx.currentTime;
    const baseFreq = 2200 + Math.random() * 800;
    const chirpCount = 2 + Math.floor(Math.random() * 2);

    for (let i = 0; i < chirpCount; i += 1) {
      const start = now + i * 0.12;
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(baseFreq, start);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.4, start + 0.05);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.9, start + 0.1);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.018, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.11);

      osc.connect(gain).connect(masterGain);
      osc.start(start);
      osc.stop(start + 0.15);
    }
  }

  /* ---------------------------------------------------------------- */
  /* Internal: one-shot SFX helpers                                   */
  /* ---------------------------------------------------------------- */

  /** A short sine "ping" with quick decay. */
  function ping(freq: number, duration: number, gainPeak: number, type: OscillatorType = "sine", startOffset = 0): void {
    if (!ctx || !masterGain || muted) return;
    const now = ctx.currentTime + startOffset;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain).connect(masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  /** A short filtered noise burst. */
  function noiseBurst(duration: number, freq: number, q: number, gainPeak: number, type: BiquadFilterType = "bandpass", startOffset = 0): void {
    if (!ctx || !masterGain || muted) return;
    const now = ctx.currentTime + startOffset;
    const source = ctx.createBufferSource();
    source.buffer = createNoiseBuffer(ctx, duration);
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter).connect(gain).connect(masterGain);
    source.start(now);
    source.stop(now + duration + 0.05);
  }

  /* ---------------------------------------------------------------- */
  /* Public API                                                        */
  /* ---------------------------------------------------------------- */

  const engine: AudioEngine = {
    get started() {
      return started;
    },
    get muted() {
      return muted;
    },

    start() {
      if (started) return;
      if (typeof window === "undefined") return;
      const AudioContextClass =
        window.AudioContext ??
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      ctx = new AudioContextClass();
      masterGain = ctx.createGain();
      void ctx.resume();
      buildGraph();
      started = true;
    },

    toggleMute() {
      if (!ctx || !masterGain) return false;
      muted = !muted;
      masterGain.gain.setTargetAtTime(muted ? 0.0001 : 1, ctx.currentTime, 0.18);
      return !muted;
    },

    setMute(value: boolean) {
      if (!ctx || !masterGain) return;
      muted = value;
      masterGain.gain.setTargetAtTime(muted ? 0.0001 : 1, ctx.currentTime, 0.18);
    },

    setWeather(state: WeatherState) {
      applyWeather(state);
    },

    setArc(arc: ArcName) {
      if (arc === currentArc) return;
      currentArc = arc;
      if (started) buildPad();
    },

    destroy() {
      if (chirpTimer !== null) window.clearTimeout(chirpTimer);
      if (thunderTimer !== null) window.clearTimeout(thunderTimer);
      chirpTimer = null;
      thunderTimer = null;
      teardownPad();
      try {
        highRainSource?.stop();
        lowRainSource?.stop();
        rumbleSource?.stop();
      } catch {
        /* already stopped */
      }
      if (ctx) void ctx.close();
      ctx = null;
      started = false;
    },

    /* ---- Sound effects ---- */

    playChoiceAppear() {
      /* Soft chime — a gentle sine that decays quickly. */
      ping(880, 0.4, 0.05, "sine");
      ping(1320, 0.3, 0.025, "sine", 0.04);
    },

    playChoiceSelect() {
      /* Warm click — short filtered noise burst. */
      noiseBurst(0.09, 1200, 1.2, 0.06, "bandpass");
      ping(220, 0.12, 0.03, "triangle");
    },

    playStatIncrease() {
      /* Gentle rising two-note ascending tone. */
      ping(523, 0.18, 0.04, "sine"); // C5
      ping(784, 0.28, 0.04, "sine", 0.12); // G5
    },

    playRelationshipIncrease() {
      /* Warm pad swell — two detuned sines with slow attack/decay. */
      if (!ctx || !masterGain || muted) return;
      const now = ctx.currentTime;
      const freqs = [261, 392]; // C4 + G4
      for (const freq of freqs) {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        osc.detune.value = (Math.random() - 0.5) * 8;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.035, now + 0.25);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
        osc.connect(gain).connect(masterGain);
        osc.start(now);
        osc.stop(now + 1.5);
      }
    },

    playSlimeUnlock() {
      /* Magical shimmer — multiple detuned sines with slow decay. */
      const freqs = [523, 659, 784, 988, 1175]; // C5 E5 G5 B5 D6
      for (let i = 0; i < freqs.length; i += 1) {
        ping(freqs[i], 1.2, 0.022, "sine", i * 0.06);
      }
    },

    playChapterTransition() {
      /* Page-turn-like sound — filtered noise sweep. */
      if (!ctx || !masterGain || muted) return;
      const now = ctx.currentTime;
      const duration = 0.45;
      const source = ctx.createBufferSource();
      source.buffer = createNoiseBuffer(ctx, duration);
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.Q.value = 0.8;
      filter.frequency.setValueAtTime(400, now);
      filter.frequency.exponentialRampToValueAtTime(2400, now + duration);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.05, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      source.connect(filter).connect(gain).connect(masterGain);
      source.start(now);
      source.stop(now + duration + 0.05);
    },

    playEndingReach() {
      /* Deep, resonant chord — low root, fifth, octave. */
      if (!ctx || !masterGain || muted) return;
      const now = ctx.currentTime;
      const freqs = [110, 164.8, 220, 329.6]; // A2 E3 A3 E4
      for (const freq of freqs) {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        osc.detune.value = (Math.random() - 0.5) * 6;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.04, now + 0.6);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 4);
        osc.connect(gain).connect(masterGain);
        osc.start(now);
        osc.stop(now + 4.1);
      }
    },

    playProsperityStageUp() {
      /* Celebratory but restrained bell tone. */
      ping(587, 1.0, 0.04, "sine"); // D5
      ping(881, 1.4, 0.025, "sine", 0.08); // A5
      ping(1175, 1.6, 0.015, "sine", 0.16); // D6
    },
  };

  return engine;
}

/* ------------------------------------------------------------------ */
/* Convenience: map chapter weather text to a WeatherState             */
/* ------------------------------------------------------------------ */

/**
 * Heuristic mapping from a chapter's `weather` string to an audio
 * weather state. Integration code can call this when a chapter loads.
 */
export function weatherTextToState(weather: string): WeatherState {
  const w = weather.toLowerCase();
  if (w.includes("thunder") || w.includes("storm") || w.includes("sideways") || w.includes("mercy") || w.includes("without horizon")) {
    return "storm";
  }
  if (w.includes("clear") || w.includes("bright morning") || w.includes("calm night") || w.includes("after rain") || w.includes("easing")) {
    return "clear";
  }
  if (w.includes("heavy") || w.includes("monsoon") || w.includes("driving") || w.includes("warm rain") || w.includes("fine rain") || w.includes("rain finally") || w.includes("rain touching") || w.includes("rain ticking") || w.includes("soft rain") || w.includes("rain entering") || w.includes("rain heard") || w.includes("dripping") || w.includes("first rain") || w.includes("medicinal") || w.includes("mist") || w.includes("dust and rain") || w.includes("rain that falls")) {
    return "heavy";
  }
  return "light";
}
