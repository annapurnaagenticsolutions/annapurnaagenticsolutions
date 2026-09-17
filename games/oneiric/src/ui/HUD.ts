// ONEIRIC — In-game heads-up display (Glassmorphic Canvas UI)
// Inspired by Island Ops, Robotic Jellyfish Simulator, and Porto Celeste telemetry interfaces.

import type { GameState } from '../types';
import type { TotemState } from '../entities/Totem';
import { TotemEntity } from '../entities/Totem';
import { getThemeForDepth } from '../data/layers';
import { DreamStack } from '../dream/DreamStack';
import { BALANCE } from '../data/balance';

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Helper to draw a modern glassmorphic card with rounded corners and subtle highlight borders. */
function drawGlassCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r = 8,
  accent = '#e8c89a',
  glow = false,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();

  // Glass gradient fill
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, 'rgba(22, 16, 12, 0.88)');
  grad.addColorStop(1, 'rgba(12, 9, 6, 0.92)');
  ctx.fillStyle = grad;
  ctx.fill();

  // Subtle glowing border
  ctx.strokeStyle = glow ? accent : `rgba(${hexToRgb(accent)}, 0.45)`;
  ctx.lineWidth = glow ? 1.5 : 1;
  ctx.stroke();

  // Corner highlights (techno-aesthetic)
  const len = Math.min(8, r);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;
  // Top-left
  ctx.beginPath(); ctx.moveTo(x, y + len); ctx.lineTo(x, y); ctx.lineTo(x + len, y); ctx.stroke();
  // Bottom-right
  ctx.beginPath(); ctx.moveTo(x + w, y + h - len); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - len, y + h); ctx.stroke();

  ctx.restore();
}

