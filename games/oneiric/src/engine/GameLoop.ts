// ONEIRIC — GameLoop
// Fixed-timestep game loop with requestAnimationFrame.
// Uses an accumulator pattern: update runs at a fixed 60Hz (dt = 1/60),
// while render runs every animation frame for smooth visuals independent
// of the simulation rate.

const FIXED_DT = 1 / 60; // seconds per fixed update step
const MAX_FRAME = 0.25; // clamp huge frame gaps (e.g. tab switch) to avoid spiral of death

export class GameLoop {
  private updateFn: (dt: number) => void;
  private renderFn: () => void;
  private rafId: number | null = null;
  private lastTime: number = 0;
  private accumulator: number = 0;

  /** Total elapsed simulation time (seconds). */
  time: number = 0;
  /** Smoothed frames-per-second estimate. */
  fps: number = 60;

  private fpsAccum: number = 0;
  private fpsFrames: number = 0;

  constructor(updateFn: (dt: number) => void, renderFn: () => void) {
    this.updateFn = updateFn;
    this.renderFn = renderFn;
  }

  /** Start the loop. Safe to call once; subsequent calls are ignored. */
  start(): void {
    if (this.rafId !== null) return;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.rafId = requestAnimationFrame(this.tick);
  }

  /** Stop the loop and cancel the pending animation frame. */
  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private tick = (now: number): void => {
    this.rafId = requestAnimationFrame(this.tick);

    let frameTime = (now - this.lastTime) / 1000;
    this.lastTime = now;
    if (frameTime > MAX_FRAME) frameTime = MAX_FRAME;

    // FPS smoothing (exponential-ish over ~0.5s windows)
    this.fpsAccum += frameTime;
    this.fpsFrames++;
    if (this.fpsAccum >= 0.5) {
      this.fps = this.fpsFrames / this.fpsAccum;
      this.fpsAccum = 0;
      this.fpsFrames = 0;
    }

    this.accumulator += frameTime;
    while (this.accumulator >= FIXED_DT) {
      this.updateFn(FIXED_DT);
      this.time += FIXED_DT;
      this.accumulator -= FIXED_DT;
    }

    this.renderFn();
  };
}
