export type StatKey = "Empathy" | "Wisdom" | "Practicality";
export type CompanionKey = "Meera" | "Leela" | "Tara" | "Kabir" | "Dev";
export type SlimeKey = "Dew" | "Clay" | "Lantern" | "Herb" | "Echo";
export type ProsperityStage = "Survival" | "Recovery" | "Connection" | "Growth" | "Identity";

export type Stats = Record<StatKey, number>;
export type Relationships = Record<CompanionKey, number>;

/**
 * The dual-path system. At game start the player chooses between:
 * - "listener" — the contemplative path (no resources, no failure states)
 * - "keeper"   — the survival path (resources, time pressure, failure states)
 */
export type GamePath = "listener" | "keeper";

/**
 * Village resources tracked only on the Keeper's Path. `days` is the number of
 * days remaining before the monsoon arrives. On the Listener's Path this is
 * always null and resource effects on choices are ignored.
 */
export type Resources = {
  timber: number;
  grain: number;
  clay: number;
  herbs: number;
  days: number;
};

export type ChoiceEffect = {
  stats?: Partial<Stats>;
  relationships?: Partial<Relationships>;
  villageDelta?: number;
  unlockSlime?: SlimeKey;
  nextChapterId?: number;
  consequence: string;
  /** Resources spent by this choice. Only applied on the Keeper's Path. */
  resourceCost?: Partial<Resources>;
  /** Resources gained by this choice. Only applied on the Keeper's Path. */
  resourceGain?: Partial<Resources>;
  /** Days consumed by this choice (Keeper's Path only). */
  dayCost?: number;
};

/**
 * Optional gating for a narrative choice. When present, the choice only
 * appears (and is only accepted by the reducer) if every supplied condition
 * is satisfied by the current game state.
 */
export type ChoiceRequires = {
  /** Minimum stat values required for the choice to appear. */
  stat?: Partial<Stats>;
  /** Minimum relationship values required for the choice to appear. */
  relationship?: Partial<Relationships>;
  /** A slime that must already be unlocked. */
  slime?: SlimeKey;
  /** Village progress must be strictly above this value. */
  villageProgressAbove?: number;
  /** Village progress must be strictly below this value. */
  villageProgressBelow?: number;
  /**
   * Minimum resources required for the choice to appear. Only checked on the
   * Keeper's Path (when `state.resources` is not null). Ignored on the
   * Listener's Path.
   */
  resourceMinimum?: Partial<Resources>;
};

export type NarrativeChoice = {
  id: string;
  label: string;
  tone: "empathy" | "wisdom" | "practicality";
  effect: ChoiceEffect;
  /** Optional state gate. Existing choices without `requires` always show. */
  requires?: ChoiceRequires;
};

/**
 * A paragraph appended to a chapter's static body only when its condition
 * is met by the current game state. Conditional content is additive.
 */
export type ConditionalParagraph = {
  text: string;
  condition: (state: GameState) => boolean;
};

/**
 * A state-reactive text variation. The `base` text is shown by default; the
 * first variant whose condition is met replaces it. If no variant matches,
 * the base text is used. Allows a single paragraph to shift tone based on
 * the player's build (e.g. a companion's warmth changes with relationship).
 */
export type StateVariant = {
  base: string;
  variants: Array<{ text: string; condition: (state: GameState) => boolean }>;
};

/**
 * Companion dialogue variation. When a companion is mentioned, their spoken
 * line can vary by relationship level. The first variant whose condition is
 * met is used; otherwise the base line is shown.
 */
export type CompanionDialogue = {
  companion: CompanionKey;
  base: string;
  variants: Array<{ text: string; condition: (state: GameState) => boolean }>;
};

export type Chapter = {
  id: number;
  arc: string;
  title: string;
  chapterNumber: string;
  location: string;
  weather: string;
  opening: string;
  body: string[];
  choices: NarrativeChoice[];
  summaryBeat?: string;
  isEnding?: boolean;
  /** Paragraphs appended to `body` when their conditions are met. */
  conditionalBody?: ConditionalParagraph[];
  /** Paragraphs in `body` that may be replaced by state-reactive variants. */
  reactiveBody?: StateVariant[];
  /** Companion dialogue lines that vary by relationship level. */
  companionDialogue?: CompanionDialogue[];
};

/** Resolve a StateVariant to the text that should render for the given state. */
export function resolveVariant(variant: StateVariant, state: GameState): string {
  for (const v of variant.variants) {
    if (v.condition(state)) return v.text;
  }
  return variant.base;
}

/** Resolve a CompanionDialogue to the line that should render. */
export function resolveDialogue(dialogue: CompanionDialogue, state: GameState): string {
  for (const v of dialogue.variants) {
    if (v.condition(state)) return v.text;
  }
  return dialogue.base;
}

