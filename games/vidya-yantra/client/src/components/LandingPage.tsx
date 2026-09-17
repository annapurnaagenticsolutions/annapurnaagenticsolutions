// Rasa Engine landing reminder: the first viewport is a mineral instrument-world—an offset compass, diagonal apprentice route, and restrained saffron insight over indigo atmosphere.
/* Rasa Engine landing: a mineral pilgrimage from Ashram shelter through ten active field chapters toward the original Living Survey horizon. */
import { assets } from "@/game/assets";

type ChapterRoute = "ashram" | "road" | "rasa" | "monsoon" | "archive" | "estuary" | "saltLibrary" | "mirrorStep" | "confluence" | "returnObservatory" | "livingSurvey" | "lineageChamber";
type LandingPageProps = { onEnter: () => void; onNewJourney: () => void; onNewJourneyPlus: () => void; onContinue: () => void; onPreviewChapter: (chapter: ChapterRoute) => void; hasJourney: boolean; continuation: { chapter: string; practice: string; question: string } };

const disciplines = [
  { index: "01", name: "Shastra", line: "Observe, compare, and find the pattern beneath the noise.", mark: "✦" },
  { index: "02", name: "Astra", line: "Practice form, timing, and the responsibility behind strength.", mark: "↗" },
  { index: "03", name: "Prana", line: "Balance movement, breath, and the living conditions around you.", mark: "◌" },
  { index: "04", name: "Seva", line: "Repair, protect, and discover what the community needs next.", mark: "⌇" },
];

const chapters: { roman: string; title: string; place: string; copy: string; cta: string; biome: ChapterRoute; current?: boolean }[] = [
  { roman: "I", title: "The First Measure", place: "Ashraya Vana Ashram", copy: "Begin with listening, practice circles, guide conversations, and a responsibility chosen for the road.", cta: "Observe the first measure", biome: "ashram", current: true },
  { roman: "II", title: "The Road of Many Arts", place: "Village paths & river towns", copy: "Travel beyond the forest, meet people with different needs, and turn lessons into practical skills.", cta: "Chart Nadi Corridor", biome: "road" },
  { roman: "III", title: "Rasa Engine", place: "Silent celestial courtyard", copy: "A later discovery: an instrument only a prepared traveler can read, align, and use with care.", cta: "Align Silent Courtyard", biome: "rasa" },
  { roman: "IV", title: "Monsoon Observatory", place: "Stormfront instrument terrace", copy: "Redirect a living current, plan shelter in rain, and decide what a public water measure must protect.", cta: "Enter Monsoon Observatory", biome: "monsoon" },
  { roman: "V", title: "Warning Archive", place: "High-ridge signal terrace", copy: "Compare wind, river, and settlement memory before an early warning crosses the ridge.", cta: "Climb to the Archive", biome: "archive" },
  { roman: "VI", title: "Listening Estuary", place: "Tidal mangrove observatory", copy: "Read salinity, current, and habitat together before a coastal promise can travel.", cta: "Reach the Estuary", biome: "estuary" },
  { roman: "VII", title: "Salt Library", place: "Open-margin memory coast", copy: "Hold testimony, route records, and ecological observation beside one another without closing the margin too soon.", cta: "Open the Salt Library", biome: "saltLibrary" },
  { roman: "VIII", title: "Mirror Step", place: "Open copper evidence chamber", copy: "Compare observation, inference, and testimony before a route can carry its countermark into public view.", cta: "Enter Mirror Step", biome: "mirrorStep" },
  { roman: "IX", title: "The Confluence Table", place: "River, ridge & shore terrace", copy: "Braid three route conditions into a public record that keeps a visible return condition for the next reader.", cta: "Reach the Confluence Table", biome: "confluence" },
  { roman: "X", title: "Return Observatory", place: "Amendment instrument terrace", copy: "Carry a public route back to changing river, ridge, and shore conditions, then leave its earlier line visible beside the amendment.", cta: "Enter Return Observatory", biome: "returnObservatory" },
  { roman: "XI", title: "The Living Survey", place: "Survey basin & lineage leaves", copy: "Read a new water, ridge, and shore variance beside the earlier route and its amendment before it can reach the next reader.", cta: "Enter Living Survey", biome: "livingSurvey" },
  { roman: "XII", title: "Lineage Chamber", place: "Open Almanac comparison table", copy: "Begin the new season by holding earlier line, amendment, variance, and reader as four distinct physical leaves.", cta: "Enter Lineage Chamber", biome: "lineageChamber" },
];

