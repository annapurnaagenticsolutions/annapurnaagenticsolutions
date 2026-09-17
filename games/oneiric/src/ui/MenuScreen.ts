// ONEIRIC — Title, how-to-play, pause, win/lose, and descending screens.
// All canvas-rendered. No DOM.

import type { GameState, MetaState, Particle, DreamTarget } from '../types';
import { TotemEntity, type TotemState } from '../entities/Totem';
import { DEFAULT_TOTEM } from '../data/totems';
import { getThemeForDepth } from '../data/layers';

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

// Module-level particle cache for the title/win screens. We keep a stable
// array so the drift is continuous across frames rather than re-seeded.
const titleParticles: Particle[] = [];
const winParticles: Particle[] = [];

function ensureTitleParticles(canvasW: number, canvasH: number): void {
  if (titleParticles.length > 0) return;
  for (let i = 0; i < 120; i++) {
    titleParticles.push({
      x: Math.random() * canvasW,
      y: Math.random() * canvasH,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 6,
      life: 1,
      maxLife: 1,
      color: i % 3 === 0 ? '#ffe0b0' : '#e8c89a',
      size: 1 + Math.random() * 2.5,
      type: 'drift',
    });
  }
}

function ensureWinParticles(canvasW: number, canvasH: number): void {
  if (winParticles.length > 0) return;
  for (let i = 0; i < 50; i++) {
    winParticles.push({
      x: Math.random() * canvasW,
      y: canvasH + Math.random() * 100,
      vx: (Math.random() - 0.5) * 10,
      vy: -10 - Math.random() * 20,
      life: 1,
      maxLife: 1,
      color: '#e8c89a',
      size: 1 + Math.random() * 2.5,
      type: 'spark',
    });
  }
}

