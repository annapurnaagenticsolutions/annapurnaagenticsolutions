# Audit Report v4.1

## Scope
Context Rail + Header/Scroll Integrity after the v4.0 screenshot gate.

## Evaluation 1 — Layout ownership: PASS
The cross-page trail is now mounted inside the page-intro metadata row. It cannot occupy zero-height overlay geometry or cover the eyebrow/H1. Desktop, tablet and mobile collapse rules are explicit.

## Evaluation 2 — Navigation/scroll semantics: PASS
World resume links use `#world=<id>` rather than bare product-node hashes. Manual scroll restoration, semantic-hash top restoration and measured sticky-header height remove the browser-native anchor collision seen in v4.0.

## Evaluation 3 — Regression/trust/performance: PASS
All inherited contracts, schemas, public-copy/comprehension checks, v4.0 experience tests, JS syntax and static gzip budgets pass. Home, Explore atlas, Lab theatre, Evidence Field, selective glass and local-only memory remain unchanged in their accepted roles.

## Remaining visual gate
External screenshots remain the final acceptance evidence for 1440 / ~1024 / ~390 layouts. About, Contact and GitHub/GitHub Pages links remain deferred until this gate passes.
