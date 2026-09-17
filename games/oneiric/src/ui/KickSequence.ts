// ONEIRIC — The synchronized kick mini-game.
// A sweeping marker must be stopped inside a shrinking zone, repeated per
// layer in the stack. Canvas-rendered. No DOM.

import type { KickState } from '../types';
import { BALANCE } from '../data/balance';
import { getThemeForDepth } from '../data/layers';

export class KickSequence {
  /**
   * Initialize kick state for a chain of `totalKicks` kicks.
   * The first kick zone is centered around 0.5 with width = totemKickZone.
   */
  static create(totalKicks: number, totemKickZone: number): KickState {
    const zoneWidth = totemKickZone;
    return {
      active: true,
      currentKick: 0,
      totalKicks,
      markerPos: 0,
      markerDir: 1,
      markerSpeed: BALANCE.kickBaseMarkerSpeed,
      zoneStart: 0.5 - zoneWidth / 2,
      zoneEnd: 0.5 + zoneWidth / 2,
      attempts: 0,
      successes: 0,
      flashTimer: 0,
      flashType: null,
    };
  }

  /**
   * Advance the sweeping marker. Bounces at 0 and 1. Marker speed scales
   * with the current layer depth (deeper = faster). Decrement flash timer.
   */
  static update(kick: KickState, dt: number, currentLayerDepth: number): void {
    kick.markerSpeed =
      BALANCE.kickBaseMarkerSpeed +
      currentLayerDepth * BALANCE.kickSpeedPerLayer;

    kick.markerPos += kick.markerDir * kick.markerSpeed * dt;
    if (kick.markerPos <= 0) {
      kick.markerPos = 0;
      kick.markerDir = 1;
    } else if (kick.markerPos >= 1) {
      kick.markerPos = 1;
      kick.markerDir = -1;
    }

    if (kick.flashTimer > 0) {
      kick.flashTimer -= dt;
      if (kick.flashTimer <= 0) {
        kick.flashTimer = 0;
        kick.flashType = null;
      }
    }
  }

  /**
   * Attempt a kick. If the marker is inside the zone, advance to the next
   * kick with a shrunk zone. Otherwise register a miss with a red flash.
   */
  static attemptKick(kick: KickState): {
    success: boolean;
    advanced: boolean;
    completed: boolean;
  } {
    const inZone =
      kick.markerPos >= kick.zoneStart && kick.markerPos <= kick.zoneEnd;

    if (!inZone) {
      kick.attempts += 1;
      kick.flashType = 'miss';
      kick.flashTimer = 0.3;
      return { success: false, advanced: false, completed: false };
    }

    // Success
    kick.successes += 1;
    kick.attempts += 1;
    kick.currentKick += 1;
    kick.flashType = 'hit';
    kick.flashTimer = 0.3;

    const completed = kick.currentKick >= kick.totalKicks;

    if (!completed) {
      // Shrink the zone for the next kick and re-center around 0.5.
      const curWidth = kick.zoneEnd - kick.zoneStart;
      const newWidth = curWidth * (1 - BALANCE.kickZoneShrinkPerKick);
      kick.zoneStart = 0.5 - newWidth / 2;
      kick.zoneEnd = 0.5 + newWidth / 2;
    }

    return { success: true, advanced: true, completed };
  }

  /**
   * Render the kick mini-game: a centered horizontal bar with the zone
   * highlighted, a sweeping marker, labels, flash overlay, and remaining
   * kick dots.
   */
  static render(
    ctx: CanvasRenderingContext2D,
    kick: KickState,
    canvasW: number,
    canvasH: number,
    currentKickLabel: string,
  ): void {
    // Use a generic accent (layer-1 theme) for the bar border; the label
    // below carries the actual layer name passed in by the caller.
    const theme = getThemeForDepth(1);
    const accent = theme.palette.accent;

    const barW = canvasW * 0.6;
    const barH = 24;
    const barX = (canvasW - barW) / 2;
    const barY = canvasH / 2 - barH / 2;

    // Label above
    ctx.save();
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = accent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(
      `KICK ${kick.currentKick + 1} / ${kick.totalKicks} \u2014 Press K`,
      canvasW / 2,
      barY - 16,
    );
    ctx.restore();

    // Bar background
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    // Kick zone (highlighted segment)
    const zx = barX + kick.zoneStart * barW;
    const zw = (kick.zoneEnd - kick.zoneStart) * barW;
    ctx.fillStyle = 'rgba(76, 175, 80, 0.45)';
    ctx.fillRect(zx, barY, zw, barH);
    ctx.strokeStyle = '#4caf50';
    ctx.lineWidth = 2;
    ctx.strokeRect(zx, barY, zw, barH);

    // Marker (vertical line)
    const mx = barX + kick.markerPos * barW;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(mx, barY - 4);
    ctx.lineTo(mx, barY + barH + 4);
    ctx.stroke();
    ctx.restore();

    // Label below (current layer name being kicked from)
    ctx.save();
    ctx.font = '13px monospace';
    ctx.fillStyle = accent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(currentKickLabel, canvasW / 2, barY + barH + 12);
    ctx.restore();

    // Remaining kicks as dots
    ctx.save();
    const dotR = 5;
    const dotGap = 16;
    const dotsW = kick.totalKicks * dotGap;
    const dotsX = (canvasW - dotsW) / 2 + dotGap / 2;
    const dotsY = barY + barH + 40;
    for (let i = 0; i < kick.totalKicks; i++) {
      ctx.beginPath();
      ctx.arc(dotsX + i * dotGap, dotsY, dotR, 0, Math.PI * 2);
      if (i < kick.successes) {
        ctx.fillStyle = '#4caf50';
        ctx.fill();
      } else if (i === kick.currentKick) {
        ctx.fillStyle = accent;
        ctx.fill();
      } else {
        ctx.strokeStyle = 'rgba(212, 165, 116, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    ctx.restore();

    // Flash overlay (green on hit, red on miss)
    if (kick.flashTimer > 0 && kick.flashType) {
      const alpha = (kick.flashTimer / 0.3) * 0.35;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = kick.flashType === 'hit' ? '#4caf50' : '#e04848';
      ctx.fillRect(barX - 8, barY - 8, barW + 16, barH + 16);
      ctx.restore();
    }
  }

  /**
   * Current zone width (zoneEnd - zoneStart).
   */
  static getZoneWidth(kick: KickState): number {
    return kick.zoneEnd - kick.zoneStart;
  }
}
