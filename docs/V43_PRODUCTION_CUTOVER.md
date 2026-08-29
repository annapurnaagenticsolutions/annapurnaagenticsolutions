# v4.3 — Production Readiness + GitHub Pages Cutover

## Decision
v4.2 completed the public company layer. v4.3 does **not** reopen the accepted visual system. It converts the current static site into a production-cutover candidate by hardening metadata, accessibility, CSP compatibility, GitHub Pages packaging and post-publish verification.

## Production enhancements
1. **Metadata and discovery** — consistent canonical, description, robots, Open Graph and Twitter summary metadata on all indexable pages; `sitemap.xml`, `robots.txt`, `site.webmanifest`, favicon and `llms.txt` are production assets.
2. **Accessibility shell** — every public page now has a keyboard skip link, stable `#main-content`, a labelled home link, explicit mobile-menu ownership and a 44px mobile menu control. Escape, outside-click and link selection close the mobile menu deterministically.
3. **Strict CSP compatibility** — static HTML no longer contains inline `style` attributes or inline scripts. World colors/positions are CSS classes/tokens, allowing the existing `style-src 'self'` policy to be meaningful rather than contradictory.
4. **GitHub Pages packaging** — `.nojekyll`, relative 404 assets, manifest scope/start URL and relative local links are ready for the `/annapurna-portal/` Pages subpath.
5. **Public-link truth semantics** — source repositories and portal paths are recorded as publicly verified; GitHub Pages runtime availability is explicitly a **post-publish HTTP gate**, not inferred from repository existence.
6. **Cutover automation** — local production-surface tests are deterministic. `scripts/verify_v43_public_runtime.py` is the separate deployment-time gate and must be run after Pages has published.

## Public-source verification on 2026-08-29
Public GitHub inspection confirmed:
- `annapurnaagenticsolutions` is a public GitHub account/organization surface.
- `annapurna-portal` is public and contains `about`, `contact`, `ai-solutions`, `axon`, `idea-hub`, `software-lab`, `website-studio` and `wonderhub-by-AnnapurnaAgenticSolutions` paths.
- `axon` is a public repository.
- `open-enterprise-agentops-mesh` is public; its README identifies `/site` as the recommended GitHub Pages source and includes `interactive_demo_path.html` as a public demo path.

The verification environment could not reliably execute the GitHub Pages runtime itself. v4.3 therefore refuses to label those Pages URLs as runtime-verified until the post-publish HTTP gate passes.

## Cutover sequence
1. Run `python scripts/v43_release_audit.py`.
2. **Apply the v4.3 branch overlay to the existing `annapurna-portal` repository.** Do not replace the repository with the Living World RC directory alone; the existing product directories (`ai-solutions/`, `axon/`, `idea-hub/`, `website-studio/`, `software-lab/`, WonderHub and other public assets) must be preserved.
3. Review the resulting repository diff, then commit the overlay at the GitHub Pages root.
4. Confirm Pages publishes the intended branch/root.
5. Wait for the Pages deployment to complete.
6. Run `python scripts/verify_v43_public_runtime.py`.
7. Run Lighthouse for Home, Explore, Lab, Evidence, About and Contact at the deployed URL.
8. Verify 390px mobile, ~1024px tablet, keyboard-only and reduced-motion operation.
9. Only after all gates pass, promote the release profile from `release-candidate` to `production`.

## Promotion blockers
Do not promote if any of the following occurs:
- deployed route returns non-200 or wrong content;
- canonical points to a different site path;
- About/Contact source or Pages link is broken;
- CSP console errors block first-party CSS/JS/data;
- mobile menu cannot be operated by keyboard/touch;
- Lighthouse falls below the configured release profile thresholds;
- LCP/INP regression exceeds the retained promotion budget;
- a public claim is presented without its evidence boundary.
