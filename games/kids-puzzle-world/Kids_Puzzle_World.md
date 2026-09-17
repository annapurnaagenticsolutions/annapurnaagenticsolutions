# KIDS PUZZLE WORLD
## Senior AI Coding Agent — Product, Gameplay, Engineering & Execution Context

### 1. Mission

Design and build a production-quality, browser-first **Kids Puzzle World**: a highly visual collection of short, replayable puzzle experiences for children.

This must not feel like:
- a school worksheet,
- a quiz website,
- a collection of text questions,
- an AI chatbot,
- a crude prototype,
- or a generic collection of mini-games.

It should feel like a coherent **playful world of discovery**, where children solve problems by observing, dragging, rotating, connecting, balancing, sequencing, experimenting, predicting, and discovering patterns.

The product must prioritize:

**play → curiosity → experimentation → reasoning → satisfaction**

Learning should emerge from gameplay rather than being presented as instruction.

---

## 2. Target audience

Primary:
- ages approximately 6–12

Design so that:
- younger children can understand core mechanics visually,
- older children still find harder puzzle variants interesting,
- reading is helpful but not required for the majority of gameplay.

Avoid requiring:
- extensive typing,
- long instructions,
- complex menus,
- external accounts,
- social interaction.

---

## 3. Product vision

Create a world containing multiple themed puzzle regions such as:

- Pattern Forest
- Shape Workshop
- Gravity Garden
- Logic Temple
- River Crossing
- Light & Shadow Cave
- Gear Factory
- Balance Bay
- Maze Mountain
- Number Village
- Sound Garden
- Machine Island

Do not mechanically implement all regions at once.

Instead build a polished architecture capable of supporting them, then implement a smaller number of genuinely strong puzzle families deeply enough to prove the product.

Quality is more important than raw puzzle count.

---

## 4. Initial playable scope

Implement at least **5 fundamentally different puzzle systems**.

Recommended starting systems:

### A. Pattern Builder
Children infer and complete visual sequences.

Examples:
- shape sequences,
- color-free symbolic patterns where possible,
- rotation sequences,
- size sequences,
- alternating movement,
- compound patterns.

### B. Path & Maze Puzzle
Guide a character/object through obstacles.

Support:
- movement constraints,
- switches,
- gates,
- keys,
- movable objects,
- optional shortest-path challenges.

### C. Balance & Physics Puzzle
Place objects to balance platforms or satisfy physical constraints.

Gameplay state must be driven by actual simulation or deterministic physics logic—not a fake success animation.

### D. Gear / Machine Puzzle
Children connect gears, pulleys, belts, switches, or simple mechanisms.

Correct configuration should produce visible machine behavior.

### E. Spatial Assembly
Rotate, move, and fit pieces into silhouettes, structures, bridges, or machines.

---

## 5. Stretch puzzle systems

After the first five work correctly, selectively consider:

- light reflection,
- pipe routing,
- circuit-like logic without dangerous real-world electrical instruction,
- bridges,
- sorting systems,
- tangram-like geometry,
- hidden object reasoning,
- visual analogy,
- sequencing,
- cause-and-effect machines,
- simple resource puzzles,
- ecosystem chains,
- musical patterns,
- perspective puzzles.

Do not add systems merely to increase feature count.

---

## 6. Core gameplay principles

Every puzzle should have:

1. a clearly observable goal,
2. minimal instructions,
3. meaningful player agency,
4. immediate visual response,
5. deterministic rules,
6. discoverable failure,
7. recoverability,
8. satisfying completion feedback,
9. replayability or variation,
10. progressive difficulty.

Prefer:

> “I discovered how it works.”

over:

> “The game told me what answer to select.”

---

## 7. Interaction model

Prioritize:

- click,
- tap,
- drag,
- drop,
- rotate,
- connect,
- move,
- swipe,
- place,
- toggle,
- inspect.

Keyboard controls may supplement but should not be required for core play.

Touch interaction must be first-class.

All draggable elements need:
- sensible hit targets,
- clear selected/drag state,
- snapping where appropriate,
- cancellation/recovery behavior,
- no accidental irreversible actions.

---

## 8. World structure

Create a coherent lightweight progression system.

Suggested hierarchy:

World Map  
→ Region  
→ Puzzle Family  
→ Puzzle Level  
→ Completion / Discovery  
→ Next Challenge

