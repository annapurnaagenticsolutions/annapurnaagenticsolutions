# Codex local execution — InvariantC M2–M4

Do not merge with AXON. Work in this standalone Rust repository. Use zero paid APIs, no customer data and no production deployment without review.

For the commercial-scanning target, follow [`COMMERCIAL_SAAS_RELEASE_PLAN.md`](COMMERCIAL_SAAS_RELEASE_PLAN.md). The release plan does not override these restrictions; hosted scanning remains disabled until its security, data, and operational gates pass.

**Latest staging record (2026-10-08):** The APAC D1 `invariantc-sitetruth-staging` is configured in `worker/wrangler.toml`. Migrations `0001`–`0008` are recorded in D1; `0004`–`0008` were applied as sequential D1 API batches with the migration-ledger insert in each batch. A deliberate constraint-failure batch rolled back without leaving its scratch table. Read-only checks confirm zero tenants, challenges, verified origins, policies, jobs, artifacts, and outbox rows. `PRAGMA integrity_check` is rejected by the D1 API authorizer (`SQLITE_AUTH`), so that operation was unavailable. Every scan gate remains false; there is no Queue binding/consumer, R2 binding, Cron Trigger, or browser runner. The staging Worker remains at version `92c6912c-b071-443f-ad27-0fb3df1dd1a7` (100%). The latest credential-free `/health` smoke failed before HTTP because local DNS returned `ENOTFOUND`; the historical health/assets/auth smoke is not current evidence. No Worker, Pages, website, production resource, tenant key, or customer data was changed or created. GitHub run #19 passed synthetic browser acceptance, but customer-site browser egress and commercialization gates remain open.

**Cloudflare connector and release-path recheck (2026-10-08):** The reconnected connector authenticates to the Annapurna account. The staging Worker deployment history still shows version `92c6912c-b071-443f-ad27-0fb3df1dd1a7` at 100%; no Worker deployment occurred. A Workers Builds lookup found no build configuration for the SiteTruth staging script. No SiteTruth-specific build token/GitHub connection is configured; a build token associated with another service was not reused. Pages settings and deployments were not changed. GitHub draft PR #6 remains open and unmerged at `cd5eadc8fa5e2291403e46a0655404f1216cb080`. Hosted run #19 passed SiteTruth validation/security and 120-second fuzz, including local Workerd/D1 acceptance, 25,000-request synthetic soak, six synthetic browser scenarios, and dependency audits. The fixed-denial probes passed, while the TLS-only probe remained inconclusive with `pinned_tls_connection_failed`. The separate website quality-gate workflow failed its homepage contract and is outside this Worker task.

## 1. Establish native baseline

```bash
python scripts/validate_corpus.py
python scripts/verify_seeded_pages.py
python scripts/scenariodb_smoke.py
npm run test:js
cargo fmt --all -- --check
cargo clippy --all-targets -- -D warnings
cargo test --all-targets
cargo run -- corpus corpus/manifest.json --offline
cargo build --release
```

If `cargo fmt` fails due to formatting only, run `cargo fmt`, inspect diff and rerun. If compiler fails, fix code before modifying corpus labels.

## 2. WASM build and parity (free/local)

```bash
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
npm run build:wasm-node
npm run parity
npm run build:wasm
```

- The parity script executes all **144** corpus scenarios in Rust native CLI and WASM Node target; compare exact JSON reports, outcomes and hashes.
- Verify Cloudflare bundler output includes patched wasm-bindgen glue.
- In a network-restricted Windows checkout, use the Cargo.lock-matching CLI already under `.tools/wasm-bindgen-cli-<version>/bin`, put that directory first on `PATH`, and pass `--mode no-install` before `--features wasm` to `wasm-pack build`. This avoids the wrapper trying to download or rebuild the CLI.
- Before marking M2 complete, run `npx wrangler dev -c worker/wrangler.toml` and send representative `POST /v1/check` requests using a local test secret.
- The staging Worker is deployed; the production Worker is not. Never paste production secrets into the repository.

## 3. Browser collector (free/local)

Install Node 22+, Playwright and Chromium locally (no cloud browser spend):

```bash
npm install
npx playwright install chromium
npm run demo:serve
```

In a second terminal:

```bash
node collector/cli.mjs --spec examples/browser_capture/apples-bad.capture.json --observations apples-bad.observations.json --evidence apples-bad.evidence.json
cargo run -- check examples/apples.contract.json --observations apples-bad.observations.json
```

Run all six browser capture specs: `apples-bad`, `apples-good`, `apples-click`, `apples-unknown`, `cart-bad`, `cart-good`.

