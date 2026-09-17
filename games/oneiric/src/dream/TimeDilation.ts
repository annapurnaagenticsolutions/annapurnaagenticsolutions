// ONEIRIC — Time dilation
// Applies subjective time scaling based on dream depth.
// Deeper layers slow subjective time (player feels slower), but stability
// drains at REAL time — which is why deeper layers are riskier.

import type { DreamLayer } from '../types';
import { BALANCE } from '../data/balance';

export class TimeDilation {
  /**
   * Compute the effective (subjective) delta-time for a layer.
   * - If layer is null (hub/limbo), return realDt unchanged.
   * - Otherwise return realDt * layer.timeScale.
   * Deeper layers have smaller timeScale, so subjective time slows.
   */
  static computeEffectiveDt(realDt: number, layer: DreamLayer | null): number {
    if (layer === null) {
      return realDt;
    }
    return realDt * layer.timeScale;
  }

  /**
   * The wake timer always ticks at real time, regardless of which layer
   * the player is in. This is the hard 3-minute run cap.
   */
  static computeWakeTick(realDt: number): number {
    return realDt;
  }

  /**
   * Compute stability drain for a layer over a real-time interval.
   * drain = instabilityRate + projectionCount * stabilityDrainPerProjection
   * Returns drain * dt (using REAL dt, not effective dt).
   *
   * Because deeper layers have higher instabilityRate AND the drain uses
   * real time (not the slowed subjective time), deeper layers are far
   * riskier despite feeling slower to the player.
   */
  static computeStabilityDrain(
    layer: DreamLayer,
    projectionCount: number,
    dt: number
  ): number {
    const drain =
      layer.instabilityRate +
      projectionCount * BALANCE.stabilityDrainPerProjection;
    return drain * dt;
  }
}
