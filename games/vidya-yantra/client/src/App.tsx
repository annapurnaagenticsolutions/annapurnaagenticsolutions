// Ashram-first design reminder: visitors enter through a story journal, then choose to step into the living game world.
/* Rasa Engine routing: the landing pilgrimage exposes every completed field chapter while game hashes remain the sole scene contract. */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import GameCanvas from "@/components/GameCanvas";
import GameErrorBoundary from "@/components/GameErrorBoundary";
import LandingPage from "@/components/LandingPage";
import { clearChronicle, emptyChronicle, loadChronicle, loadChronicleData, saveChronicle } from "@/game/Chronicle";
import { Toaster } from "@/components/ui/sonner";
import "./index.css";

export default function App() {
  const isDemo = new URLSearchParams(window.location.search).has("demo");
  const [landingChronicle, setLandingChronicle] = useState(() => loadChronicleData());
  useEffect(() => {
    const result = loadChronicle();
    if (result.recovered) toast("Your saved journey could not be loaded and was reset to the beginning.");
  }, []);
  const [biome, setBiome] = useState<"ashram" | "road" | "rasa" | "monsoon" | "archive" | "estuary" | "saltLibrary" | "mirrorStep" | "confluence" | "returnObservatory" | "livingSurvey" | "lineageChamber">(() => window.location.hash === "#lineage-chamber" || new URLSearchParams(window.location.search).get("chapter") === "lineage-chamber" ? "lineageChamber" : window.location.hash === "#living-survey" || new URLSearchParams(window.location.search).get("chapter") === "living-survey" ? "livingSurvey" : window.location.hash === "#return-observatory" || new URLSearchParams(window.location.search).get("chapter") === "return-observatory" ? "returnObservatory" : window.location.hash === "#confluence" || new URLSearchParams(window.location.search).get("chapter") === "confluence" ? "confluence" : window.location.hash === "#mirror-step" || new URLSearchParams(window.location.search).get("chapter") === "mirror-step" ? "mirrorStep" : window.location.hash === "#salt-library" || new URLSearchParams(window.location.search).get("chapter") === "salt-library" ? "saltLibrary" : window.location.hash === "#estuary" || new URLSearchParams(window.location.search).get("chapter") === "estuary" ? "estuary" : window.location.hash === "#archive" || new URLSearchParams(window.location.search).get("chapter") === "archive" ? "archive" : window.location.hash === "#monsoon" || new URLSearchParams(window.location.search).get("chapter") === "monsoon" ? "monsoon" : window.location.hash === "#rasa" ? "rasa" : window.location.hash === "#road" ? "road" : "ashram");
  const [screen, setScreen] = useState<"landing" | "game">(() => isDemo || window.location.hash === "#ashram" || window.location.hash === "#road" || window.location.hash === "#rasa" || window.location.hash === "#monsoon" || window.location.hash === "#archive" || window.location.hash === "#estuary" || window.location.hash === "#salt-library" || window.location.hash === "#mirror-step" || window.location.hash === "#confluence" || window.location.hash === "#return-observatory" || window.location.hash === "#living-survey" || window.location.hash === "#lineage-chamber" ? "game" : "landing");
  useEffect(() => {
    const syncHash = () => {
      if (window.location.hash === "#monsoon") { setBiome("monsoon"); setScreen("game"); }
      if (window.location.hash === "#archive") { setBiome("archive"); setScreen("game"); }
      if (window.location.hash === "#estuary") { setBiome("estuary"); setScreen("game"); }
      if (window.location.hash === "#salt-library") { setBiome("saltLibrary"); setScreen("game"); }
      if (window.location.hash === "#mirror-step") { setBiome("mirrorStep"); setScreen("game"); }
      if (window.location.hash === "#confluence") { setBiome("confluence"); setScreen("game"); }
      if (window.location.hash === "#return-observatory") { setBiome("returnObservatory"); setScreen("game"); }
      if (window.location.hash === "#living-survey") { setBiome("livingSurvey"); setScreen("game"); }
      if (window.location.hash === "#lineage-chamber") { setBiome("lineageChamber"); setScreen("game"); }
      if (window.location.hash === "#road") { setBiome("road"); setScreen("game"); }
      if (window.location.hash === "#rasa") { setBiome("rasa"); setScreen("game"); }
      if (window.location.hash === "#ashram") { setBiome("ashram"); setScreen("game"); }
    };
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);
  const enter = () => { setBiome("ashram"); window.location.hash = "ashram"; setScreen("game"); };
  const startNewJourney = () => { clearChronicle(); setLandingChronicle(loadChronicleData()); enter(); };
  const startNewJourneyPlus = () => { const prior = loadChronicleData(); const next = emptyChronicle(); next.journeyMode = "new-plus"; next.skills = { ...prior.skills }; next.traits = { ...prior.traits }; next.milestones = [...prior.milestones, "New Journey+ · mastery carried"]; next.taraBond = Math.max(1, Math.min(6, prior.taraBond)); saveChronicle(next); setLandingChronicle(next); enter(); };
  const travel = (destination: "ashram" | "road" | "rasa" | "monsoon" | "archive" | "estuary" | "saltLibrary" | "mirrorStep" | "confluence" | "returnObservatory" | "livingSurvey" | "lineageChamber") => { setBiome(destination); window.location.hash = destination === "saltLibrary" ? "salt-library" : destination === "mirrorStep" ? "mirror-step" : destination === "returnObservatory" ? "return-observatory" : destination === "livingSurvey" ? "living-survey" : destination === "lineageChamber" ? "lineage-chamber" : destination; setScreen("game"); };
  const exit = () => { setLandingChronicle(loadChronicleData()); window.history.replaceState(null, "", window.location.pathname); setScreen("landing"); };
  const hasJourney = landingChronicle.chapter !== "ashram" || landingChronicle.guideQuests.rishi > 0 || landingChronicle.guideQuests.muni > 0 || landingChronicle.guideQuests.raja > 0 || landingChronicle.routeComplete || landingChronicle.mirrorStepUnlocked;
  const carriedPractice = landingChronicle.countermarkLens || landingChronicle.fieldAnnotation || landingChronicle.mangroveTechnique || landingChronicle.rasaTechnique || (Object.values(landingChronicle.skills).some(Boolean) ? "First field practice" : "First field question");
  return <>{screen === "landing" ? <LandingPage onEnter={enter} onNewJourney={startNewJourney} onNewJourneyPlus={startNewJourneyPlus} onContinue={() => travel(landingChronicle.chapter)} onPreviewChapter={travel} hasJourney={hasJourney} continuation={{ chapter: landingChronicle.chapter, practice: carriedPractice, question: landingChronicle.mirrorStepComplete ? "Which condition might still revise the route?" : landingChronicle.chapterEightSignal || "Which field question still needs company?" }} /> : <GameErrorBoundary onReturnToBeginning={() => { clearChronicle(); window.history.replaceState(null, "", window.location.pathname); setScreen("landing"); }}><GameCanvas onExit={exit} biome={biome} onTravel={travel} /></GameErrorBoundary>}<Toaster position="bottom-right" richColors closeButton /></>;
}