Acceptance:

| Scenario | Expected |
|---|---|
| apples-bad | FAIL |
| apples-good | PASS |
| apples-click | FAIL after button click |
| apples-unknown | UNKNOWN |
| cart-bad | FAIL |
| cart-good | PASS |

Use `examples/apples.contract.json` for apple cases and `examples/browser_capture/cart.contract.json` for cart cases. Record exact CLI stdout and toolchain versions.

If the local browser is policy-blocked, record the failure; **never bypass organization browser policies**.

## 4. Evidence and DB

```bash
node evidence/pack.mjs --report report.json --out evidence-run-001
node evidence/verify.mjs evidence-run-001
```

Raw synthetic inputs only:

```bash
node evidence/pack.mjs --report report.json --contract examples/apples.contract.json --observations apples-bad.observations.json --out evidence-run-synthetic --include-inputs --synthetic-only
```

- Do not use raw-input capture on live customer sites.
- ScenarioDB SQLite schema is `db/schema.sql`; harden deletion/retention before customer use.

## 5. Only after these gates

1. **Complete locally (2026-10-08):** the Worker handler has four in-process integration tests against compiled WASM output, including PASS/FAIL/UNKNOWN and authentication. The current local Workerd/D1 HTTP smoke is blocked before any request by `connect EACCES 127.0.0.1:8787`; earlier authenticated smoke/load results are historical and do not validate the migrated runtime.
2. **Complete as a local profile; staging schema installed (2026-10-08):** the latest candidate includes pinned PSL data, disabled domain-challenge routes, bounded cleanup/recovery, queued/running cancellation on proof revocation, execution-authorization helpers, atomic tenant suspension with active-scan cancellation, a 24-hour scan-quota history floor, an authenticated tenant-scoped scan intake/status route, an AES-GCM encrypted payload outbox with key-ID rotation, idempotent queue dispatch, and disabled hosted schedules. The Worker bounds request-body reads to 90 seconds, below the 120-second concurrency lease; focused Node/SQLite tests cover intake validation, tenant isolation, encryption binding/rotation, idempotency, queue retry, and terminal payload deletion. D1 migrations `0001`–`0008` are installed in staging, and an API batch rollback smoke passed without customer or tenant data. This does not test the Worker’s application-level D1 quota/intake paths. No queue consumer or browser runtime is implemented/configured, so the intake is fail-closed and is not a hosted scanning service. The staging Worker still has no Queue, R2, or Cron binding. Keyring setup and intake semantics are documented in `SCAN_INTAKE_OPERATIONS.md`. The Worker remains at version `92c6912c-b071-443f-ad27-0fb3df1dd1a7`; no new code was deployed. Resource measurements are in `LOCAL_VERIFIED_BASELINE.md`; local tests do not establish edge CPU, memory, or production behavior.
   A CI-only acceptance runner passed in hosted run #19: it applied/listed all migrations locally, created ephemeral synthetic-only tenant/key rows, exercised current Workerd auth, revocation, expiry, tenant isolation and quotas, and ran a bounded 25,000-request load. It strips Cloudflare credentials and uses only Wrangler `--local`; this cannot establish remote D1 semantics or edge capacity.
   A separate default-deny Container egress prototype is under `worker/egress-prototype/`. It has no scanner binding, data store, public route, or enabled-by-default probe. Hosted run #19 verified the fixed `.invalid` HTTP/S denials and synthetic redirect. Its fixed `example.com` TLS handshake-only path still returned 502 `pinned-tls-probe-failed` with sanitized code `pinned_tls_connection_failed`; no successful handshake was demonstrated. The probe rejects IANA special-purpose IPv4 answers, pins the selected IPv4 lookup, verifies hostname/SNI/certificate identity, and sends no HTTP request to the site. This is not Chromium or deployed egress and does not validate arbitrary destinations or browser behavior. The Cloudflare Durable Object scheduling policy is public beta and deployed processes retain root Linux capabilities. See `docs/EGRESS_DENY_PROTOTYPE.md`; hosted URL scanning remains disabled.
