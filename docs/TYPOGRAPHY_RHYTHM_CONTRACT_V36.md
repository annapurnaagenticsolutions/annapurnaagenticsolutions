# Typography & Visual Rhythm Contract — v3.6

## Required
- Home Establish, Explore, Lab, Evidence and 404 H1 use `--type-display`.
- Home Focus/Journey use `--type-section-display`.
- Lab scene headings use `--type-scene-title`.
- Page-intro lead copy uses `--type-lead`.
- Journey route-order badges are absent outside Journey.
- Explore active nodes do not change label font size.
- Mobile typography is explicitly bounded at <=760px and <=430px.
- Explore remains narrative-rail + living-field on desktop and stacks on mobile.

## Failure conditions
A release fails this contract if the same semantic heading role receives a page-specific size override, if route step numbers appear during Establish/Focus, or if responsive layout relies on accidental text shrinking to avoid collisions.
