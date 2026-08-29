# v2.1 Performance Report

Static gzip comparison against v2.0:
- `index.html`: 2,766 → 2,788 bytes (+0.8%).
- `assets/site.css`: 17,518 → 18,382 bytes (+4.9%).
- `assets/site.js`: 18,489 → 19,350 bytes (+4.7%).

All files remain within the release-profile gzip budgets.
Production promotion still requires deployed browser evidence that LCP and INP do not regress by more than 10%.
No new runtime framework, third-party script, font, or WebGL context was introduced.
