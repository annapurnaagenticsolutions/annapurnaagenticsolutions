# Context Rail Contract v4.1

- Context is part of `.page-intro-meta`; it MUST NOT be injected as a zero-height overlay.
- The page eyebrow and Context Rail share one metadata row on desktop and stack on constrained widths.
- The visual hierarchy is: current trail (context) → Resume world (primary) → adjacent destination (secondary).
- World resume state MUST use `#world=<id>` or another non-anchor state encoding; bare `#<world-id>` is prohibited because product nodes use those IDs.
- Sticky-header offsets derive from measured header height.
- Cross-page navigation MUST NOT restore an arbitrary prior vertical scroll position for semantic world-state URLs.
- At narrow mobile widths, preserve path + Resume and collapse lower-priority context first.
