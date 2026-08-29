# Production Checklist — v1.4

- [ ] Deploy branch overlay to a preview/public branch.
- [ ] Verify Home, Explore, Living Lab and Evidence on desktop + mobile.
- [ ] Verify all five explicit intent choices visibly change structure/order/CTA.
- [ ] Verify returning-session intent restoration only after the configured 6-hour gap.
- [ ] Verify `Why this view?` explains the real decision source.
- [ ] Verify Page Guide commands: AI governance, learning, MSME tools, design, less detail, more detail, evidence, performance.
- [ ] Disable/block `adaptive-model.json`; confirm the normal static page remains usable.
- [ ] Disable JavaScript; confirm normal content/navigation remain available and intent/agent controls do not gate anything.
- [ ] Run Lighthouse on all four pages.
- [ ] Capture comparable v1.3/v1.4 LCP and interaction/INP evidence; reject if either regresses >10% without mitigation.
- [ ] Test reduced-motion, keyboard-only, forced-colors and touch/swipe paths.
- [ ] Confirm no remote agent/analytics endpoint or identity tracking was introduced.
- [ ] Confirm adaptive state cannot modify evidence/product/history JSON.
- [ ] Run `scripts/v14_release_audit.py` and `scripts/verify_v14_deployed_site.py` against the deployed URL.
