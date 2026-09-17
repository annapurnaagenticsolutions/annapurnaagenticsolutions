import { CompanionKey, GameState, ProsperityStage, SlimeKey, StatKey } from "./types";

/* ------------------------------------------------------------------ */
/* Completed journey storage                                          */
/* ------------------------------------------------------------------ */

export const JOURNEYS_STORAGE_KEY = "varsha-hollow-completed-journals";

export type CompletedJourney = {
  id: string;
  endingChapterId: number;
  endingTitle: string;
  endingSummaryBeat: string;
  stats: GameState["stats"];
  relationships: GameState["relationships"];
  villageProgress: number;
  unlockedSlimes: SlimeKey[];
  keyChoices: Array<{
    chapterId: number;
    chapterTitle: string;
    choiceLabel: string;
    consequence: string;
  }>;
  history: GameState["history"];
  dateCompleted: string;
};

export function readCompletedJourneys(): CompletedJourney[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(JOURNEYS_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as CompletedJourney[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function saveCompletedJourney(journey: CompletedJourney): CompletedJourney[] {
  if (typeof window === "undefined") return [];
  const existing = readCompletedJourneys();
  const next = [journey, ...existing].slice(0, 12);
  window.localStorage.setItem(JOURNEYS_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function clearCompletedJourneys(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(JOURNEYS_STORAGE_KEY);
}

/* ------------------------------------------------------------------ */
/* Stat listening-style descriptors                                   */
/* ------------------------------------------------------------------ */

export function statDescriptor(stats: GameState["stats"]): string {
  const entries = (Object.keys(stats) as StatKey[]).map((key) => ({ key, value: stats[key] }));
  entries.sort((a, b) => b.value - a.value);
  const top = entries[0];
  if (top.value === entries[entries.length - 1].value) {
    return "You listened with equal measure of heart, mind, and hands.";
  }
  if (top.key === "Empathy") return "You listened with your heart before all else.";
  if (top.key === "Wisdom") return "You listened with your mind, reading what the rain remembered.";
  return "You listened with your hands, building what could hold.";
}

/* ------------------------------------------------------------------ */
/* Prosperity stage descriptions                                      */
/* ------------------------------------------------------------------ */

export const PROSPERITY_DESCRIPTIONS: Record<ProsperityStage, string> = {
  Survival: "The village barely holds. Forty roofs still leak, the channels stay dry, and every morning is a negotiation with hunger.",
  Recovery: "First repairs settle into the walls. Cautious hope moves between households, and the square remembers the sound of its own voice.",
  Connection: "The village works together as a single body. The market opens, the clinic fills, and trust becomes a currency worth more than grain.",
  Growth: "The village thrives. Trade reaches beyond the valley, the bridge stands, and children name the slimes that share their work.",
  Identity: "The village has become something new. The rain shrine teaches what it learned, and Varsha Hollow gives its name to a way of caring.",
};

/* ------------------------------------------------------------------ */
/* Companion epilogues                                                */
/* ------------------------------------------------------------------ */

export type EpilogueTier = "low" | "medium" | "high";

export function epilogueTier(value: number): EpilogueTier {
  if (value >= 8) return "high";
  if (value >= 4) return "medium";
  return "low";
}

export const COMPANION_EPILOGUES: Record<CompanionKey, Record<EpilogueTier, string>> = {
  Meera: {
    low: "Meera kept her distance after the last roof was finished. She nodded once across the square, the way one nods to weather that has passed, and returned to her beams.",
    medium: "Meera stayed through the final repairs, her hands steady beside yours. She did not say much. She did not need to. The bridge stood, and that was the conversation.",
    high: "Meera built the last arch with you beside her, and when the river tested it she did not look away. She rested her hand on the stone the way one rests a hand on a shoulder, and the bridge held the both of you.",
  },
  Leela: {
    low: "Leela closed her ledger the day trade resumed and left the square without a word. The contracts held. The numbers were honest. That was all she owed the village, and all the village received.",
    medium: "Leela stayed to see the market find its feet, her slate board tucked under one arm. She counted the season fair, counted herself fairly too, and walked the road when the work was done.",
    high: "Leela rewrote the market code in your hand and hers, page by page, until the rules belonged to no single person. She kept the original ledger. She said it was for the archive. It was for the two of you.",
  },
  Tara: {
    low: "Tara folded her maps and took the western road before the second monsoon. She left a copy pinned to the shrine door, the corners weighted with river stones, and no note beneath it.",
    medium: "Tara stayed long enough to see her maps become the village's first textbook. She traced the deepest channel with her finger one last time, then let the page belong to everyone.",
    high: "Tara walked every channel with you before she left, naming the turns the way one names a path home. She gave you the original map, the one that contradicted every archive, and said the valley was yours to read now.",
  },
  Kabir: {
    low: "Kabir packed his clinic quietly and moved it uphill without asking for help. He left a poultice at your door and a note that read only: for the shoulder you did not mention.",
    medium: "Kabir stayed through the season, his notes growing thicker than his patience. He documented the recovery carefully, and the clinic became a place where uncertainty was allowed to sit down.",
    high: "Kabir kept his grandfather's notes beside your listening practice, and the two stacks became one discipline. He did not call it friendship. He called it a complete record, and his hands did not shake when he wrote it.",
  },
  Dev: {
    low: "Dev counted the village safe and stepped back to the watch-house. He did not attend the closing gathering. His work was done, and done meant done, and the rope line stayed coiled where he left it.",
    medium: "Dev stayed until every household was counted and every road was clear. He stood at the edge of the square while the village celebrated, watching the way he always watched, and that was his way of being there.",
    high: "Dev stood beside you at the shrine door after the last storm, neither of them speaking. He placed his hand on the lintel the way one steadies a frightened animal, and the village was safe because he never stopped counting it.",
  },
};

/* ------------------------------------------------------------------ */
/* Slime reflections                                                  */
/* ------------------------------------------------------------------ */

export const SLIME_REFLECTIONS: Record<SlimeKey, string> = {
  Dew: "The Dew slimes learned that their gift could travel through kindness, not command. They still gather at the reservoir each morning, patient as the first light.",
  Clay: "The Clay slimes shaped shelter before they shaped walls. They remember the feeling of a safe home, and every brick they make carries that memory forward.",
  Lantern: "The Lantern slimes lit the path no one remembered. They glow brightest beside buried water, keeping a promise older than the village that sealed it.",
  Herb: "The Herb slimes read the health of soil and skin with a gentleness that asked for nothing. The clinic garden grew around them, and they grew around the clinic.",
  Echo: "The Echo slimes mapped danger through returning sound. They taught the village that listening is a form of courage, and that silence is never empty.",
};

/* ------------------------------------------------------------------ */
/* Key choice selection                                               */
/* ------------------------------------------------------------------ */

export function selectKeyChoices(
  history: GameState["history"],
  max = 4,
): Array<{
  chapterId: number;
  chapterTitle: string;
  choiceLabel: string;
  consequence: string;
}> {
  if (history.length === 0) return [];
  // Prefer branch points, endings, and companion-defining moments.
  const branchChapterIds = new Set([5, 13, 18, 24, 25, 35, 36]);
  const scored = history.map((entry, index) => {
    let score = 0;
    if (branchChapterIds.has(entry.chapterId)) score += 10;
    if (entry.consequence.length > 90) score += 3;
    score += Math.min(2, index);
    return { entry, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const picked = scored.slice(0, max).map((item) => item.entry);
  // Restore chronological order.
  picked.sort((a, b) => a.chapterId - b.chapterId);
  return picked;
}
