// ONEIRIC — Renderer
// Reusable Canvas 2D drawing helpers. The game's main render logic lives
// in main.ts; this module provides primitive draw functions that respect
// an externally-applied camera translation (via withCamera) and alpha
// composition for dream fog / particle effects.

import type { Particle } from '../types';
import type { Camera } from '../types';

export class Renderer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  /** Fill the entire canvas with a solid color. */
  clear(color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
  }

  /** Filled rectangle. */
  rect(x: number, y: number, w: number, h: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, w, h);
  }

  /** Filled circle with optional alpha. */
  circle(x: number, y: number, r: number, color: string, alpha?: number): void {
    const prev = this.ctx.globalAlpha;
    if (alpha !== undefined) this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, r, 0, Math.PI * 2);
    this.ctx.fill();
    if (alpha !== undefined) this.ctx.globalAlpha = prev;
  }

  /** Stroked line. */
  line(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    width: number,
  ): void {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
  }

  /** Radial gradient fill centered at (x, y) with the given radius. */
  gradient(
    x: number,
    y: number,
    r: number,
    innerColor: string,
    outerColor: string,
  ): void {
    const g = this.ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, innerColor);
    g.addColorStop(1, outerColor);
    this.ctx.fillStyle = g;
    this.ctx.beginPath();
    this.ctx.arc(x, y, r, 0, Math.PI * 2);
    this.ctx.fill();
  }

  /** Fill text. `align` defaults to 'left'. */
  text(
    x: number,
    y: number,
    text: string,
    color: string,
    font: string,
    align: CanvasTextAlign = 'left',
  ): void {
    this.ctx.fillStyle = color;
    this.ctx.font = font;
    this.ctx.textAlign = align;
    this.ctx.textBaseline = 'alphabetic';
    this.ctx.fillText(text, x, y);
  }

  /** Save/restore wrapper: runs fn with a clean context state. */
  pushPop(fn: () => void): void {
    this.ctx.save();
    try {
      fn();
    } finally {
      this.ctx.restore();
    }
  }

  /** Draw a Particle using its type-appropriate shape and fading alpha. */
  particle(p: Particle): void {
    const alpha = p.maxLife > 0 ? Math.max(0, Math.min(1, p.life / p.maxLife)) : 0;
    const prev = this.ctx.globalAlpha;
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = p.color;

    switch (p.type) {
      case 'rain':
        // Elongated streak for rain.
        this.ctx.fillRect(p.x - p.size * 0.5, p.y - p.size * 2, p.size, p.size * 4);
        break;
      case 'spark':
      case 'fragment':
        // Small glowing dot.
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
        break;
      case 'ash':
      case 'drift':
      default:
        // Soft square for drifting ash/fog motes.
        this.ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        break;
    }

    this.ctx.globalAlpha = prev;
  }

  /** Semi-transparent full-canvas overlay for dream fog. */
  fogOverlay(color: string, alpha: number): void {
    const prev = this.ctx.globalAlpha;
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.ctx.globalAlpha = prev;
  }

  /**
   * Apply the camera transform (translate by -offset + shake), run fn,
   * then restore. World-space draw calls inside fn will be offset
   * correctly; screen-space UI should be drawn outside this wrapper.
   */
  withCamera(camera: Camera, fn: () => void): void {
    const offset = camera.getOffset();
    this.ctx.save();
    this.ctx.translate(-offset.x, -offset.y);
    try {
      fn();
    } finally {
      this.ctx.restore();
    }
  }
}
