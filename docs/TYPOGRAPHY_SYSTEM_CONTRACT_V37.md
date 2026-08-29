# Typography System Contract — v3.7

The same semantic role must render with the same font family, font-size token, weight, leading and tracking regardless of page.

## Required tiers
1. `--type-h1`: every public page proposition.
2. `--type-h2`: Focus, Journey, Lab scene and CTA major headings.
3. `--type-h3`: supporting section and inspector headings.
4. `--type-lead`: lead explanatory copy.
5. `--type-body`, `--type-ui`, `--type-small`, `--type-micro`: body and interface hierarchy.

## Prohibited
- page-name-specific H1/H2 sizes;
- state-driven font-size changes for Explore nodes;
- punctuation outside a no-wrap semantic impact span when it can orphan;
- anchor transitions that place target content beneath the sticky header.

## Acceptance
Desktop, tablet and mobile screenshots should show hierarchy changes only because of semantic role or responsive breakpoint—not because the visitor moved to another page.
