// Next-journey design reminder: the Chronicle records evidence, practice, companionship, and public consequence as lived field notes, not a min-max ledger.
import type { MaterialId, TraitKey } from "./HudBridge";
import { chronicleSchema } from "./chronicleSchema";

export type SkillId = "starThread" | "measuredStep" | "rainwardPulse" | "shelterWeave";
export type GuideId = "rishi" | "muni" | "raja";
export type AccessibilityPreferences = { reducedMotion: boolean; largeText: boolean; highContrast: boolean; colorblind: boolean; muted: boolean };
// Per-biome ambient drone bed volume (0..1). Stored on the chronicle so the
// player's chosen atmosphere level survives across journeys on this device.
export type AmbientDroneBiome = "ashram" | "road" | "rasa" | "monsoon" | "archive" | "estuary" | "saltLibrary" | "mirrorStep" | "confluence" | "returnObservatory" | "livingSurvey" | "lineageChamber";

export type TravellerChronicle = {
  version: 1;
  chapter: "ashram" | "road" | "rasa" | "monsoon" | "archive" | "estuary" | "saltLibrary" | "mirrorStep" | "confluence" | "returnObservatory" | "livingSurvey" | "lineageChamber";
  traits: Record<TraitKey, number>;
  skills: Record<SkillId, boolean>;
  guideQuests: Record<GuideId, number>;
  choices: string[];
  unlockedLocations: string[];
  materials: Record<MaterialId, number>;
  routeComplete: boolean;
  routeConsequence: string;
  routeSeal: boolean;
  taraBond: number;
  taraQuest: number;
  milestones: string[];
  rasaTechnique: string;
  rasaOutcome: string;
  advancedTechnique: string;
  compassRepaired: boolean;
  rasaUnlocked: boolean;
  guideConsequences: Record<GuideId, string>;
  arunaEvidenceComplete: boolean;
  layaPracticeComplete: boolean;
  taraStormQuest: number;
  taraReward: string;
  stormfrontComplete: boolean;
  publicChoice: string;
  chapterFiveSignal: string;
  archiveUnlocked: boolean;
  archiveSignals: number;
  archiveComplete: boolean;
  archiveShard: number;
  taraArchiveRoute: number;
  archiveDrillBest: number;
  archiveDrillSeason: string;
  chapterSixSignal: string;
  estuaryUnlocked: boolean;
  estuarySignals: number;
  estuaryComplete: boolean;
  mangroveTechnique: string;
  stewardshipChoice: string;
  taraEstuaryRoute: number;
  tideDrillBest: number;
  tideDrillSeason: string;
  chapterSevenSignal: string;
  saltLibraryUnlocked: boolean;
  saltRecords: number;
  saltLibraryComplete: boolean;
  fieldAnnotation: string;
  saltMarshTechnique: string;
  memoryStewardship: string;
  taraSaltRoute: number;
  saltDrillBest: number;
  saltDrillSeason: string;
  chapterEightSignal: string;
  mirrorStepUnlocked: boolean;
  mirrorSources: number;
  mirrorStepComplete: boolean;
  countermarkLens: string;
  corroborationChoice: string;
  mirrorDrillBest: number;
  mirrorDrillSeason: string;
  mirrorStepOutcome: string;
  chapterNineSignal: string;
  confluenceReady: boolean;
  confluenceSources: number;
  confluenceComplete: boolean;
  routeBraid: string;
  publicRouteChoice: string;
  confluenceDrillBest: number;
  confluenceDrillSeason: string;
  taraUnboundLine: boolean;
  chapterTenSignal: string;
  chapterTenReady: boolean;
  returnObservatoryReady: boolean;
  returnWindows: number;
  returnObservatoryComplete: boolean;
  revisionCompass: string;
  amendmentChoice: string;
  observatoryDrillBest: number;
  observatoryDrillSeason: string;
  taraReturnLine: boolean;
  chapterElevenSignal: string;
  chapterElevenReady: boolean;
  livingSurveyUnlocked: boolean;
  livingSurveyMarks: number;
  livingSurveyComplete: boolean;
  terrainRegister: string;
  varianceChoice: string;
  variancePublication: string;
  surveyorEncountered: boolean;
  surveyDrillBest: number;
  surveyDrillSeason: string;
  campaignComplete: boolean;
  epilogueSeen: boolean;
  homecomingComplete: boolean;
  lineageComparisonViewed: boolean;
  lineageComparisonLayer: "earlier" | "amendment" | "variance" | "reader";
  sourceLedgerFilter: "all" | "observation" | "inference" | "testimony" | "amendment" | "variance";
  surveyNoPulse: boolean;
  surveyChallengeBest: number;
  newPlusChallengeBest: number;
  taraUnboundJournal: string;
  journeyMode: "new" | "continue" | "new-plus";
  openAlmanacReady: boolean;
  lineageChamberLayers: number;
  lineageChamberComplete: boolean;
  fourfoldComparison: string;
  chapterTwelveSignal: string;
  lineageDrillBest: number;
  lineageDrillSeason: string;
  captionsEnabled: boolean;
  heardExchanges: string[];
  accessibility: AccessibilityPreferences;
  ambientVolume: number;
};

