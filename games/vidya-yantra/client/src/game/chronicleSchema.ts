// Save-schema validation for the Traveller's Chronicle.
// Uses zod to validate the shape and types of loaded save data before it
// merges into live game state. A corrupted or schema-mismatched save falls
// back to emptyChronicle() instead of silently infecting the game.
import { z } from "zod";

// ── Enum/literal schemas ──────────────────────────────────────────────

const chapterSchema = z.enum([
  "ashram", "road", "rasa", "monsoon", "archive", "estuary",
  "saltLibrary", "mirrorStep", "confluence", "returnObservatory",
  "livingSurvey", "lineageChamber",
]);

const traitKeySchema = z.enum(["viveka", "sahas", "karuna"]);
const skillIdSchema = z.enum(["starThread", "measuredStep", "rainwardPulse", "shelterWeave"]);
const guideIdSchema = z.enum(["rishi", "muni", "raja"]);
const materialIdSchema = z.enum([
  "mapFragment", "copperFitting", "waterReed", "shelterCloth",
  "mangroveResin", "saltLeaf", "confluenceSeal", "observatoryFolio",
]);

const journeyModeSchema = z.enum(["new", "continue", "new-plus"]);
const lineageLayerSchema = z.enum(["earlier", "amendment", "variance", "reader"]);
const sourceLedgerFilterSchema = z.enum(["all", "observation", "inference", "testimony", "amendment", "variance"]);

// ── Reusable field schemas with range clamping ────────────────────────

const traitValue = z.number().min(0).max(100);
const bondValue = z.number().min(0).max(6);
const nonNegInt = z.number().min(0).int();

// ── Full Chronicle schema ─────────────────────────────────────────────
// Every field is validated for type; numerics are range-checked where a
// sensible bound exists. Unknown keys are stripped (zod default) so that
// a save with extra junk from a browser extension cannot pollute state.

export const chronicleSchema = z.object({
  version: z.literal(1),
  chapter: chapterSchema,
  traits: z.record(traitKeySchema, traitValue),
  skills: z.record(skillIdSchema, z.boolean()),
  guideQuests: z.record(guideIdSchema, nonNegInt),
  choices: z.array(z.string()),
  unlockedLocations: z.array(z.string()),
  materials: z.record(materialIdSchema, nonNegInt),
  routeComplete: z.boolean(),
  routeConsequence: z.string(),
  routeSeal: z.boolean(),
  taraBond: bondValue,
  taraQuest: nonNegInt,
  milestones: z.array(z.string()),
  rasaTechnique: z.string(),
  rasaOutcome: z.string(),
  advancedTechnique: z.string(),
  compassRepaired: z.boolean(),
  rasaUnlocked: z.boolean(),
  guideConsequences: z.record(guideIdSchema, z.string()),
  arunaEvidenceComplete: z.boolean(),
  layaPracticeComplete: z.boolean(),
  taraStormQuest: nonNegInt,
  taraReward: z.string(),
  stormfrontComplete: z.boolean(),
  publicChoice: z.string(),
  chapterFiveSignal: z.string(),
  archiveUnlocked: z.boolean(),
  archiveSignals: nonNegInt,
  archiveComplete: z.boolean(),
  archiveShard: nonNegInt,
  taraArchiveRoute: nonNegInt,
  archiveDrillBest: nonNegInt,
  archiveDrillSeason: z.string(),
  chapterSixSignal: z.string(),
  estuaryUnlocked: z.boolean(),
  estuarySignals: nonNegInt,
  estuaryComplete: z.boolean(),
  mangroveTechnique: z.string(),
  stewardshipChoice: z.string(),
  taraEstuaryRoute: nonNegInt,
  tideDrillBest: nonNegInt,
  tideDrillSeason: z.string(),
  chapterSevenSignal: z.string(),
  saltLibraryUnlocked: z.boolean(),
  saltRecords: nonNegInt,
  saltLibraryComplete: z.boolean(),
  fieldAnnotation: z.string(),
  saltMarshTechnique: z.string(),
  memoryStewardship: z.string(),
  taraSaltRoute: nonNegInt,
  saltDrillBest: nonNegInt,
  saltDrillSeason: z.string(),
  chapterEightSignal: z.string(),
  mirrorStepUnlocked: z.boolean(),
  mirrorSources: nonNegInt,
  mirrorStepComplete: z.boolean(),
  countermarkLens: z.string(),
  corroborationChoice: z.string(),
  mirrorDrillBest: nonNegInt,
  mirrorDrillSeason: z.string(),
  mirrorStepOutcome: z.string(),
  chapterNineSignal: z.string(),
  confluenceReady: z.boolean(),
  confluenceSources: nonNegInt,
  confluenceComplete: z.boolean(),
  routeBraid: z.string(),
  publicRouteChoice: z.string(),
  confluenceDrillBest: nonNegInt,
  confluenceDrillSeason: z.string(),
  taraUnboundLine: z.boolean(),
  chapterTenSignal: z.string(),
  chapterTenReady: z.boolean(),
  returnObservatoryReady: z.boolean(),
  returnWindows: nonNegInt,
  returnObservatoryComplete: z.boolean(),
  revisionCompass: z.string(),
  amendmentChoice: z.string(),
  observatoryDrillBest: nonNegInt,
  observatoryDrillSeason: z.string(),
  taraReturnLine: z.boolean(),
  chapterElevenSignal: z.string(),
  chapterElevenReady: z.boolean(),
  livingSurveyUnlocked: z.boolean(),
  livingSurveyMarks: nonNegInt,
  livingSurveyComplete: z.boolean(),
  terrainRegister: z.string(),
  varianceChoice: z.string(),
  variancePublication: z.string(),
  surveyorEncountered: z.boolean(),
  surveyDrillBest: nonNegInt,
  surveyDrillSeason: z.string(),
  campaignComplete: z.boolean(),
  epilogueSeen: z.boolean(),
  homecomingComplete: z.boolean(),
  lineageComparisonViewed: z.boolean(),
  lineageComparisonLayer: lineageLayerSchema,
  sourceLedgerFilter: sourceLedgerFilterSchema,
  surveyNoPulse: z.boolean(),
  surveyChallengeBest: nonNegInt,
  newPlusChallengeBest: nonNegInt,
  taraUnboundJournal: z.string(),
  journeyMode: journeyModeSchema,
  openAlmanacReady: z.boolean(),
  lineageChamberLayers: nonNegInt,
  lineageChamberComplete: z.boolean(),
  fourfoldComparison: z.string(),
  chapterTwelveSignal: z.string(),
  lineageDrillBest: nonNegInt,
  lineageDrillSeason: z.string(),
  captionsEnabled: z.boolean(),
  heardExchanges: z.array(z.string()),
  accessibility: z.object({
    reducedMotion: z.boolean(),
    largeText: z.boolean(),
    highContrast: z.boolean(),
    colorblind: z.boolean(),
    muted: z.boolean(),
  }),
  ambientVolume: z.number().min(0).max(1),
});

export type ValidatedChronicle = z.infer<typeof chronicleSchema>;
