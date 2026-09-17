# Varsha Hollow — Branching Narrative Design

## Problem

The original game shipped 25 chapters of excellent prose, but the narrative reducer
advanced every chapter by `id + 1` regardless of which choice the player picked.
The game claimed to be "choice-driven" but was linear fiction with a flavor-choice
skin. This document describes the branching structure added to make choices
structurally meaningful.

## Design Principles

1. **Not every chapter branches.** 5 branch points across 36 total chapters keeps
   the writing quality high and the scope manageable.
2. **Braided, not forking.** Most branches diverge for 2-3 chapters and then
   converge back to the main spine, so the story still has a shared shape.
3. **Different endings.** The final branch point (Chapter 24) routes to one of
   three distinct endings based on the player's choice.
4. **Voice preservation.** All new content matches the existing prose voice:
   third-person past tense, short punchy paragraphs, evocative opening lines,
   slime impressions as physical sensations, characters defined by action.
5. **Tone diversity.** Branches are triggered by different stat tones (Wisdom,
   Empathy, Practicality), not always the same one.

## Chapter Graph

```
Ch 1-4 (linear, Dry Shrine)
  |
Ch 5 ──────────────────────────────────────────────
  |─ Empathy (ask-consensus)     → Ch 6 (main path)
  |─ Wisdom (read-archives)      → Ch 26 (Forgotten Channels)
  |─ Practicality (accept-roofs) → Ch 6 (main path)
  |
Ch 6-9 (Forty Roofs, main path)
  |
Ch 26 → Ch 27 → Ch 28 ──┐ (Forgotten Channels branch)
  |                      |
  |......................|
  |                      v
  |                 Ch 10 (convergence: Before the First Drop)
  |
Ch 10 ───────────────────
  |
Ch 11-12 (Hollow Market, main path)
  |
Ch 13 ──────────────────────────────────────────────
  |─ Empathy (free-jars)         → Ch 29 (Sanctuary Path)
  |─ Wisdom (collect-proof)      → Ch 14 (main path)
  |─ Practicality (shut-market)  → Ch 14 (main path)
  |
Ch 14 (main path)
  |
Ch 29 → Ch 30 ──────────┐ (Sanctuary Path branch)
  |                      |
  |......................|
  |                      v
  |                 Ch 15 (convergence: The Market Learns Its Name)
  |
Ch 15 ───────────────────
  |
Ch 16-17 (Moving Lights, main path)
  |
Ch 18 ──────────────────────────────────────────────
  |─ Empathy (walk-with-lights)  → Ch 19 (main path)
  |─ Wisdom (study-pulse)        → Ch 19 (main path)
  |─ Practicality (open-door)    → Ch 31 (Broken Seal)
  |
Ch 19 (main path)
  |
Ch 31 → Ch 32 ──────────┐ (Broken Seal branch)
  |                      |
  |......................|
  |                      v
  |                 Ch 20 (convergence: The Storm Ledger)
  |
Ch 20 ───────────────────
  |
Ch 21 (Great Storm, main path)
  |
Ch 22 ──────────────────────────────────────────────
  |─ Empathy (rescue-first)      → Ch 23 (main path)
  |─ Wisdom (split-teams)        → Ch 23 (main path)
  |─ Practicality (gate-first)   → Ch 33 (Price of the Gate)
  |
Ch 23 (main path)
  |
Ch 33 → Ch 34 ──────────┐ (Price of the Gate branch)
  |                      |
  |......................|
  |                      v
  |                 Ch 24 (convergence: The Gate Opens)
  |
Ch 24 ──────────────────────────────────────────────
  |─ Empathy (ask-consent)       → Ch 25 (ending: A Village That Chooses Tomorrow)
  |─ Wisdom (follow-sequence)    → Ch 35 (ending: The Garden of Echoes)
  |─ Practicality (take-control) → Ch 36 (ending: The Weight of the Water)
```

## Branch Points (5 total)

| # | Chapter | Trigger | Branch | Converges To | New Chapters |
|---|---------|---------|--------|--------------|--------------|
| 1 | Ch 5 | Wisdom (read-archives) | Forgotten Channels | Ch 10 | 26, 27, 28 |
| 2 | Ch 13 | Empathy (free-jars) | Sanctuary Path | Ch 15 | 29, 30 |
| 3 | Ch 18 | Practicality (open-door) | Broken Seal | Ch 20 | 31, 32 |
| 4 | Ch 22 | Practicality (gate-first) | Price of the Gate | Ch 24 | 33, 34 |
| 5 | Ch 24 | All three choices | Three endings | (terminal) | 35, 36 |

## Endings (3 total)

| Ending | Chapter | Trigger | Tone |
|--------|---------|---------|------|
| A Village That Chooses Tomorrow | Ch 25 (existing) | Empathy (ask-consent) | Harmonious — the village enters Identity through shared trust |
| The Garden of Echoes | Ch 35 (new) | Wisdom (follow-sequence) | Scholarly — the village becomes a school of listening |
| The Weight of the Water | Ch 36 (new) | Practicality (take-control) | Bittersweet — the village survives but trust is damaged |

## New Chapters (11 total)

| ID | Title | Arc | Branch |
|----|-------|-----|--------|
| 26 | The Map Beneath the Map | Forgotten Channels | Branch 1 |
| 27 | The Drowned Workshop | Forgotten Channels | Branch 1 |
| 28 | What the Channels Knew | Forgotten Channels | Branch 1 |
| 29 | The Jar Garden | Hollow Market | Branch 2 |
| 30 | The Word Spreads | Hollow Market | Branch 2 |
| 31 | The Fall of Stone | Moving Lights | Branch 3 |
| 32 | The Harder Path Down | Moving Lights | Branch 3 |
| 33 | The Missing | Great Storm | Branch 4 |
| 34 | The Reckoning at the Mill | Great Storm | Branch 4 |
| 35 | The Garden of Echoes | Great Storm | Ending (Wisdom) |
| 36 | The Weight of the Water | Great Storm | Ending (Practicality) |

## Technical Changes

1. **Chapter type**: Added `isEnding?: boolean` to mark terminal chapters.
2. **Choice routing**: Choices now specify `nextChapterId` to route to specific
   chapters. The reducer uses `choice.effect.nextChapterId ?? chapter.id + 1`
   (unchanged), but chapters now set explicit `nextChapterId` values at branch
   points.
3. **Reducer guard**: Added a safety check that falls back if a branch routes
   to a non-existent chapter ID.
4. **Completion check**: Changed from `history.length >= 25` to checking
   whether the current chapter is an ending AND the player has made a choice
   in it. This handles variable path lengths from branching.
5. **Save/load**: No changes needed — the save state already tracks
   `currentChapterId` and `history`, which fully capture the player's position
   in the branching graph.
6. **Slime unlocks**: Branch chapters that skip slime-unlock chapters (e.g.,
   the Forgotten Channels branch skips Ch 6 which unlocks Clay) provide their
   own slime unlocks to ensure all 5 slimes are reachable on every path.
