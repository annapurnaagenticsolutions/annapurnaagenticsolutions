# v1.5 — Temporal + Sensory Living Layer

## Objective
Add atmosphere only after v1.4's three living layers are already present: adaptive structure, responsive/organic interaction, and an embedded page agent. The goal is to make the site feel continuous and time-aware without turning the white professional baseline into an effects showcase.

## Adopted from the supplied prompts
1. **Shared temporal adaptation** — `data/temporal-state.json` is an authoritative, cached presentation state with a configurable generation interval.
2. **Local-time ambience** — browser-local morning/afternoon/evening/night changes greeting and extremely subtle ambient wash only.
3. **Discrete scroll choreography** — five named beats (`Establish`, `Signal`, `Connect`, `Respond`, `Continue`) change presentation state as sections become relevant.
4. **Idle breathing** — only the Annapurna ecosystem core breathes, at 3.6s and 1.012 maximum scale.
5. **Narrative page transitions** — cross-document View Transitions are capped well below 800ms, with instant fallback.
6. **Reduced-motion and low-power governors** — reduced motion removes animations; save-data / <=4 hardware concurrency selects minimal mode.
7. **Performance-first canvas lifecycle** — the living canvas stops when off-screen and throttles on constrained devices.

## Deliberately not adopted yet
- Ambient shaders.
- Ambient audio.
- Three.js / React Three Fiber.
- Cursor trails, magnetic buttons, custom cursor, confetti, parallax-everything.
- Weather-driven mood until a deliberate brand home-base is configured.

## Truth boundary
Temporal and sensory state are presentation-only. They cannot change product maturity, evidence claims, public repository metrics, or semantic company history.

## Performance boundary
Static transfer is measured against v1.4. Promotion still requires deployed/browser evidence that LCP and INP do not regress more than 10%.
