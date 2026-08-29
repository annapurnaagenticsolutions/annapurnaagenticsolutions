# v3.1 Performance Report

Static gzip comparison against v3.0:
- `index.html`: 3,172 → 3,163 bytes (-0.3%).
- `explore.html`: 1,766 → 1,766 bytes (+0.0%).
- `lab.html`: 2,118 → 2,118 bytes (+0.0%).
- `evidence.html`: 1,283 → 1,283 bytes (+0.0%).
- `assets/site.css`: 25,828 → 26,961 bytes (+4.4%).
- `assets/site.js`: 23,212 → 23,240 bytes (+0.1%).

This is a correction-only release: no new runtime framework, font, third-party script, audio layer or WebGL context.
Production promotion still requires deployed LCP/INP comparison against v3.0 with regression no greater than 10%.
