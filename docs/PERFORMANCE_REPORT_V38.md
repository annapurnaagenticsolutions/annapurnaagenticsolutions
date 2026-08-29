# Performance Report v3.8

Static gzip comparison against v3.7 RC:

| Asset | v3.7 gzip | v3.8 gzip | Delta |
|---|---:|---:|---:|
| `assets/site.css` | 29,478 B | 31,194 B | +5.82% |
| `assets/site.js` | 25,449 B | 25,753 B | +1.19% |
| `index.html` | 3,210 B | 3,220 B | +0.31% |
| `explore.html` | 1,830 B | 1,843 B | +0.71% |
| `lab.html` | 2,118 B | 2,129 B | +0.52% |
| `evidence.html` | 1,283 B | 1,299 B | +1.25% |
| `assets/public-data.js` | — | 2,790 B | new static fallback |

All configured static budgets pass. No framework, third-party runtime, network dependency, or WebGL context was added. Backdrop blur is limited to a small set of semantic surfaces rather than full-screen fields. Existing browser promotion gate remains LCP/INP regression <=10%.
