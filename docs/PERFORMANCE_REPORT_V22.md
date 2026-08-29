# v2.2 Performance Report

Static gzip comparison against v2.1:
- `index.html`: 2,788 → 2,888 bytes (+3.6%).
- `assets/site.css`: 18,382 → 19,942 bytes (+8.5%).
- `assets/site.js`: 19,350 → 19,582 bytes (+1.2%).

All current files remain inside the release-profile budgets.
Production promotion still requires comparable deployed LCP/INP evidence with ≤10% regression.
No framework, third-party runtime, external font, or WebGL context was added.
