# Living Website Master Prompt Alignment — v1.4

## Layer 1 — Adaptive Structure
Implemented. Four real signals feed a deterministic decision function. The result changes actual section/order/depth/CTA/product/simulation composition, not just copy.

## Layer 2 — Organic Form & Ambient Motion
Retained from v1.3. Motion is tied to pointer, intentional actions, world state, return state or real data arrival. No new autoplay spectacle and no 3D dependency.

## Layer 3 — Embedded Agentic Behavior
Implemented rules-first. The Page Guide has real tools to filter/recompose, navigate, highlight, explain the current decision and adjust depth. It is dismissible and non-modal.

## Live Data
Repository/public pulse remains JSON-backed. v1.4 animates value transitions when refreshed data arrives.

## Safe failure
- JS off: normal static website remains.
- adaptive JSON unavailable: default/static content remains.
- localStorage unavailable: current-session interaction still works.
- agent dismissed/unavailable: all navigation/content remains accessible.

## Performance
Static before/after transfer is recorded. Local PerformanceObserver captures LCP/interaction/long-task observations without transmitting them. Production promotion requires <=10% LCP and INP regression against a comparable deployed/browser baseline.

## Deliberately not added
- LLM runtime call: deterministic mapping is sufficient.
- React/Framer migration: existing vanilla stack already supports the required behavior.
- Three.js/WebGPU: not required to prove adaptive/agentic liveness.
