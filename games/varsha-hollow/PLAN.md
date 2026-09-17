# Varsha Hollow: The Slime Shepherd — Build Plan

## Product Goal

Create a responsive browser-based narrative game set in Varsha Hollow. The first release is a complete 25-chapter season with meaningful choices, visible consequences, persistent progress, and a dark fantasy monsoon presentation.

## Risk Slices

### Narrative branching
The chapter model must support 25 chapters, two to three choices per chapter, stat consequences, companion loyalty changes, village prosperity changes, slime unlocks, and summary beats without coupling content to React rendering.

### Persistence
Authenticated users must be able to create a run, load the latest run, and save after every choice. The UI must degrade gracefully when a user is not signed in by retaining a local run.

### Responsive presentation
The landing page, narrative reader, choice cards, progress meters, companion cards, and slime collection must remain readable at mobile widths and desktop widths.

### Visual atmosphere
The generated art and UI palette must communicate deep teal, earthy brown, rain-washed stone, soft glows, and hopeful darkness. The hero should feel like a story portal rather than a generic dashboard.

## Verification Criteria

1. The exact CTA text **Begin Journey** is visible on the landing page.
2. The exact arc names **Dry Shrine**, **Forty Roofs**, **Hollow Market**, **Moving Lights**, and **Great Storm** are visible in the game UI.
3. The exact stat labels **Empathy**, **Wisdom**, and **Practicality** are visible.
4. The prosperity stages appear in order: **Survival**, **Recovery**, **Connection**, **Growth**, **Identity**.
5. The companions **Meera**, **Leela**, **Tara**, **Kabir**, and **Dev** appear in the relationship tracker.
6. The slimes **Dew**, **Clay**, **Lantern**, **Herb**, and **Echo** appear in the collection panel.
7. A choice visibly changes progress state, adds a consequence to the summary, and advances the chapter.
8. A user can reload the page and recover the latest local or server-backed run.
9. `pnpm check` and `pnpm test` complete successfully.
10. Browser screenshots show no console/runtime errors and demonstrate the primary play loop.

## Implementation Order

1. Generated art manifest and design tokens.
2. Data model and persistence procedures.
3. Game shell and responsive visual system.
4. Chapter engine and choice consequence reducer.
5. 25-chapter season content.
6. Save/load integration, transitions, summary beats, and polish.
7. Type-check, tests, visual verification, and checkpoint.

## Intentional Scope

This release emphasizes narrative immersion and replayable stateful choice over real-time combat. The gameplay loop is reading, choosing, managing trust, and watching Varsha Hollow change. A future season can add exploration scenes, mini-games, or a richer 3D shrine layer without rewriting the story engine.
