// Rasa Engine HUD reminder: the field notebook surfaces learning, shared safety, and consequence without reducing the journey to a ledger.
export type TraitKey = "viveka" | "sahas" | "karuna";
export type MaterialId = "mapFragment" | "copperFitting" | "waterReed" | "shelterCloth" | "mangroveResin" | "saltLeaf" | "confluenceSeal" | "observatoryFolio";
type HudMaterials = Record<Exclude<MaterialId, "confluenceSeal" | "observatoryFolio">, number> & Partial<Record<"confluenceSeal" | "observatoryFolio", number>>;

export type HudState = {
  chapter: string;
  questTitle: string;
  questDetail: string;
  glyphs: number;
  glyphGoal: number;
  traits: Record<TraitKey, number>;
  pulseReady: boolean;
  choiceOpen: boolean;
  choiceMode: "stance" | "public" | "stewardship" | "memory" | "corroboration" | "confluence" | "observatory" | "survey";
  demo: boolean;
  season: string;
  timeOfDay: string;
  notice: string;
  materials: HudMaterials;
  routeComplete: boolean;
  routeConsequence: string;
  routeSeal: boolean;
  taraBond: number;
  taraQuest: number;
  milestone: string;
  stability: number;
  rasaTechnique: string;
  rasaOutcome: string;
  advancedTechnique: string;
  arunaEvidence: number;
  layaPractice: number;
  taraStormQuest: number;
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
  taraUnboundJournal: string;
  journeyMode: "new" | "continue" | "new-plus";
  openAlmanacReady: boolean;
  lineageChamberLayers: number;
  lineageChamberComplete: boolean;
  fourfoldComparison: string;
  chapterTwelveSignal: string;
  lineageDrillBest: number;
  lineageDrillSeason: string;
};

const initialState: HudState = {
  chapter: "Chapter I · Ashraya Vana",
  questTitle: "Preparing the Ashram",
  questDetail: "The morning study circles are being set in order.",
  glyphs: 0,
  glyphGoal: 4,
  traits: { viveka: 48, sahas: 36, karuna: 42 },
  pulseReady: true,
  choiceOpen: false,
  choiceMode: "stance",
  demo: false,
  season: "Vasanta · renewal",
  timeOfDay: "Dawn study",
  notice: "The path begins with attention.",
  materials: { mapFragment: 0, copperFitting: 0, waterReed: 0, shelterCloth: 0, mangroveResin: 0, saltLeaf: 0, confluenceSeal: 0, observatoryFolio: 0 },
  routeComplete: false,
  routeConsequence: "",
  routeSeal: false,
  taraBond: 0,
  taraQuest: 0,
  milestone: "",
  stability: 100,
  rasaTechnique: "",
  rasaOutcome: "",
  advancedTechnique: "",
  arunaEvidence: 0,
  layaPractice: 0,
  taraStormQuest: 0,
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
  taraUnboundJournal: "",
  journeyMode: "new",
  openAlmanacReady: false,
  lineageChamberLayers: 0,
  lineageChamberComplete: false,
  fourfoldComparison: "",
  chapterTwelveSignal: "",
  lineageDrillBest: 0,
  lineageDrillSeason: "",
};

export class HudBridge {
  private state: HudState = initialState;
  private listeners = new Set<(state: HudState) => void>();
  // Accessibility state shared with the Babylon layer. This is intentionally
  // kept separate from HudState so it does not trigger HUD re-renders; the 3D
  // systems (AmbientLife, CinematicCamera, Player, worlds) read it directly.
  reducedMotion = false;

  subscribe(listener: (state: HudState) => void) {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  patch(next: Partial<HudState>) {
    this.state = {
      ...this.state,
      ...next,
      traits: next.traits ? { ...next.traits } : this.state.traits,
      materials: next.materials ? { ...next.materials } : this.state.materials,
    };
    this.listeners.forEach((listener) => listener(this.state));
  }

  setReducedMotion(enabled: boolean) { this.reducedMotion = enabled; }
}
