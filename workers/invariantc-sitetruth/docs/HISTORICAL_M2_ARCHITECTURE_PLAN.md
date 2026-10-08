# M2 — Cloudflare/WASM integration plan (not yet implemented)

## Design

```text
SiteTruth UI (Workers static assets)
      |
Authenticated scan request + verified domain ownership
      |
Workers API ----> D1: contracts, scan metadata, quotas
      |
Queue / Workflow (asynchronous run)
      |
Browser Run / locally hosted Playwright (owned or demo site)
      |
Typed observations JSON (DOM, API, structured-scene)
      |
Rust InvariantC WASM module (offline evaluation)
      |
Redacted report + hashes ----> R2 short-TTL evidence
      |
Customer dashboard / JSON download
```

## Responsibilities

- Browser collector extracts observations. The Rust engine does **not** do HTTP/browser automation.
- Use a small JS/TypeScript Worker API as glue around a Rust/WASM evaluation module, or workers-rs for a Rust Worker once compatibility is proven.
- D1 stores metadata and client-scoped contract definitions. R2 stores bounded evidence artifacts; no indefinite screenshots by default.
- Prefer HTTP POST request processing for small runs; use Queues/Workflows only for asynchronous scans that need them.
- For zero/low-cost testing, run Playwright locally first; add Cloudflare Browser Run only after confirming billing and limits. Credit coverage for Browser Run must be confirmed in the customer's actual startup grant.

## Module feasibility gate

1. Confirm `serde`, `serde_json`, and `sha2` compile for wasm32-unknown-unknown.
2. Extract `evaluate(contract_json, observations_json) -> report_json` as a pure function with no host I/O.
3. Add Wasm-bindgen wrapper only if the JS worker needs it; otherwise workers-rs crate.
4. Cross-target golden corpus: native and wasm must produce identical normalized reports for all 144 fixtures.
5. Measure Worker CPU, bundle size and memory; do not assert compatibility solely because Rust generally compiles to WASM.
6. Verify no time/random/network dependencies were introduced to the core.

## MVP pilot constraints

- 1-2 owned websites and intentionally seeded defect pages.
- No customer credentials, private URLs or PII.
- Tight request quotas; all cloud runs budgeted.
- Raw screenshots off by default until deletion workflow is implemented.
- Opt-in retention; mark source provenance and confidence in adapter metadata.

## Product success gate

Use a human-labelled real-site dataset after synthetic baseline. Require demonstrations that tests find real value beyond what a manually authored Playwright assertion would find for comparable authoring effort. Do not build billing/CRM before evidence of willingness to pay.

## Official reference

- https://developers.cloudflare.com/workers/languages/rust/
- https://developers.cloudflare.com/workers/runtime-apis/webassembly/
- https://developers.cloudflare.com/browser-run/playwright/
