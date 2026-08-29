# v3.8 — Optical Material + Semantic Typography + Evidence Field

## Decision on glass
A glass treatment is beneficial **only selectively**. The white visual system already has strong restraint; global glassmorphism would make the site look like a generic SaaS/portfolio template and would add GPU cost. v3.8 therefore uses glass as an optical metaphor for inspection and focus: header, Guide, selected-world inspector, atlas core, lab system lenses, and provenance surfaces. Large stages remain unblurred.

## Typography
v3.7 correctly unified the font family and semantic tiers, but the screenshots showed that making every page-level H1 optically identical flattened hierarchy. v3.8 keeps one inner-page H1 role while restoring a larger Home display role. Major experience H2, support headings, lead/body/UI/meta remain shared. The punctuation after “digital experiences” now belongs to that phrase, preventing a leading orphan period before “Connected.”

## Evidence field
Evidence now inherits the material language without pretending to be another product world. Claim cards expose source name and scope, source-local conflicts remain visible, repository signals use the same optical lens language, and semantic-history entries read as provenance records. A generated `assets/public-data.js` provides a static fallback so local `file://` previews do not remain indefinitely on “Loading…”. Production still tries versioned JSON first.

## Accessibility / performance
No meaning depends on transparency. Forced-colors and reduced-transparency modes receive solid surfaces. Backdrop blur is limited to a few high-value static surfaces; evidence card glass is primarily translucent material rather than per-card heavy blur. No framework, WebGL context, third-party runtime or network dependency was added.
