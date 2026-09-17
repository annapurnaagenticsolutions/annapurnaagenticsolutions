# Session 002 — v0.2 Compressed Expansion

## Built
- Grew the platform from 6 to 8 activities.
- Added **Combine Anything** and **AI Court** as new mechanic families.
- Added versioned challenge state and expanded playable sharing across six activities.
- Added URL-carried friend rooms for asynchronous comparison without requiring accounts/backend state.
- Added daily shared starting point, active-day run/best-run state and local funnel insights.
- Added PWA Share Target metadata/intake.
- Added reference connected-intelligence server and JSON task schemas.
- Added client/server output normalization, length/range bounds and server request-rate limiting.
- Added challenge/input escaping and bounded challenge fields after a dedicated security review.

## Verification
- 15 automated tests: PASS.
- All game module imports resolve: PASS.
- Static release audit: PASS.
- JavaScript syntax sweep: PASS.
- Static HTTP routes/assets: PASS.
- Reference intelligence endpoint valid request: PASS.
- Reference intelligence endpoint invalid request rejected with HTTP 400: PASS.
- Headless Chromium visual screenshots: NOT VERIFIED. Chromium hangs/fails in the container before image production, including with headless/no-sandbox/disable-gpu flags.

## Design consequence
v0.2 is now a more credible **micro-experience engine**, not just a collection page: content/state can travel through links, friends can append bounded responses, local product behavior can be measured, and intelligence can be swapped without rewriting game modules.
