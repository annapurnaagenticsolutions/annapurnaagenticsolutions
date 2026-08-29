# v3.4 — Journey Frame Resolution

## Finding from screenshot 3
The Journey copy was visibly shifted to the viewport edge and the persistent ecosystem disappeared. This was not primarily a typography or whitespace problem. The adaptive reordering function selected `data-adaptive-block="living"` and physically inserted that nested Journey section before the page CTA. Doing so removed the Journey from `.v3-story-copy`, severing it from the two-column `story | world` composition.

## Correction
The Home story is now an explicit structural anchor. Adaptive ordering can still assign priority and change route/world/CTA state, but nested anchored blocks are not eligible for DOM reparenting. Only direct children of `main` can be physically reordered.

## Expected desktop Journey frame
- copy remains aligned to the same wrapped story column as Establish and Focus;
- the world rail remains in the right column;
- the same sticky ecosystem persists into Journey;
- the route overlay appears inside that ecosystem;
- scroll-driven route steps update the copy and active topology together.

## Boundary
No new architecture or visual language is introduced. v3.4 repairs composition ownership and protects it from adaptive-state mutations.
