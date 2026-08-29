# Performance Report v4.0

Static gzip comparison against v3.8:

| Asset | v3.8 gzip | v4.0 gzip | Delta |
|---|---:|---:|---:|
| `assets/site.css` | 31,194 B | 32,324 B | +3.62% |
| `assets/site.js` | 25,753 B | 25,868 B | +0.45% |
| `index.html` | 3,220 B | 3,253 B | +1.02% |
| `evidence.html` | 1,299 B | 1,375 B | +5.85% |

No framework, third-party runtime, WebGL context or network dependency was added. Mobile sticky-header blur is disabled to reduce continuous compositing cost. The inherited LCP/INP <=10% browser-regression promotion gate remains authoritative.
