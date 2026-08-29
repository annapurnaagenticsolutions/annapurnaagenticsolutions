# Performance Report v4.1

Static gzip comparison against v4.0:

| Asset | v4.0 | v4.1 | Delta |
|---|---:|---:|---:|
| `assets/site.css` | 33,600 B | 33,986 B | +1.15% |
| `assets/site.js` | 28,835 B | 29,311 B | +1.65% |
| `assets/material.js` | 2,340 B | 2,340 B | +0.00% |
| `assets/public-data.js` | 2,790 B | 2,790 B | +0.00% |
| `index.html` | 3,253 B | 3,253 B | +0.00% |
| `explore.html` | 1,843 B | 1,843 B | +0.00% |
| `lab.html` | 2,129 B | 2,129 B | +0.00% |
| `evidence.html` | 1,767 B | 1,767 B | +0.00% |

- Existing LCP/INP browser promotion gate remains <=10% regression.
- No new runtime framework, WebGL context, third-party script or network dependency.
- The context correction is CSS/DOM-state only; no new visual asset payload.
