# Security, privacy and failure-mode review — M1

## Trust boundaries

1. User-authored contract (untrusted JSON) -> Rust parser/compiler.
2. External observation collector -> supplied observation document.
3. Rust evaluator -> local report.
4. Future Cloudflare SaaS boundary is out of scope for M1.

## Properties present in M1 design

- No arbitrary script execution or interpolation/eval.
- No external network/file reads driven by contract expressions; JSON pointer references are only into supplied observations.
- AST recursion and input size limits.
- Unknown/missing evidence does not become success.
- Default report excludes raw observed values.
- No collection, telemetry, API keys, or paid services.
- Contract/data SHA-256 identifies normalized input; **not** an authenticity proof.

## Known limitations and risks

- The CLI needs Rust toolchain verification; the packaging environment could not compile it.
- JSON observations may contain secrets or personal data. They remain in local memory/disk as input until the caller removes them; report redaction does not make the input storage safe.
- External collectors may lie, mis-parse, or observe stale/inconsistent states. Two outputs may agree but both be wrong.
- Equality against a single internally derived source can be tautological. Source independence needs a future compiler warning and/or trust policy.
- A scene object array is not visual recognition. Users must not conflate structured scene count with pixel/object count.
- Floating-point arithmetic is not an exact financial primitive. Seeded tests cover unsafe integer boundaries and arithmetic overflow. The JSON API libFuzzer harness is added, but its Windows ASAN runtime did not start and hosted CI has not run; coverage-guided numeric/parser fuzzing remains open.
- Deep JSON documents can be expensive even below the input size limit. Seeded mutation, nesting, large-equality and historical local HTTP-load checks exist. A 25,000-request current Workerd/D1 soak is configured in Linux CI but pending; even a passing local emulator run does not establish edge capacity. Coverage-guided fuzz results also remain a pre-commercial requirement.
- CLI  escape sequences in user-authored identifiers are rejected by ASCII identifier validation; source paths may still appear in error strings if user supplies unusual paths.
- Future collectors must not send private URLs or customer credentials to arbitrary third-party sites.
- Customer content retention, deletion, tenant isolation, encryption and consent are unsolved; therefore **no hosted customer uploads in M1**.

## Next-stage controls (Cloudflare/browser collector)

The detailed gate and proposed verification, egress, quota, and retention controls are in [HOSTED_COLLECTOR_CONTROLS.md](HOSTED_COLLECTOR_CONTROLS.md). Its reference schema has only been smoke-tested in local SQLite and is not active service code.

- Verify ownership/control of domains before scanning private routes or accepting session cookies.
- The local Playwright collector now rejects external targets until the reviewed egress policy exists, refuses to launch Chromium as root, enables Chromium sandboxing explicitly, and applies its same-origin request filter at BrowserContext scope so popups inherit it. Its local-only harness is not an SSRF defense or hosted scanner.
- Public demo may scan allowlisted static demo sites only; authenticated scanning opt-in, with least-privilege tokens and explicit retention.
- Strong SSRF and DNS rebinding controls; block localhost, private/link-local/cloud metadata destinations, unexpected redirects and non-HTTP(S) targets.
- Rate/concurrency limits and scanning quotas.
- Restrict browser runtime permissions, download handling and exfiltration.
- Evidence encryption, per-tenant access checks and minimal/short TTL.
- Redact or avoid personal data from screenshots and DOM snapshots; use synthetic test data by default.
- Server-side billing quotas and budget caps.
- Do not claim compliance certification or correctness proof; report bounded observations and test coverage.

## Go/no-go for live customers

No live customer data or authenticated browser crawling until threat model, automated security tests, deletion flow, incident plan and billing controls are implemented and reviewed.