export class HUD {
  /**
   * Modern glassmorphic in-dream HUD:
   * 1. Top-Left: Mind Telemetry (Arc stability gauge, status badge, fragments)
   * 2. Top-Center: Neural Realm & Wake Synchronization Bar
   * 3. Top-Right: Gyroscopic Totem Chamber
   * 4. Bottom-Left: Tactical Infiltration Abilities (Surge cooldown, Echo Lures)
   * 5. Bottom-Right: Tactical Dreamer Radar (Minimap with threat blips & beacons)
   */
  static render(
    ctx: CanvasRenderingContext2D,
    state: GameState,
    totemState: TotemState,
    canvasW: number,
    canvasH: number,
    time: number,
  ): void {
    const reduced = prefersReducedMotion();
    const layer = DreamStack.getCurrentLayer(state.layerStack, state.currentLayer)
      ?? (state.layerStack.length > 0 ? state.layerStack[state.layerStack.length - 1] : null);
    const theme = layer ? layer.theme : getThemeForDepth(state.currentLayer);
    const accent = theme.palette.accent;
    const fg = theme.palette.fg;

    // =========================================================================
    // 1. TOP-LEFT: MIND TELEMETRY CARD
    // =========================================================================
    const cardX = 24;
    const cardY = 24;
    const cardW = 220;
    const cardH = 92;
    drawGlassCard(ctx, cardX, cardY, cardW, cardH, 10, accent);

    const stab = Math.max(0, Math.min(100, state.stability));
    let stabColor = '#4caf50';
    let statusText = 'STABLE';
    if (stab < 30) {
      stabColor = '#e04848';
      statusText = 'CRITICAL';
    } else if (stab <= 60) {
      stabColor = '#e0a030';
      statusText = 'DEGRADING';
    }

    // Circular Arc Stability Gauge
    const gaugeCenterX = cardX + 42;
    const gaugeCenterY = cardY + 46;
    const gaugeRadius = 26;

    ctx.save();
    // Background Arc
    ctx.beginPath();
    ctx.arc(gaugeCenterX, gaugeCenterY, gaugeRadius, -Math.PI * 1.25, Math.PI * 0.25);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Value Arc
    const arcEnd = -Math.PI * 1.25 + (stab / 100) * (Math.PI * 1.5);
    ctx.beginPath();
    ctx.arc(gaugeCenterX, gaugeCenterY, gaugeRadius, -Math.PI * 1.25, arcEnd);
    ctx.strokeStyle = stabColor;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Percentage in center
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(stab)}%`, gaugeCenterX, gaugeCenterY);
    ctx.restore();

    // Telemetry text readouts
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '10px monospace';
    ctx.fillStyle = `rgba(${hexToRgb(accent)}, 0.7)`;
    ctx.fillText('MIND STABILITY', cardX + 78, cardY + 28);

    // Status pill
    ctx.fillStyle = stabColor;
    ctx.font = 'bold 11px monospace';
    ctx.fillText(statusText, cardX + 78, cardY + 46);

    // Fragment balance
    ctx.font = '12px monospace';
    ctx.fillStyle = accent;
    ctx.fillText(`\u25C6 ${state.fragments} FRAGMENTS`, cardX + 78, cardY + 66);
    ctx.restore();

    // =========================================================================
    // 2. TOP-CENTER: NEURAL REALM & WAKE SYNCHRONIZATION BAR
    // =========================================================================
    const headerW = Math.min(440, canvasW - 540);
    const headerH = 54;
    const headerX = (canvasW - headerW) / 2;
    const headerY = 24;
    drawGlassCard(ctx, headerX, headerY, headerW, headerH, 10, accent);

    const layerLabel = layer
      ? `LAYER ${layer.depth} \u2014 ${theme.name.toUpperCase()}`
      : `LAYER ${state.currentLayer}`;

    ctx.save();
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(layerLabel, headerX + headerW / 2, headerY + 18);

    // Wake timer countdown
    const wakeSec = Math.max(0, Math.ceil(state.wakeTimer));
    const mm = Math.floor(wakeSec / 60);
    const ss = wakeSec % 60;
    const wakeStr = `SYNCHRONIZED WAKE IN ${mm}:${ss.toString().padStart(2, '0')}`;
    ctx.font = '11px monospace';
    ctx.fillStyle = wakeSec < 30 ? '#ff6b6b' : fg;
    ctx.fillText(wakeStr, headerX + headerW / 2, headerY + 36);

    // Disturbance pulse dot next to title
    const dotX = headerX + headerW - 24;
    const dotY = headerY + 27;
    const dotAlpha = reduced ? 0.8 : 0.4 + 0.6 * Math.sin(time * (3 + state.disturbance));
    ctx.globalAlpha = dotAlpha;
    ctx.fillStyle = state.disturbance > 3 ? '#ff4d4d' : accent;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 4 + Math.min(6, state.disturbance), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // =========================================================================
    // 3. TOP-RIGHT: GYROSCOPIC TOTEM CHAMBER
    // =========================================================================
    const totemCardW = 140;
    const totemCardH = 92;
    const totemCardX = canvasW - totemCardW - 24;
    const totemCardY = 24;
    drawGlassCard(ctx, totemCardX, totemCardY, totemCardW, totemCardH, 10, accent);

    // Render totem icon inside card
    const totemIconX = totemCardX + 38;
    const totemIconY = totemCardY + 46;
    TotemEntity.render(totemState, ctx, totemIconX, totemIconY, 36);

    // Totem telemetry labels
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '10px monospace';
    ctx.fillStyle = `rgba(${hexToRgb(accent)}, 0.7)`;
    ctx.fillText('TOTEM', totemCardX + 68, totemCardY + 28);

    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = accent;
    ctx.fillText('[T] SPIN', totemCardX + 68, totemCardY + 46);

    ctx.font = '9px monospace';
    ctx.fillStyle = totemState.isSpinning ? '#4caf50' : 'rgba(255,255,255,0.4)';
    ctx.fillText(totemState.isSpinning ? 'ACTIVE' : 'IDLE', totemCardX + 68, totemCardY + 64);
    ctx.restore();

    // =========================================================================
    // 4. BOTTOM-LEFT: TACTICAL ABILITY TRAY
    // =========================================================================
    const abilityW = 250;
    const abilityH = 78;
    const abilityX = 24;
    const abilityY = canvasH - abilityH - 24;
    drawGlassCard(ctx, abilityX, abilityY, abilityW, abilityH, 10, accent);

    // Lucid Surge Ability
    const surgeReady = state.player.surgeCooldown <= 0;
    const surgePct = surgeReady ? 1.0 : Math.max(0, 1 - state.player.surgeCooldown / BALANCE.lucidSurgeBaseCooldown);

    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = surgeReady ? '#4caf50' : '#888888';
    ctx.fillText(`[SPACE] LUCID SURGE`, abilityX + 16, abilityY + 20);

    ctx.font = '10px monospace';
    ctx.fillStyle = surgeReady ? '#ffffff' : 'rgba(255,255,255,0.5)';
    ctx.textAlign = 'right';
    ctx.fillText(surgeReady ? 'READY' : `${state.player.surgeCooldown.toFixed(1)}s`, abilityX + abilityW - 16, abilityY + 20);

    // Recharge Bar
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(abilityX + 16, abilityY + 30, abilityW - 32, 4);
    ctx.fillStyle = surgeReady ? '#4caf50' : accent;
    ctx.fillRect(abilityX + 16, abilityY + 30, (abilityW - 32) * surgePct, 4);

    // Sonic Echo Lures
    ctx.textAlign = 'left';
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = state.player.echoesLeft > 0 ? '#6ab8d8' : '#777777';
    ctx.fillText(`[F] ECHO LURES`, abilityX + 16, abilityY + 54);

    // Echo charges pips
    const maxEchoes = 3 + (state.player.echoesLeft > 3 ? state.player.echoesLeft - 3 : 0);
    for (let p = 0; p < Math.max(3, maxEchoes); p++) {
      const pipX = abilityX + abilityW - 48 + p * 14;
      const pipY = abilityY + 54;
      ctx.beginPath();
      ctx.arc(pipX, pipY, 4, 0, Math.PI * 2);
      if (p < state.player.echoesLeft) {
        ctx.fillStyle = '#6ab8d8';
        ctx.fill();
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    ctx.restore();

    // =========================================================================
    // 5. BOTTOM-RIGHT: TACTICAL DREAMER RADAR (MINIMAP)
    // =========================================================================
    const radarW = 160;
    const radarH = 160;
    const radarX = canvasW - radarW - 24;
    const radarY = canvasH - radarH - 24;
    drawGlassCard(ctx, radarX, radarY, radarW, radarH, 12, accent);

    const rCenterX = radarX + radarW / 2;
    const rCenterY = radarY + radarH / 2;
    const rRadius = radarW / 2 - 14;

    ctx.save();
    // Radar background circle
    ctx.beginPath();
    ctx.arc(rCenterX, rCenterY, rRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(10, 8, 5, 0.6)';
    ctx.fill();
    ctx.strokeStyle = `rgba(${hexToRgb(accent)}, 0.3)`;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Range rings
    ctx.beginPath();
    ctx.arc(rCenterX, rCenterY, rRadius * 0.5, 0, Math.PI * 2);
    ctx.arc(rCenterX, rCenterY, rRadius * 0.8, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.stroke();

    // Rotating sweep line
    const sweepAngle = (time * 2.5) % (Math.PI * 2);
    ctx.beginPath();
    ctx.moveTo(rCenterX, rCenterY);
    ctx.lineTo(rCenterX + Math.cos(sweepAngle) * rRadius, rCenterY + Math.sin(sweepAngle) * rRadius);
    ctx.strokeStyle = `rgba(${hexToRgb(accent)}, 0.4)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Scale factor: dream pixels -> radar radius
    const radarScale = rRadius / 400; // 400px dream radius maps to radar