/**
 * Returns true when every requirement in a `ChoiceRequires` gate is satisfied
 * by the current state. Choices without `requires` are always available.
 */
export function meetsRequirements(requires: ChoiceRequires | undefined, state: GameState): boolean {
  if (!requires) return true;
  if (requires.stat) {
    for (const [key, min] of Object.entries(requires.stat)) {
      const stat = key as StatKey;
      if (state.stats[stat] < (min ?? 0)) return false;
    }
  }
  if (requires.relationship) {
    for (const [key, min] of Object.entries(requires.relationship)) {
      const companion = key as CompanionKey;
      if (state.relationships[companion] < (min ?? 0)) return false;
    }
  }
  if (requires.slime && !state.unlockedSlimes.includes(requires.slime)) return false;
  if (requires.villageProgressAbove !== undefined && state.villageProgress <= requires.villageProgressAbove) return false;
  if (requires.villageProgressBelow !== undefined && state.villageProgress >= requires.villageProgressBelow) return false;
  // Resource minimums are only enforced on the Keeper's Path, where resources
  // are tracked. On the Listener's Path the gate is ignored so that choices
  // authored for both paths remain available to contemplative players.
  if (requires.resourceMinimum && state.path === "keeper" && state.resources) {
    for (const [key, min] of Object.entries(requires.resourceMinimum)) {
      const resource = key as keyof Resources;
      if (state.resources[resource] < (min ?? 0)) return false;
    }
  }
  return true;
}

export type ChoiceRecord = {
  chapterId: number;
  chapterTitle: string;
  choiceId: string;
  choiceLabel: string;
  consequence: string;
};

export type GameState = {
  started: boolean;
  currentChapterId: number;
  stats: Stats;
  relationships: Relationships;
  villageProgress: number;
  unlockedSlimes: SlimeKey[];
  history: ChoiceRecord[];
  lastConsequence: string | null;
  lastSummary: string | null;
  /**
   * The chosen play path. Defaults to "listener" for backward compatibility.
   * Optional so that legacy persisted/server saves (which predate the dual-path
   * system) remain assignable to GameState; hydration fills the default.
   */
  path?: GamePath;
  /** Village resources. Null/absent on the Listener's Path; populated on the Keeper's Path. */
  resources?: Resources | null;
  /** True when the Keeper's Path has ended in ruin. Always false on the Listener's Path. */
  failed?: boolean;
  /** Human-readable explanation when `failed` is true. */
  failureReason?: string | null;
};

export const STAT_KEYS: StatKey[] = ["Empathy", "Wisdom", "Practicality"];
export const COMPANION_KEYS: CompanionKey[] = ["Meera", "Leela", "Tara", "Kabir", "Dev"];
export const PROSPERITY_STAGES: ProsperityStage[] = [
  "Survival",
  "Recovery",
  "Connection",
  "Growth",
  "Identity",
];
export const SLIME_KEYS: SlimeKey[] = ["Dew", "Clay", "Lantern", "Herb", "Echo"];

export const INITIAL_STATE: GameState = {
  started: false,
  currentChapterId: 1,
  stats: { Empathy: 1, Wisdom: 1, Practicality: 1 },
  relationships: { Meera: 0, Leela: 0, Tara: 0, Kabir: 0, Dev: 0 },
  villageProgress: 10,
  unlockedSlimes: ["Dew"],
  history: [],
  lastConsequence: null,
  lastSummary: null,
  path: "listener",
  resources: null,
  failed: false,
  failureReason: null,
};

/**
 * Creates the starting resource pool for the Keeper's Path: enough to survive
 * a careful playthrough, but tight enough that wasteful choices can end in ruin
 * before the monsoon arrives.
 */
export function createKeeperResources(): Resources {
  return { timber: 8, grain: 12, clay: 6, herbs: 4, days: 30 };
}

/**
 * Resource threshold bands used by UI tone cues and (potentially) by future
 * narrative gating. Each resource has three bands: scarce, low, sufficient.
 */
export const RESOURCE_THRESHOLDS = {
  timber: { scarce: 2, low: 4, sufficient: 6 },
  grain: { scarce: 3, low: 6, sufficient: 9 },
  clay: { scarce: 1, low: 3, sufficient: 5 },
  herbs: { scarce: 1, low: 2, sufficient: 3 },
} as const;

export function getProsperityStage(progress: number): ProsperityStage {
  if (progress >= 80) return "Identity";
  if (progress >= 60) return "Growth";
  if (progress >= 40) return "Connection";
  if (progress >= 20) return "Recovery";
  return "Survival";
}
