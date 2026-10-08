# Hosted browser collector security gate

**Status:** hosted browser collection remains design-only. Tenant-scoped scan intake/status and encrypted outbox code now exist locally, but intake/dispatch remain disabled and no Queue producer/consumer, Cron Trigger, runner, or network-isolated browser runtime is configured. The DNS TXT challenge component and migrations `0002`/`0003` are recorded as installed in the approved staging D1 behind `DOMAIN_VERIFICATION_ENABLED = "false"`; migrations `0004`–`0008` add local deletion/recovery safeguards, origin-revocation cancellation, and encrypted outbox persistence and are not applied remotely. Mocked resolver, pinned `tldts` Public Suffix List, SQLite schema checks, and fake-binding tests cover local behavior, but no real DNS proof or Cloudflare D1 Worker transaction has been exercised. Last recorded read-only staging counts found zero tenants, domain challenges, verified origins, scan policies, jobs, and artifacts. The last verified API-only staging Worker had no tenant/key rows; current health/version remain unverified. Staging has no R2 binding or Cron Trigger; all hosted, recovery, and retention flags remain false, and all thresholds/durations are unset. There is no Container or Browser Run binding, customer identity service, or active deletion schedule. URL scanning remains disabled, and this document does not authorize customer scans.

## Boundary and launch rule

The current Worker only evaluates submitted JSON; it does not fetch URLs. The Playwright collector is a local CLI. Its `--attest-ownership` option is a local operator acknowledgment, not independent domain verification. Keep hosted browser collection disabled until every gate below has an implementation and an environment-level security test.

Public demonstrations must target only an operator-maintained allowlist of synthetic sites. A customer scan must be an explicit, authenticated request scoped to one tenant, one freshly verified HTTPS origin, and an approved capture specification. Domain verification establishes technical control of a hostname; it does not establish legal ownership, authority over every application route, or permission to use a customer's account. The initial hosted pilot must not accept session cookies, passwords, bearer tokens, or other customer credentials.

## Required request flow

1. Authenticate the caller and resolve the tenant from the authenticated identity. Never accept a tenant ID as authorization by itself.
2. Canonicalize the requested origin to lowercase IDNA ASCII, `https`, port 443, and an exact hostname. Reject IP literals, userinfo, fragments, wildcards, nonstandard ports, and non-HTTPS schemes. Do not expand a verified root domain to its subdomains; verify each hostname separately.
3. Require an active ownership proof no older than 24 hours and perform a fresh challenge check before a queued scan starts. Revoke access and cancel queued work when verification expires or is revoked. The application must query and validate DNS; the SQL reference schema only checks that a one-time challenge was consumed.
4. Validate that the capture specification is within tenant limits. Atomically reserve the tenant's request rate, daily scan allowance, and concurrency slot before enqueueing. Duplicate idempotency keys must not spend quota twice.
5. Launch a disposable browser session with a per-session hostname allowlist. Apply an independent egress control at the network/proxy boundary; Playwright request routing alone is not the egress boundary. Deny private, loopback, link-local, multicast, reserved, and cloud-metadata addresses after DNS resolution, and enforce the address decision at connection time to prevent rebinding races.
6. Permit only HTTPS to the verified origin and explicitly declared asset/API hostnames. Reject unexpected redirects and popups. Disable downloads, service workers, WebSockets, UDP/QUIC, persistent browser profiles, local filesystem mounts, and ambient credentials unless a future reviewed requirement explicitly enables a capability.
7. Persist only the bounded redacted JSON report and its digest. Do not store screenshots, full DOM, cookies, raw observations, request bodies, or unredacted capture artifacts. Keep job payloads ephemeral or encrypted with a short expiry and never place them in logs or analytics.
8. Delete expired R2 objects before deleting their D1 pointers. Make deletion idempotent and retryable; retain only the minimum deletion audit metadata. A storage lifecycle rule is a backstop, not proof of exact deletion timing.

## Domain-control proof protocol

For a future hosted service, use a one-time DNS TXT challenge at `_invariantc-verification.<hostname>`:

- Generate at least 32 random bytes with a cryptographic RNG. Bind the challenge to the authenticated tenant, exact ASCII hostname, and a unique challenge ID. Expire it after 15 minutes.
- Show the user a TXT value such as `invariantc-v1=<challenge-id>.<random-token>`. Store only SHA-256 of the token, never the plaintext token. Do not put challenge values in logs, analytics, or URLs.
- Verify an exact TXT value by querying DNS from the service-side verifier. Consume the challenge once, in the same database transaction that records the verified exact origin. Limit challenge creation and verification attempts per tenant and hostname.
- Give the verification a maximum 24-hour validity. Recheck DNS immediately before a queued scan begins; if the record is absent or different, fail closed and require a new challenge. A successful DNS proof is not a substitute for explicit scan scope and user authorization.
- Require each subdomain to be verified independently. Do not accept wildcard certificates, wildcard DNS records, IP literals, public suffixes, HTTP, or private/internal names as hosted targets.