    // Projections (red threat blips)
    if (layer) {
      for (const proj of layer.projections) {
        const dx = (proj.x - state.player.x) * radarScale;
        const dy = (proj.y - state.player.y) * radarScale;
        if (dx * dx + dy * dy < rRadius * rRadius) {
          ctx.beginPath();
          ctx.arc(rCenterX + dx, rCenterY + dy, 3, 0, Math.PI * 2);
          ctx.fillStyle = '#ff4d4d';
          ctx.fill();
        }
      }

      // Memory objects & Anchors
      const room = layer.rooms[layer.currentRoomIndex];
      if (room) {
        for (const obj of room.objects) {
          if (obj.collected) continue;
          const dx = (obj.x - state.player.x) * radarScale;
          const dy = (obj.y - state.player.y) * radarScale;
          if (dx * dx + dy * dy < rRadius * rRadius) {
            ctx.beginPath();
            ctx.arc(rCenterX + dx, rCenterY + dy, 3, 0, Math.PI * 2);
            if (obj.type === 'memory') {
              ctx.fillStyle = '#6ab8d8'; // cyan memory beacon
            } else if (obj.type === 'descent-anchor' || obj.type === 'seed-anchor') {
              ctx.fillStyle = '#ffe0b0'; // gold extraction portal
            } else {
              ctx.fillStyle = 'rgba(255,255,255,0.4)';
            }
            ctx.fill();
          }
        }
      }
    }

