---
version: alpha
name: "Annapurna Agentic Solutions public site"
description: "A light, evidence-led connected field for governed AI, learning products and interactive experiences."
colors:
  primary: "#111827"
  accent-blue: "#2563EB"
  accent-cyan: "#0891B2"
  accent-green: "#16825D"
  accent-violet: "#7C3AED"
  accent-rose: "#D94670"
  background: "#FFFFFF"
  surface-soft: "#F7F9FC"
  line: "#E7EAF0"
  scrollbar-thumb: "#AAB7C7"
  scrollbar-track: "#F7F9FC"
  scrollbar-hover: "#748399"
  muted: "#667085"
typography:
  sans:
    fontFamily: "Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
rounded:
  DEFAULT: "22px"
  sm: "10px"
  md: "16px"
  lg: "24px"
spacing:
  page-max: "1180px"
  section: "82px"
  content-gutter: "20px"
components:
  navigation: { radius: "10px", height: "68px" }
  button: { radius: "11px", height: "44px" }
  card: { radius: "20px", border: "1px solid #DCE4EF" }
  focus: { outline: "3px solid rgba(37,99,235,.24)", offset: "3px" }
---

# Annapurna Agentic Solutions public site

## Overview

### Creative North Star

The site should feel like a glass instrument panel on a white workbench: a calm, inspectable field where signals move between governance, structure, learning and experience. The portfolio page uses a small orbit-and-node motif as its signature, while the content cards stay quiet enough for a builder or evaluator to read.

### Product context and register

- **Audience and primary job:** Builders, startup evaluators, design partners, educators and collaborators need to understand what Annapurna is making, what is usable today, and where the work is still exploratory.
- **Target market(s) and evidence:** India-first AI governance and learning work, with open-source developer infrastructure and globally legible browser experiences. Business and maturity evidence lives in the repository strategy documents and the public Evidence page.
- **Locale(s) and language policy:** English is the current public locale. Indian legal/product terms retain their established names; no translation or locale switch is implied.
- **Usage scene:** Public browsing on laptop or phone; mostly first-visit reading with occasional deep links into a product or source repository.
- **Register:** Hybrid. The company home and portfolio index are brand/editorial surfaces; product and evidence pages remain more utilitarian and inspectable.
- **Memorable signature:** Connected fields, signal paths and small labeled nodes express relationships between products without requiring animation to understand the page.
- **Restraint:** Copy, status labels and source links must do the credibility work. Avoid decorative motion, opaque claims, fake adoption numbers and product cards that imply a live demo when none is linked.
- **Anti-references:** Do not resemble a generic SaaS feature grid, a dark “AI future” landing page, or a venture-pitch wall of inflated metrics.
- **Token ownership/runtime mapping:** `assets/site.css` is the canonical runtime token source (Model B). `DESIGN.md` mirrors accepted values; `assets/products.css` consumes those variables and adds only scoped semantic aliases for the Products index. The design drift gate is the strict frontend audit plus the existing repository checks.

## Colors

The public site is light-first: `background` and white surfaces carry the page, `primary` provides high-contrast text and primary actions, `muted` supports secondary copy, and `line` separates content without heavy chrome. Blue, cyan, green, violet and rose are semantic world accents already used by the shared ecosystem; the Products index uses cyan as its local signal color and keeps other accents tied to their product family. Focus uses the shared blue outline. Forced-colors mode removes reliance on translucency and shadows.

## Typography

Inter is the shared public typeface with system fallbacks. Display headings use tight tracking and a controlled measure; body copy stays around 14–17px with roughly 1.6 line height. `mono` is reserved for technical evidence or code-like labels. Product names and maturity labels use sentence case or deliberate product casing; all-caps is limited to short eyebrows and metadata.

## Layout

The shared `page-max` is 1180px with a 20px minimum viewport gutter. Desktop pages use a two-column hero and two-column content grids where the content benefits from comparison; narrow layouts collapse to one column at 760px. The sticky site navigation is 68px on larger screens and 62px on small screens; the Products section index sits below it and remains horizontally scrollable. Content should reflow at narrow widths and 200% zoom; only the small section index may scroll horizontally.

## Elevation & Depth

Hierarchy comes from white/soft tonal layers, a 1px line, and restrained shadows. Glass and blur are optical accents for the sticky header, signal field and small context controls; `prefers-reduced-transparency` provides an opaque fallback. Static content never needs a heavy shadow to be legible. Motion is optional and must not carry meaning by itself.

## Shapes

The site uses rounded containers (`DEFAULT` 22px), 20px product cards, 11px buttons and 999px pills. Cards have quiet borders and an inset top highlight; dividers remain 1px. Product-specific accents appear as small dots, rails or status surfaces rather than recoloring an entire screen.

## Components

### Foundational visual states

Links and buttons expose hover and `:focus-visible`; the shared 3px focus outline remains visible against white surfaces. Cards respond with border/shadow refinement only. Reduced motion removes transitions and scroll smoothing; forced colors replaces decorative surfaces with system colors.

### Buttons and actions

Primary actions use the `primary` dark fill; secondary actions use a white surface and `line` border. The Products page uses links for navigation, not clickable card shells, so every action has a real destination.

### Navigation and data display

The sticky header is shared across public routes. Page sections use labeled anchor navigation rather than tabs because each category is independently bookmarkable. Product cards repeat the same anatomy: kicker, maturity status, title, outcome, impact, proof signals and a footer with a source/page link or a plain maturity note.

### Forms and overlays

This public portfolio surface has no form, modal, picker or asynchronous CRUD workflow. If one is added later, it must use the canonical shared site patterns and keep its browser/OS ownership explicit.

### Iconography

The site uses small dots, arrows and simple geometric marks. Text labels remain present; no icon-only action carries essential meaning.

### Motion

Motion is a soft page-continuity enhancement already owned by `assets/site.js` and `assets/site.css`. The Products page's signal field is understandable when completely static. Reduced motion disables transitions and scroll choreography.

### Content and data visualization

Public copy is first-person, concrete and honest about limits. Numbers are shown only with their scope (“recorded tests”, “documented scenarios”, “illustrative”). Maturity is data, not decoration: live, shipping/open, internal pilot, design partner, prototype and experiment are distinct states.

## Do's and Don'ts

- **Do:** Keep one clear outcome per card and show the strongest evidence signal beside it.
- **Do:** Label prototypes and simulated telemetry so evaluators can trust the page.
- **Don't:** Turn internal metrics into adoption, production, compliance or savings claims.
- **Don't:** Add decorative gradients or motion that compete with the signal field, or UI controls that do not have a real destination or accessible name.
