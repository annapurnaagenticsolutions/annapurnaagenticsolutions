// Ashram-first design reminder: sound is sparse and instrumental—brief cues for attention, practice, and earned alignment.
export class SoundFeedback {
  private context: AudioContext | null = null;
  // Shared mute flag. The React accessibility layer toggles this so a single
  // mute control silences every world's sparse interaction tones without
  // having to thread the setting through each world constructor.
  private static muted = false;
  static setMuted(muted: boolean) { SoundFeedback.muted = muted; }
  static isMuted() { return SoundFeedback.muted; }

  private getContext() {
    if (typeof window === "undefined") return null;
    if (!this.context) this.context = new AudioContext();
    if (this.context.state === "suspended") void this.context.resume();
    return this.context;
  }

  tone(frequency: number, duration: number, type: OscillatorType = "sine", gain = 0.04) {
    if (SoundFeedback.muted) return;
    const context = this.getContext();
    if (!context) return;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    envelope.gain.setValueAtTime(0.0001, context.currentTime);
    envelope.gain.exponentialRampToValueAtTime(gain, context.currentTime + 0.015);
    envelope.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.connect(envelope);
    envelope.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration + 0.03);
  }

  pulse() { this.tone(196, 0.18, "triangle", 0.045); this.tone(294, 0.28, "sine", 0.026); }
  collect() { this.tone(523, 0.12, "sine", 0.035); this.tone(659, 0.24, "sine", 0.025); }
  align() { this.tone(233, 0.18, "triangle", 0.04); this.tone(349, 0.28, "sine", 0.03); this.tone(466, 0.42, "sine", 0.022); }
  speak() { this.tone(176, 0.12, "sine", 0.025); }
  dispose() { if (this.context) void this.context.close(); this.context = null; }
}

