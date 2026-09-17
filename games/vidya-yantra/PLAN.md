# Game Plan: Vidya Yantra — The Living Knowledge Realm

## Risk Tasks

### 1. Movement, bounds, and follow-camera handoff
- **Why isolated:** The prototype needs a game feel rather than a static diorama. Player input, a fixed isometric perspective, world boundaries, and a camera target that follows without becoming disorienting must work together.
- **Approach:** Use a semantic input manager, a procedural player mesh, planar movement within a courtyard radius, and a damped ArcRotateCamera target update. Keep the camera angle fixed; only its focus eases toward the player.
- **Verify:** W/A/S/D and arrow input moves the apprentice in the expected screen-relative direction; the player cannot exit the courtyard; start → walk → stop transitions remain smooth; camera follow does not snap or drift.

### 2. Deterministic presentation and visible state transitions
- **Why isolated:** Screenshot review needs real gameplay even when manual keyboard input is unavailable. The `?demo` path must exercise the game loop predictably without taking away the normal playable path.
- **Approach:** Define a small ordered autopilot sequence: collect glyphs, trigger a knowledge pulse near a construct, approach the yantra, then resolve one moral stance. Drive it through the same world methods used by keyboard play.
- **Verify:** Loading with `?demo` visibly advances the quest, collects glyphs, produces a pulse, changes a trait meter, and leaves no input or timing exceptions.

## Main Build

Build a full-screen Babylon.js playable courtyard in an original scholarly fantasy world. The apprentice explores a celestial observatory where Rishi, Muni, and Raja are original fictional guide roles. The core loop is movement → study glyph collection → action pulse against two corrupted constructs → yantra activation → a brief consequence choice that increases one of Viveka, Sahas, or Karuna.

- **Assets needed:** One visual target/reference image; wide horizon plate; circular yantra texture; Rishi codex portrait; transparent compass-orbit brand icon. The rest of the scene uses deliberately authored procedural meshes, thin-line geometry, and hand-tuned materials.
- **Verify:**
  - Movement direction matches player input and player state visibly shifts between resting and moving.
  - Five knowledge glyphs collect on contact; the quest count increments and a star-thread trail appears.
  - A knowledge pulse visibly expands from the apprentice and stuns/repels nearby constructs.
  - The yantra activates only after the knowledge threshold; the choice interaction changes the correct trait value.
  - The Rishi, Muni, and Raja landmarks are legible in the scene and their original fictional roles are named in the HUD.
  - HUD remains readable with no overlap at desktop and narrow mobile viewports.
  - No missing texture fallback, runtime exception, or browser console error occurs during capture.
  - Reference consistency: indigo sky, parchment sandstone, copper instrumentation, jade accents, Yantra Saffron alignment details, three-quarter perspective, and intentional object density.
  - `?demo` shows a deterministic sequence of exploration, study, action, and growth.

