# Annapurna Play deployment plan

The five experiences are presented as one platform but deployed as five independent Workers. This keeps a game-specific rollback or release hold from taking down the catalogue or another title.
## Public platform surface

The shareable entry point is https://play.annapurnaagenticsolutions.com/. Each title has a branded hostname under the same parent domain:

| Surface | URL |
| --- | --- |
| Platform hub | https://play.annapurnaagenticsolutions.com/ |
| FunLab | https://funlab.play.annapurnaagenticsolutions.com/ |
| ONEIRIC | https://oneiric.play.annapurnaagenticsolutions.com/ |
| Vidya Yantra | https://vidya-yantra.play.annapurnaagenticsolutions.com/ |
| Varsha Hollow | https://varsha-hollow.play.annapurnaagenticsolutions.com/ |
| Kids Puzzle World | https://kids-puzzle-world.play.annapurnaagenticsolutions.com/ |
| Shared guest-progress API | https://api.play.annapurnaagenticsolutions.com/ |

The API is a small Cloudflare Worker backed by D1. It accepts bounded, anonymous progress snapshots keyed by a client-generated opaque key; it does not collect names, email addresses, child profiles, chat, or account credentials. The current titles remain local-first until each game has an explicit, visible sync interaction designed and tested.

## Deployment matrix

| Title | Public role | Delivery mode | Save boundary | Worker asset directory | Current gate |
| --- | --- | --- | --- | --- | --- |
| FunLab | Multi-game platform | Static bundle | Local browser storage | `dist/` | Audit and clean-browser playtest |
| ONEIRIC | Signature standalone game | Vite static build | Local browser storage | `dist/` | Production build and WebGL/device smoke |
| Vidya Yantra | Learning world | Static showcase build | Local chronicle | `dist/static/` | Static showcase validation; backend not required for core journey |
| Varsha Hollow | Narrative learning world | Static preview build | Local journal; cloud save deferred | `dist/static/` | Static-preview validation; auth/API backend remains a separate release |
| Kids Puzzle World | Child-safe puzzle world | Vite static build | Local browser storage | `dist/` | Child-safety, touch, keyboard and clean-browser QA |

## Why independent Workers

The common catalogue is a discovery surface; each game remains its own build and release unit. This gives every title an explicit compatibility date, asset directory, dry-run, preview URL and rollback history. It also avoids forcing Vidya Yantra or Varsha Hollow’s server dependencies into the static games.

## Build commands

Run each title from its own directory:

```text
FunLab:            npm run build:static
ONEIRIC:           npm run build
Vidya Yantra:      pnpm exec vite build --config vite.static.config.ts
Varsha Hollow:     VITE_STATIC_PREVIEW=true pnpm exec vite build --config vite.static.config.ts
Kids Puzzle World: npm run build
```

Then validate and deploy the corresponding `wrangler.jsonc`:

```text
wrangler deploy --dry-run
wrangler deploy
```

The hub is deployed from play/wrangler.jsonc, and the shared API is deployed from play-api/wrangler.jsonc. Game configs attach their branded custom domains while retaining independent Worker rollback units.

No command above creates accounts, changes auth, or migrates a database. The two learning worlds must not be described as fully backed by cloud accounts until their server/storage plans are separately deployed and tested.

## Shared launch rules

- Free guest play is the default during the preview period.
- Never ask for an account before a meaningful first interaction.
- Account prompts, when justified later by cross-device save or sharing, must be parent-mediated for child-facing experiences.
- Do not add analytics, ads, chat or child profiles as a prerequisite to play.
- A public title is “live” only after a production build, Workers dry-run, deployment, desktop/mobile smoke and clean-browser save check are recorded.
