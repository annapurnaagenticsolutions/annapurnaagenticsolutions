# Vidya Yantra — Next Journey Expansion

## Narrative Throughline

The next arc asks whether the player can turn an earned technique into **reliable public care**. Aruna tests what counts as evidence, Laya tests whether attention survives pressure, Tara tests whether a companion’s knowledge can become shared shelter, and Somavrat tests who benefits from the route that is made safe.

## Feature Dependency Map

| Arc | Features | Requires | Persistent result |
|---|---|---|---|
| **Ashram fieldwork** | Aruna’s evidence comparison, visible Star-thread instrument, Laya’s measured-movement practice, Prana practice record | Existing guide skills and Ashram lessons | `arunaEvidenceComplete`, `layaPracticeComplete`, stronger Shastra/Prana mastery |
| **Nadi reactivity** | Route-consequence voices, season and Tara-bond cues, material icon inventory | Existing route consequence and materials | A contextual return destination rather than a static Chapter II scene |
| **Monsoon trust** | Tara’s storm-shelter quest, bond-three reward, current-and-shelter combination, moving stormfront | Rainward Current plus Resonance Shelter | `taraStormQuest`, `stormfrontComplete`, Tara bond 3 |
| **Public responsibility** | Somavrat’s observatory decision, outcome record, later consequence narration | Stormfront reaches the central route | `publicChoice`, Seva mastery and a changed Chapter V premise |
| **Horizon** | Chapter V signal and lead card | Rainward Current and the public decision | New destination premise plus recommended next practice |

## Implementation Order

The Ashram and Nadi changes establish readable skills and carried context first. The Monsoon state machine then combines those systems into a moving traversal challenge with a companion gate and a public choice. The Chapter V card is deliberately last, because it should name the exact unresolved consequence produced by the player’s earlier decisions.

## Verification Criteria

Each new quest must visibly update the field objective, a world object or effect, and the Traveller’s Chronicle. Fast travel must preserve results. The Chapter V lead card must remain locked until its stated prerequisites are represented in the Chronicle.
