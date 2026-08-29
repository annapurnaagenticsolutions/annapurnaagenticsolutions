# v3.2 Performance Report

Initial static gzip comparison against v3.1:
- `index.html`: 3,163 → 3,178 bytes (+0.5%).
- `explore.html`: 1,766 → 1,766 bytes (+0.0%).
- `lab.html`: 2,118 → 2,118 bytes (+0.0%).
- `evidence.html`: 1,283 → 1,283 bytes (+0.0%).
- `assets/site.css`: 26,961 → 27,573 bytes (+2.3%).
- `assets/site.js`: 23,240 → 23,603 bytes (+1.6%).

- `assets/material.js`: **2,216 bytes gzip**, lazy-loaded only when the Home material response is invoked.

Core `site.js` remains below the existing 24 KB gzip ceiling; the optional material module has a separate 3 KB ceiling.
No framework, external font, third-party runtime, audio layer or WebGL context was added.
Production promotion still requires deployed evidence that LCP and INP regress by no more than 10%.
