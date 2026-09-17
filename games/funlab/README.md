# FunLab Browser v0.6 — Interaction Polish

v0.6 keeps the same eleven browser-first activities and deepens four proven play loops without adding backend requirements.

## What changed

- **Who Would Win?** — fights now telegraph every exchange. Guard, Power and Counter are contextual live actions with real cooldowns and health consequences; the player's timing can overturn the base prediction.
- **Jugaad Challenge** — the workbench is now a 6×3 spatial construction grid. Position, alignment and spread alter the deterministic target simulation, so rearranging the same tools can change the outcome.
- **What Happens Next?** — each theme now has a distinct map grammar, contextual hotspots, obstacles, inspectable objects and a moving world actor while preserving the cross-scene carry pack.
- **Combine Anything** — every fusion adds parent/child links to a scrollable visual lineage map; discovered nodes can be tapped to feed them back into the reactor.
- **No backend expansion** — the optional intelligence server and schemas remain frozen from v0.5.

## Run

```bash
npm test
npm run audit
npm run serve
```

Open `http://127.0.0.1:4173`.

## Verification

See `VERIFICATION.txt`. Automated tests, static audit, syntax, module-import, HTTP and extracted-package checks are release gates. Real Chrome/Edge/Firefox/Android screenshot QA is still not claimed in this container because Chromium graphics initialization remains unreliable.