3. **Partially implemented; hosted collection remains disabled:** tenant-bound DNS TXT challenge routes remain behind `DOMAIN_VERIFICATION_ENABLED = "false"`. Migrations `0001`–`0008` define scan state, retention, audited cleanup/recovery safeguards, ownership-revocation cancellation, and encrypted outbox persistence; all are recorded in staging. The feature-gated scan API validates tenant/origin/policy and exposes status; it does not launch a browser. The execution-authorization core still must be integrated with a reviewed consumer/runner that atomically claims the job and rechecks active tenant/origin, canonical HTTPS origin, and run budget immediately before navigation. Bounded cleanup/recovery/outbox-dispatch handlers require operator-supplied windows, and no Queue producer/consumer, Cron Trigger, or runner is configured in staging. D1 API batch rollback was verified with an isolated scratch transaction; live DNS, application-level quota/intake behavior, and cleanup/recovery/outbox/revocation workflows remain unverified. Before this gate can pass, integrate the recheck with a reviewed runner, approve retention/recovery windows, exercise these application paths in staging, configure scheduled deletion, and implement independently enforced browser egress. Do not enable URL scanning.
4. **Blocked on authorized data and human review:** evaluate at least 100 human-labelled real defects across multiple authorized sites using `schemas/real_defect_evaluation.schema.json`; every scored label must have multi-review consensus/adjudication. Report precision/recall by source layer and predicate, UNKNOWN rate, and high-severity precision. The scorer emits aggregate-only reports, cannot establish reviewer independence or authorization truth, and its synthetic smoke is not real-site evidence.
5. **Blocked on cleared prerequisites and consenting participants:** conduct the guided owner pilot before adding subscriptions, CRM, or AI judge.

The pilot protocol and privacy-minimal aggregate-only ledger are prepared in `docs/PILOT_PROTOCOL.md`, `schemas/pilot_session.schema.json`, and `scripts/summarize_pilot.py`. This is preparation only. Do not recruit or run sessions until the browser, hosted-safety, real-defect, consent, and site-scope prerequisites in the protocol are independently cleared.

Deliver `LOCAL_VERIFIED_BASELINE.md` showing PASS/FAIL/BLOCKED per gate and `REMAINING_RISKS.md`; do not claim production readiness from green unit tests alone.

The curated source inventory includes the release gate documents, CI workflows, and local workflow-pin/budget checks. After changing any included source, run `python scripts/refresh_release_manifest.py --refresh`, then verify with `python scripts/refresh_release_manifest.py --check`. The manifest and checksum files are self-excluded. Refresh refuses to proceed if either `rust_verified` or `browser_verified` is true; the inventory is a checksum record, not a signature or release approval.

### Read-only staging recheck

Run `npm run worker:staging-smoke` to recheck the public staging Worker without Cloudflare credentials. The command is restricted to the `invariantc-sitetruth-api-staging.*.workers.dev` HTTPS origin and checks `/health`, preview security headers, and unauthenticated `/v1/check` rejection. It performs no authenticated requests, D1 writes, migrations, scans, or deployment. A pass does not identify the deployed version or verify remote D1 schema/transaction behavior; record the tool output and obtain version/migration evidence separately.

### Additional preflight and single-command browser suite

```bash
node collector/pairing.mjs examples/apples.contract.json examples/browser_capture/apples-bad.capture.json
node collector/pairing.mjs examples/browser_capture/cart.contract.json examples/browser_capture/cart-bad.capture.json
npm run browser:suite
```

`npm run browser:suite` runs a localhost-only demo server, launches Playwright for each of six synthetic scenarios and compares the **native Rust evaluator outcome** against the recorded expected label; it cleans up temporary raw observations. The local collector now rejects external capture before browser launch, refuses a root process, enables Chromium sandboxing, blocks service workers/downloads, and filters requests at BrowserContext scope. These source-level controls do not verify the browser runtime or provide hosted SSRF protection. The local browser remains unverified in this packaging environment because an administrator policy blocks all navigation. Hosted run #19 passed the six fixed localhost-only scenarios with a read-only token and no deployment; this does not close the hosted-runtime or SSRF protection gate.

### Coverage-guided fuzz and dependency audit

The source-level JSON API target and seed corpus are in `fuzz/`; the separate `.github/workflows/fuzz-smoke.yml` runs a 120-second libFuzzer smoke on Ubuntu. The main CI workflow audits `Cargo.lock` and `fuzz/Cargo.lock` against RustSec and applies/lists the full D1 migration chain against isolated local storage. In hosted run #19, fuzz, both RustSec audits, synthetic local Workerd/D1 acceptance, and the six synthetic browser scenarios passed. All remote actions in both workflows are pinned to verified full commit SHAs with version annotations; checkout credential persistence is disabled, and `python scripts/validate_workflow_pins.py` enforces the policy. Current local fuzz execution did not start because Windows returned `STATUS_DLL_INIT_FAILED`; hosted smoke results do not replace deeper fuzzing or remote D1 acceptance.