const storageKey = "vidya-yantra-travellers-chronicle-v1";

export const skillCatalog: Record<SkillId, { discipline: string; name: string; copy: string; mark: string }> = {
  starThread: { discipline: "Shastra", name: "Star-thread Sight", copy: "Reveal relationships between clues, routes, and hidden instrument anchors.", mark: "✦" },
  measuredStep: { discipline: "Astra", name: "Measured Step", copy: "Read a moving hazard before choosing the safe moment to cross or act.", mark: "↗" },
  rainwardPulse: { discipline: "Prana", name: "Rainward Pulse", copy: "Tune water and wind nodes through a measured focus rhythm.", mark: "◌" },
  shelterWeave: { discipline: "Seva", name: "Shelter Weave", copy: "Create a short-lived refuge where repair, care, and travel can continue.", mark: "⌇" },
};

export const emptyChronicle = (): TravellerChronicle => ({
  version: 1,
  chapter: "ashram",
  traits: { viveka: 48, sahas: 36, karuna: 42 },
  skills: { starThread: false, measuredStep: false, rainwardPulse: false, shelterWeave: false },
  guideQuests: { rishi: 0, muni: 0, raja: 0 },
  choices: [],
  unlockedLocations: ["Ashraya Vana"],
  materials: { mapFragment: 0, copperFitting: 0, waterReed: 0, shelterCloth: 0, mangroveResin: 0, saltLeaf: 0, confluenceSeal: 0, observatoryFolio: 0 },
  routeComplete: false,
  routeConsequence: "",
  routeSeal: false,
  taraBond: 0,
  taraQuest: 0,
  milestones: [],
  rasaTechnique: "",
  rasaOutcome: "",
  advancedTechnique: "",
  compassRepaired: false,
  rasaUnlocked: false,
  guideConsequences: { rishi: "Aruna is waiting for a first careful observation.", muni: "Laya is waiting for practice to become a habit.", raja: "Somavrat is waiting to hear whose need the route will serve." },
  arunaEvidenceComplete: false,
  layaPracticeComplete: false,
  taraStormQuest: 0,
  taraReward: "",
  stormfrontComplete: false,
  publicChoice: "",
  chapterFiveSignal: "",
  archiveUnlocked: false,
  archiveSignals: 0,
  archiveComplete: false,
  archiveShard: 0,
  taraArchiveRoute: 0,
  archiveDrillBest: 0,
  archiveDrillSeason: "",
  chapterSixSignal: "",
  estuaryUnlocked: false,
  estuarySignals: 0,
  estuaryComplete: false,
  mangroveTechnique: "",
  stewardshipChoice: "",
  taraEstuaryRoute: 0,
  tideDrillBest: 0,
  tideDrillSeason: "",
  chapterSevenSignal: "",
  saltLibraryUnlocked: false,
  saltRecords: 0,
  saltLibraryComplete: false,
  fieldAnnotation: "",
  saltMarshTechnique: "",
  memoryStewardship: "",
  taraSaltRoute: 0,
  saltDrillBest: 0,
  saltDrillSeason: "",
  chapterEightSignal: "",
  mirrorStepUnlocked: false,
  mirrorSources: 0,
  mirrorStepComplete: false,
  countermarkLens: "",
  corroborationChoice: "",
  mirrorDrillBest: 0,
  mirrorDrillSeason: "",
  mirrorStepOutcome: "",
  chapterNineSignal: "",
  confluenceReady: false,
  confluenceSources: 0,
  confluenceComplete: false,
  routeBraid: "",
  publicRouteChoice: "",
  confluenceDrillBest: 0,
  confluenceDrillSeason: "",
  taraUnboundLine: false,
  chapterTenSignal: "",
  chapterTenReady: false,
  returnObservatoryReady: false,
  returnWindows: 0,
  returnObservatoryComplete: false,
  revisionCompass: "",
  amendmentChoice: "",
  observatoryDrillBest: 0,
  observatoryDrillSeason: "",
  taraReturnLine: false,
  chapterElevenSignal: "",
  chapterElevenReady: false,
  livingSurveyUnlocked: false,
  livingSurveyMarks: 0,
  livingSurveyComplete: false,
  terrainRegister: "",
  varianceChoice: "",
  variancePublication: "",
  surveyorEncountered: false,
  surveyDrillBest: 0,
  surveyDrillSeason: "",
  campaignComplete: false,
  epilogueSeen: false,
  homecomingComplete: false,
  lineageComparisonViewed: false,
  lineageComparisonLayer: "earlier",
  sourceLedgerFilter: "all",
  surveyNoPulse: false,
  surveyChallengeBest: 0,
  newPlusChallengeBest: 0,
  taraUnboundJournal: "",
  journeyMode: "new",
  openAlmanacReady: false,
  lineageChamberLayers: 0,
  lineageChamberComplete: false,
  fourfoldComparison: "",
  chapterTwelveSignal: "",
  lineageDrillBest: 0,
  lineageDrillSeason: "",
  captionsEnabled: true,
  heardExchanges: [],
  accessibility: { reducedMotion: false, largeText: false, highContrast: false, colorblind: false, muted: false },
  ambientVolume: 0.4,
});

