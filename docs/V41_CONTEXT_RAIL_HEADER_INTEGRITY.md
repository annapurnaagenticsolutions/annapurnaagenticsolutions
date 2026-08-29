# v4.1 — Context Rail + Header/Scroll Integrity

## Why this release exists
The v4.0 screenshots proved the continuity model was useful but exposed a presentation fault: the zero-height sticky continuity ribbon could overlap page eyebrows/headings, and `explore.html#ai`-style resume URLs collided with real world-node IDs so native browser anchor restoration could begin a page at the atlas instead of the page introduction.

## Corrections
1. **Intro-owned Context Rail** — context is mounted inside the page-intro metadata row, so layout reserves its space by construction.
2. **Compact hierarchy** — current path is contextual information; Resume is the primary action; the cross-page secondary action is visually quieter.
3. **Semantic world-state URLs** — cross-page world state now uses `#world=<id>` so the hash is state, not a DOM anchor.
4. **Scroll restoration integrity** — internal navigation uses manual restoration; semantic world hashes explicitly open at the page top.
5. **Header measurement** — a `ResizeObserver` keeps `--header-h` synchronized with the actual sticky header.
6. **Active navigation state** — Explore/Lab/Evidence receive `aria-current=page` and a restrained active marker.
7. **Responsive collapse** — at tablet the context row stacks; at small mobile the label and secondary action collapse before the path/resume action.

## Frozen systems
Home visual composition, Explore atlas layout, Interactive Lab theatre, Evidence provenance field, selective glass intensity, typography family/roles and local-only memory are unchanged.

## Acceptance gates
- No Context Rail overlap with page eyebrow, H1 or sticky header at 1440 / 1024 / 390 widths.
- `#world=<id>` resumes the selected world without native anchor scrolling.
- Direct page navigation starts at the page introduction.
- Keyboard, reduced-motion and reduced-transparency behavior remain intact.
- All inherited structural and performance tests pass.
