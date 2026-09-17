// ONEIRIC — MetaProgression
// Handles localStorage save/load, fragment spending, upgrades, and daily seed.
// All mutating methods return NEW MetaState objects (immutable). Never mutate input.

import type { MetaState, TotemConfig } from '../types';
import { BALANCE } from '../data/balance';
import { getTotemById } from '../data/totems';

const SAVE_KEY = 'oneiric_save';
const SEED_SALT = 'oneiric-dream-salt-v1';

type UpgradeType =
  | 'totemSpinSpeed'
  | 'startingStability'
  | 'kickZoneBonus'
  | 'lucidSurgeCooldown'
  | 'echoCapacity'
  | 'memoryCatalyst';

/** Returns today's date as a YYYY-MM-DD string (local time). */
function todayString(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Simple deterministic string hash: char codes multiplied and XORed. */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31) ^ str.charCodeAt(i);
    // keep within safe 32-bit signed int range
    hash = hash | 0;
  }
  // ensure positive
  return Math.abs(hash);
}

export class MetaProgression {
  // === Save / Load ===

  static load(): MetaState {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(SAVE_KEY);
    } catch (e) {
      // localStorage may be blocked (private mode). Return defaults.
      console.warn('[MetaProgression] localStorage access blocked, returning default state.', e);
      return MetaProgression.getDefault();
    }

    if (raw === null) {
      return MetaProgression.getDefault();
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.warn('[MetaProgression] Failed to parse save JSON, returning default state.', e);
      return MetaProgression.getDefault();
    }

    const merged = MetaProgression.mergeWithDefaults(parsed);

