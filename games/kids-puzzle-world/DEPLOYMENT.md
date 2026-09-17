# Kids Puzzle World deployment notes

## Current delivery shape

Kids Puzzle World is a static React/Vite game. It has no API, account system, analytics dependency or remote save service. A deployment only needs the generated `dist/` directory and SPA fallback behaviour for the three game routes.

```text
source: games/kids-puzzle-world/
build: npm run build
output: dist/
default base: /
platform base: VITE_BASE_PATH=/games/kids-puzzle-world/
```

For a platform path build, set `VITE_BASE_PATH` before the build. The Vite base and React Router basename are intentionally coupled so the world map, region screens and puzzle deep links resolve under the same prefix.

## Release gates

1. `npm run type-check`
2. `npm test -- --run`
3. `npm run build`
4. `npm run lint`
5. Browser smoke on desktop and a touch-sized viewport: world map, first region, first puzzle, reset/hint controls, completion state and reload persistence.
6. Parent-facing privacy review before adding any account, telemetry or identity flow. The child-facing loop remains guest-first.

## Hosting decision still open

The game is prepared for either a standalone game origin or a shared platform path. Do not advertise a live URL until the chosen host has a verified build, SPA fallback, cache policy and a post-deploy browser smoke result.
