# QA Checklist — v1.3

## Functional

- [x] JavaScript syntax check passes.
- [x] Manifest JSON is valid.
- [x] Service worker syntax check passes.
- [x] Prompt library JSON is valid.
- [x] Best 100 showcase JSON is valid.
- [x] Recurring character JSON is valid.
- [x] Share-card template JSON is valid.
- [x] Hinglish sample JSON is valid.
- [x] ZIP integrity passes.

## Manual smoke test

1. Open `index.html` locally.
2. Run: `What if crows ran Bengaluru traffic?`
3. Confirm output mentions recurring cast such as Crow Commissioner Cawdesh.
4. Switch to Poster loop and check Poster Briefs / Best Cards.
5. Switch to Hinglish Showcase and run a monsoon prompt.
6. Save result and verify it appears in Gallery.
7. Export Gallery JSON.

## Closure gate

Pass if the app demonstrates: funny prompt -> useful output -> shareable card -> remix path -> saved result.
