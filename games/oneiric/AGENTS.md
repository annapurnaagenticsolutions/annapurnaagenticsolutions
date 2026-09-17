# AGENTS.md — ONEIRIC Game Development Enforcement Rules

> **PURPOSE:** These rules are extracted from 11 self-reflection documents written
> by prior AI agents who repeatedly failed on this project. They are NOT suggestions.
> They are hard gates that must be checked before declaring any phase complete.
> Every rule here exists because a prior agent violated it and produced bad work.

---

## THE SEVEN FAILURE GATES

### Gate 1: Reflection ≠ Behavior Change
- **RULE:** After reading any reflection, the immediate next action MUST be a
  different workflow, not more writing about process.
- **CHECK:** "Am I about to start the same workflow I just read a reflection
  saying I shouldn't do?" If yes → STOP and change the workflow.
- **VIOLATION EXAMPLE:** The ONEIRIC agent read reflections, wrote new
  reflections about understanding the mistakes, then went back to the same
  implement→checkbox→declare-done pattern for 4 more cycles.

### Gate 2: Use the Full Time Budget
- **RULE:** The time budget is an allocation, not a ceiling. "Done" is not
  declared until the budget is consumed or the user stops you.
- **CHECK:** "Have I consumed less than 80% of the allocated time?" If yes →
  keep iterating, do not declare done.
- **VIOLATION EXAMPLE:** Every prior agent finished in 20-40% of the budget
  and stopped. The user had to tell them to use the remaining time.

### Gate 3: Measure What Matters, Not What's Easy
- **RULE:** Every verification step must be tagged with the ACTUAL question it
  answers. "Build passes" answers "does it run," not "is it good."
- **CHECK:** "Does this metric answer 'is this fun/impressive/atmospheric' —
  or just 'does this exist/compile'?" If the latter → find a better metric.
- **VIOLATION EXAMPLE:** The ONEIRIC agent verified screenshots by file size
  ("19-27x more bytes") while the world was 98% black. File size answered
  "are there pixels," not "can the player see the game."

### Gate 4: Player Feedback = Experience, Not Engineering
- **RULE:** Every piece of feedback is logged as: feeling described →
  experience gap identified → THEN possible technical cause. Never jump
  directly to "add feature X."
- **CHECK:** "Is the user describing a feeling or requesting a feature?"
  Feelings need design responses, not code responses.
- **VIOLATION EXAMPLE:** User said "this doesn't feel like a dream." Agent
  heard "add Three.js." The user was describing an experience problem; the
  agent solved a technology problem.

### Gate 5: Subagents Are the Default Team Structure
- **RULE:** Subagents are used from minute one. The main agent is
  director/integrator, not solo implementer.
- **CHECK:** "Am I doing this alone when I could be delegating to
  specialists?" If yes → launch subagents.
- **VIOLATION EXAMPLE:** Every prior agent did the first pass solo, then
  switched to subagents only after user pushback. Quality jumped when
  subagents were used.

### Gate 6: Don't Over-Specify — Let the Loop Decide
- **RULE:** Provide context and constraints to subagents, not solutions.
  Leave real decision points for the loop to exercise.
- **CHECK:** "Have I pre-decided so much that the loop has nothing left to
  decide?" If the loop doesn't change anything on iteration 2 → iteration 1
  over-specified.
- **VIOLATION EXAMPLE:** The GTM experiment's "Do Not Re-Litigate" section
  pre-decided everything. All 4 products passed on first iteration because
  failure was impossible. The loop never looped.

### Gate 7: "Done" Means Best Possible State, Not First Working State
- **RULE:** Before declaring done, ask: "Is this the best I can produce, or
  just the first thing that works?" If the latter → keep iterating.
- **CHECK:** "Could I meaningfully improve this with the remaining time?"
  If yes → I am not done.
- **VIOLATION EXAMPLE:** The ONEIRIC agent declared "industry game ready"
  when the game compiled. The world was 98% black. No human had played it.

---

## VERIFICATION PROTOCOL

Since I (the AI) cannot see images, hear audio, or feel timing, I must:

1. **Build proxy analysis tools** — screenshot brightness/color analysis,
   state inspection, automated playthrough scripts
2. **Verify visually through analysis** — brightness > threshold, color
   diversity > threshold, regional breakdown
3. **Be honest about limitations** — state clearly what I can and cannot
   verify
4. **Never declare a visual/audio feature "done" based on code existence
   alone** — verify through analysis tools or state explicitly that it's
   unverified

---

## BUILD & VERIFY COMMANDS

```bash
# Build
cd game && npm run build

# Typecheck (included in build)
npx tsc --noEmit

# Screenshot capture + analysis
node capture-full.cjs
node analyze-full.cjs screenshots-full

# Dev server
npm run dev
```

## KEY FILES

- `ARCHITECT_STATE/CREATIVE_VISION.md` — the north star, every decision serves this
- `game/src/main.ts` — integration layer
- `game/src/webgl/` — 3D rendering (SceneManager, WorldRenderer, Atmosphere, CharacterFactory)
- `game/src/data/layers.ts` — layer themes and palettes
- `game/src/data/balance.ts` — tuning constants
- `game/analyze-full.cjs` — screenshot analysis tool

