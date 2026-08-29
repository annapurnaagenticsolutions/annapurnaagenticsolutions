# Spatial Coherence Contract — v3.5

## Required
- Explore selected-world narrative is outside `.v3-atlas`.
- `.v3-atlas` contains topology only: field, core and world nodes.
- desktop layout governor clamps nodes to field bounds and protects the core safe zone.
- mobile stacks field and narrative instead of overlaying them.
- Journey route path derives from `.v3-stage .world-node` geometry.
- Journey does not render duplicate visible product names in `.v3-route-overlay`.
- active route state is applied to the persistent world node.
- semantic field physics is keyed by active world.

## Failure conditions
The release fails if an inspector overlays topology, if a route label duplicates a visible product node, or if responsive layout puts narrative content over a world node.
