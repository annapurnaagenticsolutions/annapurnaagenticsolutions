/**
 * Varsha Hollow — Visual Particle System
 * =======================================
 *
 * A lightweight canvas-based particle overlay. All visuals are drawn
 * with the 2D canvas API — no images, no WebGL, no Three.js. The
 * overlay is a single fixed full-screen canvas with `pointer-events:
 * none` so it never blocks interaction.
 *
 * Layers:
 *  A. Rain particles — intensity matches the audio weather state
 *  B. Slime shimmer  — brief burst at a slime card location
 *  C. Choice motes   — subtle drifting motes on choice hover
 *  D. Ending flourish — gentle full-screen cascade
 *
 * Pauses when the tab is not visible. Modest particle counts only.
 */

import type { WeatherState } from "./audio";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type ParticleSystem = {
  /** Set the rain intensity to match the audio weather state. */
  setWeather(state: WeatherState): void;
  /** Burst of glowing particles at a screen position (slime unlock). */
  burstSlimeShimmer(x: number, y: number, color: string): void;
  /** Emit a few drifting motes from a screen position (choice hover). */
  emitChoiceMotes(x: number, y: number, color: string): void;
  /** Full-screen particle cascade (ending reached). */
  endingFlourish(color: string): void;
  /** Tear down the canvas and animation loop. */
  destroy(): void;
};

/* ------------------------------------------------------------------ */
/* Particle structs                                                    */
/* ------------------------------------------------------------------ */

type RainDrop = {
  x: number;
  y: number;
  length: number;
  speed: number;
  opacity: number;
  drift: number;
};

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
};

type Mote = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
};

/* ------------------------------------------------------------------ */
/* Weather → rain density                                              */
/* ------------------------------------------------------------------ */

const RAIN_DENSITY: Record<WeatherState, { count: number; speed: number; length: number; opacity: number; angle: number }> = {
  light: { count: 70, speed: 6, length: 14, opacity: 0.18, angle: 0.18 },
  heavy: { count: 160, speed: 9, length: 20, opacity: 0.28, angle: 0.22 },
  storm: { count: 240, speed: 13, length: 26, opacity: 0.34, angle: 0.38 },
  clear: { count: 12, speed: 4, length: 10, opacity: 0.08, angle: 0.12 },
};

/* Palette — translucent teal/silver to match the game's visual language. */
const RAIN_COLOR = "168, 216, 216"; // #a8d8d8 in rgb

/* ------------------------------------------------------------------ */
/* Factory                                                             */
/* ------------------------------------------------------------------ */

