# Codex local execution — InvariantC M2–M4

Do not merge with AXON. Work in this standalone Rust repository. Use zero paid APIs, no customer data and no production deployment without review.

For the commercial-scanning target, follow [`COMMERCIAL_SAAS_RELEASE_PLAN.md`](COMMERCIAL_SAAS_RELEASE_PLAN.md). The release plan does not override these restrictions; hosted scanning remains disabled until its security, data, and operational gates pass.

**Last verified staging record (2026-10-08):** The operator provisioned `invariantc-sitetruth-staging` in APAC. Its D1 ID is configured in `worker/wrangler.toml`; migrations `0001`–`0003` were applied. Local migrations `0004`–`0008` add audited retention/recovery safeguards, origin-revocation cancellation, and an encrypted scan-dispatch outbox; they are not applied to staging. The authenticated tenant-scoped scan intake/status route and outbox dispatcher are now implemented locally, but every scan gate is false in staging and there is no Queue binding/consumer, Cron Trigger, or browser runner. Read-only aggregate checks found zero tenant, challenge, verified-origin, scan-policy, job, and artifact rows before the local migration additions. The staging-only Worker was deployed at `https://invariantc-sitetruth-api-staging.annapurnaagenticsolutions-4f9.workers.dev` (version `92c6912c-b071-443f-ad27-0fb3df1dd1a7`). At that verification, `/health` returned 200/ready and explicitly reported domain verification, customer payload storage, and browser scanning disabled; preview assets returned 200 with CSP; unauthenticated `/v1/check` returned 401. A later deployment attempt could not refresh the expired Wrangler token because the Cloudflare auth service was unreachable, so no new version was returned and the live version was not rechecked. No tenant keys or production resources were created. Browser acceptance and commercialization gates remain open.

**Read-only recheck (2026-10-08):** The reconnected Cloudflare MCP authenticated to the Annapurna account and confirmed that staging still serves version `92c6912c-b071-443f-ad27-0fb3df1dd1a7` at 100%. The APAC D1 migration table still contains only `0001`–`0003`; live counts for tenants, domain challenges, verified origins, scan policies, jobs, and artifacts are zero. Deployed domain-verification and artifact-retention gates are false, and no Queue, R2, or Cron binding is configured. The credential-free HTTP smoke could not resolve the Worker hostname (`ENOTFOUND`), so this turn did not reverify `/health` or preview assets. No Worker, D1, Queue, Pages, or production resource was changed.

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
2. **Complete as a local profile (2026-10-08):** the latest local candidate includes pinned PSL data, disabled domain-challenge routes, bounded cleanup/recovery, queued/running cancellation on proof revocation, execution-authorization helpers, atomic tenant suspension with active-scan cancellation, a 24-hour scan-quota history floor, an authenticated tenant-scoped scan intake/status route, an AES-GCM encrypted payload outbox with key-ID rotation, idempotent queue dispatch, and disabled hosted schedules. The Worker bounds request-body reads to 90 seconds, below the 120-second concurrency lease; focused Node/SQLite tests cover intake validation, tenant isolation, encryption binding/rotation, idempotency, queue retry, and terminal payload deletion. Migration `0008` and migrations `0004`–`0008` are local-only and unapplied remotely. No queue consumer or browser runtime is implemented/configured, so the intake is fail-closed and is not a hosted scanning service. The Worker uses no Queue, R2, or Cron binding in staging config. Keyring setup and intake semantics are documented in `SCAN_INTAKE_OPERATIONS.md`. The candidate was not redeployed because Wrangler authentication had expired and the Cloudflare auth service was unreachable. The last recorded staging version remains `92c6912c-b071-443f-ad27-0fb3df1dd1a7`; resource measurements are in `LOCAL_VERIFIED_BASELINE.md`; local tests do not establish edge CPU, memory, D1, or production behavior.
   A CI-only acceptance runner passed in hosted run #14: it applied/listed all migrations locally, created ephemeral synthetic-only tenant/key rows, exercised current Workerd auth, revocation, expiry, tenant isolation and quotas, and ran a bounded 25,000-request load. It strips Cloudflare credentials and uses only Wrangler `--local`; this cannot establish remote D1 semantics or edge capacity.
   A separate default-deny Container egress prototype is under `worker/egress-prototype/`. It has no scanner binding, data store, public route, or enabled-by-default probe. Its CI-only Linux job uses Docker/Workerd for fixed `.invalid` HTTP/S denial probes, a synthetic redirect, and one `example.com` TLS handshake-only path that rejects IANA special-purpose IPv4 answers before connecting only to the selected checked address, explicitly verifies the certificate name and SNI, and sends no HTTP request to the site. Hosted run #16 verified the three fixed denial responses, but the TLS-only probe returned 502 `pinned-tls-probe-failed` with sanitized code `pinned_tls_connection_failed`; CI reported this as inconclusive and proved no successful handshake. The current local source preserves `example.com` as the TLS socket host, pins its lookup to the checked address, and propagates only format-checked socket error codes. Hosted run #18 stopped before the Container runtime because its structural check still expected the old socket shape; the source and structural check now agree on hostname-preserving pinned lookup. The hosted fix result is pending. The fresh local Wrangler dry-run stopped before bundling because Docker CLI is unavailable. This is not Chromium or deployed egress and does not validate arbitrary destinations or browser behavior. The Cloudflare Durable Object scheduling policy is public beta and deployed processes retain root Linux capabilities. See `docs/EGRESS_DENY_PROTOTYPE.md`; hosted URL scanning remains disabled.
