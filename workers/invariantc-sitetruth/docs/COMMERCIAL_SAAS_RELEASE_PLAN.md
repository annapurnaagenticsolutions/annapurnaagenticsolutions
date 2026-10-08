# SiteTruth commercial SaaS release plan

**Updated:** 2026-10-08
**Target:** a reviewed, deployable Cloudflare-backed commercial site-scanning service. This plan does not authorize production deployment, paid browser usage, collection from customer sites, or commercial claims.

## Release decision

**Not ready to deploy as a commercial scanning SaaS.** The current product is an API-only evaluator with a synthetic preview. The staged Worker accepts caller-supplied JSON and does not browse URLs. Hosted scanning remains disabled. The phases below are ordered by dependency; a later phase cannot substitute for an earlier security or evidence gate.

## Phase 1 — Local evaluator and browser acceptance

**Status: evaluator checks pass; browser acceptance, current Workerd/D1 acceptance, and fuzz execution are configured in CI but not yet evidenced.**

- Preserve the 144-case synthetic corpus and native/WASM parity checks.
- Keep the current JavaScript, Rust, WASM, schema, and Worker bundle checks in CI.
- Run all six Playwright scenarios in an organization-approved local environment or the new read-only GitHub Actions job and record exact outcomes and toolchain versions. The current environment returned `connect EACCES 127.0.0.1:4173`; do not work around that restriction. CI runs only the six fixed synthetic `127.0.0.1` fixtures, uses a read-only repository token, and has no customer inputs or deployment step. Its result remains pending until the workflow runs.
- The `fuzz/json_api` libFuzzer target, seed corpus, and 120-second Linux CI smoke workflow are implemented. A local Windows AddressSanitizer build succeeded, but the process exited with `STATUS_DLL_INIT_FAILED` before fuzzing; the workflow has not run yet. Record actual coverage-guided results before closing this gate.
- CI now runs the current migration chain through `0008` against isolated local D1, seeds ephemeral synthetic-only tenant keys, starts current Workerd on loopback, exercises auth/revocation/expiry, tenant isolation and quota rejection, then runs a 25,000-request synthetic load. It strips Cloudflare credentials from child processes and has no deploy or remote D1 command. The Windows host cannot run this check because Wrangler's runtime fetch and loopback HTTP are blocked; the hosted result remains pending and, if successful, will establish local Workerd/D1 behavior only, not remote D1 semantics or edge capacity.
- Both GitHub Actions workflows now pin every remote action to a verified full commit SHA, annotate the resolved version, and disable persisted checkout credentials. Local preflight scripts enforce pinning and bounded job timeouts; the main workflow also cancels superseded runs on a ref. This hardens CI but does not establish that any hosted job has run successfully.
- The main CI workflow bounds every job with an explicit timeout and cancels superseded runs on the same ref to limit duplicate runner use. This is CI cost control only; service capacity and Cloudflare spend still need an operator-approved budget.
- `npm run worker:staging-smoke` now provides a credential-free, read-only check of the staging health response, preview security headers, and unauthenticated evaluation rejection. It rejects non-staging URLs, bounds responses and request time, and checks that hosted domain/scan features remain disabled. The first current attempt failed before receiving an HTTP response because local DNS returned `ENOTFOUND`; no current live result is established. Even a pass would not verify the deployed version, D1 migration state, or edge behavior.

## Phase 2 — Tenant identity, domain authorization, and quotas

**Status: staging schema installed; runtime domain verification and scan controls remain disabled and unverified.**

