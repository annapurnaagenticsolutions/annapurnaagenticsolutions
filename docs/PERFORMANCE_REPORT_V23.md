# v2.3 Performance Report

Static gzip comparison against v2.2:
- `index.html`: 2,888 → 3,010 bytes (+4.2%).
- `assets/site.css`: 19,942 → 21,108 bytes (+5.8%).
- `assets/site.js`: 19,582 → 20,244 bytes (+3.4%).

No new framework, external font, third-party runtime, or WebGL context was introduced.
Production promotion still requires deployed LCP/INP regression ≤10%.