3. **Partially implemented; hosted collection remains disabled:** tenant-bound DNS TXT challenge routes remain behind `DOMAIN_VERIFICATION_ENABLED = "false"`. Migrations `0003`–`0008` define scan state, retention, local audit/recovery safeguards, ownership-revocation cancellation, and encrypted outbox persistence. The feature-gated scan API validates tenant/origin/policy and exposes status; it does not launch a browser. The execution-authorization core still must be integrated with a reviewed consumer/runner that atomically claims the job and rechecks active tenant/origin, canonical HTTPS origin, and run budget immediately before navigation. Bounded cleanup/recovery/outbox-dispatch handlers require operator-supplied windows, and no Queue producer/consumer, Cron Trigger, or runner is configured in staging. Only migrations `0001`–`0003` are applied to staging; D1 transaction behavior and migrations `0004`–`0008` remain unverified remotely. Before this gate can pass, verify live DNS and D1 behavior, integrate the recheck with a reviewed runner, approve retention/recovery windows, exercise cleanup/recovery/cancellation/outbox dispatch in staging, configure scheduled deletion, and implement independently enforced browser egress. Do not enable URL scanning.
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

`npm run browser:suite` runs a localhost-only demo server, launches Playwright for each of six synthetic scenarios and compares the **native Rust evaluator outcome** against the recorded expected label; it cleans up temporary raw observations. The local collector now rejects external capture before browser launch, refuses a root process, enables Chromium sandboxing, blocks service workers/downloads, and filters requests at BrowserContext scope. These source-level controls do not verify the browser runtime or provide hosted SSRF protection. The local browser remains unverified in this packaging environment because an administrator policy blocks all navigation. Hosted run #14 passed the six fixed localhost-only scenarios with a read-only token and no deployment; this does not close the hosted-runtime or SSRF protection gate.

### Coverage-guided fuzz and dependency audit

The source-level JSON API target and seed corpus are in `fuzz/`; the separate `.github/workflows/fuzz-smoke.yml` runs a 120-second libFuzzer smoke on Ubuntu. The main CI workflow audits `Cargo.lock` and `fuzz/Cargo.lock` against RustSec and applies/lists the full D1 migration chain against isolated local storage. In hosted run #14, fuzz, both RustSec audits, and synthetic local Workerd/D1 acceptance passed. All remote actions in both workflows are pinned to verified full commit SHAs with version annotations; checkout credential persistence is disabled, and `python scripts/validate_workflow_pins.py` enforces the policy. Current local fuzz execution did not start because Windows returned `STATUS_DLL_INIT_FAILED`; hosted smoke results do not replace deeper fuzzing or remote D1 acceptance.
