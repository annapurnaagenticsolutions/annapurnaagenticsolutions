# Paheli Bazaar v0.3 Showcase Ready

A mobile-first static puzzle game: 7 shops, 140 curated puzzles, daily challenge, rounds, hints, coins, Kid Mode, smart next actions, goal tracking, local progress, and PWA-ready files.

## Run locally

Use a local server so JSON files load correctly:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Contents

- 7 puzzle shops
- 140 curated puzzles
- Daily Challenge with visible daily bonus feedback
- Rounds: Chotu, Family, Bazaar Mix, Emoji Express, Logic Laddoo Plate, Wrong Answer Darbar, Science Magic Show, Word Paan Challenge
- Kid Mode toggle to avoid tricky puzzles in random play, rounds, and daily challenge
- Smart suggested-next action
- Next Goals and title progress
- Recent round history
- localStorage progress
- PWA manifest and service worker
- Mobile-first CSS

## Privacy and safety

No login, backend, payments, ads, analytics, or personal data collection. Progress is stored only in the browser using localStorage.

## Best showcase flow

1. Open the app and enter the bazaar.
2. Show the seven shop cards and the suggested next action.
3. Open Logic Laddoo Shop and solve one puzzle with and without hints.
4. Show Daily Challenge and the +25 daily bonus behavior.
5. Open Rounds and run Family Round or Bazaar Mix.
6. Open Bazaar Pass to show progress, titles, goals, Kid Mode, and recent rounds.

## Version note

v0.3 is a showcase-readiness pass over v0.2. It avoids major scope expansion and focuses on safer/easier play, clearer rewards, and presentation polish.
