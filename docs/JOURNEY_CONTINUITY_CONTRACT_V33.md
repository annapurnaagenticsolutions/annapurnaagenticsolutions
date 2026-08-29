# Journey Continuity Contract — v3.3

The right-hand Living World is one persistent visual object throughout the Home narrative.

## Required
- exactly one `.v3-stage` on Home;
- story copy and world rail occupy the same desktop grid row;
- world rail stretches for the complete story height;
- `.v3-stage` remains sticky inside that rail;
- story shell does not clip the desktop sticky lifecycle;
- Journey reuses `.v3-route-overlay` inside the same stage;
- final CTA receives only a temporary visual handoff, not a new world instance.

## Failure condition
If Journey shows copy while the spatial world disappears, the release fails this contract regardless of whether the underlying state machine still works.