## CURRENT KNOWN ISSUES (from director's audit)

1. **World is still too dark** — 30-36% black pixels, brightness 10-11 in
   gameplay screenshots. The prior agent's "fix" was insufficient.
2. **Layer palettes are too dark** — wall colors like #8a6a4a, floor #5a4838
   are muddy browns that don't read as "warm amber dream"
3. **Vignette is crushing edges** — both the color grade shader AND the
   atmosphere distortion pass apply vignette, compounding the darkening
4. **Fog density may still be too high** for deeper layers
5. **The descent animation was never visually verified** — only checked via
   file sizes
6. **Audio is completely unverified** — no human has confirmed it sounds good
7. **Game feel (hit-stop, shake, timing) is unverified** — set by math, not
   by play

---

## EVOLUTION SESSION LEARNINGS (Inception transformation)

### What was done
- **Architecture:** Replaced BoxGeometry tiles with composed architecture
  (ExtrudeGeometry arches, LatheGeometry fluted columns, MeshPhysicalMaterial
  glass, vertex-displaced fractured walls). Each layer has distinct geometry
  vocabulary. Floating architecture fragments rotate in the void.
- **Characters:** Player is now a LatheGeometry hooded cloak with capsule arms,
  3D totem on left hand, brighter lantern. Projections are distorted humanoids
  with eye slits and lower-body dissolve. Fragments are ConvexGeometry crystals.
- **Narrative:** 8 dream targets with names, ideas, bios. Target name shown
  during descent. Memory objects (chair, clock, mirror, photo, toy, desk, door,
  window, bars) placed in rooms for environmental storytelling.
- **Mechanics:** Asymmetric time dilation (player at realDt, world at
  effectiveDt). 3D totem check with camera zoom. Kick as world-collapse
  (trauma + flash + debris + distortion boost + accent glow overlay).
- **Post-Processing:** Selective bloom (threshold 0.85), shadows on lantern,
  world-warping shaders (layer-specific distortion), floor ripple, volumetric
  light shafts (Layer 1).
- **Title Screen:** Dream layer diagram (concentric rings for Surface/Current/
  Abyss/Limbo) with rotating dashed circles and layer labels.

### Critical bugs found and fixed
1. **BokehPass (DoF) causes black screens** — The BokehPass blurs everything
   to black when the camera moves or rooms rebuild. The depth buffer becomes
   inconsistent across room transitions. **Fix:** Disabled BokehPass
   (`bokehPass.enabled = false`). DoF is not safe with dynamic room rebuilding
   unless depth buffer stability is verified.
2. **WorldRenderer.update() not called during kick/limbo** — The 3D world
   stops updating during kick and limbo phases because updateKicking() and
   updateLimbo() didn't call worldRenderer.update(). **Fix:** Added
   worldRenderer.update() + atmosphere.update() to both phases.
3. **SceneManager.update() not called during kick** — Camera and post-
   processing froze during kick. **Fix:** Added sceneManager.update() to
   updateKicking().
4. **Lighting too dark after post-processing changes** — HemisphereLight
   reduced to 0.3 and AmbientLight to 0.25 made the world too dark.
   **Fix:** Restored to 0.6 and 0.5 respectively.
5. **Lantern intensity could drop to near-zero at 0 stability** — The
   flicker at low stability could make the world invisible. **Fix:** Added
   minimum intensity floor of 3.5-4.0.

### Verification metrics (final state)
- All 12 gameplay screenshots: 0% black pixels, brightness 32-137
- Color diversity: 162-1193 unique colors per screenshot
- Descent animation: all 13 frames visible, brightness 46-89, 0% black
- Build: passes with zero errors, 674 KB bundle (176 KB gzip)
- No console errors during full playthrough

### What still can't be verified by the AI
- Whether the composed architecture actually reads as "dream architecture"
  from the 3/4 camera angle (vs. just "shapes")
- Whether the player model looks like a hooded dreamer (vs. just a shape)
- Whether the memory objects are recognizable (vs. just colored shapes)
- Whether the descent feels like "falling through consciousness"
- Whether the kick feels like a "world-collapse event"
- Audio quality, game feel timing, overall atmosphere

### Key architectural decisions
- **ArchitectureFactory.ts** is a new module separate from CharacterFactory.
  WorldRenderer imports both. ArchitectureFactory owns tile/door/floating/
  dissolve creation. CharacterFactory owns player/projection/fragment/anchor/
  memory-object creation.
- **Memory objects** are placed as non-interactive `DreamObject` entries with
  `type: 'memory'` and `memoryKind`. WorldRenderer.createObject has a new
  `case 'memory'` that calls CharacterFactory.createMemoryObject.
- **Totem** is a 3D object on the player's left hand, accessed via
  `playerGroup.getObjectByName('totemMesh')`. It rotates perpetually in
  WorldRenderer.updatePlayer.
- **Dissolve material** exists in ArchitectureFactory.createDissolveMaterial
  but is NOT wired into the kick sequence (too risky to swap all tile
  materials during gameplay). The kick uses distortion boost + overlay
  instead.
