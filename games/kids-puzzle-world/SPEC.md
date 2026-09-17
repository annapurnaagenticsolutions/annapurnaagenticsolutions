# Kids Puzzle World — Technical & Design Spec

Companion to `Kids_Puzzle_World.md` (the product brief, unmodified) and
`CONTEXT.md` (the autonomous operating contract). This file locks the
decisions the brief deliberately left open ("exact implementation is your
decision" — §17/§20/§43). Everything below is a decision, not a menu.
Building starts by following §10 (implementation sequence) in order.

If a decision here proves wrong once real building starts, change it and
append one line to §11 (Decision Log) explaining why — don't stall waiting
for permission (see `CONTEXT.md`).

---

## 1. Scope lock

The v1 build is exactly the 5 mechanics the brief itself recommends starting
with (§4), mapped onto 5 of its 12 named regions (§3):

| Region (world map) | Mechanic |
|---|---|
| Pattern Forest | Pattern Builder |
| Maze Mountain | Path & Maze |
| Balance Bay | Balance & Physics |
| Gear Factory | Gear/Machine |
| Shape Workshop | Spatial Assembly |

The World Map in v1 shows **only these 5 regions** — not 12 tiles with 7
"coming soon," which would read as nagging/incomplete for a kids' product.
The remaining 7 named regions (Gravity Garden, Logic Temple, River Crossing,
Light & Shadow Cave, Number Village, Sound Garden, Machine Island) are
explicitly deferred and not designed in this document. Adding one later
should require no runtime/mechanic code changes — only a new `regionId`,
a world-map entry, and level data pointed at an existing mechanic — which is
how this scope lock stays consistent with brief §3's "architecture capable
of supporting them, then implement a smaller number deeply."

---

## 2. Tech stack

- **Build tool:** Vite. Fast dev loop, native ESM, trivial route-level code
  splitting via dynamic `import()` — the mechanism for §26's lazy-loading of
  heavy puzzle systems.
- **Framework:** React 18, function components + hooks only.
- **Language:** TypeScript, `strict: true`, no `any` in puzzle-core code
  (`runtime/`, `mechanics/*/definition.ts|state.ts|generator.ts|validator.ts`).
- **State management — split in two:**
  - *Shell/progression:* **Zustand**, with its `persist` middleware pointed
    at the custom corruption-safe storage adapter in `persistence/saveStore.ts`
    (§7) rather than raw `localStorage` directly.
  - *Per-puzzle simulation state:* **not** global state. Each live puzzle
    instance owns a plain class/closure outside React, exposed to components
    via `useSyncExternalStore`. This keeps puzzle-core logic framework-free
    and unit-testable with zero DOM, and lets continuous-simulation mechanics
    (balance, gear) tick on `requestAnimationFrame` without fighting React's
    render scheduler. Required for 60fps and for brief §19's
    "inspectable, genuinely simulated" rule.
- **Styling:** Tailwind CSS for layout plumbing (flex/grid, responsive
  breakpoints, spacing scale) with Tailwind's default color palette
  **disabled** and a fully bespoke theme in its place — material-named
  tokens (e.g. `forest-moss`, `gear-brass`, `gravity-sky`), not
  `primary`/`gray`; a self-hosted playful display font + a separate readable
  body font; hand-built chunky/organic UI primitives, no shadcn or
  default-component reuse. This is a bet, not a certainty — see risk #3 in
  §9; it gets re-audited with fresh eyes during the Phase 12 visual-polish
  pass, and hand-authored bespoke CSS/SVG chrome is an acceptable fallback
  for shell screens if Tailwind-built UI still reads generic.
- **Animation — two-tier:**
  - Shell/chrome transitions (screen transitions, world-map pans, menu
    open/close, hint-overlay fades, button micro-feedback): **Framer
    Motion**, wrapped to respect `prefers-reduced-motion`.
  - Puzzle-internal visuals representing actual gameplay (gear rotation,
    piece position, beam angle): **read directly from simulation state each
    frame** — no animation library ever decides these values, only applies
    them. This is the concrete, checkable enforcement of brief §19.
- **Rendering:** DOM + CSS transforms for Pattern Builder, Path & Maze,
  Gear/Machine, Spatial Assembly (real DOM nodes → better keyboard focus and
  accessibility, plenty fast for the element counts involved). **Canvas2D**
  only for Balance & Physics (matter.js's natural rendering surface, higher
  body counts). **No WebGL/Three.js anywhere** — none of the 5 mechanics
  need it, and the brief explicitly forbids 3D used just to claim 3D (§17).
- **Routing:** React Router, route-level lazy loading per mechanic, plus a
  conditionally-registered `/dev/scenario-lab` route (§9).
- **Package manager:** npm (zero extra install requirements).

---

## 3. Physics/simulation approach per mechanic

| Mechanic | Approach | Why |
|---|---|---|
| Pattern Builder | No physics. Discrete rule evaluator applied to symbolic slot values. | Correctness is "does `rule(sequence))` match" — genuinely computed, not physics-shaped. |
| Path & Maze | No physics. Discrete grid state machine (position/walls/switches/gates/keys/boxes) re-evaluated per move. | A real discrete-event simulation; continuous physics is the wrong tool for grid logic. |
| **Balance & Physics** | **Real engine: matter.js.** | Brief §19 names decorative physics as *the* anti-pattern to avoid. Torque/center-of-mass/toppling must genuinely emerge from mass × distance and real collision, which needs an actual rigid-body solver. Hand-rolling 2D rigid-body physics is high effort/high bug risk for a solo build agent versus a well-tested ~90kb library; heavier engines (Rapier/Box2D-wasm) add integration cost with no payoff for 2D lever/seesaw/stacking puzzles. Lazy-loaded only into this mechanic's route chunk. |
| **Gear/Machine** | **No physics engine — deterministic directed-graph rotation-propagation simulation.** | Gear puzzles are about topology/ratio correctness, not collision. matter.js has no first-class gear-meshing primitive, so using it would mean faking gears via constraints anyway — dependency weight with no gain. Instead: a graph of nodes (gears/pulleys/axles) with edges carrying ratio + direction-inversion; one driver has angular velocity, propagated by traversal each tick and integrated (`angle += ω·dt`) with periodic mod-2π normalization to avoid float drift on long runs. This is genuine simulation — deterministic integration over real connectivity — even without a general physics engine. Win condition reads the consumer node's *actually propagated* angular velocity against the target within tolerance; incompatible gear meshing is a real constraint check at graph-build time, not a cosmetic failure. |
| Spatial Assembly | No physics. Deterministic geometric fit-check (cell-mask overlap or polygon SAT test) between actual piece geometry-at-transform and the target silhouette region. | Fit must be computed from real occupied cells given the actual applied rotation/position — matching piece IDs to slot IDs would be exactly the "fake success" §19 forbids. |

---

## 4. Seeded procedural generation

**RNG:** in-house, no dependency. A string-seed hash (cyrb53/FNV-1a) feeds
`mulberry32` for the actual stream. Full control avoids an upstream
dependency version bump silently changing output and desyncing the scripted
solved-path regression tests (§8); the whole PRNG is ~15 lines and trivially
unit-tested for determinism. Lives at `shared/rng.ts`.

**Core guarantee pattern — generate the solution first, then scramble it —**
makes solvability true by construction rather than by search, used across 4
of the 5 mechanics:

- **Pattern Builder:** pick a rule from a shared rule library (arithmetic
  step, rotation-by-step, alternating AB/AABB, size-scaling, compound
  dual-attribute), compute the full canonical sequence by calling *the same
  rule-evaluator function the runtime win-check uses*, then hide the last
  1–2 slots. Decoys are wrong-parameter perturbations of the same rule,
  diffed against the correct answer to guarantee non-collision.
- **Path & Maze:** build the maze via randomized DFS/Prim's spanning tree
  (a path from start to every cell, including goal, is structurally
  guaranteed). Decorate on top: gates on tree-path edges, switches/keys on
  cells reachable via flood-fill excluding the gated edge. **Exception:**
  Sokoban-style movable-box layouts don't preserve solvability under
  scrambling, so that sub-case uses generate-then-validate instead: run
  BFS/IDA* over the state space `(player, boxes, switches)` with a
  node/time cap, accept on success, regenerate up to K attempts, and fall
  back to a simpler decoration pattern if the cap is exceeded. Flagged as
  risk #2 in §9.
- **Balance & Physics:** pick masses/positions satisfying the closed-form
  static torque balance (Σ mass·distance = 0 around the fulcrum) — i.e.
  generate the *solved* arrangement first — then scramble starting
  positions. A solution exists by construction; matter.js at runtime should
  converge to match the static pre-check within tolerance (used as a
  dev-time consistency assertion, not a per-play cost).
- **Gear/Machine:** generate the driver→...→target graph topology and
  required gear sizes first by directly computing what the propagation
  function needs to reach the target condition, then scramble by moving a
  subset of gears into a "parts tray" (optionally adding 1–2
  size-incompatible decoy gears).
- **Spatial Assembly:** partition the target silhouette region into pieces
  first (the pieces *are* a tiling of the silhouette by construction), then
  scramble each piece's position/rotation. Multiple valid solutions may
  exist; at least one (the original tiling) is guaranteed.

Every generator runs its own runtime validator as a post-generation
self-check — always in dev/test, and as a cheap guard in production — and
regenerates with a bumped seed offset on failure rather than ever shipping a
broken puzzle. This is a hard invariant satisfying brief §21/§22, not a
hope.

---

## 5. Puzzle Runtime contract

Generic over per-mechanic state/action/hint types — mechanic-specific
richness lives in `S`/`A`/`H`, the shared surface stays small so this
doesn't become a God interface.

```typescript
// src/runtime/types.ts
export type PuzzleStatus = 'idle' | 'playing' | 'paused' | 'won' | 'failed-safe';
export type HintTier = 1 | 2 | 3 | 4 | 5;

export interface DifficultyConfig {
  level: number;                        // 1..N, drives generator params
  params: Record<string, number>;       // mechanic-specific knobs
}

export interface PuzzleMetadata {
  id: string;
  mechanicId: 'pattern' | 'path' | 'balance' | 'gear' | 'assembly';
  title: string;                         // i18n key
  regionId: string;
  difficulty: DifficultyConfig;
  seed?: number;
}

export interface SerializedPuzzleState {
  schemaVersion: number;
  mechanicId: string;
  seed?: number;
  payload: unknown;                      // JSON-safe; validated on read
}

// S = simulation state shape, A = action union, H = hint-state shape
export interface PuzzleDefinition<S, A, H = unknown> {
  metadata: PuzzleMetadata;
  createInitialState(seed?: number): S;
  reducer(state: S, action: A): S;          // pure, sync; continuous sims use a {type:'tick', dt} action
  isValidAction(state: S, action: A): boolean;
  checkWin(state: S): boolean;
  checkFailSafe?(state: S): boolean;         // e.g. stuck-but-recoverable; never a hard loss
  getHintState(state: S, tier: HintTier): H; // pure, no mutation
  serialize(state: S): SerializedPuzzleState;
  deserialize(data: SerializedPuzzleState): S;
  reset(state: S): S;
}
```

A separate `PuzzleRuntime<S, A>` wrapper (not part of the pure definition)
owns the *live* instance: `dispatch`/`subscribe` (feeding
`useSyncExternalStore`), `status`, and hint-tier tracking, and calls
`checkWin` after every dispatch. This is the
init/play/pause/reset/validate/complete/serialize lifecycle from brief §18.
Continuous simulation (balance, gear) routes through the same
`dispatch({type: 'tick', dt})` path as discrete moves, which keeps
*everything* inspectable and replayable as an action log — this is what
makes the scripted solved-path regression tests in §8 possible.

---

## 6. Folder structure

Maps 1:1 onto brief §18's 8 architecture layers:

```
src/
  app/                    # Game Shell: routes, screens, progression/settings/audio stores (Zustand)
  runtime/                # Puzzle Runtime: types.ts, PuzzleRuntime.ts, usePuzzleRuntime.ts, hintController.ts
  mechanics/              # Puzzle Definition + Simulation State, one dir per mechanic:
    pattern/  path-maze/  balance/  gear/  assembly/
      definition.ts  state.ts  generator.ts  validator.ts (+ solver.ts / graph.ts / physics.ts / geometry.ts as needed)
      renderer/           # Renderer layer, mechanic-scoped React components
      __tests__/
    registry.ts           # mechanicId -> lazy-loaded { definition, renderer }
  input/                   # Input Layer: useDragAndDrop, useKeyboardNav, usePointerGestures (shared)
  feedback/                # Feedback Layer: SoundManager, particles/, motionPresets.ts, HintOverlay
  analytics/               # Analytics Adapter: AnalyticsAdapter interface + Null/Local implementations
  persistence/             # saveSchema.ts, saveStore.ts (all localStorage access centralized here)
  shared/                  # rng.ts, i18n/, theme/tokens.ts, ui/ (dumb shared primitives)
  dev/scenario-lab/        # gated dev-only route + presets + DevOverlay
  test/simulated-players/  # scripted solved-path fixtures, one per representative level
e2e/                       # Playwright specs
```

---

## 7. Save/progression schema

```typescript
// src/persistence/saveSchema.ts
export const SAVE_SCHEMA_VERSION = 1;

export interface SaveDataV1 {
  schemaVersion: 1;
  createdAt: string; updatedAt: string;
  preferences: { audioMuted: boolean; reducedMotion: boolean; highContrast: boolean; locale: string };
  progression: { unlockedRegionIds: string[]; levels: Record<string, LevelProgress> };
  devFlags?: { unlockAll?: boolean };    // only ever written by Scenario Lab, never child-facing UI
}
export interface LevelProgress {
  status: 'unseen' | 'started' | 'completed';
  bestMetric?: number;                   // optional, mechanic-defined, never shown competitively
  hintTiersUsedMax?: number;             // design telemetry only, never a shame indicator to the child
  lastPlayedAt: string;
}
export type AnySaveData = SaveDataV1;    // grows: SaveDataV1 | SaveDataV2 | ...
```

Single stable storage key `kpw:save`; `schemaVersion` lives **inside** the
JSON payload (not the key), so migration is driven by reading it, not by
key-probing. Migration is a linear chain
`migrations: Record<number, (old: unknown) => unknown>` keyed by
from-version; on load: parse → validate the claimed version's shape (don't
trust the tag blindly) → apply migrations sequentially, re-validating after
each step → write back once fully migrated.

