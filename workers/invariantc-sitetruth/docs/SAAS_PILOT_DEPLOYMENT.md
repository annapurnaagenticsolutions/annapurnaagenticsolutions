# SiteTruth QA API pilot deployment runbook

**Latest verified state (2026-10-08):** Cloudflare API deployment history confirms the feature-disabled staging Worker `invariantc-sitetruth-api-staging` remains on version `92c6912c-b071-443f-ad27-0fb3df1dd1a7` at 100%. APAC D1 `invariantc-sitetruth-staging` records migrations `0001`–`0008`; read-only aggregate checks found zero tenant/challenge/origin/policy/job/artifact/outbox rows, and a D1 API batch rollback smoke passed. `PRAGMA integrity_check` was unavailable because the D1 API authorizer returned `SQLITE_AUTH`. The latest credential-free HTTP smoke failed before HTTP because local DNS returned `ENOTFOUND`; current `/health` and asset responses are not freshly verified. GitHub PR #6 run #19 passed SiteTruth validation/security and fuzz, including CI-local Workerd/D1 acceptance, a 25,000-request synthetic soak, six localhost browser scenarios, and RustSec/npm audits. Its pinned TLS egress probe remained inconclusive. Scan flags remain false; no tenant/key or positive quota policy was provisioned, and no code was deployed. Production deployment still requires a separate explicit operational review under `CODEX_M2_M4_HANDOFF.md`.

## Product boundary

The last deployed Worker is an API-only evaluator. `/v1/check` accepts a bounded JSON contract and observations, evaluates them in memory, and returns an allow-listed report without raw observations. The local source also contains a gated tenant scan-intake/status route that can retain contract/capture payloads only as AES-GCM ciphertext for up to 24 hours; those gates remain false, and staging has no Queue binding/consumer, Cron Trigger, or browser runner. No deployed endpoint browses URLs, launches Playwright, signs up customers, or charges them. The last verified staging state had no active tenants or API keys; `/v1/check` rejected unauthenticated requests. The bundled site is a synthetic preview. Do not call this a public or paid SaaS until human accuracy evaluation, the guided user pilot, security review, and deployment approval are complete.

Tenant control data is limited to opaque tenant IDs, quota policy, API-key IDs and SHA-256 hashes, key status, and expiry. Customer payloads and reports are not stored. Quotas are deliberately not defaulted: a tenant with any unset quota fails closed with HTTP 503.

## Staging prerequisites

1. Use an operator-approved Cloudflare account and staging environment. **Completed:** the Worker is deployed to its `workers.dev` staging endpoint, which is publicly reachable over HTTPS.
2. Create a staging D1 database named `invariantc-sitetruth-staging` and set its ID in `worker/wrangler.toml`. **Completed:** the dedicated APAC database ID is configured; do not reuse a production database.
3. Wrangler 4.148.0 is installed as a project dev dependency and locked in `package-lock.json`. The install audit initially found a high-severity transitive `sharp` issue; the project pins patched `sharp` 0.35.5 and the subsequent install audit reported zero vulnerabilities.
4. Confirm the configured Wrangler version and account plan/cost with the operator. **Staging-only deployment was approved by the operator on 2026-10-08; account-plan/cost review remains unrecorded.** No tenant quota workload is enabled. Production is not authorized by that approval.
5. Build and verify the Rust/WASM artifact with the handoff commands. `worker/pkg/` is generated and ignored; it must exist for Wrangler bundling.

## Local-only checks

From the package root:

```powershell
npm run build:wasm
npm run test:js
npm run test:wasm-worker
npm run verify:tenant-schema
npm run verify:domain-verification-schema
npm run verify:scan-retention-schema
npm run verify:worker-config
npm run worker:dry-run
npm run worker:migrate-local
cargo +nightly fuzz build json_api
cargo +nightly fuzz run json_api -- -max_total_time=120 -max_len=1048576
```

Coverage-guided fuzzing needs the free `cargo-fuzz` tool and a compatible sanitizer toolchain. `fuzz/json_api` compiles the production Rust modules with seed inputs. On this host the Windows ASAN-instrumented target built but exited with `STATUS_DLL_INIT_FAILED` before fuzzing; GitHub run #19 completed the bounded 120-second Ubuntu workflow. This is finite fuzzing and must not be described as exhaustive assurance.

