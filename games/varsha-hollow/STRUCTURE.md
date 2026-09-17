# Varsha Hollow: The Slime Shepherd — Structure

## Frontend

`client/src/App.tsx` owns the route shell and renders the game page. `client/src/pages/Home.tsx` contains the landing portal and the in-game reader, with the page split into focused components under `client/src/components/` as the UI grows. `client/src/index.css` contains the global palette, typography, textures, and transition rules.

## Game Data

`client/src/game/chapters.ts` is a framework-agnostic content registry. Every chapter has an arc, title, location, narrative paragraphs, choices, optional summary beat, and consequences. `client/src/game/types.ts` contains the shared state vocabulary. `client/src/game/reducer.ts` applies choice consequences deterministically and produces the next state.

## Persistence

`drizzle/schema.ts` contains the `gameProgress` table. `server/db.ts` provides typed read/write helpers. `server/routers.ts` exposes public metadata and protected `game.load`, `game.start`, and `game.save` procedures. Local storage is used as a resilient offline fallback for a first play session.

## UI Regions

The game frame consists of a compact top bar, a left narrative column, and a right state rail on desktop. On mobile, the state rail becomes a horizontally scrollable summary band. The rail shows the current chapter, village prosperity, core stats, companions, and slimes.

## Visual Language

Dark teal canvas, rain-washed brown surfaces, misted gradients, restrained borders, amber action accents, and soft cyan/teal glow. Typography uses a literary serif for chapter titles and a clean sans-serif for controls and metrics.

## Future Extension Points

The chapter registry can support conditional choices, chapter gates, alternate endings, and scene art. The state model can accept inventory, flags, and reputation without changing the current reducer contract.
