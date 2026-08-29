# Audit Report — v1.6 RC

## Problem audited
v1.5 was technically adaptive but did not always communicate causality to a first-time visitor.

## PASS
- 15 JSON schemas including perceived-liveness contract;
- 4 real adaptive signal classes;
- visible Living Response receipt;
- explicit first-visit experiment cue;
- cross-page continuity ribbon;
- Page Guide remains rules-first, local-only and safe-fallback;
- structural choreography only follows explicit visitor intent;
- reduced-motion preserved;
- five-section Home / four-link primary navigation;
- canonical migration and static HTTP deployment verification;
- static gzip budgets.

## Performance versus v1.5
- Home HTML: +5.9%
- CSS: +5.3%
- JS: +6.1%
- Explore/Lab/Evidence HTML: unchanged

These are transfer deltas, not LCP/INP evidence. The <=10% deployed-browser promotion rule remains open.
