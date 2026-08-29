# Sensory Effects Contract

Sensory effects are a finishing layer, not a substitute for living behavior.

## Tier 1 implemented
- five discrete scroll-linked narrative beats;
- one focal breathing target (`#ecosystem-core`);
- cross-page narrative View Transitions;
- client-side local-time ambience.

## Accessibility
`prefers-reduced-motion` disables breathing and animated page transitions. Narrative beat state may still update without movement so information remains equivalent.

## Device governor
Save-data mode or <=4 reported hardware threads selects `minimal` motion. The canvas is also paused while off-screen and throttled on constrained devices.

## Explicitly skipped
Cursor trails, magnetic hover buttons, custom cursors, confetti, parallax-everything, ambient audio, and ambient shaders.

## Performance
Atmospheric effects are cut before core content/adaptation if the <=10% LCP/INP promotion budget cannot be met.