Do not build an overcomplicated RPG metagame.

Use progression mainly to:
- introduce mechanics gradually,
- expose harder challenges,
- create a sense of exploration.

---

## 9. Difficulty model

Difficulty should derive from systems, not arbitrary timers.

Possible dimensions:
- more pieces,
- more constraints,
- fewer obvious cues,
- multi-stage solutions,
- decoy possibilities,
- larger search space,
- interacting mechanics,
- less direct geometry,
- optional optimization challenge.

Avoid punishing difficulty spikes.

---

## 10. Hint system

Hints must preserve discovery.

Implement layered hints such as:

1. visual nudge,
2. highlight relevant region,
3. reveal relationship,
4. demonstrate first step,
5. optional near-solution assistance.

Never shame the player.

Do not penalize children for using hints.

---

## 11. Failure model

Failure should be:
- safe,
- reversible,
- understandable.

Prefer:
- reset object,
- undo,
- rewind,
- try again,
- gentle visual indication.

Avoid:
- lives,
- energy systems,
- forced waits,
- aggressive countdown timers,
- failure sounds designed to create anxiety.

---

## 12. Reward model

Use intrinsic rewards first:

- satisfying motion,
- animation,
- world reaction,
- objects coming alive,
- new puzzle discovery,
- visible progress.

Optional lightweight collectibles may exist.

Do not design:
- loot boxes,
- gambling-style rewards,
- manipulative streak systems,
- scarcity pressure,
- pay-to-progress,
- compulsive retention loops.

---

## 13. Child safety and privacy

The product should work without collecting personal information.

Default architecture:
- no account required,
- no real names,
- no chat,
- no public profiles,
- no user-to-user messaging,
- no location tracking,
- no behavioral advertising.

Persist progress locally unless a backend is explicitly added later.

Do not embed unrestricted generative chat into the child-facing experience.

---

## 14. Visual direction

Use a clean, high-quality visual style.

Desired qualities:
- bright but not chaotic,
- playful,
- readable,
- tactile,
- dimensional,
- polished,
- coherent.

Avoid:
- excessive gradients,
- generic AI-dashboard visuals,
- tiny UI,
- dense text,
- excessive cards,
- visual clutter.

The puzzle itself should dominate the screen.

---

## 15. Animation principles

Animation must communicate state.

Use it for:
- drag feedback,
- snapping,
- physical movement,
- mechanism activation,
- success,
- world reactions,
- subtle environmental life.

Avoid decorative animation that interferes with solving.

Respect reduced-motion preferences where practical.

---

## 16. Audio architecture

Audio is optional initially but architecture should support:

- interaction sounds,
- mechanical feedback,
- environmental ambience,
- completion cues.

Provide mute controls.

Never make correct gameplay dependent solely on audio.

---

## 17. Technology

Prefer a browser-first implementation.

Recommended baseline:

- TypeScript
- React or equivalent component architecture
- Canvas/WebGL/Three.js only where it materially improves gameplay
- CSS for standard UI
- deterministic puzzle-state models
- physics library only when genuine physical simulation is required
- local persistence

Do not use Three.js simply to claim 3D.

Use the simplest rendering architecture capable of achieving polished interaction.

---

## 18. Architecture

Separate:

### Game Shell
Navigation, settings, progression, save state.

### Puzzle Runtime
Common lifecycle:
- initialize,
- play,
- pause,
- reset,
- validate,
- complete,
- serialize.

### Puzzle Definition
Configuration/data describing a level.

### Simulation State
The authoritative gameplay state.

### Renderer
Visual representation of simulation.

### Input Layer
Mouse/touch/keyboard interaction.

### Feedback Layer
Particles, sound, animation, success states.

### Analytics Adapter
Disabled/local by default but structurally separable.

---

## 19. Critical architectural rule

**The rendered state must derive from real gameplay state.**

Do not create fake demonstrations where:
- a solution animation plays regardless of state,
- visual machinery operates independently of puzzle logic,
- physics is merely decorative,
- success is determined by a button rather than the simulation.

The game should be inspectable and deterministic.

---

## 20. Puzzle API

Create a reusable puzzle contract similar conceptually to:

- metadata
- initialState
- rules
- actions
- reducer/update
- validation
- winCondition
- hintState
- reset
- serialization
- difficulty configuration

Exact implementation is your decision.

---

## 21. Procedural variation

