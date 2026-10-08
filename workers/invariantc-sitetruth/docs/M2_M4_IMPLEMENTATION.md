# InvariantC / SiteTruth — M2–M4 implementation report

**Scope:** A usable offline-oriented integration package, not a deployed production SaaS.

## Completed in this package

### M2: Rust → WASM integration source
- Optional `wasm` Cargo feature with minimal `wasm-bindgen` exports.
- Common Rust JSON API: `compile_json(contract)` and `check_json(contract, observations)`.
- Worker request handler tests run under Node without WASM, secrets, or a cloud account.
- Cloudflare-aware `wasm-pack` glue patch (required by official Cloudflare documentation for direct `wasm-bindgen` use).
- 144-case native-vs-Node-WASM parity harness for local Codex execution.
- Authenticated, stateless evaluation HTTP API: `POST /v1/check`, `GET /health`.

### M3: SiteTruth browser collector
- Versioned capture specifications binding selectors/attributes to InvariantC JSON pointers.
- Supported extraction: `text`, `number_text`, `count_elements` with required parent, `attribute`, `attribute_json`, `json_text`, `exists`.
- Explicit user-directed `click` actions, with same-origin routing and navigation boundary.
- Missing and ambiguous selectors remain absent rather than becoming success; compiler should produce UNKNOWN for missing paths.
- No screenshots, raw DOM snapshots, auth cookies, or traffic archives by default.
- Only localhost targets work by default; local CLI use of an external site requires an exact allowed origin and an explicit operator acknowledgment. This is self-attestation only, not independent domain verification or a hosted SSRF control.
- Six synthetic pages and corresponding collection specs for known PASS / FAIL / UNKNOWN demonstrations (including a click-triggered defect).
- Static HTML test checks five scenarios independently of browser execution.

### M4: Evidence and scenario index
- Redacted local evidence package by default; explicit consent flags for **synthetic** raw fixture inclusion.
- Per-artifact SHA-256 verification and report-identity checking (fingerprints **are not signatures or source attestation**).
- SQLite/D1-oriented schema for scenarios, runs and findings with update-immutability, primary/foreign keys and duplicate protection.
- Python stdlib SQLite smoke test verifies insert, immutability, duplication and FK behavior.
- Static demonstration UI with six synthetic examples, including uncertainty.

## Execution status

| Gate | Status |
|---|---|
| Node collector/Worker/evidence unit tests | PASS locally |
| Python synthetic corpus labels | PASS locally |
| SQLite schema smoke | PASS locally |
| Seeded HTML static checks | PASS locally |
| Rust compile / Cargo test | UNVERIFIED: Rust/Cargo unavailable in this environment |
| Native/WASM parity for 144 cases | UNVERIFIED: requires Rust/Cargo, wasm-pack and node-target WASM |
| Browser collector against real Chromium | BLOCKED: environment-managed Chromium URLBlocklist policy rejects navigation |
| Wrangler bundling / Worker API live | UNVERIFIED: Wrangler/cloud deployment not available |
| Actual website accuracy | UNMEASURED: no human-labelled real-site dataset |

## Invariant: there is one evaluator

**Do not implement a parallel JS evaluator.** Browser collection is JavaScript/Playwright, but pass/fail/unknown logic remains in Rust. Unit tests for the Worker intentionally inject a fake evaluator to exercise HTTP boundaries; that is a test stub, not another product evaluator.

## Risk and readiness

- Do not expose the capture CLI as an open URL-fetching SaaS. It does not prove DNS ownership, block DNS rebinding or provide production SSRF containment. Run locally against owned/tested sites until those controls exist.
- The Worker evaluator accepts submitted JSON and does **not** access URLs. It must be deployed only after WASM parity, secret, rate limiting, origin controls, body limits and cost guards are validated.
- A single API bearer key is an internal pilot mechanism, **not multi-tenant customer authentication**.
- ScenarioDB is a SQLite evidence **index**, not a new DBMS. D1 deployment and retention deletion must be tested independently.
- Browser observations may be self-declared page state; they are not proof of visual truth. Four emoji rendered is not itself independently established from a JSON attribute.
- Treat the static UI as a synthetic educational preview, not a working hosted scanner.

## Official platform references

- Rust on Cloudflare Workers: https://developers.cloudflare.com/workers/languages/rust/
- WASM in JS Workers: https://developers.cloudflare.com/workers/runtime-apis/webassembly/javascript/
- Browser Run Playwright: https://developers.cloudflare.com/browser-run/playwright/
- Browser Run limits: https://developers.cloudflare.com/browser-run/limits/
- Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/