The latest local `worker:dry-run` passed at 522.33 KiB / 174.05 KiB gzip and includes the disabled scan intake/status route and encrypted outbox with key-ID rotation, bounded contract/capture processing, plus D1, Durable Object, assets, pinned PSL, bounded retention/recovery/dispatch handlers, quota-history floor, and request-body deadlines. No Queue/R2/Cron binding or encryption secret is configured, and the authorization helper still has no queue consumer or runner. Wrangler emitted a non-fatal profile log-write `EPERM` warning and exited successfully. No staging deploy was attempted; Cloudflare deployment history confirms version `92c6912c-b071-443f-ad27-0fb3df1dd1a7` remains at 100%. The current credential-free HTTP smoke failed before HTTP on local DNS `ENOTFOUND`. APAC D1 migrations `0001`–`0008` are recorded, but no authenticated remote evaluation or application-level quota/scan behavior was exercised. GitHub run #19 passed the isolated local D1/Workerd acceptance and 25,000-request soak, six synthetic local browser scenarios, dependency audits, and fuzz workflow. The local loopback Workerd/browser attempts remain blocked by `EACCES`; the intake and encryption-key lifecycle are described in `SCAN_INTAKE_OPERATIONS.md`.

The DNS TXT challenge implementation is covered by `npm run test:js` and `npm run verify:domain-verification-schema`. The Worker injects the pinned `tldts` Public Suffix List classifier with private suffixes included. Its code is present in the staging bundle, but `DOMAIN_VERIFICATION_ENABLED` remains `false` in `worker/wrangler.toml`; no live DNS proof or route transaction has been exercised against Cloudflare D1. A pre-navigation ownership recheck and independently enforced browser egress are still required before any hosted scan. Cloudflare Containers is the preferred prototype candidate because internet can be disabled and HTTP/S routed through a trusted Worker handler, but checked-address TLS has not been demonstrated. See `BROWSER_RUNTIME_REVIEW.md`.

`0003_scan_retention.sql` and the feature-gated scheduler define scan quotas and artifact retention. Migrations `0004`–`0008` add audited cleanup/recovery, origin-revocation cancellation, and an encrypted dispatch outbox; all eight migrations are now recorded in staging, but their application-level D1 flows remain untested. The tenant-scoped intake/status route is implemented locally but remains disabled; it validates and persists only encrypted short-lived payloads and queues identifiers. No queue consumer or runner calls the execution-authorization core, so no browser scan runs. Recovery and retention windows remain unset. No Queue, R2, or Cron binding is configured. These are not active customer-data retention, recovery, or scan services.

For a repeatable local HTTP smoke, use only an organization-approved environment that permits loopback navigation: apply the migration, seed an operator-approved synthetic tenant/key with positive limits using the local D1 binding, start `npm run worker:dev`, then set `WORKER_LOCAL_TEST_TOKEN` and run `npm run worker:smoke-local` in another terminal. The smoke script rejects non-loopback URLs. Optional `WORKER_LOCAL_SECOND_TENANT_TOKEN`, `WORKER_LOCAL_REVOKED_TOKEN`, and `WORKER_LOCAL_EXPIRED_TOKEN` exercise cross-tenant isolation and inactive keys. Do not bypass the current `EACCES` restriction, and do not use a production key in local tests.

For a synthetic local load run, use a disposable local tenant whose limits exceed the requested workload, set `WORKER_LOCAL_TEST_TOKEN`, then run `npm run worker:load-local`. Defaults are 128 requests at concurrency 8; override with `WORKER_LOCAL_LOAD_REQUESTS` and `WORKER_LOCAL_LOAD_CONCURRENCY`. The tool accepts only credential-free loopback HTTP URLs and does not contact the staging endpoint. Delete the local synthetic tenant/key afterward. The recorded 4,096-request run at concurrency 16 completed over 37.456 seconds without failures at 109.35 requests/second and p95 188.501 ms; this is not a Cloudflare edge or production capacity measurement.

## Completed reviewed staging setup

