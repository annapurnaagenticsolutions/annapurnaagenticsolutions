# Vidya Yantra — Runtime Structure

## Design Contract

React is the **picture frame**, Babylon.js is the **canvas**, and `client/src/game/**` contains the framework-agnostic game rules. The experience is intentionally an original fictional scholarly world rather than a recreation of any sacred narrative.

## Modules

| Path | Ownership | Responsibility |
|---|---|---|
| `client/src/components/GameCanvas.tsx` | React host | Owns one lifecycle-safe Babylon Engine, the canvas, and DOM overlay state. |
| `client/src/game/scene.ts` | Scene entry | Creates and disposes the scene, camera, lights, world, and update hook. |
| `client/src/game/GameWorld.ts` | Game rules | Owns player, glyphs, adversaries, NPC landmarks, quest state, and deterministic demo sequence. |
| `client/src/game/InputManager.ts` | Input | Maps keyboard state to semantic move, pulse, and interact actions. |
| `client/src/game/Player.ts` | Actor | Owns the apprentice mesh, velocity, knowledge pulse cooldown, and movement state. |
| `client/src/game/HudBridge.ts` | UI boundary | Publishes compact immutable HUD snapshots to the React overlay; keeps gameplay rules out of React. |
| `client/src/game/assets.ts` | Asset registry | Centralizes durable `/manus-storage/...` URLs for generated game art. |

## State Model

```text
WorldState
  quest: GatherGlyphs | CalibrateYantra | ChooseStance | Restored
  glyphsCollected: 0..5
  traits: { viveka, sahas, karuna }
  pulseCooldown: seconds
  choiceOpen: boolean
  demo: boolean
```

The player owns a `TransformNode`-like root mesh and a `pulse()` action. Glyphs are small visible meshes with a collected flag. Constructs use a simple state (`patrol`, `approach`, `stunned`) and are intentionally not pathfinding agents. The world performs broad-radius distance checks rather than adding physics dependencies.

## Update Order

1. Read semantic input and choose player movement/action.
2. Update player motion and camera focus.
3. Update glyph bobbing, construct steering/stun, pulse wave, and yantra rings.
4. Resolve proximity interactions and publish UI snapshot if state changed.
5. If `?demo`, advance the seeded stage through the same collection, pulse, interaction, and choice methods.

## Asset Hints

| Asset | Runtime usage | Size |
|---|---|---|
| Horizon plate | Optional softly lit background plane behind the courtyard | 1920×1080 px, fills 16:9 frame |
| Yantra disc | Detail texture for the central calibration plate | 4.5m diameter |
| Rishi portrait | Codex dialogue card in the DOM HUD | 136×180 px displayed |
| Compass-orbit mark | HUD header icon and browser favicon | 44×44 px HUD, 32×32 px favicon |

## Cleanup Rules

`GameCanvas` owns engine initialization and disposal. `GameWorld` owns any keyboard listeners through `InputManager.dispose()`. Scene-scoped observables, materials, lights, and meshes are released with the Babylon scene. No gameplay module reaches into React state directly.