    // Refresh daily seed if a new day has begun.
    return MetaProgression.refreshDailySeed(merged);
  }

  static save(meta: MetaState): void {
    try {
      const json = JSON.stringify(meta);
      localStorage.setItem(SAVE_KEY, json);
    } catch (e) {
      // Quota errors or disabled storage — log and don't crash.
      console.warn('[MetaProgression] Failed to persist save (quota or storage error).', e);
    }
  }

  static getDefault(): MetaState {
    return {
      totalFragments: 0,
      upgrades: {
        totemSpinSpeed: 0,
        startingStability: 0,
        kickZoneBonus: 0,
        lucidSurgeCooldown: 0,
        echoCapacity: 0,
        memoryCatalyst: 0,
      },
      unlockedTotems: ['top'],
      activeTotemId: 'top',
      runsCompleted: 0,
      bestDepth: 0,
      bestFragments: 0,
      dailySeed: MetaProgression.generateDailySeed(),
      lastPlayedDate: todayString(),
    };
  }

  // === Fragment earning ===

  static calculateRunFragments(
    depthReached: number,
    seedPlanted: boolean,
    kicksChained: number,
  ): number {
    let fragments = depthReached * BALANCE.fragmentPerDepth;
    if (seedPlanted) {
      fragments += BALANCE.fragmentPerSeedPlanted;
    }
    fragments += kicksChained * BALANCE.fragmentPerKickSuccess;
    return Math.floor(fragments);
  }

  static applyRunResult(
    meta: MetaState,
    fragmentsEarned: number,
    depthReached: number,
  ): MetaState {
    return {
      ...meta,
      upgrades: { ...meta.upgrades },
      unlockedTotems: [...meta.unlockedTotems],
      totalFragments: meta.totalFragments + fragmentsEarned,
      runsCompleted: meta.runsCompleted + 1,
      bestDepth: Math.max(meta.bestDepth, depthReached),
      bestFragments: Math.max(meta.bestFragments, fragmentsEarned),
    };
  }

  // === Upgrades ===

  static purchaseUpgrade(
    meta: MetaState,
    upgradeType: UpgradeType,
  ): { success: boolean; newMeta: MetaState; error?: string } {
    const currentLevel = meta.upgrades[upgradeType] ?? 0;

    if (currentLevel >= 4) {
      return { success: false, newMeta: meta, error: 'MAXED' };
    }

    const costs = BALANCE.upgradeCosts[upgradeType];
    const cost = costs ? costs[currentLevel] : 999;

    if (meta.totalFragments < cost) {
      return { success: false, newMeta: meta, error: 'INSUFFICIENT' };
    }

    return {
      success: true,
      newMeta: {
        ...meta,
        upgrades: { ...meta.upgrades, [upgradeType]: currentLevel + 1 },
        unlockedTotems: [...meta.unlockedTotems],
        totalFragments: meta.totalFragments - cost,
      },
    };
  }

  static getUpgradeCost(meta: MetaState, upgradeType: string): number | null {
    const level = meta.upgrades[upgradeType as keyof typeof meta.upgrades];
    if (level === undefined || level >= 4) {
      return null;
    }
    const costs = BALANCE.upgradeCosts[upgradeType as keyof typeof BALANCE.upgradeCosts];
    if (!costs) {
      return null;
    }
    return costs[level];
  }

  static applyUpgradesToState(
    baseStability: number,
    baseKickZone: number,
    meta: MetaState,
  ): {
    stability: number;
    kickZone: number;
    spinSpeed: number;
    surgeCooldownReduction: number;
    echoBonus: number;
    memoryCatalystBonus: number;
  } {
    const stability =
      baseStability + meta.upgrades.startingStability * BALANCE.upgradeEffects.startingStabilityPerLevel;
    const kickZone =
      baseKickZone + meta.upgrades.kickZoneBonus * BALANCE.upgradeEffects.kickZoneBonusPerLevel;
    const spinSpeed = meta.upgrades.totemSpinSpeed;
    const surgeCooldownReduction =
      (meta.upgrades.lucidSurgeCooldown ?? 0) * BALANCE.upgradeEffects.lucidSurgeCooldownReductionPerLevel;
    const echoBonus =
      (meta.upgrades.echoCapacity ?? 0) * BALANCE.upgradeEffects.echoCapacityPerLevel;
    const memoryCatalystBonus =
      (meta.upgrades.memoryCatalyst ?? 0) * BALANCE.upgradeEffects.memoryCatalystBonusPerLevel;

    return {
      stability,
      kickZone,
      spinSpeed,
      surgeCooldownReduction,
      echoBonus,
      memoryCatalystBonus,
    };
  }

  // === Totem management ===

  static unlockTotem(meta: MetaState, totemId: string): MetaState {
    if (meta.unlockedTotems.includes(totemId)) {
      return meta;
    }
    return {
      ...meta,
      upgrades: { ...meta.upgrades },
      unlockedTotems: [...meta.unlockedTotems, totemId],
    };
  }

  static setActiveTotem(meta: MetaState, totemId: string): MetaState {
    if (!meta.unlockedTotems.includes(totemId)) {
      return meta;
    }
    return {
      ...meta,
      upgrades: { ...meta.upgrades },
      unlockedTotems: [...meta.unlockedTotems],
      activeTotemId: totemId,
    };
  }

  static getActiveTotemConfig(meta: MetaState): TotemConfig {
    return getTotemById(meta.activeTotemId);
  }

  // === Daily seed ===

  static generateDailySeed(): string {
    const dateStr = todayString();
    const hash = hashString(`${dateStr}:${SEED_SALT}`);
    return hash.toString(36);
  }

  static isDailySeed(meta: MetaState): boolean {
    return meta.dailySeed === MetaProgression.generateDailySeed();
  }

  static refreshDailySeed(meta: MetaState): MetaState {
    const today = todayString();
    if (meta.lastPlayedDate !== today) {
      return {
        ...meta,
        upgrades: { ...meta.upgrades },
        unlockedTotems: [...meta.unlockedTotems],
        dailySeed: MetaProgression.generateDailySeed(),
        lastPlayedDate: today,
      };
    }
    return meta;
  }

  // === Reset ===

  static reset(): MetaState {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (e) {
      console.warn('[MetaProgression] Failed to remove save key.', e);
    }
    return MetaProgression.getDefault();
  }

  // === Internal helpers ===

  /** Merge a parsed (untrusted) object with defaults, validating all required fields. */
  private static mergeWithDefaults(parsed: unknown): MetaState {
    const defaults = MetaProgression.getDefault();

    if (typeof parsed !== 'object' || parsed === null) {
      return defaults;
    }

    const obj = parsed as Record<string, unknown>;

    const totalFragments =
      typeof obj.totalFragments === 'number' && Number.isFinite(obj.totalFragments)
        ? obj.totalFragments
        : defaults.totalFragments;

    let upgrades = { ...defaults.upgrades };
    if (obj.upgrades && typeof obj.upgrades === 'object') {
      const up = obj.upgrades as Record<string, unknown>;
      if (typeof up.totemSpinSpeed === 'number') upgrades.totemSpinSpeed = up.totemSpinSpeed;
      if (typeof up.startingStability === 'number') upgrades.startingStability = up.startingStability;
      if (typeof up.kickZoneBonus === 'number') upgrades.kickZoneBonus = up.kickZoneBonus;
      if (typeof up.lucidSurgeCooldown === 'number') upgrades.lucidSurgeCooldown = up.lucidSurgeCooldown;
      if (typeof up.echoCapacity === 'number') upgrades.echoCapacity = up.echoCapacity;
      if (typeof up.memoryCatalyst === 'number') upgrades.memoryCatalyst = up.memoryCatalyst;
    }

    const unlockedTotems =
      Array.isArray(obj.unlockedTotems) && obj.unlockedTotems.every((t) => typeof t === 'string')
        ? (obj.unlockedTotems as string[])
        : defaults.unlockedTotems;

    const activeTotemId =
      typeof obj.activeTotemId === 'string' ? obj.activeTotemId : defaults.activeTotemId;

    const runsCompleted =
      typeof obj.runsCompleted === 'number' && Number.isFinite(obj.runsCompleted)
        ? obj.runsCompleted
        : defaults.runsCompleted;

    const bestDepth =
      typeof obj.bestDepth === 'number' && Number.isFinite(obj.bestDepth)
        ? obj.bestDepth
        : defaults.bestDepth;

    const bestFragments =
      typeof obj.bestFragments === 'number' && Number.isFinite(obj.bestFragments)
        ? obj.bestFragments
        : defaults.bestFragments;

    const dailySeed =
      typeof obj.dailySeed === 'string' ? obj.dailySeed : defaults.dailySeed;

    const lastPlayedDate =
      typeof obj.lastPlayedDate === 'string' ? obj.lastPlayedDate : defaults.lastPlayedDate;

    return {
      totalFragments,
      upgrades,
      unlockedTotems,
      activeTotemId,
      runsCompleted,
      bestDepth,
      bestFragments,
      dailySeed,
      lastPlayedDate,
    };
  }
}
