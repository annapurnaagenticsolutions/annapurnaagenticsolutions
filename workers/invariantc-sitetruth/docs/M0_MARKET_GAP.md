# M0 — Market / standards / differentiation audit

Date: 2026-10-08. Evidence is from project documentation linked below; there is **no claim of an unoccupied market**.

| Existing capability | Already solved | Do not rebuild | Remaining hypothesis to test |
|---|---|---|---|
| [Playwright assertions](https://playwright.dev/docs/test-assertions) | Browser locators, text/visibility/field assertions, retries | Browser automation/DOM assertion framework | Bind observations from DOM to API/scenario expectations as a single compiled contract |
| [Pact](https://docs.pact.io/) | Consumer/provider HTTP and message contract compatibility | Consumer contract broker/verifier | Cross-layer semantic invariants *within* an app, after API shape compatibility is established |
| [Soda data contracts](https://docs.soda.io/) | Data quality expectations and validation | ETL/data contract framework | Reproducible UI↔API↔workflow defect evidence with explicit unknowns |
| [Great Expectations](https://docs.greatexpectations.io/docs/core/define_expectations/) | Data expectations, including configurable multi-source checks | General data expectation library | Lightweight, deterministic compiler + edge/CLI integration driven by application observations |
| [OPA/Rego](https://www.openpolicyagent.org/docs/policy-language) | Broad, mature structured policy language and evaluation engine | General rules language or policy engine | Domain-specific test plans and discrepancy evidence for software correctness |
| [JSON Schema](https://json-schema.org/) / [Rust jsonschema](https://docs.rs/jsonschema/latest/jsonschema/) | Shape/value structure validation | JSON Schema dialect and engine | Compare *related values* from different sources; JSON Schema alone does not prove business cross-layer consistency |
| Cloudflare [Browser Run](https://developers.cloudflare.com/browser-run/playwright/) | Hosted Playwright browser automation | Another browser renderer | Browser collection adapter feeds our small offline Rust engine |

## Finding

There is significant competition and functional overlap. **A generic “universal invariant language” is not a product moat.** We should validate a narrower proposition:

> Detect reproducible contradictions across DOM, API, structured scene, workflow and database observations, with low false positives and explicit UNKNOWN outcomes, using an offline executable contract.

The first competitive evidence is not marketing claims; it is a benchmark with seeded defects and legitimate-looking non-defects. Human-reviewed real website defects will be needed before commercialization.

## Customers to interview before SaaS pricing

1. Education websites and interactive course publishers (count, label, scoring mistakes).
2. E-commerce owners (unit-price, quantity, cart/checkout discrepancies).
3. QA leads of small SaaS teams (success-state and persistence mismatches).

## Differentiation test (go/no-go)

- Capture a real defect Playwright alone misses unless the test author explicitly links two observations.
- A generated contract should be easier to maintain than equivalent handwritten test glue.
- Fewer than 5% false positives on a representative reviewed dataset is a *target*, not a present result.
- Show the customer the evidence and rerun on a fixed build; observe whether it drives action.
- Interview at least 5 potential customers before investing in billing/accounts.

## Reuse boundary

- Rust compiler/evaluator: new independent, tiny project.
- SiteTruth QA: first SaaS consumer of contracts.
- AXON: **no** new compiler; separate architecture and release stream.
- ScenarioDB: deferred, store JSON/R2 + D1 metadata before proposing Rust DB internals.
- WebMCP Contract Lab: a second possible future consumer, not MVP scope.
