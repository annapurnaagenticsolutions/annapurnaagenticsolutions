# Independent Audit Remediation — v4.3 Patch

This patch responds to the independently supplied Phase 1 / Phase 2 audit without reopening the accepted Living World visual architecture.

## Critical findings

1. **Lighthouse accessibility gate (Home 94 / Explore 86 in the independent audit)**
   - The concrete Lighthouse causes reported in findings 2–4 were remediated.
   - Exact Lighthouse scores are **not re-asserted here** because this execution environment blocks Chromium navigation to localhost (`ERR_BLOCKED_BY_ADMINISTRATOR`). The repository's deployment/CI Lighthouse gate remains authoritative after publish.

2. **Invalid `aria-pressed` on `<body>`**
   - Intent and Lab-mode state updates are scoped to their actual control groups.
   - `body` continues to use `data-*` state only.
   - A browser-executed offline DOM check confirmed `body.getAttribute('aria-pressed') === null` after `site.js` initializes.

3. **WCAG 2.5.3 label-in-name mismatch**
   - The Annapurna core and six Home constellation controls now derive their accessible names from their visible labels instead of overriding them with divergent `aria-label` values.

4. **Explore inspector contrast**
   - Rail/small labels use `#667085` (4.97:1 against white).
   - Inspector copy/relationship text use `#5f6b7a` (5.43:1 against white).
   - Shared Lab, Evidence, footer, About, Contact and Guide small-text patterns were also hardened after an additional computed-style scan.

## High findings

5. **Explore heading order**
   - Atlas node names are semantic `<strong>` labels rather than `<h3>` headings.
   - Public-page heading sequences are checked by `scripts/independent_audit_remediation_test.py`.

6. **Raw crawlability of all six product worlds**
   - Home and Explore now include a semantic raw-HTML `Direct product world links` navigation containing six real anchors.
   - The interactive constellation remains button-based because those controls select/preview state rather than navigate; crawlability and interaction semantics are kept separate.

7. **No-JavaScript fallback**
   - Home, Explore, Lab, Evidence, About and Contact now include a `<noscript>` navigation with the six product worlds and six core pages.

## Medium findings addressed in the same patch

8. **Stale Resume state**
   - Trail age is tracked with `trailUpdatedAt`, which is updated only on meaningful world interaction/resume—not on ordinary page loads.
   - `<=30 days`: **Resume [World]**.
   - `31–90 days`: **Revisit [World]** and **Previous trail**.
   - `>90 days`: stale context rail is suppressed.

9. **Lab / Evidence / About / Contact follow-up accessibility scan**
   - Static heading/label checks pass.
   - A computed-style normal-text contrast scan against the white baseline found no remaining sub-4.5:1 text in these four pages after targeted shared-token corrections (excluding intentionally white text on dark controls).
   - Exact Lighthouse scores remain a deployment/CI verification gate.

10. **390px / 1024px responsive pass**
   - Home, Explore, Lab, Evidence, About and Contact were rendered at 390px and 1024px using the shipped CSS.
   - All six pages report viewport-contained document width after the responsive hardening pass.
   - `overflow-x: clip` prevents decorative/pseudo layers from creating horizontal page panning.

## Process response

The independent audit also identified documentation/audit sprawl. This remediation intentionally does **not** create another versioned schema/contract family. It adds one remediation note and one focused independent regression test on top of the v4.3 release profile.

## Verification commands

```bash
python scripts/independent_audit_remediation_test.py
python scripts/validate_json_schemas.py
python scripts/v43_production_cutover_test.py
python scripts/v43_release_audit.py
node --check assets/site.js
```

Post-publish, re-run the existing Lighthouse CI job and do not promote unless its configured accessibility minimum is met.