Where appropriate, support seeded generation.

A seed should reproduce the same puzzle.

Use procedural generation only where generated puzzles can be validated automatically.

Never generate unsolvable puzzles.

---

## 22. Puzzle validation

Every generated puzzle should be checkable for:

- validity,
- solvability,
- expected solution range,
- required mechanics,
- difficulty bounds.

Create developer-side validation tests.

---

## 23. Scenario Lab

Build a developer-accessible **Scenario Lab**.

This is not primarily child-facing.

It should allow rapid testing of gameplay systems and edge conditions.

Include presets such as:

### Puzzle States
- fresh puzzle
- nearly solved
- solved
- invalid configuration
- maximum difficulty
- minimum difficulty

### Interaction Stress
- rapid dragging
- repeated reset
- resize during play
- touch-size viewport
- keyboard-only flow
- repeated hint usage

### Simulation Stress
- maximum moving objects
- physics pile-up
- multiple simultaneous mechanism triggers
- long-running simulation

### Persistence
- fresh user
- partial progress
- all currently available levels complete
- corrupted/invalid local state recovery

---

## 24. Accessibility

Target strong practical accessibility.

Include:
- keyboard navigation for menus,
- clear focus states,
- large targets,
- sufficient contrast,
- reduced-motion awareness,
- non-color-only state representation,
- simple language.

Where a puzzle inherently requires spatial manipulation, provide reasonable alternative cues rather than pretending the experience is fully equivalent.

---

## 25. Responsive requirements

Must work meaningfully at:

- desktop,
- laptop,
- tablet,
- landscape tablet,
- modern mobile portrait where practical.

Puzzle layouts should adapt rather than merely shrink.

---

## 26. Performance targets

Aim for:

- responsive interaction,
- stable animation,
- no major input latency,
- minimal unnecessary rerenders,
- sensible memory use,
- lazy loading of heavy puzzle systems/assets.

Prefer a stable 60 FPS experience where rendering complexity allows.

Gracefully degrade effects before degrading gameplay.

---

## 27. Offline/PWA readiness

Architect for eventual PWA use.

If practical, implement:
- installability,
- cached shell,
- local puzzle data,
- offline access to previously bundled puzzle content.

Do not make network connectivity a prerequisite for basic play.

---

## 28. Content system

Puzzle content should be data-driven wherever sensible.

Separate:
- puzzle mechanics,
- levels,
- difficulty,
- text,
- assets.

This enables future creation tools and multilingual support.

---

## 29. Internationalization readiness

Avoid hardcoding UI strings deeply into components.

Design for future localization.

Keep child-facing text short.

---

## 30. Testing strategy

Implement meaningful tests.

At minimum:

### Unit
- reducers/state transitions,
- validators,
- win conditions,
- generators,
- serialization.

### Integration
- player action → state change → visual consequence,
- reset,
- hints,
- completion,
- progression.

### Browser/E2E
- load game,
- open region,
- play puzzle,
- complete puzzle,
- persist progress,
- reload,
- recover progress.

---

## 31. Automated player simulation

Where possible, create scripted solution paths for representative levels.

Use them to verify:
- puzzles remain solvable,
- actions work,
- completion triggers,
- regressions are caught.

---

## 32. Visual QA

Inspect the actual rendered browser.

Look for:
- overflow,
- clipping,
- weak hierarchy,
- tiny controls,
- broken responsive layouts,
- misaligned objects,
- inconsistent scale,
- accidental scrollbars,
- unclear puzzle affordances,
- overly large empty space,
- childish-but-cheap visual treatment.

Fix discovered issues.

---

## 33. Gameplay QA

Actually play the puzzles.

Evaluate:
- Is the objective obvious?
- Is manipulation satisfying?
- Does the puzzle have real reasoning?
- Can accidental states trap the player?
- Is reset reliable?
- Are hints useful?
- Does success feel earned?
- Would a child understand what happened?

---

## 34. Developer tooling

Provide useful developer capabilities:

- scenario selector,
- state inspector,
- FPS/performance display toggle,
- puzzle seed,
- reset state,
- unlock all,
- current puzzle metadata,
- optional debug overlays.

Keep developer tooling out of normal child-facing presentation.

---

## 35. Save model

Store:
- progression,
- solved levels,
- optional best metrics,
- preferences.

Handle schema evolution safely.

