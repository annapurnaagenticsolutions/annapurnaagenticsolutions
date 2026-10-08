# InvariantC + SiteTruth QA

**Version:** 0.2.0 integration prototype (OpenAPI contract 0.3.0)

**Product state:** research preview with an API-only staging Worker deployed; not a commercial SaaS.

InvariantC evaluates typed software contracts against caller-supplied observations and returns PASS, FAIL, or UNKNOWN. The Rust evaluator is shared by the CLI, WASM bindings, and Cloudflare Worker. The local product page demonstrates synthetic examples only.

## Current capabilities

- Rust contract compiler/evaluator and a 144-case synthetic corpus.
- Compiled WASM builds for Node and Cloudflare bundling, with native/WASM parity tooling.
- Local Playwright collector for explicitly scoped test sites. The browser acceptance suite is currently blocked by organization localhost-navigation policy; do not bypass it.
- Redacted local evidence packaging and a SQLite scenario index.
- Cloudflare Worker source for caller-supplied JSON evaluation, D1-backed tenant API keys, revocation/expiry, and per-tenant Durable Object quotas.
- Responsive research-preview page with an embedded synthetic demo; no account, hosted scan, checkout, or analytics flow.

The last deployed Worker remains an API-only evaluator and does not browse submitted URLs or persist `/v1/check` contracts, observations, or reports. Local source now includes an authenticated scan intake/status route and encrypted dispatch outbox, but all scan gates remain false; the staging configuration has no Queue binding/consumer, Cron Trigger, or browser runner. The staging Worker version `92c6912c-b071-443f-ad27-0fb3df1dd1a7` is recorded at [invariantc-sitetruth-api-staging](https://invariantc-sitetruth-api-staging.annapurnaagenticsolutions-4f9.workers.dev); APAC D1 migrations `0001`–`0003` are applied, and read-only counts found no tenant or scan records. Live checks at that prior verification returned health `ready` with domain verification, payload storage, and browser scanning disabled; the research-preview assets returned CSP headers, and unauthenticated API calls were rejected. No tenant or API key is provisioned, so authenticated evaluation is not enabled. This endpoint is staging only, not a commercial service.

## Local verification

```powershell
python scripts/validate_corpus.py
python scripts/verify_seeded_pages.py
python scripts/scenariodb_smoke.py
npm run test:js
npm run test:wasm-worker
npm run verify:worker-config
npm run verify:tenant-schema
npm run verify:hosted-controls-schema
npm run verify:evaluation-metrics
npm run verify:pilot-summary
npm run worker:dry-run
cargo fmt --all -- --check
cargo clippy --all-targets -- -D warnings
cargo test --all-targets
cargo run -- corpus corpus/manifest.json --offline
npm run parity
```

The compiled-WASM Worker integration needs `worker/pkg/` generated first:

```powershell
npm run build:wasm
npm run test:wasm-worker
```

For local Rust release and WASM builds, see `docs/CODEX_M2_M4_HANDOFF.md`. For reviewed staging setup and its operator-only actions, see `docs/SAAS_PILOT_DEPLOYMENT.md`.

The source-level JSON API fuzz target is under `fuzz/`; `.github/workflows/fuzz-smoke.yml` runs it for 120 seconds on Ubuntu. The main CI workflow audits both Rust lockfiles against RustSec. Hosted execution has not been observed. Local fuzz execution requires nightly Rust, `cargo-fuzz`, and a working sanitizer runtime; a target build alone does not count as fuzz coverage. See `docs/LOCAL_VALIDATION_RESULTS.md` for current evidence.

## Product and release boundary

The page and fixtures are synthetic. Real-site precision/recall, customer value, ownership authorization, site-owner pilot results, hosted browser safety, production operations, and pricing have not been established. The hosted browser collector, billing, subscriptions, CRM, AI judge, production routes, and commercial availability remain gated. Do not present unit tests or local builds as customer outcomes or release certification.

See `docs/LOCAL_VERIFIED_BASELINE.md`, `docs/REMAINING_RISKS.md`, and `docs/PRODUCT_POSITIONING.md` for current evidence and safe claims.