The disabled endpoint implementation is in `worker/src/domain-verification.mjs`, with persistence constraints in `worker/migrations/0002_domain_verification.sql`. It stores only a challenge-token hash and consumes proof with the exact-origin record in a D1 batch. A pinned `tldts` classifier covers ICANN, private, multi-label, and IDN cases. Migrations `0001`–`0003` are recorded in staging, but this does not establish D1 transaction behavior or live DNS resolution. Migrations `0004`–`0008` and bounded cleanup/recovery/outbox code exist locally. Migration `0007` cancels queued and running jobs when origin proof is revoked. The local scan-intake route validates and enqueues encrypted short-lived jobs, but it does not execute scans or call `worker/src/scan-job-authorization.mjs`. A future reviewed queue consumer must claim jobs atomically and recheck tenant/origin authority immediately before navigation. Tests use local SQLite/fake bindings; D1/runtime enforcement remains open. Retention/recovery flags are false and all thresholds/windows are unset. Independent egress controls and runtime proof are still absent. `worker/src/artifact-retention.mjs` implements a bounded, retryable R2-first deletion core with fake D1/R2 tests, while scheduled behavior awaits reviewed policy and D1/R2/Cron integration. The separate D1 reference schema is not wired to these routes.

## Egress isolation

The current collector's `page.route()` same-origin check is useful defense in depth. It does not bind Chromium's DNS answer to the address that the service validated and cannot by itself stop DNS rebinding or access to private networks. A hosted runner needs a forced egress proxy or equivalent network policy that:

- Resolves every requested hostname through a controlled resolver, checks every A/AAAA/CNAME result, rejects non-public or reserved destinations, and connects only to a checked address.
- Blocks direct DNS, direct browser egress, internal routes, metadata endpoints, and every port except the explicitly permitted HTTPS port. Rechecks each redirect and each subresource.
- Has no route to control-plane services, D1, R2, internal APIs, or other tenants. The browser receives no Cloudflare bindings or service credentials.
- Is tested with private IPv4/IPv6, IPv4-mapped IPv6, alternate numeric IP encodings, DNS rebinding, redirect chains, popups, WebSockets, and attempts to fetch metadata endpoints.

Cloudflare Containers is the preferred prototype candidate because `enableInternet = false` plus a default-deny outbound handler can force HTTP/S through trusted Worker code and block non-web ports. The preferred prototype uses the Durable Object Container API with `interceptAllOutboundHttp()` and `interceptOutboundHttps("*")`; the `Container` class alternative needs `ContainerProxy`, HTTPS interception, and the ephemeral CA installed in the container's runtime trust store at startup (not baked into the image). This remains unapproved until the handler demonstrates checked-address TLS connections with correct SNI and certificate validation for every destination. A DNS check followed by ordinary Worker `fetch()` does not demonstrate address pinning: Workers cannot fetch an IP URL and `resolveOverride` is restricted to hosts in the Worker's zone. See `BROWSER_RUNTIME_REVIEW.md`. Browser Run is an alternative only if address-level egress guarantees are independently demonstrated. The current local collector uses neither runtime.

## Quotas, concurrency, and abuse controls

Every tenant must have an operator-approved positive policy for requests per minute, scans per day, concurrent scans, pages per scan, actions per page, request-body bytes, and wall-clock runtime. Limits must be checked server-side before a browser starts, not supplied or raised by the client. Reserve quota atomically, release concurrency leases on every terminal state, and expire orphaned leases. Enforce idempotency and queue backpressure; return `429` with a retry hint when a limit is exceeded.

For the evaluation API, source code uses a per-tenant Durable Object as the authoritative coordinator for request-per-minute/day windows and short-lived concurrent-evaluation leases. The Worker caps request-body reads at 90 seconds, below the 120-second concurrency lease, and the local Node regression checks timeout, stream cancellation, and lease release. A previous local Workerd smoke exercised D1 key authentication, tenant isolation, request/concurrency rejection, revocation and expiry; the shared SQLite quota core tests stale-lease cleanup. The current local Workerd HTTP smoke is blocked before any request by loopback `EACCES`, so the earlier end-to-end result is historical. Linux CI has a pending run that applies the current migration chain through `0008`, exercises current Workerd/D1 auth and quota behavior with synthetic-only keys, and performs a 25,000-request loopback load. A passing result remains local-runtime evidence only. This API coordinator is not a hosted scan queue or billing ledger. Migration `0003` defines scan-specific quotas, idempotency, state transitions, and queue-time origin checks; migration `0008` adds encrypted outbox payloads. The disabled intake API applies these controls locally, but they are not active in staging and no queue consumer or browser runner exists. Do not funnel all tenants through one global Durable Object. A Workers Rate Limiting binding can be an additional burst-control layer, but Cloudflare documents its counters as location-local and eventually consistent; it must not be the billing or exact daily quota ledger. Persist job and policy metadata in D1 using atomic batches, and keep the numerical limits unset until an approved capacity/cost budget exists.

