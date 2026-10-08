# Codex implementation and verification handoff — InvariantC M0/M1

## Role

You are working on a **separate Rust project**, not AXON. Do not alter the AXON/AgentOps Mesh repositories. This is an initial source package, not a verified release.

## Primary task: make v0.1 verifiably runnable

1. Read `README.md`, `docs/M0_MARKET_GAP.md`, `docs/M1_ENGINE_SPEC.md`, `docs/THREAT_MODEL.md`.
2. Install/use stable Rust/Cargo toolchain locally. Do not enable paid APIs.
3. Execute `cargo fmt --all` then `cargo test --all-targets`.
4. Fix **all compiler errors**, borrow-checker issues, serde deserialization issues and Rust unit tests. Preserve stated semantics unless tests reveal a genuine specification bug.
5. Run `cargo clippy --all-targets` and resolve warnings where practical; aim for `-D warnings` after passing.
6. Run all documented CLI examples. Verify exit codes: apples=2, checkout=0, missing=3, bad input=4.
7. Run `cargo run -- corpus corpus/manifest.json --offline`: 144 cases with 48 PASS, 72 FAIL, 24 UNKNOWN expected labels.
8. Run `python scripts/validate_corpus.py` to independently confirm corpus fixture labels; explicitly distinguish from Rust tests.
9. Run `cargo fmt --all -- --check` after formatting and add a strict CI gate.
10. Produce a test baseline containing command, result, actual passed/failed test counts and toolchain versions. Do not hide failures.

## Security and design reviews

11. Test unknown-field rejection in AST/contract structs; verify no implicit default pass from malformed input.
12. Test path references including escaped `~0` and `~1`, null versus missing, wrong observed types, duplicate IDs, invalid tolerances, nested expressions and numeric boundaries.
13. Add offline invariant tests that confirm no network/paid-provider dependencies or telemetry code exists.
14. Add property/metamorphic tests without external services: pass symmetry for equal, stable reports for identical inputs, mutation of expected/actual causes mismatch, missing observation yields UNKNOWN.
15. Add adversarial input tests (depth, huge arrays, extreme numbers, JSON pointer ambiguity) and document performance/memory bounds.
16. Do not introduce a generic SQL engine, model inference, browser runtime, or separate rule language.
17. Avoid collecting/storing customer secrets or personal data.

## Architecture review

18. Confirm we are not reinventing Playwright, Pact, Soda, Great Expectations, JSON Schema or OPA. If a focused OSS dependency replaces work reliably, document the tradeoff.
19. Keep the Rust core pure. Domain observation collection belongs in adapters.
20. Ensure any new dependencies are open-source with clear licenses and no paid service requirement.
21. Document honest product differentiation. A generic equal assertion is not itself defensible IP.
22. Once M1 passes, draft the M2 WASM-native parity RFC; **do not deploy a SaaS yet**.

## Deliverables

- Working Rust CLI and tests.
- `Cargo.lock` committed for reproducible application builds.
- Updated `README.md` and spec if discrepancies found.
- `VERIFIED_BUILD_AND_TEST_REPORT.md` with actual outputs.
- `REMAINING_GAPS.md` with release blockers.
- Optional design-only `M2_WASM_RFC.md` (do not implement cloud components without explicit approval).

## Acceptance condition

M1 is accepted only if compiler, tests, CLI outcomes, full corpus and security checks are verified on a real Rust toolchain. Synthetic corpus passing alone does not prove real-site detection quality.
