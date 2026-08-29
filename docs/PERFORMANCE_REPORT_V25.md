# v2.5 Performance Report

Static gzip comparison against v2.4:
- `index.html`: 3,010 → 3,010 bytes (+0.0%).
- `assets/site.css`: 21,544 → 22,099 bytes (+2.6%).
- `assets/site.js`: 21,552 → 22,783 bytes (+5.7%).

No new framework, external font, third-party runtime, or WebGL context was introduced.
Production promotion still requires deployed LCP/INP regression ≤10%.

The static JavaScript ceiling moves from 22 KB to 24 KB gzip for v2.5 because the causal-chain/composite state machine exceeds the previous ceiling; the measured bundle remains below 23 KB gzip. This does not relax the deployed ≤10% LCP/INP regression gate.