export type LoadChronicleResult = { chronicle: TravellerChronicle; recovered: boolean; error?: string };

// Convenience wrapper for callers that only need the chronicle payload and do
// not need to surface a recovery toast (e.g. the in-game canvas state init).
export function loadChronicleData(): TravellerChronicle {
  return loadChronicle().chronicle;
}

export function loadChronicle(): LoadChronicleResult {
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return { chronicle: emptyChronicle(), recovered: false };
    const parsed = JSON.parse(stored) as Partial<TravellerChronicle>;
    const base = emptyChronicle();
    const merged: TravellerChronicle = { ...base, ...parsed, traits: { ...base.traits, ...parsed.traits }, skills: { ...base.skills, ...parsed.skills }, guideQuests: { ...base.guideQuests, ...parsed.guideQuests }, materials: { ...base.materials, ...parsed.materials }, guideConsequences: { ...base.guideConsequences, ...parsed.guideConsequences }, accessibility: { ...base.accessibility, ...parsed.accessibility }, ambientVolume: typeof parsed.ambientVolume === "number" ? parsed.ambientVolume : base.ambientVolume, choices: parsed.choices ?? [], milestones: parsed.milestones ?? [], unlockedLocations: parsed.unlockedLocations ?? base.unlockedLocations, heardExchanges: parsed.heardExchanges ?? [] };
    // Validate the merged save against the zod schema. If the save is
    // corrupted, schema-mismatched, or contains out-of-range values, fall
    // back to a fresh chronicle rather than letting bad data infect state.
    const result = chronicleSchema.safeParse(merged);
    if (!result.success) {
      console.warn("Chronicle save failed validation; starting fresh.", result.error.issues);
      return { chronicle: emptyChronicle(), recovered: true, error: "Saved journey could not be validated." };
    }
    return { chronicle: result.data as TravellerChronicle, recovered: false };
  } catch (error) {
    return { chronicle: emptyChronicle(), recovered: true, error: error instanceof Error ? error.message : "Saved journey could not be read." };
  }
}

export function saveChronicle(next: TravellerChronicle) { window.localStorage.setItem(storageKey, JSON.stringify(next)); }
export function clearChronicle() { window.localStorage.removeItem(storageKey); }
// Emergency backup used by the game error boundary so a crashed run can still
// be recovered from a separate localStorage slot.
const backupKey = "vidya_yantra_chronicle_backup";
export function backupChronicle(next: TravellerChronicle) { try { window.localStorage.setItem(backupKey, JSON.stringify(next)); } catch { /* storage may be unavailable; the live save is best-effort */ } }
export function loadBackupChronicle(): TravellerChronicle | null { try { const stored = window.localStorage.getItem(backupKey); if (!stored) return null; return JSON.parse(stored) as TravellerChronicle; } catch { return null; } }
export function clearBackupChronicle() { window.localStorage.removeItem(backupKey); }
