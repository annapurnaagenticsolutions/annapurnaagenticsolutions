// AmbientDrone — a fully procedural per-biome ambient pad built with the Web
// Audio API. No external audio files: each biome is 2-3 sustained oscillators,
// slightly detuned for richness, routed through a warm lowpass filter with a
// slow LFO that breathes the cutoff/gain. Volume is kept very low (a bed, not
// a feature) and is player-controllable. The drone shares the same gesture
// requirement as SoundFeedback: the AudioContext is created/resumed lazily so
// browsers do not block it as autoplay. It runs independently of SoundFeedback
// (separate nodes into the same destination) so the sparse interaction tones
// remain untouched.
import type { AmbientDroneBiome } from "./Chronicle";

type DroneConfig = {
  // Base frequencies for the sustained voices (Hz). 2-3 voices per biome.
  voices: number[];
  // Lowpass filter base cutoff (Hz). Lower = warmer/darker.
  cutoff: number;
  // LFO rate (Hz) for the breathing modulation.
  lfoRate: number;
  // LFO depth (Hz) added/subtracted from the cutoff.
  lfoDepth: number;
  // Per-voice detune in cents for chorus-like richness.
  detune: number[];
  // Base gain before the master volume is applied (kept very low).
  baseGain: number;
};

const configs: Record<AmbientDroneBiome, DroneConfig> = {
  // Ashram — warm, low, grounded. Root ~110Hz with a perfect fifth.
  ashram: { voices: [110, 164.81, 55], cutoff: 420, lfoRate: 0.05, lfoDepth: 90, detune: [-4, 4, 0], baseGain: 0.032 },
  // Road — open, airy, slightly higher. ~146Hz with a major third.
  road: { voices: [146.83, 184.99, 73.42], cutoff: 520, lfoRate: 0.06, lfoDepth: 110, detune: [-5, 5, 0], baseGain: 0.03 },
  // Rasa — richer, more complex. ~130Hz with a minor seventh for tension.
  rasa: { voices: [130.81, 196, 233.08], cutoff: 480, lfoRate: 0.07, lfoDepth: 120, detune: [-6, 6, -3], baseGain: 0.03 },
  // Monsoon — darker, wetter. ~98Hz with a low rumble component.
  monsoon: { voices: [98, 49, 146.83], cutoff: 360, lfoRate: 0.08, lfoDepth: 140, detune: [-7, 7, 0], baseGain: 0.034 },
  // Archive — quiet, still, almost a single tone. ~123Hz.
  archive: { voices: [123.47, 246.94], cutoff: 380, lfoRate: 0.035, lfoDepth: 60, detune: [-3, 3], baseGain: 0.026 },
  // Estuary — flowing, with a slow filter sweep. ~116Hz.
  estuary: { voices: [116.54, 174.81, 58.27], cutoff: 500, lfoRate: 0.09, lfoDepth: 180, detune: [-5, 5, 0], baseGain: 0.03 },
  // SaltLibrary — crystalline, slightly brighter. ~164Hz.
  saltLibrary: { voices: [164.81, 246.94, 82.41], cutoff: 640, lfoRate: 0.055, lfoDepth: 100, detune: [-4, 4, 0], baseGain: 0.028 },
  // MirrorStep — reflective, with a detuned echo feel. ~138Hz.
  mirrorStep: { voices: [138.59, 138.59, 207.88], cutoff: 460, lfoRate: 0.045, lfoDepth: 90, detune: [-8, 8, -4], baseGain: 0.03 },
  // Confluence — layered, two chords merging. ~110Hz + ~146Hz.
  confluence: { voices: [110, 146.83, 164.81, 73.42], cutoff: 500, lfoRate: 0.05, lfoDepth: 110, detune: [-4, 4, -3, 0], baseGain: 0.028 },
  // ReturnObservatory — noble, resolved. ~131Hz major chord.
  returnObservatory: { voices: [130.81, 164.81, 196], cutoff: 540, lfoRate: 0.04, lfoDepth: 80, detune: [-3, 3, 0], baseGain: 0.03 },
  // LivingSurvey — active but calm. ~155Hz.
  livingSurvey: { voices: [155.56, 233.08, 77.78], cutoff: 560, lfoRate: 0.065, lfoDepth: 100, detune: [-5, 5, 0], baseGain: 0.029 },
  // LineageChamber — deep, ancestral. ~87Hz low and resonant.
  lineageChamber: { voices: [87.31, 43.65, 130.81], cutoff: 340, lfoRate: 0.03, lfoDepth: 70, detune: [-6, 6, -3], baseGain: 0.034 },
};

