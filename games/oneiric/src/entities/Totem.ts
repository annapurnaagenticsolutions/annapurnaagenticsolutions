// ONEIRIC — Totem entity
// Real angular-velocity spin physics + reality check. In a dream the totem
// spins forever; in reality it spins for spinDuration seconds then decelerates
// via friction (multiplicative velocity decay) until it stops.
//
// The totem state is a plain object (not the TotemConfig itself) so it can be
// stored on GameState or a UI component without mutating config data.

import type { TotemConfig } from '../types';
import { BALANCE } from '../data/balance';

export interface TotemState {
  config: TotemConfig;
  rotation: number;       // current angle in radians
  spinVelocity: number;   // angular velocity (rad/s)
  isSpinning: boolean;    // true while still rotating
  spinTime: number;       // seconds spent in the current spin
  wobble: number;         // precession wobble amplitude
}

export class TotemEntity {
  /**
   * Create fresh totem state from a config. The totem starts at rest.
   */
  static create(config: TotemConfig): TotemState {
    return {
      config,
      rotation: 0,
      spinVelocity: 0,
      isSpinning: false,
      spinTime: 0,
      wobble: 0,
    };
  }

  /**
   * Advance the totem's spin physics.
   *
   * DREAM (isDreaming = true):
   *   The totem spins forever with pristine gyroscopic stability and zero wobble.
   *
   * REALITY (isDreaming = false):
   *   Phase 1 — active spin: base rotation for config.spinDuration.
   *   Phase 2 — friction decay & wobble: as velocity bleeds, wobble increases,
   *   causing the totem to precess and clatter to a halt.
   */
  static update(
    totemState: TotemState,
    isDreaming: boolean,
    dt: number,
    spinSpeedUpgrade: number,
  ): void {
    const config = totemState.config;
    const baseSpinRate =
      8 + spinSpeedUpgrade * BALANCE.upgradeEffects.totemSpinSpeedPerLevel;

    if (isDreaming) {
      // Dream: perpetual spin, perfectly vertical, zero wobble.
      totemState.spinVelocity = baseSpinRate;
      totemState.rotation += totemState.spinVelocity * dt;
      totemState.spinTime += dt;
      totemState.wobble = 0;
      totemState.isSpinning = true;
      return;
    }

    // Reality.
    if (!totemState.isSpinning && totemState.spinVelocity < 0.1) {
      totemState.spinVelocity = 0;
      return;
    }

    totemState.spinTime += dt;

    if (totemState.spinTime <= config.spinDuration) {
      // Phase 1: driven spin at base rate.
      totemState.spinVelocity = baseSpinRate;
      totemState.rotation += totemState.spinVelocity * dt;
      totemState.wobble = Math.sin(totemState.spinTime * 8) * 0.05; // tiny micro-wobble
      totemState.isSpinning = true;
    } else {
      // Phase 2: friction decay + rising wobble.
      totemState.spinVelocity *= 0.92;
      totemState.rotation += totemState.spinVelocity * dt;
      const decayRatio = Math.max(0, 1 - totemState.spinVelocity / baseSpinRate);
      totemState.wobble = Math.sin(totemState.spinTime * 14) * (decayRatio * 0.45);
      if (totemState.spinVelocity < 0.1) {
        totemState.spinVelocity = 0;
        totemState.isSpinning = false;
        totemState.wobble = 0.5; // settled on its side
      }
    }
  }

  /**
   * Determine whether the totem's behavior indicates a dream or reality.
   *
   *   - If the totem is STILL spinning after `spinDuration + 0.5` seconds
   *     have elapsed → it's a dream (confidence 1.0).
   *   - If the totem has fully stopped → it's reality (confidence 1.0).
   *   - If we're still within the spinDuration window → inconclusive
   *     (confidence 0); the player can't yet tell.
   */
  static checkReality(totemState: TotemState): {
    isDream: boolean;
    confidence: number;
  } {
    const config = totemState.config;
    const decisionThreshold = config.spinDuration + 0.5;

    if (totemState.spinTime < decisionThreshold) {
      // Not enough time has passed to judge.
      return { isDream: false, confidence: 0 };
    }

    // Past the decision threshold: a real totem should have stopped by now.
    if (totemState.isSpinning || totemState.spinVelocity > 0.1) {
      return { isDream: true, confidence: 1.0 };
    }
    return { isDream: false, confidence: 1.0 };
  }

  /**
   * Effective kick-zone width given the totem's base width plus the
   * kick-zone-bonus upgrade level.
   */
  static getKickZoneWidth(config: TotemConfig, upgradeLevel: number): number {
    return (
      config.kickZoneWidth +
      upgradeLevel * BALANCE.upgradeEffects.kickZoneBonusPerLevel
    );
  }

  /**
   * Render the totem at a HUD position. The visual differs per totem type:
   *
   *   top  — a small cone that rotates around its tip.
   *   coin — a flat ellipse that flips (scaleX driven by rotation).
   *   ring — a circle that rotates with a highlight mark.
   *
   * All variants use config.color for the fill.
   */
  static render(
    totemState: TotemState,
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
  ): void {
    const config = totemState.config;
    const rot = totemState.rotation;

    ctx.save();
    ctx.translate(x, y);
    if (totemState.wobble) {
      ctx.rotate(totemState.wobble);
    }

    switch (config.type) {
      case 'top': {
        // A small spinning top: cone body that rotates.
        ctx.rotate(rot);
        ctx.fillStyle = config.color;
        ctx.beginPath();
        // Cone: tip at origin, base up.
        ctx.moveTo(0, size * 0.5);
        ctx.lineTo(-size * 0.4, -size * 0.4);
        ctx.lineTo(size * 0.4, -size * 0.4);
        ctx.closePath();
        ctx.fill();
        // Stem
        ctx.strokeStyle = config.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.4);
        ctx.lineTo(0, -size * 0.7);
        ctx.stroke();
        break;
      }

      case 'coin': {
        // A flipping coin: ellipse whose scaleX oscillates with rotation.
        const sx = Math.cos(rot);
        ctx.scale(Math.abs(sx) < 0.05 ? 0.05 : sx, 1);
        ctx.fillStyle = config.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.5, size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Edge highlight when nearly side-on.
        if (Math.abs(sx) < 0.3) {
          ctx.strokeStyle = config.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, -size * 0.5);
          ctx.lineTo(0, size * 0.5);
          ctx.stroke();
        }
        break;
      }

      case 'ring': {
        // A rotating ring with a highlight dot on its perimeter.
        ctx.rotate(rot);
        ctx.strokeStyle = config.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.45, 0, Math.PI * 2);
        ctx.stroke();
        // Highlight mark
        ctx.fillStyle = config.color;
        ctx.beginPath();
        ctx.arc(size * 0.45, 0, size * 0.12, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }

    ctx.restore();
  }
}
