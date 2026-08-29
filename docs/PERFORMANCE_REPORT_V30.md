# v3.0 Performance Report

Static gzip comparison against v2.5:
- `index.html`: 3,010 → 3,172 bytes (+5.4%).
- `explore.html`: 1,658 → 1,766 bytes (+6.5%).
- `lab.html`: 2,100 → 2,118 bytes (+0.9%).
- `evidence.html`: 1,283 → 1,283 bytes (+0.0%).
- `assets/site.css`: 22,099 → 25,828 bytes (+16.9%).
- `assets/site.js`: 22,793 → 23,212 bytes (+1.8%).

All current static files remain inside the existing release-profile budgets.
No new framework, font, third-party runtime, audio layer or WebGL context was introduced.
Production promotion still requires a deployed comparison showing LCP and INP regression no greater than 10%.