## Retention and deletion

- Default redacted report retention to seven days, matching the commercial validation gate; do not retain raw observations, screenshots, cookies, or DOM snapshots.
- Require each artifact to have an expiry and a tenant-scoped random object key. Keep R2 private, authorize every read by tenant, and never expose a stable public bucket URL.
- At expiry, enumerate the corresponding R2 object keys, delete objects idempotently, then remove D1 artifact and job records in one transactional batch. If an R2 delete fails, preserve the D1 pointer and retry. Run an R2 lifecycle expiration rule as a safety net.
- Cloudflare states that R2 lifecycle deletion is typically completed within 24 hours of the expiration time. Therefore a lifecycle rule alone cannot support a strict seven-day physical-deletion promise; the service needs an active deletion worker and a documented deletion bound verified in the chosen environment.
- Test user-requested deletion, normal expiry, repeated deletion, partial R2 failure, orphan discovery, D1/R2 disagreement, and deletion after the browser job has failed. Logs should record deletion status without retaining the report, target path, or raw values.

`db/hosted_retention_candidates.sql` is only a reference query/order. The staging D1 schema through migration `0003` is installed, but deletion/recovery/authorization/outbox cores have not been exercised against Cloudflare D1/R2 and no R2, Queue, or Cron binding is configured, so there is no active deletion or scan service. `npm run verify:scan-retention-schema` applies migrations `0001`–`0008` to in-memory SQLite, and `npm run test:js` covers local authorization, encrypted payload intake, outbox retry, and cleanup/recovery cores; these checks do not establish D1 atomicity, Durable Objects, DNS, browser-runtime egress, R2 lifecycle, secret rotation, or deletion timing. A production-like D1/Queue/R2 integration and scheduled retry path remain required.

Domain metadata/scan-job cleanup, stale-job recovery, outbox retry, and origin-revocation cancellation are present locally. The intake route does not execute jobs; the authorization helper still must be integrated with a separately reviewed queue consumer and browser runner. These mechanisms require operator/privacy-approved retention/recovery windows and Cloudflare D1/Queue integration evidence. Apply migrations `0004`–`0008` only after a reviewed staging migration plan; do not enable domain verification or URL scanning until the authorization path, egress, D1/Queue/R2 behavior, and scheduled cleanup/recovery are verified.

## Release gates before any hosted scan

- Tenant authentication and authorization tests cover cross-tenant reads, writes, and origin reuse.
- DNS challenges use production-grade randomness, expiry, single use, rate limiting, and a real resolver; ownership expiry/revocation is enforced immediately before navigation.
- Network tests prove that browser traffic cannot reach private/link-local/metadata destinations even through DNS rebinding, redirects, or subresources.
- Tenant quota and concurrency tests pass under parallel requests and retry/replay conditions; operational and monetary ceilings are approved.
- Browser sessions are disposable, credential-free, and isolated between tenants.
- Redaction, access control, active expiry, R2 lifecycle backstop, deletion retries, and incident/audit procedures are exercised end to end.
- Domain challenge and expired/revoked origin metadata have an approved retention and deletion schedule; cleanup preserves foreign-key integrity and required audit records.
- Pricing, availability, limits, and expected spend for the selected browser runtime are reviewed before enabling any paid service. Compare the Container prototype and Browser Run against the approved egress design.
- Independent security review and explicit operational approval are recorded. Until then, no hosted collector endpoint, public scanner, customer credentials, or live customer data.

## Platform references

- [Browser Run session guardrails](https://developers.cloudflare.com/browser-run/features/guardrails/)
- [Browser Run outbound Worker routing constraints](https://developers.cloudflare.com/browser-run/features/outbound-workers/)
- [Container outbound traffic and HTTPS interception](https://developers.cloudflare.com/containers/configuration/outbound-traffic/)
- [Container pricing](https://developers.cloudflare.com/containers/platform/pricing/)
- [Workers Rate Limiting binding and its consistency behavior](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
- [Durable Objects design rules](https://developers.cloudflare.com/durable-objects/best-practices/rules-of-durable-objects/)
- [D1 database batches and transaction behavior](https://developers.cloudflare.com/d1/worker-api/d1-database/)
- [R2 object lifecycle behavior](https://developers.cloudflare.com/r2/buckets/object-lifecycles/)