    // Player position (gold triangle in center)
    ctx.beginPath();
    ctx.arc(rCenterX, rCenterY, 4, 0, Math.PI * 2);
    ctx.fillStyle = accent;
    ctx.fill();

    // Radar title
    ctx.font = '9px monospace';
    ctx.fillStyle = `rgba(${hexToRgb(accent)}, 0.6)`;
    ctx.textAlign = 'center';
    ctx.fillText('TACTICAL RADAR', rCenterX, radarY + 14);
    ctx.restore();

    // =========================================================================
    // 6. ACTIVE MEMORY RESONANCE VIGNETTE OVERLAY
    // =========================================================================
    if (state.activeResonance && state.activeResonance.timer > 0) {
      const alpha = Math.min(1.0, state.activeResonance.timer / 0.5);
      ctx.save();
      ctx.globalAlpha = alpha;
      const resW = Math.min(680, canvasW - 120);
      const resH = 50;
      const resX = (canvasW - resW) / 2;
      const resY = 90;

      drawGlassCard(ctx, resX, resY, resW, resH, 10, accent, true);

      ctx.font = 'italic 14px Georgia, serif';
      ctx.fillStyle = '#ffe0b0';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`"${state.activeResonance.text}"`, canvasW / 2, resY + resH / 2);
      ctx.restore();
    }

    // =========================================================================
    // 7. BOTTOM-CENTER: CONTROLS GUIDE PILL
    // =========================================================================
    const ctrlW = Math.min(560, canvasW - 520);
    const ctrlH = 32;
    const ctrlX = (canvasW - ctrlW) / 2;
    const ctrlY = canvasH - ctrlH - 24;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 11, 8, 0.85)';
    ctx.beginPath();
    ctx.roundRect(ctrlX, ctrlY, ctrlW, ctrlH, 16);
    ctx.fill();
    ctx.strokeStyle = `rgba(${hexToRgb(accent)}, 0.3)`;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = '11px monospace';
    ctx.fillStyle = `rgba(${hexToRgb(accent)}, 0.85)`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      'WASD Move \u00B7 SPACE Surge \u00B7 F Echo Lure \u00B7 E Resonate/Descend \u00B7 T Totem',
      canvasW / 2,
      ctrlY + ctrlH / 2,
    );
    ctx.restore();
  }

  /**
   * Minimal limbo HUD: clean telemetry text and countdown.
   */
  static renderLimboHUD(
    ctx: CanvasRenderingContext2D,
    state: GameState,
    canvasW: number,
    canvasH: number,
    time: number,
  ): void {
    const reduced = prefersReducedMotion();
    const cx = canvasW / 2;

    ctx.save();
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const alpha = reduced ? 0.9 : 0.7 + 0.3 * Math.sin(time * 2);
    ctx.globalAlpha = alpha;
    ctx.fillText('SUB-LIMBO VOID \u2014 FIND THE MEMORY ANCHOR', cx, 36);
    ctx.globalAlpha = 1;

    // Countdown
    const sec = Math.max(0, Math.ceil(state.limboTimer));
    const mm = Math.floor(sec / 60);
    const ss = sec % 60;
    ctx.font = '16px monospace';
    ctx.fillStyle = sec < 10 ? '#ff6b6b' : '#ffffff';
    ctx.fillText(`COLLAPSE IN ${mm}:${ss.toString().padStart(2, '0')}`, cx, 68);
    ctx.restore();
  }

  /**
   * Semi-transparent pause overlay.
   */
  static renderPauseOverlay(
    ctx: CanvasRenderingContext2D,
    canvasW: number,
    canvasH: number,
  ): void {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, canvasW, canvasH);

    drawGlassCard(ctx, canvasW / 2 - 160, canvasH / 2 - 60, 320, 120, 12, '#e8c89a', true);

    ctx.fillStyle = '#e8c89a';
    ctx.font = 'bold 36px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SIMULATION PAUSED', canvasW / 2, canvasH / 2 - 14);

    ctx.font = '13px monospace';
    ctx.fillStyle = '#d4a574';
    ctx.fillText('Press ESC to resume infiltration', canvasW / 2, canvasH / 2 + 24);
    ctx.restore();
  }

  /**
   * 3D Gateway Antechamber HUD.
   * Displays the Gateway navigation header and interactive target dossiers when approaching doors.
   */
  static renderHubHUD(
    ctx: CanvasRenderingContext2D,
    state: GameState,
    totemState: TotemState,
    canvasW: number,
    canvasH: number,
    time: number,
    activeDoor: any | null,
  ): void {
    const accent = '#e8c89a';

    // =========================================================================
    // 1. TOP-CENTER: GATEWAY ANTECHAMBER HEADER
    // =========================================================================
    const headerW = Math.min(520, canvasW - 400);
    const headerH = 54;
    const headerX = (canvasW - headerW) / 2;
    const headerY = 24;
    drawGlassCard(ctx, headerX, headerY, headerW, headerH, 10, accent);

    ctx.save();
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('THE ARCHITECT\u2019S GATEWAY', headerX + headerW / 2, headerY + 18);

    ctx.font = '11px monospace';
    ctx.fillStyle = accent;
    ctx.fillText('CHOOSE A TARGET CONSCIOUSNESS DOORWAY', headerX + headerW / 2, headerY + 36);
    ctx.restore();

    // =========================================================================
    // 2. TOP-LEFT: DREAM FRAGMENT REPOSITORY
    // =========================================================================
    const fragCardW = 160;
    const fragCardH = 60;
    drawGlassCard(ctx, 24, 24, fragCardW, fragCardH, 10, accent);

    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '10px monospace';
    ctx.fillStyle = `rgba(${hexToRgb(accent)}, 0.7)`;
    ctx.fillText('MEMORY REPOSITORY', 38, 42);

    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = accent;
    ctx.fillText(`\u25C6 ${state.totalFragments} FRAGMENTS`, 38, 62);
    ctx.restore();

    // =========================================================================
    // 3. TOP-RIGHT: TOTEM CHAMBER
    // =========================================================================
    const totemCardW = 140;
    const totemCardH = 70;
    const totemCardX = canvasW - totemCardW - 24;
    drawGlassCard(ctx, totemCardX, 24, totemCardW, totemCardH, 10, accent);

    const totemIconX = totemCardX + 38;
    const totemIconY = 24 + 35;
    TotemEntity.render(totemState, ctx, totemIconX, totemIconY, 32);

    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '10px monospace';
    ctx.fillStyle = `rgba(${hexToRgb(accent)}, 0.7)`;
    ctx.fillText('TOTEM', totemCardX + 68, 44);

    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = accent;
    ctx.fillText('[T] SPIN', totemCardX + 68, 62);
    ctx.restore();

    // =========================================================================
    // 4. HOLOGRAPHIC TARGET DOSSIER (WHEN APPROACHING A DOOR)
    // =========================================================================
    if (activeDoor && activeDoor.target) {
      const target = activeDoor.target;
      const targetColor = target.portraitColor || accent;
      const cardW = Math.min(540, canvasW - 80);
      const cardH = 200;
      const cardX = (canvasW - cardW) / 2;
      const cardY = canvasH / 2 - cardH / 2 - 20;

      // Draw glass dossier card
      drawGlassCard(ctx, cardX, cardY, cardW, cardH, 12, targetColor, true);

      ctx.save();
      // Target badge & security rating
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = targetColor;
      ctx.fillText(`\u25C6 TARGET INFILTRATION DOSSIER \u2014 [DOOR ${activeDoor.label}]`, cardX + 24, cardY + 20);

      const secLevel = target.securityLevel || 'Moderate';
      const secColor = secLevel === 'Extreme' ? '#ff4d4d' : secLevel === 'Heavy' ? '#ff9f43' : '#2ed573';
      ctx.fillStyle = secColor;
      ctx.textAlign = 'right';
      ctx.fillText(`SECURITY: ${secLevel.toUpperCase()}`, cardX + cardW - 24, cardY + 20);

      // Target Name
      ctx.textAlign = 'left';
      ctx.font = 'bold 22px Georgia, serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(target.name, cardX + 24, cardY + 40);

      // Target Bio
      ctx.font = 'italic 13px Georgia, serif';
      ctx.fillStyle = 'rgba(230, 215, 195, 0.9)';
      ctx.fillText(target.bio, cardX + 24, cardY + 70);

      // Idea to Plant & Contract Bonus
      ctx.font = '12px monospace';
      ctx.fillStyle = targetColor;
      ctx.fillText(`IDEA TO PLANT: \u201C${target.idea.toUpperCase()}\u201D`, cardX + 24, cardY + 98);

      ctx.font = '11px monospace';
      ctx.fillStyle = '#ffe0b0';
      ctx.fillText(`MEMORY RELICS: ${target.memoryObjects.join(', ').toUpperCase()}`, cardX + 24, cardY + 118);

      // Contract bonus
      if (target.contractBonus) {
        ctx.textAlign = 'right';
        ctx.fillStyle = accent;
        ctx.fillText(`REWARD: +${target.contractBonus} \u25C6`, cardX + cardW - 24, cardY + 118);
      }

      // Action button
      const actW = cardW - 48;
      const actH = 38;
      const actX = cardX + 24;
      const actY = cardY + 144;
      const pulse = 0.85 + Math.sin(time * 5) * 0.15;

      ctx.beginPath();
      ctx.roundRect(actX, actY, actW, actH, 6);
      ctx.fillStyle = `rgba(${hexToRgb(targetColor)}, ${0.25 * pulse})`;
      ctx.fill();
      ctx.strokeStyle = targetColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 13px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`[PRESS E] INITIATE DESCENT INTO ${target.name}`, actX + actW / 2, actY + actH / 2);

      ctx.restore();
    }

    // =========================================================================
    // 5. BOTTOM-CENTER: CONTROLS GUIDE PILL
    // =========================================================================
    const ctrlW = Math.min(560, canvasW - 80);
    const ctrlH = 32;
    const ctrlX = (canvasW - ctrlW) / 2;
    const ctrlY = canvasH - ctrlH - 24;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 11, 8, 0.85)';
    ctx.beginPath();
    ctx.roundRect(ctrlX, ctrlY, ctrlW, ctrlH, 16);
    ctx.fill();
    ctx.strokeStyle = `rgba(${hexToRgb(accent)}, 0.3)`;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = '11px monospace';
    ctx.fillStyle = `rgba(${hexToRgb(accent)}, 0.85)`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      'WASD Move \u00B7 SPACE Surge \u00B7 Walk up to any door and press [E] to descend',
      canvasW / 2,
      ctrlY + ctrlH / 2,
    );
    ctx.restore();
  }
}

/** Convert a #rrggbb hex string to "r,g,b" for use in rgba(). */
function hexToRgb(hex: string): string {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h.split('').map(c => c + c).join('');
  }
  const r = parseInt(h.substring(0, 2), 16) || 255;
  const g = parseInt(h.substring(2, 4), 16) || 255;
  const b = parseInt(h.substring(4, 6), 16) || 255;
  return `${r},${g},${b}`;
}
