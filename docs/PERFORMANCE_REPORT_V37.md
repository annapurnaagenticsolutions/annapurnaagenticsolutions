# Performance Report — v3.7

Static gzip comparison against v3.6:

- `assets/site.css`: 28,877 → 29,478 bytes (**+2.08%**)
- `assets/site.js`: 25,449 → 25,449 bytes (**0.00%**)
- `index.html`: unchanged at 3,210 gzip bytes
- `explore.html`: unchanged at 1,830 gzip bytes
- `lab.html`: unchanged at 2,118 gzip bytes

Configured static budgets: PASS. No runtime library, network dependency, WebGL context or third-party script was added. Existing browser promotion gate remains LCP/INP regression <=10% when a browser-capable environment is available.
