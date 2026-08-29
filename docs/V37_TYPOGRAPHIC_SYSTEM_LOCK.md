# v3.7 — Typographic System Lock + Visual QA

## Why this release exists
v3.6 introduced shared typography tokens, but the desktop screenshots still showed residual visual-size drift because Focus, Journey, Lab scenes, Explore inspector headings and CTA headings retained separate role-specific scales. v3.7 deliberately reduces the number of public typography tiers and treats semantic role—not page identity—as the only valid reason for size variation.

## Locked hierarchy
- **H1 / page proposition:** one `--type-h1` across Home Establish, Explore, Interactive Lab, Evidence and 404.
- **Major experiential H2:** one `--type-h2` across Home Focus, Home Journey, Lab scenes and the final CTA.
- **Supporting H2/H3 tier:** one `--type-h3` across Explore narrative inspector and supporting section headings.
- **Lead:** one `--type-lead` for public intro/scene explanatory copy.
- **Body/UI:** explicit `body`, `ui`, `small` and `micro` tokens replace page-specific font-size decisions.

## Visual QA corrections
- `Connected.` owns its punctuation inside the semantic span and cannot split as `.Connected.` / orphan punctuation.
- inactive Explore labels remain contextual rather than looking disabled;
- TRACE de-emphasizes the ambient field while preserving the route signal;
- scene and anchor targets receive sticky-header scroll margin protection;
- display and major experiential headings use balanced wrapping.

## Responsive scale
Desktop, 1024-class tablet, 760-and-below mobile, and 430-and-below small-mobile tiers are explicit. Page identity never changes these values.

## Boundary
No new feature family, framework, WebGL context, external dependency, truth claim, data source or visitor model is introduced.
