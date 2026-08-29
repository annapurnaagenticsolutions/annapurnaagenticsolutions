# Performance Report v4.3

## Static delta vs v4.2
- `assets/site.css`: **33,986 B → 34,299 B gzip (+0.92%)**
- `assets/site.js`: **29,752 B → 29,880 B gzip (+0.43%)**
- No new runtime library, framework, WebGL context, font package or external script was added.
- Metadata increases individual HTML gzip sizes, but runtime CSS/JS growth is below 1%.

## Release budgets
- Core CSS budget: **35,000 B gzip** — PASS.
- Site JS budget: **30,500 B gzip** — PASS.
- Company CSS remains below **5,000 B gzip** — PASS.
- Existing Lighthouse minimums remain: Performance 85, Accessibility 95, Best Practices 90, SEO 90.
- Existing LCP/INP regression promotion gate remains unchanged.

## Performance posture
v4.3 is primarily static metadata/accessibility/security hardening. The production-critical runtime delta is intentionally small. The only authoritative final performance result is the post-publish Lighthouse/browser gate.
