# Audit Report — v1.8

## PASS
- 17 JSON/schema pairs including the new immersive-experience policy.
- Adaptive contract: four real signal classes -> five deterministic views.
- Interaction contract: six-world graph, touch gestures, return sessions and local continuity.
- Temporal/sensory contract and reduced-motion fallbacks.
- Immersive contract: six visual physics, pointer/scroll depth and connected product route.
- Public-copy audit: methodology removed from four market pages.
- First-30-second market gate: scope, interaction, product route, guide/evidence/contact paths.
- JavaScript syntax.
- GitHub Actions YAML parse.
- Exact static HTTP deployment verification.
- Current gzip budgets.

## Static transfer vs v1.7
- `index.html`: +2.5% gzip.
- `assets/site.css`: +26.0% gzip, total ~12.3 KB.
- `assets/site.js`: +6.0% gzip, total ~17.1 KB.

The CSS increase is intentional and isolated to the six dependency-free visual scene grammars. It remains inside the release budget.

## Not claimed
Local Chromium/Lighthouse PASS is not claimed. Chromium GPU/display initialization fails in this sandbox and timed out during the release check. Production CI/deployed Lighthouse remains authoritative, including the <=10% LCP/INP regression rule.