- Maintain tenant identity, key rotation/revocation, authentication, quotas, and cross-tenant isolation. Do not accept tenant IDs as proof of identity.
- The Worker now uses pinned `tldts` PSL data with private suffixes included. Domain challenge routes remain disabled until real DNS and D1 behavior are verified.
- Migrations `0001`–`0003` are recorded as applied to the approved APAC staging D1. Migrations `0004`–`0008` add local audited cleanup, recovery, ownership-revocation cancellation, and an encrypted scan-dispatch outbox; they have not been applied remotely. Read-only aggregate checks found zero tenants, challenges, origins, scan policies, jobs, and artifacts before these local migrations. The local tenant-scoped intake/status route validates exact verified origins, uses encrypted short-lived payloads, persists jobs and outbox records in a D1 batch, and is disabled in staging. The execution-authorization core still needs a reviewed runner to claim jobs and recheck authority immediately before navigation. An internal D1-batch helper cancels queued/running scans before suspending a tenant; it is not exposed through an administrative route. SQLite/fake D1 checks do not prove D1 batch or transaction behavior; validate that, quota reservation, idempotency, expiry/revocation, and concurrency in staging before provisioning any tenant.
- Require an operator-approved requests/minute, scans/day, concurrency, page, time, and report-size policy with a cost ceiling. Keep unset policies fail-closed.
- Local bounded D1 cleanup now removes expired challenges and expired/revoked origins in audited order, preserves the existing 24-hour challenge issuance rate-limit history, and retains origins referenced by scan jobs. The domain and audit retention durations are mandatory operator inputs and are intentionally absent from staging config. The local cleanup path is not yet applied to or exercised against Cloudflare D1.

## Phase 3 — Hosted scan execution and network isolation

**Status: default-deny Container prototype source now includes a fixed-host TLS handshake-only path; hosted runtime result pending. A tenant-scoped scan intake/status and encrypted outbox are implemented locally behind false-by-default gates, but no Queue binding/consumer or browser runner is configured. URL scanning is disabled and no runtime is approved. Browser execution, general checked-address HTTPS, and browser-egress guarantees are not demonstrated.**

- Prototype Cloudflare Containers first with `enableInternet = false`, HTTPS interception, and a default-deny outbound Worker. Cloudflare documents that this can route HTTP/S egress through trusted Worker code and block non-web ports, but ordinary Worker `fetch()` cannot pin an arbitrary public host to a checked IP (`resolveOverride` is same-zone limited). Prove checked-IP TCP/TLS with correct SNI/certificate validation before runtime approval. Browser Run remains an alternative only if its address-level egress guarantees are independently demonstrated. See [`BROWSER_RUNTIME_REVIEW.md`](BROWSER_RUNTIME_REVIEW.md).
- The current isolated prototype is in [`EGRESS_DENY_PROTOTYPE.md`](EGRESS_DENY_PROTOTYPE.md). It has a dedicated Worker config, no route or shared data bindings, an internet-disabled Container, all-HTTP/all-HTTPS intercepts, a default-deny handler, fixed `.invalid` denial/redirect probes, and a fixed `example.com` TLS handshake-only path that rejects IANA special-purpose IPv4 answers, explicitly checks the certificate name, connects to the selected address, and returns synthetic JSON without sending HTTP to the site. Its hosted Docker/Workerd result is pending; this host's fresh Wrangler dry-run stopped before bundling because Docker is unavailable. The probe is not Chromium and does not test public-site safety, general destination handling, or complete browser egress. Cloudflare's Durable Object scheduling policy is documented as public beta; deployed processes retain root Linux capabilities even when run under a non-root UID. This prototype does not clear the runtime approval gate.
- Review actual account pricing and set cost ceilings before enabling any binding. Containers require Workers Paid and bill provisioned memory/disk time, active CPU time, egress, Workers, and Durable Objects; Browser Run has separate browser-hour and concurrency charges. Recheck current plan, region, usage allowances, and prices during release review.
- The local intake API requires a tenant bearer key, verified origin, strict idempotency key, capture/contract pairing, same-origin HTTPS path, and operator policy. D1 job creation and AES-GCM encrypted outbox persistence are atomic; the queue message carries only IDs, and terminal job transitions audit and delete the encrypted payload. A bounded key ring supports rotation by key ID. Separate queue-consumer and browser-runner readiness gates now protect intake; the staging profile has no Queue producer or consumer binding, Cron Trigger, encryption secret, approved runner, or enabled gates. The route must remain disabled until those and the independently enforced egress/runtime gates pass. A queue consumer must use the existing atomic claim/navigation-authorization helper before any browser navigation. See `SCAN_INTAKE_OPERATIONS.md` for the route and key lifecycle contract.
- Enforce browser egress outside Playwright request routing. The enforcement layer must resolve and validate every destination and connect only to the checked address, reject non-public/reserved/metadata destinations, and block direct browser egress, DNS, UDP/QUIC, unexpected ports, and cross-tenant/control-plane paths.
- The local capture CLI refuses external targets until that reviewed egress policy is available. Its same-origin route is a defense-in-depth control for synthetic localhost scenarios only; it is not an approved hosted scanning boundary.
- Test rebinding, redirect, popup, subresource, IPv4/IPv6, mapped-address, alternate numeric-address, metadata, and credential-leak cases in the chosen runtime. Do not enable a public scan route before these tests and independent security review pass.

