# Independent Re-audit Closure — v4.3.2 patch

This patch closes the two new findings from the independent Phase-2 re-audit without changing the accepted visual system.

## 1. Evidence selection semantics

- Removed `aria-selected` from selectable `<article>` evidence cards because the attribute is invalid for the native article role.
- Visual selection is now represented by `data-selected`.
- The currently inspected evidence card receives `aria-current="true"`; non-current cards have the attribute removed.
- Click, Enter and Space behavior is preserved.

## 2. About / Contact JSON 404s

Two protections are applied rather than masking failures:

1. `loadJSON()` resolves data URLs from the loaded `assets/site.js` location, so GitHub Pages project-subpath deployment resolves to `/annapurna-portal/data/...` correctly.
2. Shared JSON families are loaded only on pages that render the relevant living/evidence surfaces. About and Contact therefore do not issue unused adaptive/repository/evidence fetches.

## Verification

- Existing independent-audit remediation test: PASS.
- Independent re-audit closure test: PASS.
- JSON schemas, interaction/adaptive contracts, v4.0/v4.1/v4.2/v4.3 production tests, public-copy audit, performance static budgets and JavaScript syntax: PASS.
- Automated browser navigation remains blocked by the execution environment; the independent external Lighthouse re-run remains the final score gate.

No new design layer, schema family, or product feature is introduced by this patch.
