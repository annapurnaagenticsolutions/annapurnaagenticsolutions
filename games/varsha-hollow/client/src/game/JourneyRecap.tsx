import { Button } from "@/components/ui/button";
import { CHAPTER_BY_ID } from "@/game/chapters";
import {
  COMPANION_EPILOGUES,
  epilogueTier,
  PROSPERITY_DESCRIPTIONS,
  selectKeyChoices,
  SLIME_REFLECTIONS,
  statDescriptor,
} from "@/game/journey";
import {
  CompanionKey,
  GameState,
  getProsperityStage,
  PROSPERITY_STAGES,
  SlimeKey,
  StatKey,
} from "@/game/types";
import {
  ArrowRight,
  Brain,
  Compass,
  Droplets,
  Feather,
  Heart,
  Hammer,
  Map,
  RotateCcw,
  Save,
  Sparkles,
  Sprout,
  Waves,
  X,
} from "lucide-react";
import { useMemo } from "react";

const HERO_IMAGE = "/manus-storage/landing_hero_background_bcdb6f55.png";

const companions: Array<{ name: CompanionKey; role: string; image: string; tint: string }> = [
  { name: "Meera", role: "Builder", image: "/manus-storage/meera_portrait_c08d4620.png", tint: "#d39d70" },
  { name: "Leela", role: "Trader", image: "/manus-storage/leela_portrait_b41dbe9b.png", tint: "#c7a4dc" },
  { name: "Tara", role: "Scout", image: "/manus-storage/tara_portrait_3f34c857.png", tint: "#89c9a2" },
  { name: "Kabir", role: "Herbalist", image: "/manus-storage/kabir_portrait_dd69bca2.png", tint: "#9bd1bf" },
  { name: "Dev", role: "Protector", image: "/manus-storage/dev_portrait_d1035000.png", tint: "#a8b8d8" },
];

const slimes: Array<{ name: SlimeKey; description: string; image: string; accent: string }> = [
  { name: "Dew", description: "A patient gatherer of water who trusts a gentle rhythm.", image: "/manus-storage/dew_slime_4966c7b8.png", accent: "#88e0dc" },
  { name: "Clay", description: "A stubborn maker of shelter, learning strength through shape.", image: "/manus-storage/clay_slime_5b774cf5.png", accent: "#d69265" },
  { name: "Lantern", description: "A luminous guide drawn toward buried water and old promises.", image: "/manus-storage/lantern_slime_70786d5c.png", accent: "#f4c978" },
  { name: "Herb", description: "A living apothecary that reads the health of soil and skin.", image: "/manus-storage/herb_slime_e669104f.png", accent: "#9cd18c" },
  { name: "Echo", description: "A resonant listener that maps danger through returning sound.", image: "/manus-storage/echo_slime_38fb3477.png", accent: "#c4a6ef" },
];

const statMeta: Record<StatKey, { icon: typeof Heart; short: string; color: string }> = {
  Empathy: { icon: Heart, short: "Listen before you lead.", color: "#e7a49c" },
  Wisdom: { icon: Brain, short: "See what the rain remembers.", color: "#9bd1d0" },
  Practicality: { icon: Hammer, short: "Build what can hold.", color: "#d9b27b" },
};

function arcTone(arc: string) {
  if (arc === "Dry Shrine") return "arc-dry";
  if (arc === "Forty Roofs") return "arc-roofs";
  if (arc === "Hollow Market") return "arc-market";
  if (arc === "Moving Lights") return "arc-lights";
  if (arc === "Forgotten Channels") return "arc-channels";
  return "arc-storm";
}

type RecapProps = {
  state: GameState;
  endingChapterId: number;
  onBeginNew: () => void;
  onSave: () => void;
  onClose?: () => void;
  saved?: boolean;
};

