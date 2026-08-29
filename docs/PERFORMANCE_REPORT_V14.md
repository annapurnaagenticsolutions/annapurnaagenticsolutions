# Performance Report — v1.4

## Before / after static transfer
| File | v1.3 gzip | v1.4 gzip | Change |
| --- | ---: | ---: | ---: |
| index.html | 2,550 B | 2,985 B | +16.9% |
| explore.html | 1,644 B | 1,644 B | 0% |
| lab.html | 2,157 B | 2,157 B | 0% |
| evidence.html | 1,273 B | 1,273 B | 0% |
| site.css | 7,125 B | ~8,082 B | +13.4% |
| site.js | 8,634 B | ~13,433 B | +55.6% |

The JS percentage increase is material but the absolute payload remains ~13.4 KB gzip and has no third-party runtime dependency.

## Browser measurement policy
The master constraint is not a 10% bundle rule; it is **no >10% LCP or INP regression per living layer**. v1.4 therefore instruments local LCP, event-duration and long-task observations through `PerformanceObserver`, exposed as `window.__livingMetrics` and through the Page Guide `performance` command.

A real-browser comparable v1.3/v1.4 measurement is still required before production promotion. Local Chromium in this execution environment times out and is not recorded as PASS.

## Cut decisions
- No Three.js/WebGPU.
- No React/Framer migration solely for animation.
- No LLM runtime call.
- No external analytics SDK.
These would increase execution cost without being necessary to prove the missing adaptive/agentic layers.
