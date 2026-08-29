# Performance Report — v1.9

Static gzip comparison against v1.8:

- `index.html`: 3328 → 3363 bytes (+1.1%).
- `explore.html`: 1658 → 1658 bytes (+0.0%).
- `lab.html`: 2100 → 2100 bytes (+0.0%).
- `evidence.html`: 1283 → 1283 bytes (+0.0%).
- `assets/site.css`: 12316 → 14339 bytes (+16.4%).
- `assets/site.js`: 17070 → 18456 bytes (+8.1%).

CSS increases because v1.9 adds six mini-scene preview grammars, whole-stage reframing, guided-path states and global continuity styling. No runtime framework, WebGL context, external font or third-party script was added.

Production promotion remains blocked until deployed browser evidence confirms LCP and INP regress by no more than 10% relative to the comparable v1.8 baseline.