export default function LandingPage({ onEnter, onNewJourney, onNewJourneyPlus, onContinue, onPreviewChapter, hasJourney, continuation }: LandingPageProps) {
  return (
    <main className="landing-page">
      <section className="landing-hero">
        <header className="landing-nav">
          <div className="landing-brand"><img src={assets.logo} alt="Vidya Yantra compass-orbit emblem" /><span className="brand-wordmark">Vidya Yantra</span></div>
          <div className="landing-nav-meta"><span>Original learning adventure</span><button onClick={hasJourney ? onContinue : onEnter}>{hasJourney ? "Continue fieldwork" : "Take measure"}</button></div>
        </header>
        <div className="hero-copy">
          <p className="eyebrow">Observe · align · carry the question</p>
          <h1>Learn the measure<br />before you meet the world.</h1>
          <p className="hero-lede">At <em>Ashraya Vana</em>, an apprentice learns that Shastra, weapon forms, elemental technique, and service are not separate paths. They are ways to travel with clarity.</p>
          <div className="hero-actions"><button className="primary-action" onClick={hasJourney ? onContinue : onEnter}>{hasJourney ? "Continue the return line" : "Observe at Ashraya Vana"} <span>↗</span></button><a href="#journey">Trace the journey <span>↓</span></a></div>
          {hasJourney && <aside className="landing-continuation"><span>Continue Journey · {continuation.chapter === "returnObservatory" ? "Return Observatory" : continuation.chapter === "confluence" ? "The Confluence Table" : continuation.chapter === "mirrorStep" ? "Mirror Step" : continuation.chapter === "saltLibrary" ? "Salt Library" : continuation.chapter === "estuary" ? "Listening Estuary" : continuation.chapter === "archive" ? "Warning Archive" : continuation.chapter === "monsoon" ? "Monsoon Observatory" : continuation.chapter === "road" ? "Nadi Corridor" : "Ashraya Vana"}</span><b>{continuation.practice}</b><p>{continuation.question}</p><div><button onClick={onContinue}>Resume ↗</button><button onClick={onNewJourney}>New Journey</button><button onClick={onNewJourneyPlus}>New Journey+</button></div></aside>}
          <div className="hero-stamp"><span>Chapter I</span><b>The First Measure</b><i>Vasanta · dawn study</i></div>
          <div className="hero-practice-legend"><span>1 · Observe the shelter</span><span>2 · Align the compass</span><span>3 · Carry a field question</span></div>
        </div>
        <div className="hero-compass" aria-hidden="true"><span>Observe</span><i></i><span>Practice</span><i></i><span>Journey</span></div>
        <div className="hero-world-sigil" aria-hidden="true"><i /><i /><i /><b /><span>River measure<br />to star measure</span></div>
        <div className="hero-diagonal-route" aria-hidden="true"><span className="route-origin">Ashram shelter</span><span className="route-destination">Observatory horizon</span><i /><b /><b /><b /></div>
        <div className="hero-material-planes" aria-hidden="true"><i className="plane parchment" /><i className="plane terracotta" /><i className="plane jade" /><i className="plane water" /></div>
        <div className="ashram-hero-scene" aria-hidden="true"><img className="hero-ila-art" src={assets.ilaIntroduction} alt="" /><i className="hero-hut one" /><i className="hero-hut two" /><i className="hero-tree one" /><i className="hero-tree two" /><i className="hero-tree three" /><i className="hero-path" /><i className="hero-instrument" /><i className="hero-star-thread"><b /><b /><b /></i></div>
      </section>

      <section className="apprentice-introduction">
        <div className="apprentice-image-frame"><img src={assets.ilaIntroduction} alt="Ila, the apprentice map-copyist, standing between Ashraya Vana and the wider river world" /><span>Ila’s copper field compass</span></div>
        <div className="apprentice-copy"><p className="section-kicker">Meet the traveler</p><h2>Ila keeps the<br /><em>unfinished chart.</em></h2><p>Before arriving at Ashraya Vana, Ila copied flood maps for a river settlement. When the river began answering the night charts, a damaged copper compass and an unanswered question led them to the Ashram.</p><p>They are not a chosen hero. They are a careful apprentice learning which patterns deserve trust, which tools need practice, and whose lives are changed by a route on a map.</p><div className="apprentice-facts"><span><b>Origin</b>River map-copyist</span><span><b>Carry</b>Damaged copper compass</span><span><b>First question</b>Why do the stars answer the river?</span></div></div>
      </section>

      <section className="landing-intro" id="journey">
        <p className="section-kicker">The opening rhythm</p>
        <div className="intro-layout"><h2>Not a chosen one.<br /><em>A careful learner.</em></h2><div><p>Vidya Yantra is an original adventure that begins in an Ashram rather than a battlefield. Its learning rhythm is inspired by teacher–student traditions: listening, reflection, practice, debate, and service.</p><p>Every lesson changes how the apprentice navigates people, places, puzzles, and action. The larger instruments of the world—including the Rasa Engine—arrive only after the player has a reason to understand them.</p></div></div>
      </section>

      <section className="discipline-section">
        <div className="section-heading"><div><p className="section-kicker">Four practice circles</p><h2>Study becomes a<br />way of moving.</h2></div><p>Ashram lessons are small playable encounters. They develop useful techniques and shift the player’s balance of discernment, courage, and compassion.</p></div>
        <div className="discipline-grid">{disciplines.map((discipline) => <article className="discipline-card" key={discipline.name}><span className="discipline-index">{discipline.index}</span><span className="discipline-mark">{discipline.mark}</span><h3>{discipline.name}</h3><p>{discipline.line}</p></article>)}</div>
      </section>

      <section className="season-section">
        <div className="season-copy"><p className="section-kicker">A living calendar</p><h2>The world does not<br />hold still for study.</h2><p>Day and night shift the atmosphere of the Ashram. Six seasonal moods—Vasanta, Grishma, Varsha, Sharad, Hemanta, and Shishira—change water, sky, conversation, and later journey conditions.</p><div className="season-legend"><span><i className="dot spring" />Vasanta</span><span><i className="dot rain" />Varsha</span><span><i className="dot clear" />Sharad</span></div></div>
        <figure className="season-visual"><div className="season-dial" aria-label="Six part seasonal wheel"><i /><i /><i /><i /><i /><i /></div><figcaption>Seasonal wheel of Ashraya Vana</figcaption></figure>
      </section>

      <section className="journey-map-section">
        <div className="section-heading map-heading"><div><p className="section-kicker">The longer run</p><h2>From Ashram<br />to the Open Almanac.</h2></div><p>Twelve playable field chapters now carry Ila from study shelter through river, instrument, storm, ridge, estuary, memory, corroboration, public route-making, visible amendment, variance, and the first fourfold comparison. The Open Almanac season asks how later readers keep seasonal records useful without making them final.</p></div>
        <div className="chapter-path">{chapters.map((chapter) => <article className={`chapter-card ${chapter.current ? "is-current" : ""}`} key={chapter.roman}><span>{chapter.roman}</span><div><em>{chapter.place}</em><h3>{chapter.title}</h3><p>{chapter.copy}</p><button onClick={() => chapter.current ? onEnter() : onPreviewChapter(chapter.biome)}>{chapter.cta} <b>↗</b></button></div></article>)}</div>
      </section>

      <section className="monsoon-feature mirror-step-feature">
        <div><p className="section-kicker">Chapter VIII · active field chapter</p><h2>Where a testimony<br />meets its mirror.</h2><p>At Mirror Step, carry observation, inference, and remembered experience into a debate chamber where no single source can close the route alone. Leave a Countermark Lens beside the route claim.</p><span>Contextual corroboration · debate instruments · accountable maps</span><button className="primary-action monsoon-action" onClick={() => onPreviewChapter("mirrorStep")}>Enter Mirror Step <span>↗</span></button></div>
        <img className="mirror-step-plate" src={assets.mirrorStep} alt="Mirror Step concept: Ila approaching an open copper evidence instrument with three source stations" />
        <div className="mirror-step-instrument" aria-hidden="true"><i /><i /><i /><b /><span>Observation · inference · testimony</span></div>
      </section>

      <section className="confluence-feature">
        <div className="confluence-copy"><p className="section-kicker">Chapter IX · active field chapter</p><h2>When several routes<br /><em>meet at one table.</em></h2><p>The Confluence Table carries the Countermark Lens beyond the mirror. Bring a source, its condition, and a public consequence into an original civic field space where a route remains useful only if another traveler can still revise it.</p><span>Gather · situate · revise · share</span><button className="primary-action" onClick={() => onPreviewChapter("confluence")}>Reach the Confluence Table <span>↗</span></button></div>
        <div className="confluence-visual"><img src={assets.confluenceTable} alt="Chapter IX Confluence Table concept: a copper public route instrument connecting river, ridge, and salt paths" /><i /><i /><b>Source · condition · public route</b></div>
      </section>

      <section className="return-observatory-feature">
        <div className="return-observatory-visual"><img src={assets.returnObservatory} alt="Chapter X Return Observatory concept: a copper armillary instrument returning a public route to changing river, ridge, and shore conditions" /><i /><i /><b>Published route · changed condition · visible lineage</b></div>
        <div className="return-observatory-copy"><p className="section-kicker">Chapter X · active field chapter</p><h2>When a route meets<br /><em>the next condition.</em></h2><p>The Return Observatory asks what happens after a public map is shared. Carry the Route Braid back to its river gauge, wind corridor, and shore record; amend the useful line without hiding the condition that changed it.</p><span>Publish · encounter change · return · amend</span><button className="primary-action" onClick={() => onPreviewChapter("returnObservatory")}>Enter Return Observatory <span>↗</span></button></div>
      </section>

      <section className="living-survey-horizon">
        <div className="living-survey-copy"><p className="section-kicker">Chapter XI · active field chapter</p><h2>When later readers<br /><em>measure the return.</em></h2><p>The Living Survey carries an earlier route, its amendment, and a new field mark through a changing basin. The aim is not one final map, but a comparison that leaves a visible variance for the next traveler.</p><span>Return · mark · compare · publish variance</span><button className="primary-action" onClick={() => onPreviewChapter("livingSurvey")}>Enter Living Survey <span>↗</span></button></div>
        <div className="living-survey-instrument" aria-label="Chapter XI Living Survey visual target"><img src={assets.livingSurvey} alt="Chapter XI Living Survey: an apprentice, Surveyor of Returns, three field stations, and four distinct lineage layers at a copper survey basin" /><b>Earlier line · amendment · reader’s variance</b></div>
      </section>

      <section className="lineage-chamber-feature"><div><p className="section-kicker">Chapter XII · Open Almanac begins</p><h2>Four leaves,<br /><em>one accountable table.</em></h2><p>The Lineage Chamber gives the new season a different starting rhythm: walk the earlier line, amendment, variance, and next-reader leaves in world space before a public notation can travel toward the Wind Ledger Terrace.</p><span>Inspect · distinguish · relate · carry forward</span><button className="primary-action" onClick={() => onPreviewChapter("lineageChamber")}>Enter Lineage Chamber <span>↗</span></button></div><div className="lineage-chamber-landing-mark" aria-hidden="true"><i /><i /><i /><i /><b>Earlier · amendment · variance · reader</b></div></section>

      <section className="guide-section">
        <div className="guide-portrait"><img src={assets.rishiPortrait} alt="Rishi Aruna, original guide character" /></div>
        <div><p className="section-kicker">Guides, not quest dispensers</p><h2>Every teacher carries<br />a question of their own.</h2><p>A living codex and dialogue quests deepen the relationships with Rishi Aruna, Muni Laya, and Raja Somavrat. Their ideas do not prescribe an answer; they frame the decisions that the apprentice must eventually make.</p><button className="primary-action" onClick={onEnter}>Carry a first question <span>↗</span></button></div>
      </section>

      <footer className="landing-footer"><span>Vidya Yantra</span><p>An original mythic-science adventure about study, growth, travel, and consequence.</p><button onClick={onEnter}>Align Chapter I</button></footer>
    </main>
  );
}
