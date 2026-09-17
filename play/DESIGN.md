# Annapurna Play design context

## Creative direction

Annapurna Play is a light, inspectable field guide to playable work: a calm white workbench with a dark instrument-panel core. The hub must feel like a doorway into distinct worlds, not a generic game-store grid.

## Audience and job

Builders, evaluators, educators, families and collaborators should understand the platform in under a minute and enter one experience without an account. The hub is a marketing/catalogue surface; gameplay owns its own visual identity.

## Tokens

- Ink: `#122033`; navy: `#0D1B2A`; paper: `#FBFCFE`; line: `#DCE4ED`.
- Semantic world accents: coral for FunLab, violet for ONEIRIC, teal for Kids Puzzle World, gold for Vidya Yantra, moss for Varsha Hollow.
- Inter/system sans for reading; monospace only for short metadata labels.
- 24px cards, 11px buttons, restrained shadows and a single connected-field motif.

## Behavior contract

- Every card has a real link and visible maturity state.
- Guest-first copy is visible before the first click; no account prompt is implied by the hub.
- The page works with JavaScript disabled and does not require remote fonts or analytics.
- Focus states, reduced motion and narrow layouts are explicit.
- The hub links to branded game domains; raw `workers.dev` URLs do not appear in public copy.

## Deployment relationship

The same page lives at `/play/` in the main Annapurna repository and is deployed as the origin of `play.annapurnaagenticsolutions.com`. Game runtimes remain independent Workers on branded subdomains under the same namespace.