## Phase 4 — Artifact safety and operations

**Status: retention schema safeguards and disabled local cleanup paths are implemented; staging integration, policy values, and active schedules remain open.**

- Connect a private R2 bucket only after operations/cost review; the D1 retention schema is installed but no R2 binding, Cron Trigger, or active deletion schedule exists.
- Configure the Cron Trigger only after the R2/D1 integration passes. Run expiry, user deletion, retries, orphan discovery, partial failure, and D1/R2 disagreement tests in the approved staging environment.
- Prove the seven-day redacted-report limit and deletion bound. Never store screenshots, full DOM, cookies, raw observations, passwords, or bearer tokens.
- Bounded local cleanup now covers expired/revoked domain metadata and expired terminal scan jobs, including jobs that never had an artifact. Scan-job deletion preserves at least 24 hours of quota history, with matching query and D1 trigger checks. Artifact cleanup records scan-job deletion evidence before removing an expired job. Migration `0008` adds immutable encrypted outbox payload metadata, a maximum 24-hour ciphertext TTL, and terminal-state deletion audit. The opt-in bounded recovery/outbox dispatch handlers require operator-approved queue-age, runtime-grace, and audit-retention inputs; these values remain unset and all flags remain false. Domain/audit retention windows are also unset until an operator and privacy/legal reviewer approve them. Local SQLite tests do not establish D1 transaction, encryption-key operations, or deletion timing.
- Establish alerting, audit access, incident response, backup/restore, support ownership, deletion requests, and rollback procedures.

The local evidence package verifier now rejects unlisted files, symlinks, malformed artifact metadata, and oversized files; synthetic raw inputs are parsed and capped before the output directory is created. This protects the local evidence bundle boundary only. It does not provide artifact authenticity, customer deletion operations, backups, or production incident response.

## Phase 5 — Real-world accuracy and owner pilot

**Status: blocked on authorized sites, human reviewers, and consenting participants.**

- Collect at least 100 human-labelled real defects from at least three authorized site applications; include human no-defect comparisons and multi-review labels for every scored row. Use the versioned JSON Schema and report precision/recall by source layer and predicate, UNKNOWN rate, and high-severity precision. Multi-layer aggregates overlap. The scorer cannot verify reviewer independence or authorization truth. Its synthetic smoke is prepared; no real human-labelled data has been collected.
- Meet the proposed ≥90% high-severity deterministic precision target before exposing alerts; this target is not yet measured or an accepted external guarantee.
- After browser and hosted-safety gates pass, run 5–10 free guided sessions with consenting site owners under the existing protocol. Capture only the approved aggregate ledger; no customer credentials or real account data.
- Compare setup/support time and findings against equivalent baselines. Do not claim savings, ROI, demand, or accuracy from synthetic cases.

## Phase 6 — Commercial product and release review

**Status: deferred until validation.**

- Only after the owner pilot, decide pricing and implement billing, subscription lifecycle, customer onboarding, account recovery, support, and public product claims.
- Complete privacy, terms, data processing, jurisdiction, retention/deletion, and incident-process review for the actual product and data flows.
- Review Cloudflare account plan, Browser service availability, expected spend, quotas, and abuse controls. Configure production resources separately from staging.
- Re-run CI, staging acceptance, security review, and production configuration inspection. Rehearse rollback against the final production candidate after its version/resources are reviewed. Obtain explicit production deployment approval before any production change.

