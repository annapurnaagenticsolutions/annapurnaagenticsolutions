# Remaining Risks — InvariantC M2–M4 / SiteTruth QA

**Updated:** 2026-10-08

## P2 — Hosted CI passed; repository controls and action freshness still need review

GitHub run #19 completed SiteTruth validation/security CI and the 120-second fuzz workflow successfully. Remote GitHub Actions references in the SiteTruth workflows use full commit SHAs, checkout credential persistence is disabled, and local pin/budget checks pass. These results do not verify repository branch-protection settings, review policy, or future upstream action freshness; recheck pins and advisory data at release time.

## P1 — Authenticated staging evaluation and quotas are not enabled

The staging API-only Worker remains at version `92c6912c-b071-443f-ad27-0fb3df1dd1a7` at [workers.dev](https://invariantc-sitetruth-api-staging.annapurnaagenticsolutions-4f9.workers.dev). APAC D1 migrations `0001`–`0008` are recorded; D1 API batch rollback passed, and read-only checks found zero tenant, challenge, origin, policy, job, artifact, and outbox rows. The latest credential-free `npm run worker:staging-smoke` failed before HTTP because local DNS returned `ENOTFOUND`; current health and assets are not freshly verified. Authenticated staging evaluation and application-level quota/revocation tests remain open. Hosted run #19 passed CI and fuzz, but pinned TLS remained inconclusive. Do not create a real tenant/key until an operator approves a capacity and cost budget.

## P1 — Customer-site browser safety remains blocked

The local localhost browser suite returned `connect EACCES 127.0.0.1:4173`; do not bypass the organization restriction. GitHub run #19 passed the six expected synthetic results (`apples-bad`, `apples-good`, `apples-click`, `apples-unknown`, `cart-bad`, `cart-good`) on an Ubuntu runner with no deployment. That validates fixed local fixtures only. The collector's sandbox/root-launch/request-filtering controls and synthetic browser tests do not verify a hosted browser's egress, redirect handling, customer-site permissions, or data safety.

## P2 — Rust dependency audit must be refreshed for release

GitHub run #19 passed RustSec checks for both Rust lockfiles. The local pinned auditor installation remains unavailable because native dependency compilation failed; rerun the hosted audit against a current advisory database during release review.

## P1 — Hosted browser collection safeguards are incomplete

The hosted collector remains disabled. DNS TXT verification and migrations `0002`/`0003` are installed in APAC staging behind `DOMAIN_VERIFICATION_ENABLED = "false"`; migrations `0001`–`0008` are recorded and staging tenant/challenge/origin/policy/job/artifact/outbox rows remain zero. Cleanup/recovery/authorization/intake/outbox code exists, but the route is disabled and no Queue binding, queue consumer, browser runner, or independently enforced network proxy exists. D1 API batch rollback passed; application-level D1 behavior and deletion timing remain unverified. Bounded cleanup preserves the 24-hour issuance/quota history and audits deletion; queue-age/runtime-grace and domain/audit retention windows require operator/privacy approval; all related flags remain false. Cloudflare Containers remains a prototype candidate. Hosted run #19 passed fixed denial probes but the pinned TLS handshake remained inconclusive and proves no general address-pinned scanning. See [`BROWSER_RUNTIME_REVIEW.md`](BROWSER_RUNTIME_REVIEW.md). Do not enable URL scanning.

An isolated default-deny Container prototype covers fixed `.invalid` HTTP/S denial/redirect cases and a fixed `example.com` TLS-handshake-only path. Hosted run #19 passed all three fixed denial cases, but the TLS probe failed closed with `pinned_tls_connection_failed`; no positive handshake or general browser egress was shown. A follow-up change preserves sanitized synchronous TLS error codes for diagnosis and needs a hosted rerun. The `durable_object` scheduling policy is public beta, and deployed processes retain root Linux capabilities regardless of the UID requested for `exec`. See [`EGRESS_DENY_PROTOTYPE.md`](EGRESS_DENY_PROTOTYPE.md). This work does not change the scanning-disabled state.

## P1 — Real-defect validation and user pilot remain open

The aggregate-only evaluator and pilot protocol are prepared and their synthetic structural/arithmetic smokes pass. No human-labelled real defects from authorized sites were collected. The requirement of at least 100 human-labelled real defects across at least three sites remains unmeasured. No actual-user pilot was conducted; 5–10 consenting site-owner sessions, browser safety, real-defect validation, consent, and site authorization are still open. Subscriptions, CRM, and an AI judge remain out of scope until after the pilot.

## P2 — Workerd resource sizing is incomplete

The current dry-run bundle, Node measurements, historical 4,096-request local Workerd/HTTP run, and GitHub run #19's 25,000-request synthetic Workerd/D1 soak are recorded in `LOCAL_VERIFIED_BASELINE.md`. The CI soak passed after migrations `0001`–`0008`, but it is a local emulator result and does not establish Cloudflare edge CPU, isolate memory, remote quota behavior, or production capacity. Seeded adversarial tests and the bounded 120-second Linux libFuzzer run passed; the Windows ASAN runtime still exits with `STATUS_DLL_INIT_FAILED`. Approve real quotas and cost ceilings only from reviewed deployed-runtime evidence.

## P2 — Product and commercial evidence

The bundled site is a research preview with a synthetic demonstration. There is no self-serve registration, hosted scan, billing, pricing, customer proof, or support operation. The public `workers.dev` URL is a staging endpoint, not a customer-facing service. Do not describe the product as commercially available or production-ready, and do not claim customer accuracy, time savings, ROI, or validated demand.

## P2 — Toolchain audit status

GitHub run #19's production Node dependency audit and RustSec lockfile audits passed. The local `npm audit --omit=dev --audit-level=high` refresh failed before receiving advisories because `registry.npmjs.org` did not resolve, so refresh both advisory sources before release. A Windows PDB filename collision found in earlier Rust builds was fixed by giving the internal library target a distinct name; fresh tests and release builds no longer emit that warning.

## Release boundary

This work used synthetic fixtures and test-only credentials. It created the approved staging D1/Worker and did not deploy production, use customer data, establish real-site authorization, or demonstrate production readiness. Report hashes identify normalized input bytes; they are not signatures or proof of truth.
