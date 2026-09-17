import { CHAPTER_BY_ID } from "./chapters";
import {
  Chapter,
  createKeeperResources,
  GameState,
  GamePath,
  INITIAL_STATE,
  meetsRequirements,
  NarrativeChoice,
  Resources,
  SlimeKey,
} from "./types";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function createFreshState(): GameState {
  return {
    ...INITIAL_STATE,
    stats: { ...INITIAL_STATE.stats },
    relationships: { ...INITIAL_STATE.relationships },
    unlockedSlimes: [...INITIAL_STATE.unlockedSlimes],
    history: [],
    lastConsequence: null,
    lastSummary: null,
    path: INITIAL_STATE.path,
    resources: INITIAL_STATE.resources,
    failed: INITIAL_STATE.failed,
    failureReason: INITIAL_STATE.failureReason,
  };
}

export function beginJourney(state: GameState = createFreshState(), path: GamePath = "listener"): GameState {
  const next: GameState = {
    ...state,
    started: true,
    currentChapterId: 1,
    history: [],
    lastConsequence: null,
    lastSummary: null,
  };
  if (path === "keeper") {
    next.path = "keeper";
    next.resources = createKeeperResources();
    next.failed = false;
    next.failureReason = null;
  } else {
    next.path = "listener";
    next.resources = null;
    next.failed = false;
    next.failureReason = null;
  }
  return next;
}

/**
 * Evaluates whether the Keeper's Path has ended in ruin after a choice. The
 * three failure conditions are intentionally restrained:
 *  - days <= 0: the monsoon arrived before the village was ready
 *  - grain <= 0: the village ran out of food
 *  - timber <= 0 AND clay <= 0: no materials left to build with
 */
function checkFailure(resources: Resources): { failed: boolean; reason: string | null } {
  if (resources.days <= 0) return { failed: true, reason: "The monsoon arrived before the village was ready." };
  if (resources.grain <= 0) return { failed: true, reason: "The village ran out of food. Families left before the work was done." };
  if (resources.timber <= 0 && resources.clay <= 0) return { failed: true, reason: "The village had no materials left to build with." };
  return { failed: false, reason: null };
}

/**
 * Returns true when the player can afford the resource cost of a choice on the
 * Keeper's Path. A choice with no `resourceCost` is always affordable.
 */
function canAfford(resources: Resources, cost: Partial<Resources> | undefined): boolean {
  if (!cost) return true;
  for (const [key, amount] of Object.entries(cost)) {
    const resource = key as keyof Resources;
    if (resources[resource] < (amount ?? 0)) return false;
  }
  return true;
}

export function applyChoice(state: GameState, chapter: Chapter, choice: NarrativeChoice): GameState {
  // Reject gated choices the player does not currently qualify for. This
  // guards against stale UI, saved-state replays, or any path that submits a
  // choice whose `requires` gate is no longer satisfied.
  if (!meetsRequirements(choice.requires, state)) {
    return state;
  }

  // Keeper's Path: reject choices the player cannot afford. Resource effects
  // are only present on Keeper's Path choices, so this is a no-op on the
  // Listener's Path.
  if (state.path === "keeper" && state.resources) {
    if (!canAfford(state.resources, choice.effect.resourceCost)) {
      return state;
    }
  }

  const nextStats = { ...state.stats };
  for (const [key, delta] of Object.entries(choice.effect.stats ?? {})) {
    const stat = key as keyof typeof nextStats;
    nextStats[stat] = clamp(nextStats[stat] + (delta ?? 0), 0, 12);
  }

  const nextRelationships = { ...state.relationships };
  for (const [key, delta] of Object.entries(choice.effect.relationships ?? {})) {
    const companion = key as keyof typeof nextRelationships;
    nextRelationships[companion] = clamp(nextRelationships[companion] + (delta ?? 0), 0, 12);
  }

  const unlockedSlimes = [...state.unlockedSlimes];
  const slime = choice.effect.unlockSlime;
  if (slime && !unlockedSlimes.includes(slime)) unlockedSlimes.push(slime);

  const record = {
    chapterId: chapter.id,
    chapterTitle: chapter.title,
    choiceId: choice.id,
    choiceLabel: choice.label,
    consequence: choice.effect.consequence,
  };

  const rawNextId = choice.effect.nextChapterId ?? chapter.id + 1;
  const safeNextId = CHAPTER_BY_ID.has(rawNextId)
    ? rawNextId
    : CHAPTER_BY_ID.has(chapter.id + 1)
      ? chapter.id + 1
      : chapter.id;

  // Apply resource effects on the Keeper's Path. On the Listener's Path these
  // fields are absent and resources remain null.
  let nextResources = state.resources;
  let failed = state.failed;
  let failureReason = state.failureReason;
  if (state.path === "keeper" && nextResources) {
    const resources = { ...nextResources };
    if (choice.effect.resourceCost) {
      for (const [key, amount] of Object.entries(choice.effect.resourceCost)) {
        const resource = key as keyof Resources;
        resources[resource] = resources[resource] - (amount ?? 0);
      }
    }
    if (choice.effect.resourceGain) {
      for (const [key, amount] of Object.entries(choice.effect.resourceGain)) {
        const resource = key as keyof Resources;
        resources[resource] = resources[resource] + (amount ?? 0);
      }
    }
    if (choice.effect.dayCost) {
      resources.days = resources.days - choice.effect.dayCost;
    }
    const failure = checkFailure(resources);
    failed = failure.failed;
    failureReason = failure.reason;
    nextResources = resources;
  }

  return {
    ...state,
    started: true,
    currentChapterId: safeNextId,
    stats: nextStats,
    relationships: nextRelationships,
    villageProgress: clamp(state.villageProgress + (choice.effect.villageDelta ?? 0), 0, 100),
    unlockedSlimes,
    history: [...state.history, record],
    lastConsequence: choice.effect.consequence,
    lastSummary: chapter.summaryBeat ?? null,
    resources: nextResources,
    failed,
    failureReason,
  };
}

export function hasSlime(state: GameState, slime: SlimeKey) {
  return state.unlockedSlimes.includes(slime);
}