function updateAndDrawParticles(
  ctx: CanvasRenderingContext2D,
  parts: Particle[],
  dt: number,
  canvasW: number,
  canvasH: number,
  wrap: boolean,
): void {
  ctx.save();
  for (const p of parts) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (wrap) {
      if (p.x < 0) p.x += canvasW;
      if (p.x > canvasW) p.x -= canvasW;
      if (p.y < 0) p.y += canvasH;
      if (p.y > canvasH) p.y -= canvasH;
    } else {
      // rising particles recycle at bottom
      if (p.y < -10) {
        p.y = canvasH + 10;
        p.x = Math.random() * canvasW;
      }
    }
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export class MenuScreen {
  /**
   * Title screen: "ONEIRIC" with glow, subtitle, prompt, best stats,
   * drifting amber particles, decorative spinning totem.
   */
  static renderTitle(
    ctx: CanvasRenderingContext2D,
    canvasW: number,
    canvasH: number,
    time: number,
    meta: MetaState,
  ): void {
    const reduced = prefersReducedMotion();
    const dt = 0.016;

    // Background — rich dark amber gradient, not pure black.
    // The title screen is the first impression; it should feel like the dream.
    ctx.save();
    const bgGrad = ctx.createRadialGradient(
      canvasW / 2, canvasH / 2, 50,
      canvasW / 2, canvasH / 2, canvasW * 0.7,
    );
    bgGrad.addColorStop(0, '#3a2a1a');
    bgGrad.addColorStop(0.5, '#241810');
    bgGrad.addColorStop(1, '#100a06');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.restore();

    // Particles — more of them, brighter, for atmosphere
    ensureTitleParticles(canvasW, canvasH);
    updateAndDrawParticles(ctx, titleParticles, dt, canvasW, canvasH, true);

    const cx = canvasW / 2;
    const cy = canvasH / 2;

    // Dream layer diagram — concentric rings representing nested dream layers.
    // This immediately communicates the Inception-like structure.
    ctx.save();
    ctx.translate(cx, cy + 120);
    const ringColors = ['#e8c89a', '#6ab8d8', '#ff6b6b', '#888888'];
    const ringLabels = ['SURFACE', 'CURRENT', 'ABYSS', 'LIMBO'];
    for (let i = 0; i < 4; i++) {
      const radius = 30 + i * 22;
      const rotation = reduced ? 0 : time * (0.3 - i * 0.05) + i * 0.5;
      ctx.save();
      ctx.rotate(rotation);
      ctx.strokeStyle = ringColors[i];
      ctx.globalAlpha = 0.4 + Math.sin(time * 0.8 + i) * 0.15;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      // Label at the top of each ring
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = ringColors[i];
      ctx.fillText(ringLabels[i], 0, -radius - 4);
      ctx.restore();
    }
    // Center dot — the dreamer
    ctx.fillStyle = '#ffe0b0';
    ctx.globalAlpha = 0.8 + Math.sin(time * 2) * 0.2;
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Title
    ctx.save();
    ctx.font = 'bold 72px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffe0b0';
    if (!reduced) {
      ctx.shadowColor = '#ffd9a0';
      ctx.shadowBlur = 30 + Math.sin(time * 1.5) * 10;
    }
    ctx.fillText('ONEIRIC', cx, cy - 60);
    ctx.shadowBlur = 0;
    ctx.restore();

    // Subtitle
    ctx.save();
    ctx.font = 'italic 18px serif';
    ctx.fillStyle = '#e4b584';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('A Nested Dream Heist', cx, cy - 10);
    ctx.restore();

    // Prompt (pulse)
    ctx.save();
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let alpha = 1;
    if (!reduced) alpha = 0.5 + 0.5 * Math.sin(time * 3);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#e8c89a';
    ctx.fillText('Press SPACE to enter the dream', cx, cy + 40);
    ctx.globalAlpha = 1;
    ctx.restore();

    // Best stats
    ctx.save();
    ctx.font = '12px monospace';
    ctx.fillStyle = 'rgba(212, 165, 116, 0.7)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(
      `Best depth: ${meta.bestDepth} \u00B7 Fragments: ${meta.totalFragments} \u00B7 Runs: ${meta.runsCompleted}`,
      cx,
      canvasH - 24,
    );
    ctx.restore();

    // Decorative spinning totem (bottom-right corner)
    const decoTotem: TotemState = {
      config: DEFAULT_TOTEM,
      rotation: reduced ? 0 : time * 6,
      spinVelocity: reduced ? 0 : 6,
      isSpinning: true,
      spinTime: time,
      wobble: 0,
    };
    TotemEntity.render(decoTotem, ctx, canvasW - 50, canvasH - 50, 36);
  }

  /**
   * Cinematic Intro & Mission Briefing screen.
   * Tells the Inception story, the philosophical premise, and outlines the 4 Directives.
   */
  static renderIntroBriefing(
    ctx: CanvasRenderingContext2D,
    canvasW: number,
    canvasH: number,
    time: number,
  ): void {
    ctx.save();
    // Atmospheric dark amber radial gradient
    const bgGrad = ctx.createRadialGradient(
      canvasW / 2, canvasH / 2, 80,
      canvasW / 2, canvasH / 2, canvasW * 0.75,
    );
    bgGrad.addColorStop(0, '#2e2014');
    bgGrad.addColorStop(0.6, '#1a120b');
    bgGrad.addColorStop(1, '#0c0704');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Drifting particles
    ensureTitleParticles(canvasW, canvasH);
    updateAndDrawParticles(ctx, titleParticles, 0.016, canvasW, canvasH, true);

    const padX = Math.max(32, canvasW * 0.06);
    const padY = Math.max(28, canvasH * 0.05);
    const maxW = Math.min(1100, canvasW - padX * 2);
    const startX = (canvasW - maxW) / 2;

    // --- 1. Top Header Banner ---
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    ctx.font = '11px monospace';
    ctx.fillStyle = 'rgba(212, 165, 116, 0.7)';
    ctx.letterSpacing = '3px';
    ctx.fillText('PASIV DEVICE PROTOCOL // EXTRACTION ARCHITECTURE', canvasW / 2, padY);

    ctx.font = 'bold 30px Georgia, serif';
    ctx.fillStyle = '#ffe0b0';
    ctx.fillText('INCEPTION: THE ART OF SUBCONSCIOUS CREATION', canvasW / 2, padY + 22);

    ctx.font = 'italic 15px Georgia, serif';
    ctx.fillStyle = 'rgba(232, 200, 154, 0.85)';
    ctx.fillText(
      '\u201CAn idea is like a virus. Resilient. Highly contagious. Once it takes hold, it shapes reality.\u201D',
      canvasW / 2,
      padY + 62,
    );
    ctx.restore();

    // --- 2. Narrative & Objective Briefing Glass Panel ---
    const narrativeY = padY + 98;
    const narrativeH = 74;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(startX, narrativeY, maxW, narrativeH, 10);
    ctx.fillStyle = 'rgba(32, 22, 14, 0.75)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(212, 165, 116, 0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '13px Georgia, serif';
    ctx.fillStyle = 'rgba(240, 224, 200, 0.9)';
    const storyP1 = 'You are an Extraction Architect entering the dreaming mind of a human subject. Inception is not an extraction; it is the delicate craft of planting an idea so deep in their subconscious that they awaken believing they arrived at it on their own.';
    const storyP2 = 'Every subconscious defends itself with armed projections. In the Gateway Antechamber, choose your target contract, descend through 3 layered realms, plant the inception seed, and execute a synchronized Kick before the dream collapses.';
    wrapText(ctx, `${storyP1} ${storyP2}`, startX + 20, narrativeY + 16, maxW - 40, 20);
    ctx.restore();

    // --- 3. The 4 Directives Grid ---
    const directivesY = narrativeY + narrativeH + 20;
    const gridCols = canvasW > 800 ? 2 : 1;
    const cardGap = 16;
    const cardW = gridCols === 2 ? (maxW - cardGap) / 2 : maxW;
    const cardH = 110;

    const DIRECTIVES = [
      {
        num: '01',
        title: 'THE 3-TIER DESCENT',
        desc: 'Infiltrate Surface \u2192 Memory \u2192 Subconscious. In each layer, locate the descent anchor portal to dive one tier deeper toward the core vault.',
        accent: '#e8c89a',
      },
      {
        num: '02',
        title: 'ARCHITECT POWERS & EVASION',
        desc: 'Subconscious projections hunt intruders. Trigger [SPACE] Lucid Surge to phase-dash through danger, and launch [F] Sonic Echo Lures to divert patrols.',
        accent: '#6ab8d8',
      },
      {
        num: '03',
        title: 'MEMORY RESONANCE',
        desc: 'Touch personal memory relics [E] scattered across rooms to restore destabilizing mind integrity and unveil the target\u2019s hidden history.',
        accent: '#f0b070',
      },
      {
        num: '04',
        title: 'THE INCEPTION & THE KICK',
        desc: 'Hold [E] at the deepest layer to plant the seed. Then execute a synchronized [K] Kick with the music-box cadence to wake up before Limbo collapse.',
        accent: '#ff6b6b',
      },
    ];

    DIRECTIVES.forEach((dir, i) => {
      const col = i % gridCols;
      const row = Math.floor(i / gridCols);
      const cx = startX + col * (cardW + cardGap);
      const cy = directivesY + row * (cardH + cardGap);

      ctx.save();
      // Glass card background
      ctx.beginPath();
      ctx.roundRect(cx, cy, cardW, cardH, 8);
      ctx.fillStyle = 'rgba(22, 16, 10, 0.82)';
      ctx.fill();
      ctx.strokeStyle = `rgba(${dir.accent === '#ff6b6b' ? '255, 107, 107' : '212, 165, 116'}, 0.4)`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Number badge
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = dir.accent;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`[DIRECTIVE ${dir.num}]`, cx + 16, cy + 14);

      // Title
      ctx.font = 'bold 13px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(dir.title, cx + 120, cy + 14);

      // Description
      ctx.font = '12px Georgia, serif';
      ctx.fillStyle = 'rgba(230, 215, 195, 0.85)';
      wrapText(ctx, dir.desc, cx + 16, cy + 38, cardW - 32, 18);

      ctx.restore();
    });

    // --- 4. Bottom Controls Summary & Action Button ---
    const bottomY = directivesY + (cardH + cardGap) * 2 + 16;
    ctx.save();
    // Glass action button
    const btnW = Math.min(520, maxW);
    const btnH = 46;
    const btnX = (canvasW - btnW) / 2;
    ctx.beginPath();
    ctx.roundRect(btnX, bottomY, btnW, btnH, 8);
    const pulse = 0.85 + Math.sin(time * 4) * 0.15;
    ctx.fillStyle = `rgba(50, 36, 24, ${pulse})`;
    ctx.fill();
    ctx.strokeStyle = '#ffe0b0';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#ffe0b0';
    ctx.fillText('\u25C6 PRESS SPACE TO ENTER THE ARCHITECT\u2019S GATEWAY \u25C6', canvasW / 2, bottomY + btnH / 2);

    // Controls footer
    ctx.font = '11px monospace';
    ctx.fillStyle = 'rgba(212, 165, 116, 0.65)';
    ctx.fillText('WASD Move \u00B7 SPACE Surge \u00B7 F Echo Lure \u00B7 E Interact/Descend \u00B7 T Totem \u00B7 K Kick', canvasW / 2, bottomY + btnH + 20);
    ctx.restore();

    ctx.restore();
  }

  /**
   * How-to-play panel.
   */
  static renderHowToPlay(
    ctx: CanvasRenderingContext2D,
    canvasW: number,
    canvasH: number,
  ): void {
    ctx.save();
    // Match the title screen's rich amber gradient
    const bgGrad = ctx.createRadialGradient(
      canvasW / 2, canvasH / 2, 50,
      canvasW / 2, canvasH / 2, canvasW * 0.7,
    );
    bgGrad.addColorStop(0, '#3a2a1a');
    bgGrad.addColorStop(0.5, '#241810');
    bgGrad.addColorStop(1, '#100a06');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvasW, canvasH);

    const panelW = Math.min(640, canvasW - 80);
    const panelH = 420;
    const px = (canvasW - panelW) / 2;
    const py = (canvasH - panelH) / 2;

    // Panel — slightly translucent over the gradient
    ctx.fillStyle = 'rgba(30, 22, 16, 0.85)';
    ctx.fillRect(px, py, panelW, panelH);
    ctx.strokeStyle = '#ffe0b0';
    ctx.lineWidth = 1;
    ctx.strokeRect(px, py, panelW, panelH);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    let y = py + 24;
    const x = px + 24;
    const lineH = 22;

    ctx.font = 'bold 22px serif';
    ctx.fillStyle = '#ffe0b0';
    ctx.fillText('HOW TO PLAY', x, y);
    y += lineH + 14;

    ctx.font = '14px serif';
    ctx.fillStyle = '#e4b584';
    wrapText(ctx,
      'YOU ARE A DREAM ARCHITECT. Descend through nested dream layers, plant the seed at the bottom, and kick out before stability collapses.',
      x, y, panelW - 48, lineH);
    y += lineH * 3 + 6;

    ctx.font = '13px monospace';
    ctx.fillStyle = '#e8c89a';
    ctx.fillText('Controls & Architect Powers', x, y);
    y += lineH;
    ctx.fillStyle = '#d4a574';
    ctx.fillText('WASD / Arrows = Move dreamer', x, y); y += lineH;
    ctx.fillText('SPACE = Lucid Surge (Phase dash through danger)', x, y); y += lineH;
    ctx.fillText('F = Sonic Echo Lure (Distract patrolling projections)', x, y); y += lineH;
    ctx.fillText('E = Interact / Descend / Resonate with memories / Plant seed', x, y); y += lineH;
    ctx.fillText('T = Totem reality check (Observe physical wobble)', x, y); y += lineH;
    ctx.fillText('K = Synchronized Kick (Escape sequence)', x, y); y += lineH;
    ctx.fillText('ESC = Pause', x, y); y += lineH + 6;

    ctx.font = '14px serif';
    ctx.fillStyle = '#d4a574';
    wrapText(ctx,
      'TOUCH MEMORY OBJECTS to restore stability and unveil the target’s subconscious history.',
      x, y, panelW - 48, lineH);
    y += lineH * 2 + 4;

    // Prompt
    ctx.font = '16px monospace';
    ctx.fillStyle = '#e8c89a';
    ctx.textAlign = 'center';
    ctx.fillText('Press SPACE to begin', canvasW / 2, py + panelH - 36);

    ctx.restore();
  }

  /**
   * Win screen: "THE IDEA TAKES ROOT" with the target's name, idea, and
   * a pulsing idea icon. Warm glow and rising particles.
   */
  static renderWin(
    ctx: CanvasRenderingContext2D,
    canvasW: number,
    canvasH: number,
    state: GameState,
    time: number,
  ): void {
    const reduced = prefersReducedMotion();
    const dt = 0.016;

    ctx.save();
    ctx.fillStyle = '#1a1410';
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.restore();

    ensureWinParticles(canvasW, canvasH);
    updateAndDrawParticles(ctx, winParticles, dt, canvasW, canvasH, false);

    const cx = canvasW / 2;
    const cy = canvasH / 2;
    const target = state.target;

    // Pulsing idea icon — large symbol that breathes.
    if (target) {
      const pulse = reduced ? 1 : 1 + Math.sin(time * 2) * 0.08;
      const iconSize = 50 * pulse;
      drawIdeaIcon(ctx, cx, cy - 130, iconSize, target.ideaIcon, target.portraitColor, time);
    }

    ctx.save();
    ctx.font = 'bold 44px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e8c89a';
    if (!reduced) {
      ctx.shadowColor = '#e8c89a';
      ctx.shadowBlur = 20 + Math.sin(time * 2) * 6;
    }
    ctx.fillText('THE IDEA TAKES ROOT', cx, cy - 70);
    ctx.shadowBlur = 0;
    ctx.restore();

    // Target name and idea below the title
    if (target) {
      ctx.save();
      ctx.font = 'bold 22px Georgia';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = target.portraitColor;
      ctx.fillText(target.name, cx, cy - 20);

      ctx.font = 'italic 20px Georgia';
      ctx.fillStyle = '#e8c89a';
      ctx.fillText(`"${target.idea}"`, cx, cy + 8);
      ctx.restore();
    }

    const elapsed = (performance.now() - state.runStartTime) / 1000;
    const em = Math.floor(elapsed / 60);
    const es = Math.floor(elapsed % 60);

    ctx.save();
    ctx.font = '14px monospace';
    ctx.fillStyle = '#d4a574';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Depth: ${state.currentLayer}  Fragments: ${state.fragments}  Time: ${em}:${es.toString().padStart(2, '0')}  Kicks: ${state.kickProgress}`, cx, cy + 48);
    ctx.restore();

    ctx.save();
    ctx.font = '16px monospace';
    ctx.fillStyle = '#e8c89a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let alpha = 1;
    if (!reduced) alpha = 0.5 + 0.5 * Math.sin(time * 3);
    ctx.globalAlpha = alpha;
    ctx.fillText('Press SPACE to return to the Atelier', cx, cy + 100);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /**
   * Lose screen: "LOST IN LIMBO" in red, cold and minimal.
   */
  static renderLose(
    ctx: CanvasRenderingContext2D,
    canvasW: number,
    canvasH: number,
    state: GameState,
    time: number,
  ): void {
    const reduced = prefersReducedMotion();

    ctx.save();
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.restore();

    const cx = canvasW / 2;
    const cy = canvasH / 2;

    ctx.save();
    ctx.font = 'bold 44px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#c44545';
    ctx.fillText('LOST IN LIMBO', cx, cy - 40);
    ctx.restore();

    ctx.save();
    ctx.font = '15px monospace';
    ctx.fillStyle = '#888888';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`You kept ${Math.floor(state.fragments * 0.1)} fragments.`, cx, cy + 10);
    ctx.restore();

    ctx.save();
    ctx.font = '16px monospace';
    ctx.fillStyle = '#aaaaaa';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let alpha = 1;
    if (!reduced) alpha = 0.5 + 0.5 * Math.sin(time * 3);
    ctx.globalAlpha = alpha;
    ctx.fillText('Press SPACE to return to the Atelier', cx, cy + 60);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /**
   * Descending transition: fade animation with layer name + target narrative.
   * During Phase C (the fall), shows the target's name, idea, and bio.
   */
  static renderDescending(
    ctx: CanvasRenderingContext2D,
    canvasW: number,
    canvasH: number,
    depth: number,
    time: number,
    target?: DreamTarget | null,
    descendProgress?: number,
  ): void {
    const reduced = prefersReducedMotion();
    const theme = getThemeForDepth(depth);

    // Fade in/out over a ~1s cycle using a sine envelope.
    let alpha = 1;
    if (!reduced) {
      alpha = 0.5 + 0.5 * Math.sin(time * Math.PI);
      alpha = Math.max(0.2, Math.min(1, alpha));
    }

    ctx.save();
    ctx.fillStyle = '#000000';
    ctx.globalAlpha = alpha;
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.globalAlpha = 1;
    ctx.restore();

    const cx = canvasW / 2;
    const cy = canvasH / 2;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 32px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = theme.palette.accent;
    ctx.fillText(`DESCENDING TO LAYER ${depth}`, cx, cy - 16);

    ctx.font = '18px serif';
    ctx.fillStyle = theme.palette.fg;
    ctx.fillText(theme.name, cx, cy + 20);
    ctx.globalAlpha = 1;
    ctx.restore();

    // Phase C narrative: target name, idea, bio — appear during the fall and fade out.
    // Phase C is 50-75% of the descent (the fall). Show narrative during 45-85%.
    if (target && descendProgress !== undefined && descendProgress > 0.45 && descendProgress < 0.85) {
      const narrProgress = (descendProgress - 0.45) / 0.4; // 0 -> 1
      const narrAlpha = Math.sin(narrProgress * Math.PI) * 0.9; // fade in and out

      ctx.save();
      ctx.globalAlpha = narrAlpha;

      // Target name — large, dramatic
      ctx.font = 'bold 28px Georgia';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = target.portraitColor;
      ctx.shadowColor = target.portraitColor;
      ctx.shadowBlur = 15;
      ctx.fillText(`ENTERING THE MIND OF`, cx, cy - 90);
      ctx.font = 'bold 36px Georgia';
      ctx.fillText(target.name, cx, cy - 55);
      ctx.shadowBlur = 0;

      // Idea — smaller, evocative
      ctx.font = 'italic 20px Georgia';
      ctx.fillStyle = '#e8c89a';
      ctx.fillText(`Plant the idea: ${target.idea}`, cx, cy + 60);

      // Bio — single line, mysterious
      ctx.font = '14px Georgia';
      ctx.fillStyle = 'rgba(200, 180, 150, 0.8)';
      ctx.fillText(target.bio, cx, cy + 90);

      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }
}

/**
 * Draw an idea icon (rose, key, letter, feather, flame) as a large pulsing symbol.
 * Simple geometric representations — evocative, not photorealistic.
 */
function drawIdeaIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  icon: 'rose' | 'key' | 'letter' | 'feather' | 'flame',
  color: string,
  time: number,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.shadowColor = color;
  ctx.shadowBlur = 15 + Math.sin(time * 2) * 5;

  switch (icon) {
    case 'rose': {
      // Concentric petals — a blooming rose.
      for (let i = 0; i < 4; i++) {
        const r = size * (1 - i * 0.2);
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.globalAlpha = 0.3 + i * 0.2;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.15, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'key': {
      // Circle + stem + teeth.
      ctx.beginPath();
      ctx.arc(-size * 0.5, 0, size * 0.3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-size * 0.2, 0);
      ctx.lineTo(size * 0.8, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(size * 0.6, 0);
      ctx.lineTo(size * 0.6, size * 0.25);
      ctx.moveTo(size * 0.75, 0);
      ctx.lineTo(size * 0.75, size * 0.2);
      ctx.stroke();
      break;
    }
    case 'letter': {
      // Envelope shape.
      ctx.beginPath();
      ctx.rect(-size * 0.6, -size * 0.4, size * 1.2, size * 0.8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-size * 0.6, -size * 0.4);
      ctx.lineTo(0, size * 0.1);
      ctx.lineTo(size * 0.6, -size * 0.4);
      ctx.stroke();
      break;
    }
    case 'feather': {
      // Curved feather shape.
      ctx.beginPath();
      ctx.moveTo(0, size * 0.6);
      ctx.quadraticCurveTo(-size * 0.5, 0, 0, -size * 0.6);
      ctx.quadraticCurveTo(size * 0.3, 0, 0, size * 0.6);
      ctx.fill();
      // Spine
      ctx.beginPath();
      ctx.moveTo(0, size * 0.6);
      ctx.lineTo(0, -size * 0.6);
      ctx.globalAlpha = 0.5;
      ctx.stroke();
      break;
    }
    case 'flame': {
      // Teardrop flame shape.
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.6);
      ctx.quadraticCurveTo(size * 0.4, -size * 0.2, size * 0.3, size * 0.2);
      ctx.quadraticCurveTo(size * 0.15, size * 0.5, 0, size * 0.5);
      ctx.quadraticCurveTo(-size * 0.15, size * 0.5, -size * 0.3, size * 0.2);
      ctx.quadraticCurveTo(-size * 0.4, -size * 0.2, 0, -size * 0.6);
      ctx.fill();
      // Inner flame
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.3);
      ctx.quadraticCurveTo(size * 0.15, 0, size * 0.1, size * 0.2);
      ctx.quadraticCurveTo(0, size * 0.3, -size * 0.1, size * 0.2);
      ctx.quadraticCurveTo(-size * 0.15, 0, 0, -size * 0.3);
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

/** Word-wrap helper for instruction text. */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): void {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, yy);
}
