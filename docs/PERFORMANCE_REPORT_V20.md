# Performance Report — v2.0

Static gzip comparison versus v1.9:

- Home HTML: 3363 → ~2766 bytes (smaller)
- Explore HTML: unchanged
- Lab HTML: unchanged
- Evidence HTML: unchanged
- CSS: 14339 → ~17518 bytes (increase driven by spatial-world and sticky-journey presentation)
- JS: 18456 → ~18500 bytes (approximately flat)

The increase is presentation-heavy CSS rather than runtime framework cost. No new runtime framework or WebGL context is introduced.

Production rule remains unchanged: v2.0 must not be promoted if deployed LCP or INP regresses by more than 10% versus the comparable v1.9 baseline.
