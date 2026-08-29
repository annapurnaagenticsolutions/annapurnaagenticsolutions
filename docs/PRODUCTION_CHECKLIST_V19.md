# Production Checklist — v1.9

- [ ] Run `python scripts/v19_release_audit.py`.
- [ ] Run the exact branch overlay through `verify_v19_deployed_site.py` over HTTP.
- [ ] Run Lighthouse on Home, Explore, Interactive Lab and Evidence.
- [ ] Compare v1.9 LCP/INP with the comparable deployed v1.8 baseline; regression must be <=10%.
- [ ] Check guided-path interruption with mouse, keyboard, touch and reduced-motion.
- [ ] Check hero node/detail collisions at 360, 390, 768, 1024 and 1440px widths.
- [ ] Confirm Page Guide remains dismissible and static navigation works with JS disabled.
- [ ] Confirm hidden adaptive/phase internals do not appear in visible public copy.
- [ ] Confirm canonical URL, sitemap and robots after final domain cutover.
- [ ] Promote `release-profile.json` channel from `release-candidate` only after deployed browser gates pass.