## Current completed local work

- Fresh native/Rust/WASM baselines are recorded in `LOCAL_VERIFIED_BASELINE.md`. The local scan intake/outbox candidate, staging preflight, egress address-screening hardening, and evidence-package boundary checks pass the current JavaScript suite (122 passed, 0 failed; one symlink test skipped because this Windows account cannot create symlinks), four compiled-WASM Worker tests, migration/configuration smokes, and the main Worker dry-run at 522.33 KiB / 174.05 KiB gzip. Esbuild bundled the current egress Worker source graph and `node --check` passed, but Wrangler's fresh Container dry-run exited before emitting a current bundle because Docker is unavailable. Staging intake, queue dispatch, execution, recovery, and retention remain disabled, with no Queue/R2/Cron binding. No new candidate was deployed; the last recorded staging version remains un-rechecked after the earlier expired Wrangler authentication issue. The new live staging recheck failed before HTTP because DNS returned `ENOTFOUND`; the last verified staging smoke is historical and covers health, static asset CSP, and unauthenticated API rejection only.
- A coverage-guided JSON API fuzz target and Linux CI smoke are configured; local fuzz execution failed before starting in the available Windows sanitizer runtime, and hosted CI has not supplied fuzz evidence.
- The six-case Playwright browser acceptance job is configured in CI with no customer-site navigation or deployment. Its hosted result remains pending.
- CI now audits both Rust lockfiles against RustSec. The local pinned `cargo-audit` installation failed during native dependency compilation and the hosted audit workflow has not run, so there is no current RustSec result.
- GitHub Actions supply-chain and job-budget policies are validated locally; hosted CI remains pending. This checkout has no Git remote configured, so the hosted workflows cannot be dispatched from this tree. Routine action-pin refreshes must be reviewed against upstream release records.
- Pinned `tldts` PSL adapter is wired into the Worker domain challenge handler and tested against ICANN, private, multi-label, IDN, and registrable-host examples.
- The scheduled retention handler is feature-gated. Staging keeps both hosted-control flags false and has no R2 binding or Cron Trigger.
- The last successful npm production-dependency audit reported zero vulnerabilities after the Wrangler `sharp` override; this turn's refresh could not resolve `registry.npmjs.org`, so a current advisory result is unavailable. The RustSec lockfile audit is configured but unverified. A staging rollback rehearsal from v3 to v2 and back to v3 passed; repeat it against the reviewed release candidate before any production deployment.
- CI now installs the locked dependencies before running Node tests, audits production dependencies, and Dependabot checks both the pinned PSL package and GitHub Actions references weekly.

## External gates that cannot be completed from this checkout

- A successful run of the configured six-case GitHub Actions browser job or another organization-approved environment for the local scenarios; the local runner is blocked and the hosted job is not yet verified.
- A completed, reviewed run of the configured 120-second Linux coverage-guided fuzz workflow; the current Windows host has not completed a fuzz run.
- A passing hosted RustSec audit of the application and fuzz-target lockfiles.
- Operator-approved capacity and cost budgets; an approved Queue/R2/Cron plan; live DNS proof and D1 transaction/quota tests. Staging migrations `0001`–`0003` are already applied, but no tenant or scan data was provisioned.
- Operator/privacy-approved domain and deletion-audit retention windows and queue-age/runtime-grace recovery thresholds; after a reviewed staging migration plan, apply migrations `0004`–`0008`, exercise cleanup, recovery, outbox dispatch, and revocation cancellation against Cloudflare D1, and configure/verify scheduled execution. The local SQLite/fake-binding coverage is not a D1 integration result.
- Security-reviewed browser runtime plus independently tested network egress enforcement. Containers are the preferred prototype candidate, not an approved runtime; checked-address HTTPS remains unproven. Browser Run's hostname guardrails alone do not meet that gate. See [`BROWSER_RUNTIME_REVIEW.md`](BROWSER_RUNTIME_REVIEW.md).
- Authorized real-site data, human labelers, site-scope authorization, participant consent, and pilot operators.
- Legal, privacy, commercial, support, and explicit production-release review.