If local data becomes invalid, recover without crashing.

---

## 36. Security

Treat puzzle definitions and local state as untrusted input.

Avoid unsafe HTML injection.

Use dependency versions responsibly.

Do not expose secrets in client code.

No unnecessary backend.

---

## 37. Product metrics architecture

If analytics is ever enabled, structure events around:
- puzzle started,
- puzzle completed,
- puzzle reset,
- hint tier used,
- abandonment point,
- performance issue.

Do not build invasive child profiling.

---

## 38. Quality bar

Do not call a screen complete because:
- components render,
- buttons exist,
- TypeScript compiles.

A feature is complete only when:
- it works,
- it looks coherent,
- state is genuinely connected,
- failure modes work,
- responsive behavior works,
- it has been played.

---

## 39. MVP success criterion

A stranger should be able to open the product and, without explanation:

1. understand that this is a puzzle world,
2. enter a region,
3. start a puzzle,
4. discover the interaction,
5. solve or meaningfully attempt it,
6. receive useful feedback,
7. continue playing.

---

## 40. Product differentiation

The core differentiator is:

**high-quality interactive reasoning through visual play.**

Not:
- content quantity,
- AI branding,
- gamified worksheets,
- endless quizzes.

---

## 41. Avoid premature backend work

Do not add:
- authentication,
- cloud databases,
- multiplayer,
- payments,
- CMS,
- admin dashboards

unless essential for the playable product.

Build the game first.

---

## 42. Implementation sequence

A sensible order is:

1. establish runnable shell,
2. implement puzzle runtime,
3. create first polished mechanic,
4. prove simulation/state architecture,
5. build progression,
6. add additional mechanics,
7. build Scenario Lab,
8. persistence,
9. responsive refinement,
10. testing,
11. visual polish,
12. performance profiling,
13. final browser playtest.

You may modify this sequence when engineering evidence suggests a better approach.

---

## 43. Autonomous decision authority

You may:
- choose libraries,
- refactor architecture,
- replace weak implementations,
- redesign screens,
- remove features that damage the product,
- create missing assets procedurally,
- adjust difficulty,
- modify level structure.

Optimize for the final playable experience.

---

## 44. Definition of done

The project is not done when it merely builds.

It is done only when the implemented scope is:

- playable,
- coherent,
- inspectable,
- testable,
- visually credible,
- responsive,
- stable,
- genuinely driven by gameplay state.

---

## 45. Senior-agent mindset

Act simultaneously as:

- game designer,
- gameplay engineer,
- interaction designer,
- frontend architect,
- QA engineer,
- performance engineer,
- child-safety reviewer,
- product owner.

Challenge weak decisions instead of preserving them.

---

## 46. Evidence over claims

Never claim a feature works merely because code for it exists.

Verify it by running it.

When practical:
- automate it,
- simulate it,
- inspect it,
- play it.

---

## 47. Final execution directive

Work autonomously.

Make reasonable engineering, gameplay, accessibility, child-safety, and artistic decisions yourself.

Do not ask routine questions.

Ask only when something is genuinely blocking or irreversible.

Do not stop with planning.

Do not stop with code generation.

Do not stop because the project compiles.

Do not stop because tests pass while the actual game remains visually or experientially weak.

**BUILD. RUN. OPEN. INSPECT. PLAY. SIMULATE. FIX. POLISH. REPEAT.**

Continuously prefer working software and observed gameplay over theoretical explanations.

Before declaring completion:

- run the application,
- open it in the browser,
- inspect representative desktop and mobile layouts,
- play every implemented puzzle family,
- exercise Scenario Lab presets,
- test reset/recovery,
- verify persistence,
- inspect developer console errors,
- evaluate performance,
- perform a final visual-quality pass.

The majority of effort must go into producing and refining the playable product—not explaining what could theoretically be built.

At the end, provide **only a concise implementation report** containing:

1. What is genuinely implemented.
2. Which gameplay systems are truly connected to simulation state.
3. Which Scenario Lab presets work.
4. Which systems are simplified, procedural, placeholder, or mocked.
5. Current architecture.
6. Performance limitations.
7. Known visual limitations.
8. Known simulation/gameplay limitations.
9. The five highest-impact next improvements.
10. The files, modules, or systems a future senior AI coding agent should inspect first.

Do not pad the report with plans, generic recommendations, or descriptions of work that was not actually completed.