export function createParticleSystem(canvas: HTMLCanvasElement): ParticleSystem {
  const maybeCtx = canvas.getContext("2d");
  if (!maybeCtx) {
    return {
      setWeather() {},
      burstSlimeShimmer() {},
      emitChoiceMotes() {},
      endingFlourish() {},
      destroy() {},
    };
  }
  const ctx: CanvasRenderingContext2D = maybeCtx;

  let weather: WeatherState = "light";
  let rainDrops: RainDrop[] = [];
  let sparks: Spark[] = [];
  let motes: Mote[] = [];
  let rafId: number | null = null;
  let running = true;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  /* ---------------------------------------------------------------- */
  /* Sizing                                                           */
  /* ---------------------------------------------------------------- */

  function resize(): void {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    rebuildRain();
  }

  function rebuildRain(): void {
    const cfg = RAIN_DENSITY[weather];
    const w = window.innerWidth;
    const h = window.innerHeight;
    rainDrops = [];
    for (let i = 0; i < cfg.count; i += 1) {
      rainDrops.push({
        x: Math.random() * w,
        y: Math.random() * h,
        length: cfg.length * (0.7 + Math.random() * 0.6),
        speed: cfg.speed * (0.8 + Math.random() * 0.4),
        opacity: cfg.opacity * (0.6 + Math.random() * 0.4),
        drift: cfg.angle,
      });
    }
  }

  /* ---------------------------------------------------------------- */
  /* Visibility — pause when tab hidden                               */
  /* ---------------------------------------------------------------- */

  function onVisibility(): void {
    if (document.hidden) {
      running = false;
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
    } else if (!running) {
      running = true;
      loop();
    }
  }

  /* ---------------------------------------------------------------- */
  /* Main loop                                                        */
  /* ---------------------------------------------------------------- */

  function loop(): void {
    if (!running) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);

    /* ---- Rain ---- */
    const cfg = RAIN_DENSITY[weather];
    ctx.lineCap = "round";
    for (const drop of rainDrops) {
      ctx.strokeStyle = `rgba(${RAIN_COLOR}, ${drop.opacity})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x - drop.drift * drop.length, drop.y + drop.length);
      ctx.stroke();

      drop.y += drop.speed;
      drop.x -= drop.drift * drop.speed;
      if (drop.y > h) {
        drop.y = -drop.length;
        drop.x = Math.random() * w;
      }
      if (drop.x < -20) drop.x = w + 20;
    }

    /* ---- Sparks (slime shimmer / ending) ---- */
    if (sparks.length > 0) {
      ctx.globalCompositeOperation = "lighter";
      for (let i = sparks.length - 1; i >= 0; i -= 1) {
        const s = sparks[i];
        const t = s.life / s.maxLife;
        const alpha = t * 0.8;
        const size = s.size * (0.5 + t * 0.5);
        ctx.fillStyle = withAlpha(s.color, alpha);
        ctx.beginPath();
        ctx.arc(s.x, s.y, size, 0, Math.PI * 2);
        ctx.fill();

        s.x += s.vx;
        s.y += s.vy;
        s.vy += s.gravity;
        s.vx *= 0.98;
        s.life -= 1;
        if (s.life <= 0) sparks.splice(i, 1);
      }
      ctx.globalCompositeOperation = "source-over";
    }

    /* ---- Motes (choice hover) ---- */
    if (motes.length > 0) {
      ctx.globalCompositeOperation = "lighter";
      for (let i = motes.length - 1; i >= 0; i -= 1) {
        const m = motes[i];
        const t = m.life / m.maxLife;
        const alpha = t * 0.5;
        ctx.fillStyle = withAlpha(m.color, alpha);
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
        ctx.fill();

        m.x += m.vx;
        m.y += m.vy;
        m.vy *= 0.97;
        m.vx *= 0.97;
        m.life -= 1;
        if (m.life <= 0) motes.splice(i, 1);
      }
      ctx.globalCompositeOperation = "source-over";
    }

    rafId = requestAnimationFrame(loop);
  }

  /* ---------------------------------------------------------------- */
  /* Helpers                                                          */
  /* ---------------------------------------------------------------- */

  /** Convert a hex color (#rrggbb) to an rgba() string with alpha. */
  function withAlpha(hex: string, alpha: number): string {
    const clean = hex.replace("#", "");
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /* ---------------------------------------------------------------- */
  /* Init                                                             */
  /* ------------------------------------------------------------------ */

  resize();
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", onVisibility);
  loop();

  /* ---------------------------------------------------------------- */
  /* Public API                                                       */
  /* ------------------------------------------------------------------ */

  return {
    setWeather(state: WeatherState) {
      if (state === weather) return;
      weather = state;
      rebuildRain();
    },

    burstSlimeShimmer(x: number, y: number, color: string) {
      const count = 24;
      for (let i = 0; i < count; i += 1) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
        const speed = 1.2 + Math.random() * 2.4;
        const maxLife = 50 + Math.floor(Math.random() * 30);
        sparks.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.2,
          life: maxLife,
          maxLife,
          size: 1.5 + Math.random() * 2,
          color,
          gravity: 0.04,
        });
      }
    },

    emitChoiceMotes(x: number, y: number, color: string) {
      const count = 4;
      for (let i = 0; i < count; i += 1) {
        const maxLife = 40 + Math.floor(Math.random() * 20);
        motes.push({
          x: x + (Math.random() - 0.5) * 30,
          y: y + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 0.4,
          vy: -0.3 - Math.random() * 0.4,
          life: maxLife,
          maxLife,
          size: 1 + Math.random() * 1.5,
          color,
        });
      }
    },

    endingFlourish(color: string) {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const count = 80;
      for (let i = 0; i < count; i += 1) {
        const maxLife = 120 + Math.floor(Math.random() * 60);
        sparks.push({
          x: Math.random() * w,
          y: -20 - Math.random() * 80,
          vx: (Math.random() - 0.5) * 0.8,
          vy: 0.6 + Math.random() * 1.4,
          life: maxLife,
          maxLife,
          size: 1.5 + Math.random() * 2.5,
          color,
          gravity: 0.008,
        });
      }
      /* Auto-dispose after 3 seconds — remove lingering sparks. */
      window.setTimeout(() => {
        sparks = sparks.filter((s) => s.life > 0);
      }, 3000);
    },

    destroy() {
      running = false;
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      rainDrops = [];
      sparks = [];
      motes = [];
    },
  };
}

/* ------------------------------------------------------------------ */
/* Convenience: tone → color                                           */
/* ------------------------------------------------------------------ */

/** Map a choice tone to its accent color (matches CSS `--choice-accent`). */
export function toneToColor(tone: "empathy" | "wisdom" | "practicality"): string {
  if (tone === "empathy") return "#e4a39c";
  if (tone === "wisdom") return "#9bd1d0";
  return "#d6ae72";
}
