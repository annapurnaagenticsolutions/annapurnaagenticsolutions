// ONEIRIC — Meta-progression shop (between runs).
// Canvas-rendered. No DOM.

import type { MetaState } from '../types';
import { BALANCE } from '../data/balance';
import { TOTEMS, getTotemById } from '../data/totems';

type UpgradeType =
  | 'totemSpinSpeed'
  | 'startingStability'
  | 'kickZoneBonus'
  | 'lucidSurgeCooldown'
  | 'echoCapacity'
  | 'memoryCatalyst';

interface UpgradePanel {
  title: string;
  effect: string;
  type: UpgradeType;
}

const PANELS: UpgradePanel[] = [
  { title: 'TOTEM PRECISION', effect: 'Faster reality check', type: 'totemSpinSpeed' },
  { title: 'STABILITY CORE', effect: '+10 stability per tier', type: 'startingStability' },
  { title: 'KICK HARMONICS', effect: '+2% kick timing zone', type: 'kickZoneBonus' },
  { title: 'LUCID SURGE', effect: '-0.4s phase-dash cooldown', type: 'lucidSurgeCooldown' },
  { title: 'SONIC ECHOES', effect: '+1 distraction lure charge', type: 'echoCapacity' },
  { title: 'MEMORY CATALYST', effect: '+5 stability from memories', type: 'memoryCatalyst' },
];

export class Atelier {
  /**
   * Render the Atelier: title, fragment balance, 6 upgrade blueprint panels,
   * active totem selector, and bottom instructions.
   */
  static render(
    ctx: CanvasRenderingContext2D,
    canvasW: number,
    canvasH: number,
    meta: MetaState,
    time: number,
    selectedUpgrade: number,
  ): void {
    // Background gradient
    ctx.save();
    const bgGrad = ctx.createRadialGradient(
      canvasW / 2, canvasH / 2, 80,
      canvasW / 2, canvasH / 2, Math.max(canvasW, canvasH) * 0.7,
    );
    bgGrad.addColorStop(0, '#241a12');
    bgGrad.addColorStop(0.5, '#15100a');
    bgGrad.addColorStop(1, '#090705');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.restore();

    const accent = '#e8c89a';
    const fg = '#d4a574';

    // Title & Header Card
    ctx.save();
    ctx.font = 'bold 32px Georgia, serif';
    ctx.fillStyle = accent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('THE ATELIER \u2014 ARCHITECT BLUEPRINTS', canvasW / 2, Math.max(20, canvasH * 0.04));
    ctx.restore();

    // Fragment balance (top-right)
    ctx.save();
    ctx.font = '16px monospace';
    ctx.fillStyle = accent;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(`\u25C6 ${meta.totalFragments} FRAGMENTS`, canvasW - 36, Math.max(24, canvasH * 0.04 + 4));
    ctx.restore();

    // 2 rows of 3 panels each
    const panelW = Math.min(320, (canvasW - 140) / 3);
    const panelH = 154;
    const gapX = 28;
    const gapY = 24;
    const totalW = panelW * 3 + gapX * 2;
    const startX = (canvasW - totalW) / 2;
    const startY = Math.max(86, canvasH / 2 - panelH - 40);

    PANELS.forEach((panel, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const px = startX + col * (panelW + gapX);
      const py = startY + row * (panelH + gapY);
      const selected = i === selectedUpgrade;
      const level = meta.upgrades[panel.type] ?? 0;
      const cost = Atelier.getUpgradeCost(meta, panel.type);
      const maxed = cost === null;

      ctx.save();
      // Panel glass background
      ctx.beginPath();
      ctx.roundRect(px, py, panelW, panelH, 12);
      ctx.fillStyle = selected ? 'rgba(42, 30, 20, 0.95)' : 'rgba(20, 15, 10, 0.88)';
      ctx.fill();

      // Border & glow
      ctx.strokeStyle = selected ? accent : 'rgba(212, 165, 116, 0.35)';
      ctx.lineWidth = selected ? 2 : 1;
      ctx.stroke();

      // Corner brackets on selected
      if (selected) {
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px, py + 10); ctx.lineTo(px, py); ctx.lineTo(px + 10, py);
        ctx.moveTo(px + panelW, py + panelH - 10); ctx.lineTo(px + panelW, py + panelH); ctx.lineTo(px + panelW - 10, py + panelH);
        ctx.stroke();
      }

      // Title
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = selected ? accent : fg;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(panel.title, px + panelW / 2, py + 16);

      // Level dots / bar
      ctx.font = '12px monospace';
      ctx.fillStyle = fg;
      ctx.fillText(`Tier ${level} / 4`, px + panelW / 2, py + 38);

      // Effect
      ctx.font = 'italic 13px Georgia, serif';
      ctx.fillStyle = 'rgba(232, 200, 154, 0.9)';
      ctx.fillText(panel.effect, px + panelW / 2, py + 62);

      // Cost
      ctx.font = 'bold 14px monospace';
      if (maxed) {
        ctx.fillStyle = '#888888';
        ctx.fillText('MAXED', px + panelW / 2, py + panelH - 36);
      } else {
        const affordable = meta.totalFragments >= cost;
        ctx.fillStyle = affordable ? accent : '#777777';
        ctx.fillText(`\u25C6 ${cost} FRAGMENTS`, px + panelW / 2, py + panelH - 36);
      }

      // Index hint
      ctx.font = '11px monospace';
      ctx.fillStyle = 'rgba(212, 165, 116, 0.6)';
      ctx.fillText(`KEY [${i + 1}]`, px + panelW / 2, py + panelH - 16);
      ctx.restore();
    });

    // Active totem selector
    const activeTotem = getTotemById(meta.activeTotemId);
    const totemY = startY + (panelH + gapY) * 2 + 24;
    ctx.save();
    ctx.font = '13px monospace';
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ACTIVE TOTEM', canvasW / 2 - 140, totemY);
    ctx.fillStyle = accent;
    ctx.font = 'bold 15px monospace';
    ctx.fillText(`\u25C0   ${activeTotem.name.toUpperCase()}   \u25B6`, canvasW / 2, totemY);
    ctx.font = 'italic 12px Georgia, serif';
    ctx.fillStyle = 'rgba(212, 165, 116, 0.8)';
    ctx.fillText(activeTotem.description, canvasW / 2, totemY + 22);
    ctx.restore();

    // Bottom instructions
    ctx.save();
    ctx.font = '12px monospace';
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(
      'SPACE Enter Dream \u00B7 [1-6] Purchase Upgrade \u00B7 [Q/E] Cycle Totem \u00B7 ESC Back',
      canvasW / 2,
      canvasH - 20,
    );
    ctx.restore();
  }

  /**
   * Cost for the next level of an upgrade, or null if maxed (level >= 4).
   */
  static getUpgradeCost(meta: MetaState, upgradeType: UpgradeType): number | null {
    const level = meta.upgrades[upgradeType] ?? 0;
    if (level >= 4) return null;
    const costs = BALANCE.upgradeCosts[upgradeType];
    return costs ? (costs[level] ?? null) : null;
  }

  /**
   * Whether the player can afford the next level of an upgrade.
   */
  static canAfford(meta: MetaState, upgradeType: UpgradeType): boolean {
    const cost = Atelier.getUpgradeCost(meta, upgradeType);
    if (cost === null) return false;
    return meta.totalFragments >= cost;
  }
}
