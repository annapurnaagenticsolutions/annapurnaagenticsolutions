# SiteTruth QA design context

## Product and audience

SiteTruth QA is a research-stage, API-first correctness checker for engineering teams maintaining education, commerce, and dashboard applications. This page has one job: explain the cross-layer discrepancy idea, let a visitor inspect synthetic fixtures, and state the product's actual availability. It is a marketing/product-preview surface, not an authenticated dashboard.

## Visual direction

- **Palette:** Frost `#f2f5fa`, Paper `#ffffff`, Ink `#111c32`, Instrument Blue `#275dc9`, Alert Coral `#e44a34`, Signal Teal `#138579`.
- **Type:** Georgia for the thesis and large values; Trebuchet/Arial for explanatory copy; a system monospace for contracts, outcomes, and availability labels. No remote font fetches.
- **Layout:** A compact instrument-panel header, a thesis-led hero with an availability card, then the side-by-side fixture workbench. Product method and pilot status follow in reading order.
- **Signature:** The inequality sign and paired values make a specific claim visible: a displayed value and a structured value can disagree. The comparison is always marked synthetic in this preview.

## Interaction and safety contract

- The scenario picker changes only embedded fixture text; it makes no network requests and never calls the Worker.
- Scenario choices are native buttons with visible focus and `aria-pressed`; the result area announces updates through a polite live region.
- The surface must label synthetic evidence, hosted-scanner availability, and commercial status. Do not add customer metrics, sign-up, billing, or live scanning claims without the corresponding evidence and review.
- Preserve keyboard access, narrow-screen reflow, visible scrollbars, forced-colors cues, and reduced-motion behavior.
- No analytics, third-party scripts, remote fonts, or forms are used.
