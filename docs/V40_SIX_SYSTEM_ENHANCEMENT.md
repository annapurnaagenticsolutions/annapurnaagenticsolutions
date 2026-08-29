# Annapurna Living World v4.0 — Six-System Enhancement Pass

## Objective
Move beyond incremental visual polish. Preserve the proven Home, Explore and Lab baseline while making the whole site behave more like one continuous intelligent environment.

## Six enhancement bundles
1. **Cross-page continuity** — current trail/world now follows the visitor onto Explore, Lab and Evidence; Explore accepts world-resume hashes.
2. **Interactive Evidence Field** — selecting a claim updates a four-stage provenance path: Claim → Source → Scope → Limit/conflict.
3. **Evidence discovery controls** — summary coverage and filters for all, verified, source-local and conflict-bearing claims.
4. **Meaningful repository context** — repository pulse replaces stars with evidence-claim coverage and exposes the evidence snapshot date; engineering activity remains explicitly non-maturity evidence.
5. **Contextual Guide** — Guide actions change by page and act on the current environment instead of exposing the same generic shortcuts everywhere.
6. **Continuity choreography + viewport hardening** — internal navigation carries a restrained transition signal, scroll/header offsets are measured at runtime, cross-page arrivals avoid sticky-header collisions, and the atlas core receives one low-amplitude breathing signal.

## Deliberate non-changes
- Home typography and composition are frozen except for continuity behavior.
- Interactive Lab layout is frozen.
- Glass remains selective; no full-stage glassmorphism.
- No Three.js/WebGPU, framework, third-party runtime, analytics, identity tracking or new network dependency was added.
- About, Contact and final GitHub-page linking are intentionally deferred to the next phase.

## Evaluation 1 — Experience coherence
PASS. The site now preserves a visitor trail across page boundaries; page transitions and Guide actions read from the current state. Evidence is no longer only a card catalogue: a selected claim has a visible provenance path and conflicts remain explicit.

## Evaluation 2 — Trust/accessibility
PASS. New evidence controls are keyboard-selectable, conflict states are not suppressed, navigation remains functional without the Guide, reduced motion disables transition/breathing effects, reduced transparency removes optical glass dependence, and visitor continuity stays browser-local.

## Evaluation 3 — Engineering/performance
PASS static gate. All inherited v2.x/v3.x contracts, JSON schemas, JS syntax and v4.0 tests pass. Local static HTTP verification passes. Shared CSS gzip increased ~3.9% vs v3.9; shared JS gzip increased ~11.5% because the continuity/evidence/Guide systems are delivered without a framework or external dependency. The release keeps the existing real-browser LCP/INP <=10% promotion gate; screenshots/runtime remain the visual/browser acceptance evidence.

## Visual acceptance targets for the next screenshot gate
- continuity ribbon must feel like context, not another nav bar;
- Evidence Field must make the selected claim easier to understand than the card index below it;
- filters must reduce scanning rather than add dashboard chrome;
- page transition should be felt, not noticed;
- Guide actions must be clearly contextual;
- no regression to Home, Explore or Lab composition.