The operator provisioned the staging D1 and approved this staging deployment. The D1 ID is set in `worker/wrangler.toml`. The command below records how the database was created; do not run it again because the resource already exists:

```powershell
Set-Location worker
npx wrangler d1 create invariantc-sitetruth-staging
```

The local migration was reviewed and applied first. The remote migration was then applied to the staging database:

```powershell
npx wrangler d1 migrations apply DB --local
npx wrangler d1 migrations apply DB --remote
```

The migration and staging deployment completed. Wrangler created the `TenantQuota` SQLite Durable Object namespace from the exported class declaration. This did not deploy production or provision tenant credentials.

## Controlled tenant provisioning

Create no tenant row until an operator approves a capacity/cost budget and sets positive `requests_per_minute`, `requests_per_day`, and `max_concurrent` values. There are no package defaults or auto-signup endpoint.

Generate a one-time pilot key without printing its token or writing it into the repository:

```powershell
node scripts/issue_pilot_key.mjs --tenant-id <opaque-tenant-id> --secret-file <absolute-path-outside-repository>
```

The secret is written once to the specified external file; stdout contains only the key ID, hash, expiry and SQL insert statement. Store that file in the operator's approved secret store and remove the temporary file after secure import. Apply the tenant and returned key SQL to the reviewed D1 database. Revoke a key by setting `status='revoked'` and `revoked_at_ms`; remove expired/revoked key metadata under the approved retention schedule. Tenant deletion cascades to its key rows.

## Staging release and acceptance

The following staging setup completed after code review and staging-only approval. The latest credential-free public HTTP smoke is blocked before any request by local DNS `ENOTFOUND`. GitHub run #19 separately passed the local-emulator Workerd/D1 acceptance; no remote authenticated tenant, quota, or scan behavior has been exercised.

1. `npx wrangler deploy --dry-run --config worker/wrangler.toml` and inspect the bundle/bindings.
2. The Worker deployed to `https://invariantc-sitetruth-api-staging.annapurnaagenticsolutions-4f9.workers.dev`, current version `92c6912c-b071-443f-ad27-0fb3df1dd1a7` (previous version `5dde8057-667e-4bff-9204-323f88724bc7`).
3. The earlier live smoke returned `/health` ready, unauthenticated `/v1/check` 401, and `/` 200 with CSP; the latest credential-free smoke did not reach HTTP because DNS returned `ENOTFOUND`. Authenticated PASS/FAIL/UNKNOWN and 429 quota tests remain unrun because there is no provisioned staging tenant/key or operator-approved quota/cost budget.
4. Remote APAC D1 records migrations `0001`–`0008`; current aggregate queries found zero tenant, key, challenge, origin, scan-policy, job, artifact, and outbox rows. In the deployed profile, scan intake remains disabled and `/v1/check` does not persist payloads/reports. A D1 API batch rollback smoke passed, but no authenticated application D1 flow or payload was sent to staging.
5. The staging rollback rehearsal passed. Wrangler rolled v3 `92c6912c-b071-443f-ad27-0fb3df1dd1a7` back to v2 `5dde8057-667e-4bff-9204-323f88724bc7` (deployment `c0bec22c-8413-4db2-bdf6-fb0e04c61982`), then restored v3 (deployment `03f5a943-827c-477a-994a-b04bf993819d`). Both versions share the same D1 and `TenantQuota` bindings and both hosted flags are false. Health 200 and unauthenticated `/v1/check` 401 passed on both; all eight tenant/scan tables remained empty. V3 is active again. Rehearse rollback again against the reviewed production candidate; this staging rehearsal does not measure production behavior. The local Node resource profile is documented in `LOCAL_VERIFIED_BASELINE.md`; it does not measure remote Workerd capacity. Do not claim field accuracy or commercial availability from these checks.

## Explicitly excluded from this API pilot

- Enabling DNS challenge routes in staging or production, hosted browser collection, URL scanning, Browser Rendering/Run bindings, and customer credentials.
- Subscriptions, checkout, CRM, self-serve account creation, and AI review.
- Production route/custom-domain binding or production deployment.
- The 100-real-defect validation and 5–10 owner guided pilot. These need separately authorized sites, human review, consenting participants, and a reviewed operating process.
