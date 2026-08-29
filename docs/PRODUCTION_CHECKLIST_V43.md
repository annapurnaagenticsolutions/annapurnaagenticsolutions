# Production Checklist v4.3

## Deterministic pre-publish gates
- [x] Core living-world visual baseline frozen
- [x] About + Contact retained
- [x] Canonical metadata on all indexable first-party pages
- [x] Open Graph + Twitter summary metadata
- [x] `robots.txt` + versioned sitemap with `lastmod`
- [x] GitHub Pages `.nojekyll`
- [x] Relative, local 404 assets and routes
- [x] SVG favicon + web manifest
- [x] `llms.txt` public machine-readable map
- [x] Skip navigation and stable `#main-content`
- [x] Mobile menu `aria-controls`, `aria-expanded`, Escape close and 44px control
- [x] No inline scripts
- [x] No inline style attributes
- [x] Strict CSP-compatible static markup
- [x] External `_blank` links use `noopener noreferrer`
- [x] Public repository/path verification separated from Pages runtime verification
- [x] JSON schemas validate
- [x] JavaScript syntax validates
- [x] Static gzip budgets pass
- [x] Local HTTP production surface passes
- [x] ZIP extraction/audit gate required for release artifact

## Post-publish gates
- [ ] Run `scripts/verify_v43_public_runtime.py`
- [ ] Home deployed HTTP 200 + content marker
- [ ] Explore deployed HTTP 200 + content marker
- [ ] Interactive Lab deployed HTTP 200 + content marker
- [ ] Evidence deployed HTTP 200 + content marker
- [ ] About deployed HTTP 200 + content marker
- [ ] Contact deployed HTTP 200 + content marker
- [ ] All configured GitHub Pages project links return 200
- [ ] Critical proof/demo links return 200
- [ ] Lighthouse minimums pass on all six first-party pages
- [ ] 390px mobile manual/browser check
- [ ] ~1024px tablet manual/browser check
- [ ] Keyboard-only navigation check
- [ ] Reduced-motion check
- [ ] Browser console has no CSP/runtime errors
- [ ] Promote `release-profile.json` channel to `production`
