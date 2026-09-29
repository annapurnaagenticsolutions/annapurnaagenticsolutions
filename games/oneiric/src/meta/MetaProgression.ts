// ONEIRIC — MetaProgression
// Handles localStorage save/load, fragment spending, upgrades, and daily seed.
// All mutating methods return NEW MetaState objects (immutable). Never mutate input.

import type { MetaState, TotemConfig } from '../types';
import { BALANCE } from '../data/balance';
import { getTotemById, TOTEMS } from '../data/totems';

const SAVE_KEY = 'oneiric_save';
const SEED_SALT = 'oneiric-dream-salt-v1';

type UpgradeType =
  | 'totemSpinSpeed'
  | 'startingStability'
  | 'kickZoneBonus'
  | 'lucidSurgeCooldown'
  | 'echoCapacity'
  | 'memoryCatalyst';

const KNOWN_TOTEMS = new Set(TOTEMS.map(totem => totem.id));

function isNaturalNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function naturalNumber(value: unknown, fallback = 0): number {
  return isNaturalNumber(value) ? value : fallback;
}

function isUpgradeType(value: string): value is UpgradeType {
  return Object.prototype.hasOwnProperty.call(BALANCE.upgradeCosts, value);
}

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
    if (!isUpgradeType(upgradeType) || !isNaturalNumber(meta.totalFragments)) {
      return { success: false, newMeta: meta, error: 'INVALID_STATE' };
    }
    const currentLevel = meta.upgrades[upgradeType];
    const costs = BALANCE.upgradeCosts[upgradeType];
    if (!isNaturalNumber(currentLevel) || currentLevel > costs.length) {
      return { success: false, newMeta: meta, error: 'INVALID_STATE' };
    }
    if (currentLevel === costs.length) {
      return { success: false, newMeta: meta, error: 'MAXED' };
    }
    const cost = costs[currentLevel];
    if (!isNaturalNumber(cost)) {
      return { success: false, newMeta: meta, error: 'INVALID_STATE' };
    }

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
    if (!isUpgradeType(upgradeType)) return null;
    const level = meta.upgrades[upgradeType];
    const costs = BALANCE.upgradeCosts[upgradeType];
    if (!isNaturalNumber(level) || level >= costs.length) return null;
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
    if (!KNOWN_TOTEMS.has(totemId) || meta.unlockedTotems.includes(totemId)) {
      return meta;
    }
    return {
      ...meta,
      upgrades: { ...meta.upgrades },
      unlockedTotems: [...meta.unlockedTotems, totemId],
    };
  }

  static setActiveTotem(meta: MetaState, totemId: string): MetaState {
    if (!KNOWN_TOTEMS.has(totemId) || !meta.unlockedTotems.includes(totemId)) {
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

    const totalFragments = naturalNumber(obj.totalFragments);
    const upgrades = { ...defaults.upgrades };
    if (obj.upgrades && typeof obj.upgrades === 'object' && !Array.isArray(obj.upgrades)) {
      const up = obj.upgrades as Record<string, unknown>;
      for (const key of Object.keys(upgrades) as UpgradeType[]) {
        const level = up[key];
        if (isNaturalNumber(level) && level <= BALANCE.upgradeCosts[key].length) {
          upgrades[key] = level;
        }
      }
    }
    const savedTotems = Array.isArray(obj.unlockedTotems) ? obj.unlockedTotems : [];
    const unlockedTotems = [...new Set([
      ...defaults.unlockedTotems,
      ...savedTotems.filter((id): id is string => typeof id === 'string' && KNOWN_TOTEMS.has(id)),
    ])];
    const activeTotemId = typeof obj.activeTotemId === 'string' && unlockedTotems.includes(obj.activeTotemId)
      ? obj.activeTotemId : defaults.activeTotemId;
    const runsCompleted = naturalNumber(obj.runsCompleted);
    const bestDepth = naturalNumber(obj.bestDepth);
    const bestFragments = naturalNumber(obj.bestFragments);

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