type VoiceNodes = { oscillators: OscillatorNode[]; gain: GainNode; filter: BiquadFilterNode; lfo: OscillatorNode; lfoGain: GainNode };

export class AmbientDrone {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private current: VoiceNodes | null = null;
  private currentBiome: AmbientDroneBiome | null = null;
  private volume = 0.4;
  private muted = false;
  private crossfadeMs = 1400;
  private started = false;

  // Lazily create/resume the AudioContext. Must be triggered by a user gesture
  // (the game canvas calls start() on first pointer/keyboard interaction).
  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.context) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.context = new Ctor();
      this.master = this.context.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === "suspended") void this.context.resume();
    return this.context;
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.applyMasterGain();
  }

  // Mute silences the drone bed while preserving the chosen volume so unmuting
  // restores the previous atmosphere level. The React accessibility panel
  // drives this from the Chronicle `muted` preference.
  setMuted(muted: boolean) {
    this.muted = muted;
    this.applyMasterGain();
  }

  isMuted() { return this.muted; }

  private applyMasterGain() {
    if (this.context && this.master) {
      const now = this.context.currentTime;
      const target = this.muted ? 0 : this.volume;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(target, now, 0.12);
    }
  }

  isStarted() { return this.started; }

  // Begin the drone for a biome. Safe to call repeatedly; subsequent calls
  // crossfade to the new biome.
  start(biome: AmbientDroneBiome, volume?: number) {
    if (volume !== undefined) this.volume = Math.max(0, Math.min(1, volume));
    const context = this.getContext();
    if (!context || !this.master) return;
    this.started = true;
    if (this.currentBiome === biome && this.current) {
      this.setVolume(this.volume);
      return;
    }
    this.currentBiome = biome;
    const next = this.buildVoice(context, biome);
    // Crossfade: fade the new voice in, fade the old voice out, then dispose it.
    const now = context.currentTime;
    const fade = this.crossfadeMs / 1000;
    next.gain.gain.setValueAtTime(0.0001, now);
    next.gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, configs[biome].baseGain), now + fade);
    if (this.current) {
      const prev = this.current;
      prev.gain.gain.cancelScheduledValues(now);
      prev.gain.gain.setValueAtTime(Math.max(0.0002, prev.gain.gain.value), now);
      prev.gain.gain.exponentialRampToValueAtTime(0.0001, now + fade);
      window.setTimeout(() => this.disposeVoice(prev), this.crossfadeMs + 120);
    }
    this.current = next;
    this.setVolume(this.volume);
  }

  private buildVoice(context: AudioContext, biome: AmbientDroneBiome): VoiceNodes {
    const config = configs[biome];
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = config.cutoff;
    filter.Q.value = 0.7;
    const gain = context.createGain();
    gain.gain.value = 0.0001;
    filter.connect(gain);
    gain.connect(this.master!);
    const oscillators = config.voices.map((freq, index) => {
      const osc = context.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.detune.value = config.detune[index] ?? 0;
      osc.connect(filter);
      osc.start();
      return osc;
    });
    // Slow LFO breathing the filter cutoff for a living-but-still pad.
    const lfo = context.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = config.lfoRate;
    const lfoGain = context.createGain();
    lfoGain.gain.value = config.lfoDepth;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();
    return { oscillators, gain, filter, lfo, lfoGain };
  }

  private disposeVoice(voice: VoiceNodes) {
    try {
      voice.oscillators.forEach((osc) => { try { osc.stop(); } catch { /* already stopped */ } osc.disconnect(); });
      voice.lfo.stop();
      voice.lfo.disconnect();
      voice.lfoGain.disconnect();
      voice.filter.disconnect();
      voice.gain.disconnect();
    } catch { /* best-effort teardown */ }
  }

  dispose() {
    if (this.current) { this.disposeVoice(this.current); this.current = null; }
    if (this.context) { void this.context.close(); this.context = null; this.master = null; }
    this.started = false;
    this.currentBiome = null;
  }
}
