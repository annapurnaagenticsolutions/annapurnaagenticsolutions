# Performance Report v3.5

v3.5 adds no framework, third-party runtime, WebGL context or network dependency. The Explore layout governor runs on initial layout and resize only. Journey geometry recalculates on route changes, Journey entry and resize; it does not add a continuous animation loop. Semantic field physics uses CSS layers already bounded by the existing motion/reduced-motion policy.

## Static gzip comparison vs v3.3 baseline
- `index.html`: 3,195 → 3,210 bytes (+0.5%)
- `explore.html`: 1,766 → 1,830 bytes (+3.6%)
- `lab.html`: 2,118 → 2,118 bytes (+0.0%)
- `evidence.html`: 1,283 → 1,283 bytes (+0.0%)
- `assets/site.css`: 26,393 → 27,813 bytes (+5.4%)
- `assets/site.js`: 23,963 → 25,449 bytes (+6.2%)
- `assets/material.js`: 2,340 → 2,340 bytes (+0.0%)

All static gzip budgets PASS. LCP/INP promotion remains subject to the existing <=10% browser-regression gate. Local static HTTP verification PASS. Chromium navigation remains blocked by the execution policy (`ERR_BLOCKED_BY_ADMINISTRATOR`), so external screenshots remain the decisive rendering gate.