**Corruption recovery (never crashes — brief §35):** all reads/writes funnel
through `persistence/saveStore.ts` only. Any failure (parse error,
validation failure, a future/negative/non-numeric version) triggers, in
order: best-effort backup of the raw string to a capped
`kpw:save:corrupted:<timestamp>` key (limit 1, itself wrapped in try/catch,
inspectable from the Scenario Lab) → fall back to `createDefaultSave()` →
`console.warn` (dev visibility only) → a small non-alarming one-time toast
("Started a fresh adventure," never "ERROR: data corrupted"). If
`localStorage` is unavailable entirely (private browsing), fall back to an
in-memory store for the session — never throw. Writes are debounced
(~500ms after the last progression change).

---

## 8. Testing tooling

- **Unit — Vitest:** reducers, validators, win-conditions, generators
  (property-style "N seeds all pass validator" loops), serialization and
  migration, RNG determinism.
- **Integration — React Testing Library + Vitest/jsdom:** render a
  mechanic's renderer wired to a **real** `PuzzleRuntime` (never mocked),
  fire `@testing-library/user-event` drag/click/keyboard, assert DOM output
  and underlying simulation state together. This is the executable form of
  brief §19/§46's "verify by reading the code path, not by assuming."
- **E2E — Playwright** (chosen over Cypress for native multi-browser touch
  and viewport emulation — `page.touchscreen`, `setViewportSize` — needed
  for brief §7/§25's touch-first/responsive requirements): load → world map
  → region → puzzle → scripted solve → assert completion → reload → assert
  persistence; plus a corruption test injecting malformed `localStorage` via
  `page.evaluate` and asserting zero console errors on reload.
- **Scripted solution-path regression tests (brief §31):** one TS module per
  representative level under
  `src/test/simulated-players/<mechanic>.solved-path.test.ts`, each a
  literal ordered action array for a fixed seed, replayed through the real
  reducer via `PuzzleRuntime`, asserting `checkWin` becomes true at the end
  and not earlier. These run as fast Vitest unit tests (no browser needed —
  they only touch the pure reducer), plus one thin Playwright smoke test
  replaying a solved path through real UI drag events for one mechanic, to
  catch input-layer regressions the pure-reducer tests can't see.

---

## 9. Scenario Lab

Gated by **route registration + build flag**, not a query param:
`/dev/scenario-lab` and its `React.lazy` chunk are registered in the router
only when `import.meta.env.DEV` or `VITE_ENABLE_DEV_TOOLS=true`. In a real
production build with the flag unset, the route doesn't exist and its lazy
chunk is never referenced in the bundle graph — genuinely absent from what
ships to children, not just hidden. (Query-param-only gating was rejected
because it still ships the code and is trivially discoverable.)

Brief §23's preset list mapped onto this architecture:

- **Puzzle States** (fresh/nearly-solved/solved/invalid/max/min difficulty):
  clean fit for all 5 mechanics — nearly-solved/solved reuse the same
  solved-path fixtures as the regression tests (`createInitialState` +
  replay N-1/N actions); invalid = dispatch into a `checkFailSafe` state;
  max/min = pass difficulty bounds into the generator.
- **Interaction Stress** (rapid dragging, repeated reset, resize,
  touch-viewport, keyboard-only, repeated hints): clean fit, all orthogonal
  to mechanic internals — pure runtime/input-layer concerns.
- **Simulation Stress** (max objects, physics pile-up, simultaneous
  triggers, long-running): "physics pile-up" maps directly onto Balance &
  Physics. One deliberate reinterpretation: "multiple simultaneous
  mechanism triggers" doesn't map literally onto Pattern Builder or Spatial
  Assembly, which have no "mechanisms" in the gear/path sense — there it
  means "many pieces/slots validated in a single bulk dispatch." Recorded
  here explicitly so it isn't later mistaken for a gap.
- **Persistence** (fresh/partial/all-complete/corrupted): direct fit onto
  `saveStore.ts` — presets pre-seed or clear `localStorage` then reload;
  the corrupted preset writes deliberately broken data and asserts the §7
  recovery path fires.

---

## 10. Implementation sequence

Concretizes brief §42. **Every phase ends with actually running the app in a
browser and playing/inspecting it** — a phase is not done when its code
compiles or its tests pass (see `CONTEXT.md`'s operating loop).

0. **Foundation** — Vite+React+TS scaffold, git init, folder structure from
   §6, base routing (World Map stub → Region stub), `saveStore.ts` skeleton,
   ESLint/Prettier/Vitest/Playwright wired. *Exit:* `npm run dev` boots, a
   blank world map renders with zero console errors, `npm test` runs.
1. **Puzzle Runtime core** — the `PuzzleDefinition`/`PuzzleRuntime` contract
   from §5, shared HUD (goal readout, reset/hint buttons), `shared/rng.ts`.
   *Exit:* a minimal mechanic runs end-to-end through the runtime in-browser,
   proving the contract before real mechanics are built on it.
2. **Balance & Physics** (built early, not last — see risk #1 in §11: its
   mutable matter.js engine state is the part of §5's contract most likely
   to need adjusting, so surfacing that friction happens while the contract
   can still flex).
3. **Pattern Builder**
4. **Path & Maze**
5. **Gear/Machine**
6. **Spatial Assembly**

   *(Each of phases 2–6: full mechanic implementation, generator +
   validator, ~8+ hand-tuned levels, layered hints, unit + integration
   tests, played in-browser with both mouse and touch emulation. Exit:
   playable start to finish, tests pass, visually polished — not placeholder
   shapes.)*

7. **Progression & world-map polish** — real per-region visuals, unlock
   logic wired to save data, completion overlays.
8. **Scenario Lab** — build the dev route and all presets from §9.
9. **Persistence hardening** — corruption recovery, migration scaffold,
   fresh/partial/complete-progress presets verified via Scenario Lab.
10. **Responsive & accessibility pass** — test at defined breakpoints,
    keyboard-only pass, reduced-motion pass, contrast check.
11. **Testing completion** — fill coverage gaps, add the E2E smoke suite,
    scripted solvers for all 5 families.
12. **Visual & performance polish** — full visual QA (brief §32), FPS check
    (brief §26), and the explicit re-audit of risk #3 (§9) with fresh eyes.
13. **Final full playtest & report** — play every mechanic and every
    Scenario Lab preset end-to-end, inspect the console, then produce the
    completion report per `CONTEXT.md`'s Final report rule.

---

## 11. Decision Log

Append one dated line whenever a locked decision above is revised during
building, and why. The three items most likely to need an entry first:

1. **matter.js ↔ the pure-reducer `PuzzleDefinition` contract** — a
   continuous physics engine is inherently mutable/stateful, which sits
   awkwardly inside an immutable-reducer contract (serializing/undoing a
   live `Engine`/`World` isn't natural). Likely resolution if it bites:
   store a serializable snapshot of body positions/velocities as `S`
   alongside a live matter.js instance, rather than the engine itself being
   the state.
2. **Sokoban-style Path & Maze generation** — the one mechanic that can't
   use generate-then-scramble; its BFS/IDA* search can blow up for larger
   grids/box counts, and the K-attempt regeneration cap is a heuristic that
   will likely need real tuning (or a redesign toward construction-based
   placement) once actual level authoring reveals real generation timing.
3. **Tailwind + custom tokens actually avoiding a "generic AI-dashboard"
   look** — a real risk to brief §14/§40's core differentiation, not just a
   theoretical one; utility-class UI tends to drift toward
   boxy-card/`rounded-md`/`shadow-sm` conventions under time pressure
   regardless of theme tokens. Explicitly re-litigated at Phase 12.

*(log entries go below this line, oldest first)*

---

## 12. Non-goals

Carried from the brief to block scope creep during autonomous building:

- No accounts, authentication, or user-to-user chat/messaging.
- No backend, cloud database, CMS, or admin dashboard.
- No multiplayer, no payments.
- No regions beyond the 5 mapped in §1 for v1.
- No PWA installability until the Phase 13 sequence above is otherwise
  complete (stretch only, if time remains).
