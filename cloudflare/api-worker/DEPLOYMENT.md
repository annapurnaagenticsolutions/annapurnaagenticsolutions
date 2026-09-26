# Skill X API Worker deployment record

The API service is `smaraze-api`, bound to D1 database `avyaan` and the custom hostname `api.smaraze.com`.

Use `worker-release.js` with `wrangler.release.jsonc` for the current release path. It is the checked-in release entrypoint containing the Workers-compatible PBKDF2 parameters, class-band entitlements, Razorpay order/signature endpoints, and operational liveness/readiness checks. Older Worker snapshots are retained as audit artifacts.

The static `smaraze` Worker proxies `/api/*` to `https://api.smaraze.com` through its `API_ORIGIN` binding.

## Operational checks

- `GET /api/live` is process liveness and does not require D1.
- `GET /api/ready` checks D1 and returns non-2xx when the database is unavailable.
- `GET /api/health` remains a compatibility health endpoint.
- Responses include `X-Request-ID` for support correlation.
- Worker logs emit only the non-PII `api.request.v1` event described by `cloudflare/contracts/operational-event.v1.schema.json`.

Before deployment, run the repository D1 preparation contracts from the project root:

    python tools/test_worker_d1_schema_contract.py
    python tools/build_d1_seed.py --check
    python tools/build_d1_seed.py --output deploy/d1/content_registry_seed.sql

Apply schema.sql and the generated seed to the target D1 database before routing authenticated traffic. The seed includes protected lesson bodies and is never part of the static public artifact.
Deployments must still be verified in the target Cloudflare account. Local syntax and contract tests do not prove hosted Worker version, route, secret, D1 data, payment, or email state.
