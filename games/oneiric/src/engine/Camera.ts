// ONEIRIC — Camera
// Follows a target with lerp smoothing, clamps to room bounds, and
// supports decaying screen shake. Implements the Camera interface from
// types.ts so it can be passed directly into RenderContext.

import type { Camera as CameraInterface } from '../types';

export class Camera implements CameraInterface {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  width: number;
  height: number;
  shake: number;

  /** Current shake offset applied this frame (set during update). */
  private shakeOffsetX: number = 0;
  private shakeOffsetY: number = 0;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.shake = 0;
  }

  /** Set the follow target and lerp the current position toward it. */
  follow(targetX: number, targetY: number, lerp: number): void {
    this.targetX = targetX - this.width / 2;
    this.targetY = targetY - this.height / 2;
    this.x += (this.targetX - this.x) * lerp;
    this.y += (this.targetY - this.y) * lerp;
  }

  /**
   * Keep the camera view inside room bounds. If the room is smaller than
   * the viewport, center the camera on the room instead of clamping.
   */
  clampToRoom(roomX: number, roomY: number, roomW: number, roomH: number): void {
    if (roomW <= this.width) {
      this.x = roomX + (roomW - this.width) / 2;
    } else {
      if (this.x < roomX) this.x = roomX;
      if (this.x > roomX + roomW - this.width) this.x = roomX + roomW - this.width;
    }

    if (roomH <= this.height) {
      this.y = roomY + (roomH - this.height) / 2;
    } else {
      if (this.y < roomY) this.y = roomY;
      if (this.y > roomY + roomH - this.height) this.y = roomY + roomH - this.height;
    }
  }

  /** Add to the current shake magnitude. */
  addShake(amount: number): void {
    this.shake += amount;
  }

  /**
   * Decay shake over time and recompute the per-frame offset.
   * `decay` is the per-second decay factor (e.g. 0.85 means ~85% retained
   * each second); a frame-rate independent form is used.
   */
  update(dt: number, decay: number): void {
    if (this.shake > 0) {
      this.shake *= Math.pow(decay, dt * 60);
      if (this.shake < 0.05) this.shake = 0;
    }
    if (this.shake > 0) {
      this.shakeOffsetX = (Math.random() * 2 - 1) * this.shake;
      this.shakeOffsetY = (Math.random() * 2 - 1) * this.shake;
    } else {
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
    }
  }

  /** Returns the translation to apply to the rendering context. */
  getOffset(): { x: number; y: number } {
    return {
      x: Math.round(this.x + this.shakeOffsetX),
      y: Math.round(this.y + this.shakeOffsetY),
    };
  }
}
