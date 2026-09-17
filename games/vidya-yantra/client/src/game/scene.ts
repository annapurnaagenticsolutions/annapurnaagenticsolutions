// Rasa Engine design reminder: Babylon owns the observatory; React frames it with a ceremonial field-instrument HUD.
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Engine } from "@babylonjs/core/Engines/engine";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Scene } from "@babylonjs/core/scene";
import { GameWorld } from "./GameWorld";
import { MonsoonWorld } from "./MonsoonWorld";
import { RoadWorld } from "./RoadWorld";
import { RasaWorld } from "./RasaWorld";
import { ArchiveWorld } from "./ArchiveWorld";
import { EstuaryWorld } from "./EstuaryWorld";
import { SaltLibraryWorld } from "./SaltLibraryWorld";
import { MirrorStepWorld } from "./MirrorStepWorld";
import { ConfluenceWorld } from "./ConfluenceWorld";
import { ReturnObservatoryWorld } from "./ReturnObservatoryWorld";
import { LivingSurveyWorld } from "./LivingSurveyWorld";
import { LineageChamberWorld } from "./LineageChamberWorld";
import { HudBridge, type HudState, type TraitKey } from "./HudBridge";

export type JourneyContext = {
  routeComplete: boolean;
  routeConsequence: string;
  taraBond: number;
  taraQuest: number;
  taraStormQuest: number;
  rasaTechnique: string;
  advancedTechnique: string;
  arunaEvidenceComplete: boolean;
  layaPracticeComplete: boolean;
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
  returnObservatoryReady?: boolean;
  returnWindows?: number;
  returnObservatoryComplete?: boolean;
  revisionCompass?: string;
  amendmentChoice?: string;
  observatoryDrillBest?: number;
  observatoryDrillSeason?: string;
  taraReturnLine?: boolean;
  chapterElevenSignal?: string;
  chapterElevenReady?: boolean;
  livingSurveyUnlocked?: boolean;
  livingSurveyMarks?: number;
  livingSurveyComplete?: boolean;
  terrainRegister?: string;
  varianceChoice?: string;
  variancePublication?: string;
  surveyorEncountered?: boolean;
  surveyDrillBest?: number;
  surveyDrillSeason?: string;
  campaignComplete?: boolean;
  epilogueSeen?: boolean;
  homecomingComplete?: boolean;
  lineageComparisonViewed?: boolean;
  lineageComparisonLayer?: "earlier" | "amendment" | "variance" | "reader";
  sourceLedgerFilter?: "all" | "observation" | "inference" | "testimony" | "amendment" | "variance";
  surveyNoPulse?: boolean;
  surveyChallengeBest?: number;
  taraUnboundJournal?: string;
  journeyMode?: "new" | "continue" | "new-plus";
  openAlmanacReady?: boolean;
  lineageChamberLayers?: number;
  lineageChamberComplete?: boolean;
  fourfoldComparison?: string;
  chapterTwelveSignal?: string;
  lineageDrillBest?: number;
  lineageDrillSeason?: string;
  measuredStep: boolean;
};

export type GameHandle = {
  scene: Scene;
  dispose: () => void;
  subscribeHud: (listener: (state: HudState) => void) => () => void;
  chooseStance: (trait: TraitKey) => void;
  advanceSeason: () => void;
  advanceTime: () => void;
  inquireGuide: (guide: "rishi" | "muni" | "raja") => void;
  setReducedMotion: (enabled: boolean) => void;
};

export async function createGameScene(engine: Engine, _canvas: HTMLCanvasElement, biome: "ashram" | "road" | "rasa" | "monsoon" | "archive" | "estuary" | "saltLibrary" | "mirrorStep" | "confluence" | "returnObservatory" | "livingSurvey" | "lineageChamber" = "ashram", rasaPrepared = false, context?: JourneyContext, reducedMotion = false): Promise<GameHandle> {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.027, 0.047, 0.11, 1);

  const camera = new ArcRotateCamera("observatory-camera", -Math.PI / 2.34, 1.08, 18.4, new Vector3(0, 0.5, 0), scene);
  camera.lowerRadiusLimit = 17.8;
  camera.upperRadiusLimit = 19.2;
  camera.lowerBetaLimit = 0.88;
  camera.upperBetaLimit = 1.18;
  camera.fov = 0.87;

  // Responsive camera framing. In portrait (tall) viewports the default
  // landscape framing crops the apprentice and the instrument ring; widen the
  // FOV and pull the radius in so the scene composes on phones held upright.
  // Landscape restores the original observatory framing.
  const applyOrientation = () => {
    const portrait = window.innerWidth < window.innerHeight;
    if (portrait) {
      camera.fov = 1.02;
      camera.lowerRadiusLimit = 15.6;
      camera.upperRadiusLimit = 17.4;
      if (camera.radius > 17.4) camera.radius = 17.4;
    } else {
      camera.fov = 0.87;
      camera.lowerRadiusLimit = 17.8;
      camera.upperRadiusLimit = 19.2;
      if (camera.radius < 17.8) camera.radius = 17.8;
    }
  };
  applyOrientation();
  window.addEventListener("resize", applyOrientation);
  window.addEventListener("orientationchange", applyOrientation);

  const skyLight = new HemisphericLight("indigo-sky-light", new Vector3(0.2, 1, -0.15), scene);
  skyLight.diffuse = Color3.FromHexString("#C7DBF2");
  skyLight.groundColor = Color3.FromHexString("#312110");
  skyLight.intensity = 0.72;

  const sun = new DirectionalLight("saffron-sun", new Vector3(-0.45, -1, 0.35), scene);
  sun.position = new Vector3(6, 12, -8);
  sun.diffuse = Color3.FromHexString("#F6C282");
  sun.intensity = 0.8;

  const hud = new HudBridge();
  hud.reducedMotion = reducedMotion;
  const demo = new URLSearchParams(window.location.search).has("demo");
  const world = biome === "lineageChamber" ? new LineageChamberWorld(scene, camera, hud, demo, context) : biome === "livingSurvey" ? new LivingSurveyWorld(scene, camera, hud, demo, context) : biome === "returnObservatory" ? new ReturnObservatoryWorld(scene, camera, hud, demo, context) : biome === "confluence" ? new ConfluenceWorld(scene, camera, hud, demo, context) : biome === "mirrorStep" ? new MirrorStepWorld(scene, camera, hud, demo, context) : biome === "saltLibrary" ? new SaltLibraryWorld(scene, camera, hud, demo, context) : biome === "estuary" ? new EstuaryWorld(scene, camera, hud, demo, context) : biome === "archive" ? new ArchiveWorld(scene, camera, hud, demo, context) : biome === "monsoon" ? new MonsoonWorld(scene, camera, hud, demo, context) : biome === "rasa" ? new RasaWorld(scene, camera, hud, rasaPrepared, demo) : biome === "road" ? new RoadWorld(scene, camera, hud, demo, context) : new GameWorld(scene, camera, hud, demo, context);
  scene.onBeforeRenderObservable.add(() => world.update(scene.getEngine().getDeltaTime() / 1000));

  return {
    scene,
    dispose: () => {
      window.removeEventListener("resize", applyOrientation);
      window.removeEventListener("orientationchange", applyOrientation);
      world.dispose();
      scene.dispose();
    },
    subscribeHud: (listener) => hud.subscribe(listener),
    chooseStance: world.chooseStance,
    advanceSeason: world.advanceSeason,
    advanceTime: world.advanceTime,
    inquireGuide: world.inquireGuide,
    setReducedMotion: (enabled) => hud.setReducedMotion(enabled),
  };
}