export default function JourneyRecap({ state, endingChapterId, onBeginNew, onSave, onClose, saved }: RecapProps) {
  const endingChapter = CHAPTER_BY_ID.get(endingChapterId);
  const stage = getProsperityStage(state.villageProgress);
  const stageIndex = PROSPERITY_STAGES.indexOf(stage);
  const keyChoices = useMemo(() => selectKeyChoices(state.history), [state.history]);
  const descriptor = useMemo(() => statDescriptor(state.stats), [state.stats]);

  // Build the path timeline from history, mapping each visited chapter to its arc.
  const pathNodes = useMemo(() => {
    const visitedIds = new Set(state.history.map((h) => h.chapterId));
    if (endingChapterId) visitedIds.add(endingChapterId);
    return Array.from(visitedIds).sort((a, b) => a - b).map((id) => {
      const ch = CHAPTER_BY_ID.get(id);
      return {
        id,
        title: ch?.title ?? `Chapter ${id}`,
        arc: ch?.arc ?? "Unknown",
        arcClass: arcTone(ch?.arc ?? ""),
        isEnding: Boolean(ch?.isEnding),
      };
    });
  }, [state.history, endingChapterId]);

  return (
    <div className="recap-backdrop" role="dialog" aria-modal="true" aria-labelledby="recap-title">
      <div className="recap-shell">
        <div className="recap-hero" style={{ backgroundImage: `url(${HERO_IMAGE})` }}>
          <div className="recap-hero-overlay" />
          {onClose && (
            <button className="recap-close" onClick={onClose} aria-label="Close journey recap">
              <X size={16} />
            </button>
          )}
          <div className="recap-hero-content">
            <span className="recap-eyebrow"><Sprout size={13} /> Season One complete</span>
            <h1 id="recap-title">{endingChapter?.title ?? "The hollow has a future."}</h1>
            {endingChapter?.summaryBeat && <p className="recap-summary-beat">{endingChapter.summaryBeat}</p>}
          </div>
        </div>

        <div className="recap-body">
          {/* B. Your Path */}
          <section className="recap-section">
            <div className="recap-section-head">
              <span className="recap-section-label"><Map size={13} /> Your Path</span>
              <span className="recap-section-value">{pathNodes.length} chapters</span>
            </div>
            <div className="recap-timeline">
              {pathNodes.map((node, index) => (
                <div className="recap-timeline-node" key={node.id}>
                  {index > 0 && <span className="recap-timeline-link" />}
                  <span className={`recap-timeline-dot ${node.isEnding ? "ending" : ""} ${node.arcClass}`}>
                    {String(node.id).padStart(2, "0")}
                  </span>
                  <span className="recap-timeline-title">{node.title}</span>
                  <span className={`recap-timeline-arc ${node.arcClass}`}>{node.arc}</span>
                </div>
              ))}
            </div>
          </section>

          {/* C. Neel's Compass */}
          <section className="recap-section">
            <div className="recap-section-head">
              <span className="recap-section-label"><Compass size={13} /> Neel's Compass</span>
              <span className="recap-section-value">{state.stats.Empathy + state.stats.Wisdom + state.stats.Practicality}/36</span>
            </div>
            <div className="recap-stats">
              {(["Empathy", "Wisdom", "Practicality"] as StatKey[]).map((stat) => {
                const MetaIcon = statMeta[stat].icon;
                return (
                  <div className="recap-stat-row" key={stat}>
                    <span className="recap-stat-icon" style={{ color: statMeta[stat].color }}><MetaIcon size={16} strokeWidth={1.8} /></span>
                    <span className="recap-stat-name">{stat}</span>
                    <div className="recap-stat-track">
                      <span style={{ width: `${Math.min(100, state.stats[stat] * 8.33)}%`, background: statMeta[stat].color }} />
                    </div>
                    <strong>{state.stats[stat].toString().padStart(2, "0")}</strong>
                  </div>
                );
              })}
            </div>
            <p className="recap-descriptor">{descriptor}</p>
          </section>

          {/* D. Circle of Trust */}
          <section className="recap-section">
            <div className="recap-section-head">
              <span className="recap-section-label"><Heart size={13} /> Circle of Trust</span>
              <span className="recap-section-value">{companions.filter(({ name }) => state.relationships[name] > 0).length}/5</span>
            </div>
            <div className="recap-companions">
              {companions.map(({ name, role, image, tint }) => {
                const value = state.relationships[name];
                const tier = epilogueTier(value);
                const epilogue = COMPANION_EPILOGUES[name][tier];
                return (
                  <div className="recap-companion" key={name} style={{ "--companion-tint": tint } as React.CSSProperties}>
                    <div className="recap-companion-head">
                      <div className="recap-companion-avatar" style={{ borderColor: `${tint}8a` }}>
                        <img src={image} alt={`${name}, ${role}`} loading="lazy" decoding="async" />
                      </div>
                      <div className="recap-companion-meta">
                        <strong>{name}</strong>
                        <span>{role}</span>
                        <div className="recap-loyalty-track"><i style={{ width: `${Math.min(100, value * 8.33)}%`, background: tint }} /></div>
                      </div>
                      <span className="recap-loyalty-number">{value}</span>
                    </div>
                    <p className="recap-epilogue">{epilogue}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* E. The Village */}
          <section className="recap-section">
            <div className="recap-section-head">
              <span className="recap-section-label"><Waves size={13} /> The Village</span>
              <span className="recap-section-value">{state.villageProgress}%</span>
            </div>
            <div className="recap-prosperity">
              <div className="recap-prosperity-current">
                <Waves size={18} />
                <strong>{stage}</strong>
                <span>stage {stageIndex + 1} / 5</span>
              </div>
              <div className="recap-prosperity-track" aria-label={`Village prosperity: ${stage}`}>
                <span style={{ width: `${state.villageProgress}%` }} />
                {PROSPERITY_STAGES.map((item, index) => (
                  <i key={item} className={index <= stageIndex ? "filled" : ""} style={{ left: `${index * 25}%` }} />
                ))}
              </div>
              <div className="recap-prosperity-labels">
                {PROSPERITY_STAGES.map((item) => (
                  <span key={item} className={item === stage ? "active" : ""}>{item}</span>
                ))}
              </div>
              <p className="recap-prosperity-description">{PROSPERITY_DESCRIPTIONS[stage]}</p>
            </div>
          </section>

          {/* F. Slime Field Notes */}
          <section className="recap-section">
            <div className="recap-section-head">
              <span className="recap-section-label"><Droplets size={13} /> Slime Field Notes</span>
              <span className="recap-section-value">{state.unlockedSlimes.length}/5</span>
            </div>
            <div className="recap-slimes">
              {slimes.map((slime) => {
                const isUnlocked = state.unlockedSlimes.includes(slime.name);
                return (
                  <div className={`recap-slime ${isUnlocked ? "unlocked" : "locked"}`} key={slime.name} style={{ "--slime-accent": slime.accent } as React.CSSProperties}>
                    <div className="recap-slime-art">
                      {isUnlocked ? <img src={slime.image} alt={`${slime.name} slime`} loading="lazy" decoding="async" /> : <span className="slime-silhouette recap-silhouette" aria-hidden="true" />}
                    </div>
                    <div className="recap-slime-copy">
                      <strong>{slime.name}</strong>
                      <span>{isUnlocked ? SLIME_REFLECTIONS[slime.name] : "Not discovered this journey."}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* G. Choices That Mattered */}
          {keyChoices.length > 0 && (
            <section className="recap-section">
              <div className="recap-section-head">
                <span className="recap-section-label"><Sparkles size={13} /> Choices That Mattered</span>
                <span className="recap-section-value">{keyChoices.length} turning points</span>
              </div>
              <div className="recap-choices">
                {keyChoices.map((choice) => (
                  <div className="recap-choice" key={`${choice.chapterId}-${choice.choiceLabel}`}>
                    <div className="recap-choice-head">
                      <span className="recap-choice-chapter">{String(choice.chapterId).padStart(2, "0")}</span>
                      <strong>{choice.chapterTitle}</strong>
                    </div>
                    <p className="recap-choice-label">“{choice.choiceLabel}”</p>
                    <p className="recap-choice-consequence">{choice.consequence}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* H. Actions */}
          <section className="recap-actions-section">
            <div className="recap-actions">
              <Button className="recap-action-primary" onClick={onBeginNew}>
                <RotateCcw size={15} /> Begin New Journey <ArrowRight size={16} />
              </Button>
              <Button variant="outline" className="recap-action-secondary" onClick={onSave} disabled={saved}>
                <Save size={14} /> {saved ? "Journey saved" : "Save Journey"}
              </Button>
            </div>
            <div className="recap-footer">
              <span><Feather size={12} /> {state.history.length} decisions recorded</span>
              <span>Varsha Hollow · Season One</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
