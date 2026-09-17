export type AmbientHandle = {
  muted: boolean;
  toggle(): boolean;
  stop(): void;
};

/**
 * A small, no-asset rain bed generated with Web Audio after a user gesture.
 * This avoids autoplay failures and keeps the project lightweight.
 */
export function createRainAmbience(): AmbientHandle | null {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;

  const context = new AudioContextClass();
  const output = context.createGain();
  const highRain = context.createBiquadFilter();
  const lowRain = context.createBiquadFilter();
  const highSource = context.createBufferSource();
  const lowSource = context.createBufferSource();
  const bufferLength = context.sampleRate * 2;
  const highBuffer = context.createBuffer(1, bufferLength, context.sampleRate);
  const lowBuffer = context.createBuffer(1, bufferLength, context.sampleRate);
  const highData = highBuffer.getChannelData(0);
  const lowData = lowBuffer.getChannelData(0);

  for (let index = 0; index < bufferLength; index += 1) {
    const sample = Math.random() * 2 - 1;
    highData[index] = sample * 0.72;
    lowData[index] = sample * 0.48;
  }

  highRain.type = "bandpass";
  highRain.frequency.value = 1900;
  highRain.Q.value = 0.55;
  lowRain.type = "lowpass";
  lowRain.frequency.value = 480;
  lowRain.Q.value = 0.65;
  output.gain.value = 0.0001;

  highSource.buffer = highBuffer;
  lowSource.buffer = lowBuffer;
  highSource.loop = true;
  lowSource.loop = true;
  highSource.connect(highRain).connect(output);
  lowSource.connect(lowRain).connect(output);
  output.connect(context.destination);
  highSource.start();
  lowSource.start();
  void context.resume();

  let muted = false;
  const handle: AmbientHandle = {
    get muted() {
      return muted;
    },
    toggle() {
      muted = !muted;
      output.gain.setTargetAtTime(muted ? 0.0001 : 0.035, context.currentTime, 0.18);
      return !muted;
    },
    stop() {
      try {
        highSource.stop();
        lowSource.stop();
      } finally {
        void context.close();
      }
    },
  };

  output.gain.setTargetAtTime(0.035, context.currentTime, 0.65);
  return handle;
}
