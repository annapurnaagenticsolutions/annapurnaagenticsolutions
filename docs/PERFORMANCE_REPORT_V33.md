# v3.3 Performance Report

Static gzip comparison against v3.2:
- `index.html`: 3,178 → 3,195 bytes (+0.5%).
- `explore.html`: 1,766 → 1,766 bytes (+0.0%).
- `lab.html`: 2,118 → 2,118 bytes (+0.0%).
- `evidence.html`: 1,283 → 1,283 bytes (+0.0%).
- `assets/site.css`: 27,573 → 26,367 bytes (-4.4%).
- `assets/site.js`: 23,603 → 23,963 bytes (+1.5%).
- `assets/material.js`: 2,216 → 2,340 bytes (+5.6%).

All files remain within the existing release-profile static gzip budgets.
No new framework, third-party runtime, audio layer or WebGL context was added.
Production promotion still requires deployed browser evidence that LCP and INP do not regress by more than 10%.
