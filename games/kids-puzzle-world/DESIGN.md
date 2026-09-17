# Kids Puzzle World design context

## Creative direction

Kids Puzzle World is a **curiosity atlas**: a friendly collection of material-like puzzle stations that rewards noticing, trying and trying again. It should feel like opening a well-made activity book on a sunny table, not like entering a school dashboard or a noisy arcade.

The world map is the signature surface. Each region has its own visual material and thinking skill, while the shared navigation keeps the experience calm and predictable.

## Visual system

- **Display:** Fredoka for world and region names; it gives the experience a rounded, memorable voice.
- **Body:** Inter with system fallbacks for instructions and status text.
- **Core palette:** paper `#f4fbf5`, ink `#18332b`, moss `#2d5016`, leaf `#6ba547`, sky `#e8f4f8`, brass `#d4af37`, berry `#ff6b6b`.
- **Depth:** quiet borders, soft shadows and tactile hover lift. Color identifies a region; it never carries the only meaning.
- **Shape language:** generous rounded cards and clear, large controls. The map should remain legible at tablet width and touch-friendly on phones.

## Interaction rules

- The guest path stays immediate: open the world, choose an unlocked region, play.
- Progress is local-first and visible as simple completion states; no child account or cloud identity is introduced in the core loop.
- Every puzzle must offer a non-drag fallback where the mechanic needs one, a clear reset, and a hint that supports thinking rather than penalising failure.
- Emoji and colour are expressive decoration, never the only label.
- Focus-visible outlines, reduced-motion support, readable contrast and touch-sized targets are release gates.

## Platform contract

The game can build standalone with `/` as its base or be mounted below a platform path with `VITE_BASE_PATH`, for example `/games/kids-puzzle-world/`. The router uses the same base at runtime, so deep links remain valid in either mode.
