# Remaining Risks — InvariantC M2–M4 / SiteTruth QA

**Updated:** 2026-10-08

## P2 — Hosted CI and upstream action freshness are not verified

All remote GitHub Actions references in `.github/workflows/ci.yml` and `.github/workflows/fuzz-smoke.yml` now use full commit SHAs with version annotations. Checkout credential persistence is disabled, and `scripts/validate_workflow_pins.py` rejects mutable refs. `scripts/validate_workflow_budget.py` requires an explicit timeout on every job and same-ref cancellation in main CI. These local policy checks do not execute GitHub-hosted jobs or verify repository settings. This checkout has no Git remote configured, so hosted CI cannot be dispatched from this tree; run the workflows in the authorized repository and review pin updates against upstream release records before closing this risk.

## P1 — Authenticated staging evaluation and quotas are not enabled

The last verified API-only Worker version was `92c6912c-b071-443f-ad27-0fb3df1dd1a7` at [workers.dev](https://invariantc-sitetruth-api-staging.annapurnaagenticsolutions-4f9.workers.dev), and APAC D1 migrations `0001`–`0003` were applied. Prior read-only aggregate queries found zero tenant, challenge, origin, scan-policy, job, and artifact rows. The prior live smoke confirmed health 200/ready with hosted controls disabled, preview assets with CSP, and unauthenticated API rejection. A later candidate deployment could not pass expired-token authentication; no new version was returned. The new credential-free `npm run worker:staging-smoke` failed before receiving an HTTP response because local DNS returned `ENOTFOUND`; current health and version remain unknown. Authenticated staging evaluation and remote quota rejection/revocation tests remain open. A new Linux CI acceptance job now runs a local D1 migration chain and current Workerd smoke/load with synthetic credentials only; its result is pending and does not establish remote D1 or edge behavior. Do not create a real tenant/key until an operator approves a capacity and cost budget.

## P1 — Browser capture acceptance is blocked

Playwright and Chromium are installed, but the local localhost browser suite returned `connect EACCES 127.0.0.1:4173`. The six expected browser results (`apples-bad`, `apples-good`, `apples-click`, `apples-unknown`, `cart-bad`, `cart-good`) remain unverified. A GitHub Actions job now builds the native evaluator and runs those fixed synthetic localhost cases with a read-only repository token and no deployment step; it has not run yet. The local collector now enables Chromium sandboxing, refuses a root launch, applies request filtering at BrowserContext scope, and rejects external targets until the reviewed egress boundary exists. These source controls do not verify the browser runtime. Resume only in an organization-approved environment that permits the required localhost browser navigation; do not bypass the policy.

## P1 — Rust dependency audit has no result yet

CI is configured to audit both Rust lockfiles against RustSec. The local pinned auditor installation failed during native dependency compilation, and hosted CI has not run. Do not claim the Rust dependency graph is vulnerability-free until the hosted checks pass and the advisory database is current.

## P1 — Hosted browser collection safeguards are incomplete

The hosted collector remains disabled. DNS TXT verification and migrations `0002`/`0003` are recorded as installed in the approved staging D1 behind `DOMAIN_VERIFICATION_ENABLED = "false"`; prior read-only aggregate checks found zero tenant/challenge/origin/scan-policy/job/artifact rows. Migrations `0004`–`0008` and cleanup/recovery/authorization/intake/outbox code exist only locally. Migration `0007` cancels queued and running jobs when origin proof is revoked; the local execution core rechecks tenant state, proof freshness, canonical origin, and run budget before returning a navigation grant. A tenant-scoped intake/status route now creates encrypted, short-lived D1 outbox entries, but it is disabled and no Queue binding, queue consumer, browser runner, or independently enforced network proxy exists. D1 behavior is unverified. Bounded cleanup preserves the 24-hour issuance/quota history and audits deletion; the recovery handler uses unset queue-age/runtime-grace inputs. Domain, audit, and recovery retention windows require operator/privacy approval; all related flags remain false. Local SQLite and fake-binding tests do not establish Cloudflare D1 semantics or deletion timing. Cloudflare Containers remains a prototype candidate; the new fixed-host TLS-handshake-only probe has no observed Docker/Workerd CI result and proves no general address-pinned scanning. See [`BROWSER_RUNTIME_REVIEW.md`](BROWSER_RUNTIME_REVIEW.md). Do not enable URL scanning.

An isolated default-deny Container prototype now covers fixed `.invalid` HTTP/S denial/redirect cases and a fixed `example.com` TLS-handshake-only path. The Worker-side probe resolves an A record, connects to the selected address with SNI/certificate checks, validates `remoteAddress`, and sends no HTTP request to the site. Unit tests, configuration checks, and Worker JavaScript bundling pass; the complete Container build and hosted Docker/Workerd run remain pending because Docker is not installed locally and this checkout has no Git remote. Even a hosted pass would not test Chromium, arbitrary destinations, negative TLS cases in the runtime, or prove browser egress isolation. The `durable_object` scheduling policy is public beta, and deployed processes retain root Linux capabilities regardless of the UID requested for `exec`. See [`EGRESS_DENY_PROTOTYPE.md`](EGRESS_DENY_PROTOTYPE.md). This work does not change the scanning-disabled state.

## P1 — Real-defect validation and user pilot remain open

The aggregate-only evaluator and pilot protocol are prepared and their synthetic structural/arithmetic smokes pass. No human-labelled real defects from authorized sites were collected. The requirement of at least 100 human-labelled real defects across at least three sites remains unmeasured. No actual-user pilot was conducted; 5–10 consenting site-owner sessions, browser safety, real-defect validation, consent, and site authorization are still open. Subscriptions, CRM, and an AI judge remain out of scope until after the pilot.

## P2 — Workerd resource sizing is incomplete

The current dry-run bundle, Node measurements, and a historical 4,096-request local Workerd/HTTP run at concurrency 16 are recorded in `LOCAL_VERIFIED_BASELINE.md`. That 37.456-second run had no failures and p95 188.501 ms, but it predates migrations `0002`/`0003` and does not establish Cloudflare edge CPU, isolate memory, remote quota behavior, or production capacity. A new CI-only current-runtime job now includes a 25,000-request synthetic Workerd/D1 load after migrations `0001`–`0008`; its result is pending. Even a passing result is local-emulator evidence, not edge capacity. Seeded adversarial tests pass. A libFuzzer target and 120-second Linux CI workflow are configured, but the available Windows ASAN runtime exits with `STATUS_DLL_INIT_FAILED` before fuzzing, and hosted CI has not run; coverage-guided results remain open. Approve real quotas and cost ceilings only from reviewed runtime evidence.

## P2 — Product and commercial evidence

The bundled site is a research preview with a synthetic demonstration. There is no self-serve registration, hosted scan, billing, pricing, customer proof, or support operation. The public `workers.dev` URL is a staging endpoint, not a customer-facing service. Do not describe the product as commercially available or production-ready, and do not claim customer accuracy, time savings, ROI, or validated demand.

## P2 — Toolchain audit status

The last successful npm install/production audit reported zero vulnerabilities after pinning Wrangler's transitive `sharp` dependency to patched 0.35.5. This turn's `npm audit --omit=dev --audit-level=high` refresh failed before receiving advisories because `registry.npmjs.org` did not resolve, so no fresh npm result is available. This is separate from the unverified RustSec audit. A Windows PDB filename collision found in earlier Rust builds was fixed by giving the internal library target a distinct name; fresh tests and release builds no longer emit that warning.

## Release boundary

This work used synthetic fixtures and test-only credentials. It created the approved staging D1/Worker and did not deploy production, use customer data, establish real-site authorization, or demonstrate production readiness. Report hashes identify normalized input bytes; they are not signatures or proof of truth.
