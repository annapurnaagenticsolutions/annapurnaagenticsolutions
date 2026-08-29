# v3.6 — Typography & Visual Rhythm + Journey Signal Refinement + Responsive Hardening

## Why this release exists
v3.5 established spatial coherence. The next screenshot review showed that the remaining inconsistency was not architectural: semantic heading levels varied by page, Home route-order badges leaked into non-Journey states, the Explore narrative rail still consumed slightly too much of the field, and responsive acceptance had not yet been made explicit.

## Typography contract
One display token now owns Home Establish, Explore, Interactive Lab, Evidence and error-page H1 rendering. Home Focus/Journey share one section-display token; Lab scenes share one scene-title token; public intro lead copy shares one lead-body token. Page identity may change wording and measure, not the font size assigned to the same semantic role.

## Visual rhythm
Explore gives more horizontal priority to the living field while retaining the structurally separate narrative rail. Atlas node labels no longer grow when selected; state is communicated by position, glow and opacity. Lab code remains recognizably code but is visually quieter than the workflow it explains.

## Journey signal
Route-order badges are now Journey-only. Establish and Focus never show unexplained 1/2/3 markers. The Journey path uses a thinner, more widely spaced dashed stroke so persistent nodes remain the dominant topology.

## Responsive hardening
The release establishes explicit review targets at 1440px desktop, ~1024px tablet and ~390px mobile. Mobile has bounded type tokens, stacked Explore narrative, reduced content gutters, and a reduced-motion route fallback that remains readable.

## Boundary
No new page, product feature, framework, WebGL context, network dependency, truth claim or visitor-identity mechanism is introduced. v3.5 spatial governance and all inherited contracts remain authoritative.
