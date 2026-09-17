# Play Platform Requirements v0.1

## 1. Product direction

Create one Annapurna play and learning platform with multiple independently releasable experiences. The platform should make discovery coherent while keeping each game’s build, release, rollback and maturity boundary explicit.

Proposed public shape:

```text
play.annapurnaagenticsolutions.com/
  /                 catalogue and shared platform shell
  /funlab/          eleven mini-games in one collection
  /kids-puzzle-world/ child-safe puzzle world
  /oneiric/         standalone dream-heist game
  /vidya-yantra/    learning world
  /varsha-hollow/   narrative world
  /wonderhub/       learning discovery hub
```

The initial implementation should be static-first. Cloudflare Workers Static Assets or Pages can serve the built browser experiences; account and progress APIs should be added only where a real product need exists.

## 2. Guest-first access model

### Default experience

- Anyone can open the catalogue and start playing without an account.
- The first session must contain a complete, satisfying playable loop.
- Anonymous progress is stored locally in the browser where the game supports saves.
- For Kids Puzzle World, child-facing play remains local-first; any future account flow must be parent-mediated and introduced outside the child’s core puzzle loop.
- No email, password, profile or child-identifying data is collected merely to try a game.
- Core gameplay remains free during the initial launch period.

### Account prompt

The preferred trigger is a value-based feature boundary, not an arbitrary timer:

1. Let the player finish a first meaningful run, level or chapter.
2. Then offer account creation when they want cross-device save, cloud resume, progress history, sharing, community features or future rewards.
3. Explain the benefit in one sentence and offer a clear “Continue as guest” path wherever possible.
4. If an account is created, migrate eligible local progress into the account after explicit confirmation.

If a game needs a hard gate later, use a transparent milestone such as completing the free opening arc—not a surprise time limit. The threshold must be configurable per game and tested for drop-off and comprehension.

### Account data boundary

- Start with the smallest useful account: verified email or an approved identity provider, a stable user id and game progress.
- Do not collect real names, birth dates, contacts or social graphs for the first release.
- Keep analytics aggregate and event-minimal; do not log raw gameplay text or sensitive identifiers by default.
- Treat learning-world accounts as a separate privacy review because some visitors may be minors.
- Account creation must never be presented as legal validation, educational certification or a requirement to view the portfolio.

## 3. Deployment model

- GitHub remains the source of truth and review history.
- Each project gets its own build command and deployment unit.
- The platform catalogue may be one static shell; individual games should not be merged into one giant runtime.
- Static games can deploy through Workers Static Assets or Cloudflare Pages.
- Dynamic worlds must first have their server, storage, authentication and asset dependencies mapped to a Workers-compatible design.
- Every deployment needs a compatibility date, reproducible build, preview URL, smoke test and rollback path.

## 4. Release order

### Phase 1 — Static-first platform candidates

Release FunLab and Kids Puzzle World as the first static-first platform candidates. FunLab proves the collection model; Kids Puzzle World adds a focused, child-safe learning experience with five puzzle families. The shared deployment preparation now covers all five requested titles, while public release can still be sequenced by maturity. Before public release:

- run the recorded test and audit suite;
- replace or pin external runtime dependencies where practical;
- complete real Chrome, Edge, mobile and keyboard checks;
- confirm local saves, reset behavior and reduced-motion/accessibility behavior;
- complete child-safety, touch-input and parent-facing privacy review for Kids Puzzle World;
- publish a clear “free during preview” label.

### Phase 2 — ONEIRIC

Deploy ONEIRIC as a separate showcase route after a clean install, production build and real-device smoke test. Keep the Lantern Warden name in the history/portfolio narrative rather than shipping a duplicate.

### Phase 3 — Learning worlds

Validate Varsha Hollow and Vidya Yantra separately. Their current React/Babylon/Express/Drizzle shape is not a drop-in full-stack static deployment, so the first deployment unit is now explicit: Vidya Yantra ships as a static showcase and Varsha Hollow as a static preview with cloud save/auth deferred. A Workers-compatible backend and storage plan remains a separate release when those features are ready.

WonderHub can remain the learning catalogue and should not be treated as evidence that every linked learning world is production-ready.

## 5. Acceptance criteria for the first launch

- A visitor can reach a playable activity within one clear action from the catalogue.
- No account prompt appears before the first meaningful interaction.
- The guest/account boundary explains what is gained and what remains free.
- A player can continue as a guest without losing the current run.
- The selected game works from a clean production build with no development-only asset paths.
- A failed game deployment cannot take down the catalogue or another game.
- Public copy matches the actual maturity of each experience.
- No generated dependencies, secrets or local development artifacts are committed.
