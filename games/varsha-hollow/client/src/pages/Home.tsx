import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { applyChoice, beginJourney, createFreshState } from "@/game/reducer";
import { AmbientHandle, createRainAmbience } from "@/game/ambient";
import { AudioEngine, createAudioEngine, weatherTextToState, ArcName } from "@/game/audio";
import { ParticleSystem, createParticleSystem, toneToColor } from "@/game/particles";
import { triggerChapterTransition } from "@/game/transitions";
import { CHAPTER_BY_ID } from "@/game/chapters";
import JourneyRecap from "@/game/JourneyRecap";
import { MapView } from "@/game/MapView";
import {
  CompletedJourney,
  readCompletedJourneys,
  saveCompletedJourney,
  selectKeyChoices,
} from "@/game/journey";
import {
  CompanionKey,
  createKeeperResources,
  GameState,
  GamePath,
  getProsperityStage,
  meetsRequirements,
  PROSPERITY_STAGES,
  resolveDialogue,
  resolveVariant,
  SlimeKey,
  StatKey,
} from "@/game/types";
import {
  ArrowRight,
  BookOpen,
  BookMarked,
  Box,
  Brain,
  Check,
  ChevronLeft,
  Clock,
  CloudRain,
  Compass,
  Droplets,
  Feather,
  Hammer,
  Heart,
  Leaf,
  LogIn,
  Map,
  Menu,
  RotateCcw,
  Sparkles,
  Sprout,
  Volume2,
  VolumeX,
  Waves,
  Wheat,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const HERO_IMAGE = "/manus-storage/landing_hero_background_bcdb6f55.png";
const UI_GLOW = "/manus-storage/ui_glow_element_ea061608.png";

const companions: Array<{ name: CompanionKey; role: string; image: string; tint: string }> = [
  { name: "Meera", role: "Builder", image: "/manus-storage/meera_portrait_c08d4620.png", tint: "#d39d70" },
  { name: "Leela", role: "Trader", image: "/manus-storage/leela_portrait_b41dbe9b.png", tint: "#c7a4dc" },
  { name: "Tara", role: "Scout", image: "/manus-storage/tara_portrait_3f34c857.png", tint: "#89c9a2" },
  { name: "Kabir", role: "Herbalist", image: "/manus-storage/kabir_portrait_dd69bca2.png", tint: "#9bd1bf" },
  { name: "Dev", role: "Protector", image: "/manus-storage/dev_portrait_d1035000.png", tint: "#a8b8d8" },
];

const companionByName = Object.fromEntries(companions.map((c) => [c.name, c])) as Record<CompanionKey, { name: CompanionKey; role: string; image: string; tint: string }>;

function relationshipLevel(value: number): string {
  if (value >= 8) return "Bonded";
  if (value >= 4) return "Trusted";
  if (value >= 1) return "Wary";
  return "Stranger";
}

const slimes: Array<{ name: SlimeKey; description: string; image: string; accent: string; chapter: number }> = [
  { name: "Dew", description: "A patient gatherer of water who trusts a gentle rhythm.", image: "/manus-storage/dew_slime_4966c7b8.png", accent: "#88e0dc", chapter: 1 },
  { name: "Clay", description: "A stubborn maker of shelter, learning strength through shape.", image: "/manus-storage/clay_slime_5b774cf5.png", accent: "#d69265", chapter: 6 },
  { name: "Lantern", description: "A luminous guide drawn toward buried water and old promises.", image: "/manus-storage/lantern_slime_70786d5c.png", accent: "#f4c978", chapter: 19 },
  { name: "Herb", description: "A living apothecary that reads the health of soil and skin.", image: "/manus-storage/herb_slime_e669104f.png", accent: "#9cd18c", chapter: 11 },
  { name: "Echo", description: "A resonant listener that maps danger through returning sound.", image: "/manus-storage/echo_slime_38fb3477.png", accent: "#c4a6ef", chapter: 16 },
];

const statMeta: Record<StatKey, { icon: typeof Heart; short: string; color: string }> = {
  Empathy: { icon: Heart, short: "Listen before you lead.", color: "#e7a49c" },
  Wisdom: { icon: Brain, short: "See what the rain remembers.", color: "#9bd1d0" },
  Practicality: { icon: Hammer, short: "Build what can hold.", color: "#d9b27b" },
};

const localStorageKey = "varsha-hollow-season-1";

type PersistedState = Omit<GameState, "started">;

function readLocalState(): GameState {
  if (typeof window === "undefined") return createFreshState();
  try {
    const stored = window.localStorage.getItem(localStorageKey);
    if (!stored) return createFreshState();
    const parsed = JSON.parse(stored) as GameState;
    return { ...createFreshState(), ...parsed, started: Boolean(parsed.started) };
  } catch {
    return createFreshState();
  }
}

function toPersistedState(state: GameState): PersistedState {
  const { started: _started, ...persisted } = state;
  return persisted;
}

function hydrateServerState(state: PersistedState): GameState {
  return { ...createFreshState(), ...state, started: true };
}

function arcTone(arc: string) {
  if (arc === "Dry Shrine") return "arc-dry";
  if (arc === "Forty Roofs") return "arc-roofs";
  if (arc === "Hollow Market") return "arc-market";
  if (arc === "Moving Lights") return "arc-lights";
  if (arc === "Forgotten Channels") return "arc-channels";
  return "arc-storm";
}

function StatRow({ label, value }: { label: StatKey; value: number }) {
  const MetaIcon = statMeta[label].icon;
  return (
    <div className="stat-row">
      <div className="stat-label-wrap">
        <span className="stat-icon" style={{ color: statMeta[label].color }}><MetaIcon size={14} strokeWidth={1.8} /></span>
        <span>{label}</span>
      </div>
      <div className="stat-track"><span style={{ width: `${Math.min(100, value * 8.33)}%`, background: statMeta[label].color }} /></div>
      <strong>{value.toString().padStart(2, "0")}</strong>
    </div>
  );
}

function ProsperityMeter({ progress }: { progress: number }) {
  const stage = getProsperityStage(progress);
  const stageIndex = PROSPERITY_STAGES.indexOf(stage);
  return (
    <section className="rail-section prosperity-section">
      <div className="section-eyebrow"><span>Village Prosperity</span><span className="eyebrow-value">{progress}%</span></div>
      <div className="prosperity-current"><Waves size={16} /><strong>{stage}</strong><span>stage {stageIndex + 1} / 5</span></div>
      <div className="prosperity-track" aria-label={`Village prosperity: ${stage}`}>
        <span style={{ width: `${progress}%` }} />
        {PROSPERITY_STAGES.map((item, index) => <i key={item} className={index <= stageIndex ? "filled" : ""} style={{ left: `${index * 25}%` }} />)}
      </div>
      <div className="prosperity-labels">{PROSPERITY_STAGES.map((item) => <span key={item} className={item === stage ? "active" : ""}>{item}</span>)}</div>
    </section>
  );
}

function CompanionTracker({ relationships, pulseCompanion }: { relationships: GameState["relationships"]; pulseCompanion: CompanionKey | null }) {
  return (
    <section className="rail-section">
      <div className="section-eyebrow"><span>Circle of Trust</span><span className="eyebrow-value">{companions.filter(({ name }) => relationships[name] > 0).length}/5</span></div>
      <div className="companion-list">
        {companions.map(({ name, role, image, tint }) => (
          <div className={`companion-row${pulseCompanion === name ? " loyalty-pulse" : ""}`} key={name} style={{ "--companion-tint": tint } as React.CSSProperties} tabIndex={0}>
            <div className="companion-avatar" style={{ borderColor: `${tint}8a` }}><img src={image} alt={`${name}, ${role}`} loading="lazy" decoding="async" /></div>
            <div className="companion-copy"><strong>{name}</strong><span>{role}</span><div className="loyalty-track"><i style={{ width: `${Math.min(100, relationships[name] * 8.33)}%`, background: tint }} /></div><span className="companion-tooltip">{role} · {relationshipLevel(relationships[name])}</span></div>
            <span className="loyalty-number">{relationships[name]}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function SlimeCollection({ unlocked, justUnlocked }: { unlocked: SlimeKey[]; justUnlocked: SlimeKey | null }) {
  return (
    <section className="rail-section slime-section">
      <div className="section-eyebrow"><span>Slime Field Notes</span><span className="eyebrow-value">{unlocked.length}/5</span></div>
      <div className="slime-grid">
        {slimes.map((slime) => {
          const isUnlocked = unlocked.includes(slime.name);
          return (
            <div className={`slime-card ${isUnlocked ? "unlocked" : "locked"}${justUnlocked === slime.name ? " slime-just-unlocked" : ""}`} key={slime.name} data-slime={slime.name} style={{ "--slime-accent": slime.accent } as React.CSSProperties}>
              <div className="slime-art">{isUnlocked ? <img src={slime.image} alt={`${slime.name} slime`} loading="lazy" decoding="async" /> : <span className="slime-silhouette" aria-hidden="true" />}</div>
              <div className="slime-copy"><div className="slime-name-row"><strong>{slime.name}</strong>{isUnlocked && <span className="slime-species">Specimen</span>}</div><span>{isUnlocked ? slime.description : `Awaiting discovery · Chapter ${slime.chapter.toString().padStart(2, "0")}`}</span></div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Landing({ onBegin, hasSavedRun, onResume, pastJourneys, onViewJourney }: { onBegin: () => void; hasSavedRun: boolean; onResume: () => void; pastJourneys: CompletedJourney[]; onViewJourney: (journey: CompletedJourney) => void }) {
  return (
    <main className="landing-shell">
      <div className="landing-backdrop" style={{ backgroundImage: `url(${HERO_IMAGE})` }} />
      <div className="landing-noise" />
      <header className="landing-nav"><div className="brand-mark"><span className="brand-sigil"><Droplets size={15} /></span><span>VARSHA HOLLOW</span></div><div className="nav-note"><span className="nav-dot" /> Season One · The Awakening</div></header>
      <div className="landing-content">
        <div className="landing-copy">
          <div className="kicker"><span className="kicker-line" /> A narrative game of rain, trust, and small miracles</div>
          <h1>Varsha<br /><em>Hollow</em></h1>
          <p className="landing-dek">The rain shrine has gone silent. Forty roofs wait beneath a bruised sky. Listen closely, and the slimes will show you what the village has forgotten.</p>
          <div className="landing-actions"><Button className="begin-button" onClick={onBegin}><span>Begin Journey</span><ArrowRight size={17} /></Button>{hasSavedRun && <Button variant="ghost" className="resume-button" onClick={onResume}><BookOpen size={15} /> Resume your story</Button>}</div>
          <div className="landing-meta"><span><span className="meta-glyph">01</span> 36 chapters</span><span><span className="meta-glyph">05</span> story arcs</span><span><span className="meta-glyph">∞</span> possible paths</span></div>
        </div>
        <div className="landing-lore"><div className="lore-card"><span className="lore-label">Field note / 001</span><p>“A village is not saved by one gifted person. It grows when different people—and different creatures—discover what they can build together.”</p><span className="lore-signature">— The old rain shrine ledger</span></div></div>
      </div>
      {pastJourneys.length > 0 && (
        <section className="past-journeys">
          <div className="past-journeys-head"><i /><span><BookMarked size={13} /> Past Journeys · {pastJourneys.length}</span></div>
          <div className="past-journeys-list">
            {pastJourneys.map((journey) => (
              <button className="past-journey-card" key={journey.id} onClick={() => onViewJourney(journey)}>
                <div className="past-journey-meta"><span>Ending · Chapter {String(journey.endingChapterId).padStart(2, "0")}</span><span>{new Date(journey.dateCompleted).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</span></div>
                <h3>{journey.endingTitle}</h3>
                <p>{journey.endingSummaryBeat}</p>
                <div className="past-journey-stats">
                  <span>Village <strong>{journey.villageProgress}%</strong></span>
                  <span>Slimes <strong>{journey.unlockedSlimes.length}/5</strong></span>
                  <span>Choices <strong>{journey.history.length}</strong></span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
      <footer className="landing-footer"><span>© VARSHA HOLLOW ARCHIVES</span><span className="footer-weather"><CloudRain size={14} /> Monsoon season, year 0</span></footer>
    </main>
  );
}

function SummarySheet({ state, chapter, onContinue }: { state: GameState; chapter: ReturnType<typeof CHAPTER_BY_ID.get>; onContinue: () => void }) {
  if (!chapter) return null;
  const latest = state.history[state.history.length - 1];
  return (
    <div className="summary-backdrop" role="dialog" aria-modal="true" aria-labelledby="summary-title">
      <div className="summary-sheet">
        <div className="summary-rain" />
        <div className="summary-topline"><span>Chapter beat recorded</span><span>{chapter.chapterNumber}</span></div>
        <div className="summary-icon"><Check size={19} /></div>
        <p className="summary-kicker">A thread takes root</p>
        <h2 id="summary-title">{chapter.title}</h2>
        <p className="summary-description">{chapter.summaryBeat}</p>
        {latest && <div className="summary-choice"><span className="summary-choice-label">You chose</span><strong>“{latest.choiceLabel}”</strong><span>{latest.consequence}</span></div>}
        <div className="summary-stats"><div><span>Village</span><strong>{getProsperityStage(state.villageProgress)}</strong></div><div><span>Next chapter</span><strong>{String(state.currentChapterId).padStart(2, "0")}</strong></div><div><span>Slimes found</span><strong>{state.unlockedSlimes.length}/5</strong></div></div>
        <Button className="summary-button" onClick={onContinue}>Continue into the rain <ArrowRight size={16} /></Button>
      </div>
    </div>
  );
}

function SavePanel({ state, isAuthenticated, isSaving, onSave, onLoadLocal, onLoadCloud, onClose, onSignIn }: { state: GameState; isAuthenticated: boolean; isSaving: boolean; onSave: () => void; onLoadLocal: () => void; onLoadCloud: () => void; onClose: () => void; onSignIn: () => void }) {
  return (
    <div className="summary-backdrop" role="dialog" aria-modal="true" aria-labelledby="save-panel-title">
      <div className="save-panel">
        <div className="summary-topline"><span>Journal management</span><span>{state.history.length} entries</span></div>
        <div className="save-panel-icon"><BookOpen size={18} /></div>
        <p className="summary-kicker">Your story, kept close</p>
        <h2 id="save-panel-title">Save the journey</h2>
        <p className="summary-description">Your local journal saves automatically on this device. Sign in when you want the same run available across devices.</p>
        <div className="save-status-card"><div><span className="save-status-label">Local journal</span><strong><span className="save-dot" /> Ready on this device</strong></div><span>{state.history.length ? "Up to date" : "No choices yet"}</span></div>
        <div className="save-status-card"><div><span className="save-status-label">Cloud journal</span><strong>{isAuthenticated ? <><span className="save-dot" /> Connected</> : <><LogIn size={12} /> Not signed in</>}</strong></div><span>{isAuthenticated ? "Sync on choice" : "Optional"}</span></div>
        <div className="save-actions"><Button className="summary-button" onClick={onSave} disabled={isSaving}><Check size={15} /> {isSaving ? "Saving…" : "Save now"}</Button><Button variant="outline" className="save-secondary" onClick={onLoadLocal}><RotateCcw size={14} /> Load local journal</Button>{isAuthenticated ? <Button variant="outline" className="save-secondary" onClick={onLoadCloud}><Waves size={14} /> Load cloud journal</Button> : <Button variant="outline" className="save-secondary" onClick={onSignIn}><LogIn size={14} /> Sign in to sync</Button>}</div>
        <button className="save-close" onClick={onClose}>Return to story <ArrowRight size={14} /></button>
      </div>
    </div>
  );
}

function GameHeader({ state, onExit, soundOn, onToggleSound, mapOpen, onToggleMap }: { state: GameState; onExit: () => void; soundOn: boolean; onToggleSound: () => void; mapOpen: boolean; onToggleMap: () => void }) {
  const chapter = CHAPTER_BY_ID.get(state.currentChapterId) ?? CHAPTER_BY_ID.get(25)!;
  return <header className="game-header"><button className="icon-button" onClick={onExit} aria-label="Return to title"><ChevronLeft size={18} /></button><div className="game-brand"><span className="brand-sigil small"><Droplets size={12} /></span><span>VARSHA HOLLOW</span></div><div className="chapter-progress"><span>{chapter.arc}</span><i /><strong>{chapter.chapterNumber}</strong></div><div className="game-header-right"><button className={`map-button${mapOpen ? " active" : ""}`} onClick={onToggleMap} aria-label="Toggle village map" aria-pressed={mapOpen}><Map size={14} /><span>{mapOpen ? "Map open" : "Map"}</span></button><button className="sound-button" onClick={onToggleSound} aria-label={soundOn ? "Mute rain ambience" : "Play rain ambience"}>{soundOn ? <Volume2 size={14} /> : <VolumeX size={14} />}<span>{soundOn ? "Rain on" : "Sound off"}</span></button><span className="save-status"><span className="save-dot" /> {state.history.length ? "Progress saved" : "New journey"}</span><button className="icon-button mobile-menu" aria-label="Open menu"><Menu size={18} /></button></div></header>;
}

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [state, setState] = useState<GameState>(() => readLocalState());
  const [screen, setScreen] = useState<"landing" | "game">(() => (readLocalState().started ? "game" : "landing"));
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [savePanelOpen, setSavePanelOpen] = useState(false);
  const [mobileRailOpen, setMobileRailOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [recapOpen, setRecapOpen] = useState(false);
  const [recapSaved, setRecapSaved] = useState(false);
  const [pastJourneys, setPastJourneys] = useState<CompletedJourney[]>(() => readCompletedJourneys());
  const [viewingJourney, setViewingJourney] = useState<CompletedJourney | null>(null);
  const [pathSelectOpen, setPathSelectOpen] = useState(false);
  const ambienceRef = useRef<AmbientHandle | null>(null);
  const audioRef = useRef<AudioEngine | null>(null);
  const particlesRef = useRef<ParticleSystem | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const storyRef = useRef<HTMLElement | null>(null);
  const prevChapterId = useRef<number>(state.currentChapterId);
  const prevProsperityStage = useRef<string>(getProsperityStage(state.villageProgress));
  const prevSlimeCount = useRef<number>(state.unlockedSlimes.length);
  const prevStatsTotal = useRef<number>(state.stats.Empathy + state.stats.Wisdom + state.stats.Practicality);
  const prevRelTotal = useRef<number>(Object.values(state.relationships).reduce((a, b) => a + b, 0));
  const prevRelationships = useRef<GameState["relationships"]>({ ...state.relationships });
  const [pulseCompanion, setPulseCompanion] = useState<CompanionKey | null>(null);
  const [justUnlockedSlime, setJustUnlockedSlime] = useState<SlimeKey | null>(null);
  const serverHydrated = useRef(false);
  const serverProgress = trpc.game.load.useQuery(undefined, { enabled: isAuthenticated, staleTime: 60_000 });
  const saveMutation = trpc.game.save.useMutation();
  const chapter = CHAPTER_BY_ID.get(state.currentChapterId) ?? CHAPTER_BY_ID.get(25)!;
  const isSeasonComplete = Boolean(chapter?.isEnding) && state.history.some((entry) => entry.chapterId === state.currentChapterId);

  useEffect(() => {
    if (!state.started || typeof window === "undefined") return;
    window.localStorage.setItem(localStorageKey, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (!isAuthenticated || serverHydrated.current || serverProgress.isLoading || !serverProgress.data) return;
    const remote = hydrateServerState(serverProgress.data);
    serverHydrated.current = true;
    if (remote.history.length >= state.history.length) {
      setState(remote);
      setScreen("game");
    }
  }, [isAuthenticated, serverProgress.data, serverProgress.isLoading, state.history.length]);

  useEffect(() => {
    if (isAuthenticated && user && serverProgress.isError) toast.error("Could not reach your cloud save. Your local journal is safe.");
  }, [isAuthenticated, user, serverProgress.isError]);

  useEffect(() => () => {
    ambienceRef.current?.stop();
    audioRef.current?.destroy();
    particlesRef.current?.destroy();
  }, []);

  // Create the particle system once the canvas is mounted.
  useEffect(() => {
    if (!canvasRef.current) return;
    particlesRef.current = createParticleSystem(canvasRef.current);
    return () => particlesRef.current?.destroy();
  }, []);

  // Sync weather + arc whenever the chapter changes.
  useEffect(() => {
    audioRef.current?.setWeather(weatherTextToState(chapter.weather));
    audioRef.current?.setArc(chapter.arc as ArcName);
    particlesRef.current?.setWeather(weatherTextToState(chapter.weather));
  }, [chapter]);

  // Play SFX + run transition when chapter changes.
  useEffect(() => {
    if (state.currentChapterId === prevChapterId.current) return;
    const forward = state.currentChapterId > prevChapterId.current;
    prevChapterId.current = state.currentChapterId;
    audioRef.current?.playChapterTransition();
    if (storyRef.current) {
      void triggerChapterTransition(storyRef.current, () => {}, forward ? "forward" : "backward");
    }
  }, [state.currentChapterId]);

  // Detect stat increases and play SFX.
  useEffect(() => {
    const total = state.stats.Empathy + state.stats.Wisdom + state.stats.Practicality;
    if (total > prevStatsTotal.current) {
      audioRef.current?.playStatIncrease();
    }
    prevStatsTotal.current = total;
  }, [state.stats]);

  // Detect relationship increases.
  useEffect(() => {
    const total = Object.values(state.relationships).reduce((a, b) => a + b, 0);
    if (total > prevRelTotal.current) {
      audioRef.current?.playRelationshipIncrease();
      // Find which companion's relationship increased and pulse it.
      for (const key of Object.keys(state.relationships) as CompanionKey[]) {
        if (state.relationships[key] > prevRelationships.current[key]) {
          setPulseCompanion(key);
          window.setTimeout(() => setPulseCompanion((prev) => (prev === key ? null : prev)), 1500);
          break;
        }
      }
    }
    prevRelTotal.current = total;
    prevRelationships.current = { ...state.relationships };
  }, [state.relationships]);

  // Detect slime unlocks → shimmer + sound + unlock animation.
  useEffect(() => {
    if (state.unlockedSlimes.length > prevSlimeCount.current) {
      audioRef.current?.playSlimeUnlock();
      const newSlime = state.unlockedSlimes[state.unlockedSlimes.length - 1];
      setJustUnlockedSlime(newSlime);
      window.setTimeout(() => setJustUnlockedSlime((prev) => (prev === newSlime ? null : prev)), 1200);
      const card = document.querySelector(`[data-slime="${newSlime}"]`);
      if (card) {
        const rect = card.getBoundingClientRect();
        const accent = (card as HTMLElement).style.getPropertyValue("--slime-accent") || "#88e0dc";
        particlesRef.current?.burstSlimeShimmer(rect.left + rect.width / 2, rect.top + rect.height / 2, accent);
      }
    }
    prevSlimeCount.current = state.unlockedSlimes.length;
  }, [state.unlockedSlimes]);

  // Detect prosperity stage-up.
  useEffect(() => {
    const stage = getProsperityStage(state.villageProgress);
    if (stage !== prevProsperityStage.current) {
      audioRef.current?.playProsperityStageUp();
      prevProsperityStage.current = stage;
    }
  }, [state.villageProgress]);

  // Ending flourish + chord.
  useEffect(() => {
    if (isSeasonComplete) {
      audioRef.current?.playEndingReach();
      particlesRef.current?.endingFlourish("#9cd18c");
    }
  }, [isSeasonComplete]);

  // When the season completes, open the journey recap automatically.
  useEffect(() => {
    if (isSeasonComplete && !recapOpen && !viewingJourney) {
      setRecapOpen(true);
      setRecapSaved(false);
    }
  }, [isSeasonComplete, recapOpen, viewingJourney]);

  const toggleSound = () => {
    if (!audioRef.current) {
      audioRef.current = createAudioEngine();
      audioRef.current.start();
      audioRef.current.setWeather(weatherTextToState(chapter.weather));
      audioRef.current.setArc(chapter.arc as ArcName);
      ambienceRef.current = createRainAmbience();
      setSoundOn(true);
      return;
    }
    setSoundOn(audioRef.current.toggleMute());
  };

  const startNewJourney = (path: GamePath = "listener") => {
    const next = beginJourney(createFreshState(), path);
    setState(next);
    setScreen("game");
    setSummaryOpen(false);
    setPathSelectOpen(false);
    if (isAuthenticated) saveMutation.mutate(toPersistedState(next));
  };

  const resumeJourney = () => {
    setScreen("game");
    setSummaryOpen(false);
  };

  const choose = (choiceId: string) => {
    const choice = chapter.choices.find((item) => item.id === choiceId);
    if (!choice) return;
    const next = applyChoice(state, chapter, choice);
    setState(next);
    setSummaryOpen(Boolean(next.lastSummary));
    if (isAuthenticated) saveMutation.mutate(toPersistedState(next));
  };

  const saveNow = () => {
    if (typeof window !== "undefined") window.localStorage.setItem(localStorageKey, JSON.stringify(state));
    if (isAuthenticated) saveMutation.mutate(toPersistedState(state));
    toast.success(isAuthenticated ? "Journal saved and synced." : "Journal saved on this device.");
  };

  const loadLocalJournal = () => {
    const local = readLocalState();
    if (!local.started) {
      toast.message("No local journal found yet.");
      return;
    }
    setState(local);
    setScreen("game");
    setSavePanelOpen(false);
    toast.success("Local journal restored.");
  };

  const loadCloudJournal = async () => {
    const result = await serverProgress.refetch();
    if (!result.data) {
      toast.message("No cloud journal found yet.");
      return;
    }
    setState(hydrateServerState(result.data));
    setScreen("game");
    setSavePanelOpen(false);
    toast.success("Cloud journal restored.");
  };

  const resetJourney = () => {
    const next = createFreshState();
    setState(next);
    setScreen("landing");
    setSummaryOpen(false);
    setRecapOpen(false);
    setRecapSaved(false);
    setViewingJourney(null);
    if (typeof window !== "undefined") window.localStorage.removeItem(localStorageKey);
    toast.success("Your journal has been cleared. The shrine waits.");
  };

  const saveJourney = () => {
    const endingChapter = CHAPTER_BY_ID.get(state.currentChapterId);
    if (!endingChapter) return;
    const journey: CompletedJourney = {
      id: `${Date.now()}-${state.currentChapterId}`,
      endingChapterId: state.currentChapterId,
      endingTitle: endingChapter.title,
      endingSummaryBeat: endingChapter.summaryBeat ?? "",
      stats: { ...state.stats },
      relationships: { ...state.relationships },
      villageProgress: state.villageProgress,
      unlockedSlimes: [...state.unlockedSlimes],
      keyChoices: selectKeyChoices(state.history),
      history: [...state.history],
      dateCompleted: new Date().toISOString(),
    };
    const updated = saveCompletedJourney(journey);
    setPastJourneys(updated);
    setRecapSaved(true);
    toast.success("Your journey has been saved to the archive.");
  };

  const viewPastJourney = (journey: CompletedJourney) => {
    setViewingJourney(journey);
    setRecapOpen(true);
    setRecapSaved(true);
  };

  const recentHistory = useMemo(() => [...state.history].reverse().slice(0, 3), [state.history]);

  // State-reactive narrative content. The static body is always shown;
  // reactive variants replace their base paragraph when a condition matches,
  // and conditional paragraphs are appended when their conditions are met.
  const renderedBody = useMemo(() => {
    const paragraphs: string[] = [...chapter.body];
    if (chapter.reactiveBody) {
      for (const variant of chapter.reactiveBody) {
        paragraphs.push(resolveVariant(variant, state));
      }
    }
    if (chapter.conditionalBody) {
      for (const conditional of chapter.conditionalBody) {
        if (conditional.condition(state)) paragraphs.push(conditional.text);
      }
    }
    return paragraphs;
  }, [chapter, state]);

  // Companion dialogue lines that vary by relationship level.
  const renderedDialogue = useMemo(() => {
    if (!chapter.companionDialogue) return [];
    return chapter.companionDialogue.map((dialogue) => ({
      companion: dialogue.companion,
      line: resolveDialogue(dialogue, state),
    }));
  }, [chapter, state]);

  // Choices filtered by their `requires` gate. Existing choices without a
  // gate are always shown.
  const visibleChoices = useMemo(
    () => chapter.choices.filter((choice) => meetsRequirements(choice.requires, state)),
    [chapter, state],
  );

  // Play choice-appear chime when choices become visible.
  useEffect(() => {
    if (visibleChoices.length > 0 && !isSeasonComplete) {
      audioRef.current?.playChoiceAppear();
    }
  }, [visibleChoices, isSeasonComplete]);

  useEffect(() => {
    if (typeof window === "undefined" || !new URLSearchParams(window.location.search).has("demo")) return;
    const demoState = beginJourney(createFreshState());
    demoState.currentChapterId = 6;
    demoState.villageProgress = 23;
    demoState.relationships.Meera = 2;
    demoState.unlockedSlimes = ["Dew", "Clay"];
    demoState.history = [{ chapterId: 5, chapterTitle: "What the Village Keeps", choiceId: "accept-roofs", choiceLabel: "Promise to repair the forty roofs before the rain, even without permission.", consequence: "The village gains a deadline and a leader, whether or not Neel feels ready." }];
    setState(demoState);
    setScreen("game");
    setSavePanelOpen(new URLSearchParams(window.location.search).has("save"));
  }, []);

  if (loading) return <div className="loading-screen"><div className="loading-mark"><Droplets size={20} /></div><span>Listening for rain…</span></div>;
  if (screen === "landing") return (
    <>
      <Landing onBegin={() => setPathSelectOpen(true)} hasSavedRun={state.started && state.history.length > 0} onResume={resumeJourney} pastJourneys={pastJourneys} onViewJourney={viewPastJourney} />
      {pathSelectOpen && (
        <div className="path-select-backdrop" role="dialog" aria-modal="true" aria-labelledby="path-select-title">
          <div className="path-select-panel">
            <div className="path-select-head">
              <span className="path-select-eyebrow"><Compass size={13} /> Choose your journey</span>
              <h2 id="path-select-title">Two ways to walk the hollow</h2>
              <button className="path-select-close" onClick={() => setPathSelectOpen(false)} aria-label="Close path selection"><X size={16} /></button>
            </div>
            <div className="path-select-options">
              <button className="path-option path-listener" onClick={() => startNewJourney("listener")}>
                <div className="path-option-icon"><Heart size={22} /></div>
                <div className="path-option-body">
                  <strong>The Listener's Path</strong>
                  <p>A contemplative journey. Listen, build trust, and find small miracles. No failure, no scarcity — only the weight of your choices.</p>
                  <span className="path-option-tag">Recommended for first visitors</span>
                </div>
              </button>
              <button className="path-option path-keeper" onClick={() => startNewJourney("keeper")}>
                <div className="path-option-icon"><Hammer size={22} /></div>
                <div className="path-option-body">
                  <strong>The Keeper's Path</strong>
                  <p>Survival with stakes. Manage timber, grain, clay, herbs, and days before the monsoon. Choices cost resources. The village can fail.</p>
                  <span className="path-option-tag">For those who want their choices to hurt</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
      {recapOpen && viewingJourney && (
        <JourneyRecap
          state={{ ...createFreshState(), stats: viewingJourney.stats, relationships: viewingJourney.relationships, unlockedSlimes: viewingJourney.unlockedSlimes, history: viewingJourney.history, villageProgress: viewingJourney.villageProgress, started: true, currentChapterId: viewingJourney.endingChapterId, lastConsequence: null, lastSummary: null }}
          endingChapterId={viewingJourney.endingChapterId}
          onBeginNew={startNewJourney}
          onSave={() => toast.message("This journey is already in your archive.")}
          onClose={() => { setViewingJourney(null); setRecapOpen(false); }}
          saved
        />
      )}
    </>
  );

  return (
    <main className="game-shell">
      <canvas ref={canvasRef} className="particle-canvas" aria-hidden="true" />
      <GameHeader state={state} onExit={() => setScreen("landing")} soundOn={soundOn} onToggleSound={toggleSound} mapOpen={mapOpen} onToggleMap={() => setMapOpen((v) => !v)} />
      <div className="game-layout">
        <section className="story-column" ref={storyRef}>
          <div className="story-topline"><Badge className={`arc-badge ${arcTone(chapter.arc)}`}>{chapter.arc}</Badge><span className="story-location"><Map size={13} /> {chapter.location}</span><span className="story-weather"><CloudRain size={13} /> {chapter.weather}</span></div>
          <div className="story-heading"><span className="chapter-label">Chapter {chapter.chapterNumber}</span><h1>{chapter.title}</h1><p className="story-opening">{chapter.opening}</p></div>
          <div className="story-body">{renderedBody.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
          {renderedDialogue.length > 0 && <div className="whisper-stack">{renderedDialogue.map((entry) => { const companion = companionByName[entry.companion]; return (<div className="whisper-card" key={entry.companion} style={{ "--whisper-tint": companion.tint } as React.CSSProperties}><div className="whisper-portrait" style={{ borderColor: `${companion.tint}8a` }}><img src={companion.image} alt={`${companion.name}, ${companion.role}`} loading="lazy" decoding="async" /></div><div className="whisper-body"><span className="whisper-name">{companion.name}</span><p className="whisper-line">{entry.line}</p></div></div>); })}</div>}
          {state.lastConsequence && state.history.length > 0 && <div className="last-consequence"><span className="consequence-mark"><Sparkles size={14} /></span><div><span className="consequence-label">The village remembers</span><p>{state.lastConsequence}</p></div></div>}
          {!isSeasonComplete && !state.failed ? <div className="choices-section"><div className="choices-label"><span>What will you do?</span><i /></div><div className="choice-list">{visibleChoices.map((choice, index) => <button className={`choice-card choice-${choice.tone}`} key={choice.id} onClick={() => { audioRef.current?.playChoiceSelect(); choose(choice.id); }} onMouseEnter={(e) => { const rect = e.currentTarget.getBoundingClientRect(); particlesRef.current?.emitChoiceMotes(rect.left + rect.width / 2, rect.top + rect.height / 2, toneToColor(choice.tone)); }}><span className="choice-index">{String.fromCharCode(65 + index)}</span><span className="choice-copy"><strong>{choice.label}</strong><small>{choice.tone === "empathy" ? "A choice of the heart" : choice.tone === "wisdom" ? "A choice of the mind" : "A choice of the hands"}</small></span><ArrowRight className="choice-arrow" size={17} /></button>)}</div></div> : state.failed ? <div className="ending-card ending-failure"><div className="ending-icon"><CloudRain size={22} /></div><div><span className="consequence-label">The journey ends here</span><h2>{state.failureReason ?? "The village could not hold."}</h2><p>The hollow will remember what you tried to build, even if the rain came before the work was done.</p></div><Button className="ending-button" onClick={resetJourney}><RotateCcw size={15} /> Begin again</Button></div> : <div className="ending-card"><div className="ending-icon"><Sprout size={22} /></div><div><span className="consequence-label">Season One complete</span><h2>The hollow has a future.</h2><p>Your choices shaped how Varsha Hollow learned to listen, build, and belong.</p></div><Button className="ending-button" onClick={() => setRecapOpen(true)}><BookOpen size={15} /> View your journey</Button></div>}
          <div className="story-footer"><span><Feather size={13} /> Journal entry {chapter.chapterNumber}</span><span>{state.history.length} decisions recorded</span></div>
        </section>
        <aside className={`state-rail ${mobileRailOpen ? "rail-open" : ""}`}>
          <div className="rail-mobile-head"><span>Journey state</span><button onClick={() => setMobileRailOpen(false)} aria-label="Close journey state"><X size={18} /></button></div>
          <section className="rail-section stats-section"><div className="section-eyebrow"><span>Neel's compass</span><span className="eyebrow-value">{state.stats.Empathy + state.stats.Wisdom + state.stats.Practicality}/36</span></div><div className="stat-list">{(["Empathy", "Wisdom", "Practicality"] as StatKey[]).map((stat) => <StatRow key={stat} label={stat} value={state.stats[stat]} />)}</div></section>
          <ProsperityMeter progress={state.villageProgress} />
          {state.path === "keeper" && state.resources && !state.failed && (
            <section className="rail-section resources-section">
              <div className="section-eyebrow"><span>Village stores</span><span className="eyebrow-value">{state.resources.days} days left</span></div>
              <div className="resource-list">
                <div className="resource-row"><span className="resource-icon" style={{ color: "#d9b27b" }}><Hammer size={14} /></span><span className="resource-name">Timber</span><strong className={state.resources.timber < 4 ? "resource-scarce" : ""}>{state.resources.timber}</strong></div>
                <div className="resource-row"><span className="resource-icon" style={{ color: "#e7a49c" }}><Wheat size={14} /></span><span className="resource-name">Grain</span><strong className={state.resources.grain < 4 ? "resource-scarce" : ""}>{state.resources.grain}</strong></div>
                <div className="resource-row"><span className="resource-icon" style={{ color: "#c4956b" }}><Box size={14} /></span><span className="resource-name">Clay</span><strong className={state.resources.clay < 3 ? "resource-scarce" : ""}>{state.resources.clay}</strong></div>
                <div className="resource-row"><span className="resource-icon" style={{ color: "#9cd18c" }}><Leaf size={14} /></span><span className="resource-name">Herbs</span><strong className={state.resources.herbs < 2 ? "resource-scarce" : ""}>{state.resources.herbs}</strong></div>
                <div className="resource-row resource-days"><span className="resource-icon" style={{ color: state.resources.days < 8 ? "#e7a49c" : "#a8d8d8" }}><Clock size={14} /></span><span className="resource-name">Days before monsoon</span><strong className={state.resources.days < 8 ? "resource-scarce" : ""}>{state.resources.days}</strong></div>
              </div>
            </section>
          )}
          <CompanionTracker relationships={state.relationships} pulseCompanion={pulseCompanion} />
          <SlimeCollection unlocked={state.unlockedSlimes} justUnlocked={justUnlockedSlime} />
          {recentHistory.length > 0 && <section className="rail-section recent-section"><div className="section-eyebrow"><span>Recent choices</span><BookOpen size={14} /></div>{recentHistory.map((item) => <div className="recent-choice" key={`${item.chapterId}-${item.choiceId}`}><span>{String(item.chapterId).padStart(2, "0")}</span><p>{item.choiceLabel}</p></div>)}</section>}
          <div className="rail-bottom"><div className="rail-actions"><button onClick={() => setSavePanelOpen(true)}><BookOpen size={13} /> Journal</button><button onClick={resetJourney}><RotateCcw size={13} /> Reset</button></div><span>{isAuthenticated ? "Cloud sync enabled" : "Local journal active"}</span></div>
        </aside>
      </div>
      <button className="mobile-rail-toggle" onClick={() => setMobileRailOpen(true)}><Compass size={15} /> Journey state <span>{getProsperityStage(state.villageProgress)}</span></button>
      {summaryOpen && <SummarySheet state={state} chapter={chapter} onContinue={() => setSummaryOpen(false)} />}
      {savePanelOpen && <SavePanel state={state} isAuthenticated={isAuthenticated} isSaving={saveMutation.isPending} onSave={saveNow} onLoadLocal={loadLocalJournal} onLoadCloud={loadCloudJournal} onClose={() => setSavePanelOpen(false)} onSignIn={() => startLogin()} />}
      {mapOpen && <MapView state={state} onClose={() => setMapOpen(false)} />}
      {recapOpen && viewingJourney && (
        <JourneyRecap
          state={{ ...createFreshState(), ...viewingJourney, stats: viewingJourney.stats, relationships: viewingJourney.relationships, unlockedSlimes: viewingJourney.unlockedSlimes, history: viewingJourney.history, villageProgress: viewingJourney.villageProgress, started: true, currentChapterId: viewingJourney.endingChapterId, lastConsequence: null, lastSummary: null }}
          endingChapterId={viewingJourney.endingChapterId}
          onBeginNew={startNewJourney}
          onSave={() => toast.message("This journey is already in your archive.")}
          onClose={() => { setViewingJourney(null); setRecapOpen(false); setScreen("landing"); }}
          saved
        />
      )}
      {recapOpen && !viewingJourney && isSeasonComplete && (
        <JourneyRecap
          state={state}
          endingChapterId={state.currentChapterId}
          onBeginNew={resetJourney}
          onSave={saveJourney}
          onClose={() => setRecapOpen(false)}
          saved={recapSaved}
        />
      )}
      {!isAuthenticated && <button className="signin-float" onClick={() => startLogin()}><LogIn size={14} /> Sign in to sync</button>}
    </main>
  );
}
