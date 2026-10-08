# M1 — InvariantC correctness engine specification

## Status

Design and source implementation v0.1; native Rust build, tests, and 144-case corpus are verified locally and in hosted CI. This specification is not a release certification; see `LOCAL_VERIFIED_BASELINE.md` and `QUALITY_STATUS_M2_M4.md` for current evidence and limits.

## Problem

Separate components report different facts about the same domain object. Examples: rendered count vs structured scene count; UI checkout total vs API price*quantity; success notification vs persisted write; retry vs duplicate side effect. Ordinary assertions can express these conditions, but maintaining cross-layer observation collection, deterministic evaluation, evidence identity and uncertainty handling is cumbersome.

## Non-goals

No AI judgment, screenshot understanding, open-web crawling, code execution, arbitrary expressions/eval, general policy language, SQL implementation, proprietary browser runtime, deployment/hosted accounts, personal data collection or AXON integration in M1.

## JSON contract v1

Top-level:

```json
{
  "version": 1,
  "id": "inventory_consistency",
  "sources": [
    {"id":"api", "layer":"api", "fields":{"/quantity":"number"}},
    {"id":"ui", "layer":"dom", "fields":{"/quantity":"number"}}
  ],
  "assertions": [
    {
      "id": "quantity",
      "expected": {"kind":"path","source":"api","pointer":"/quantity"},
      "actual": {"kind":"path","source":"ui","pointer":"/quantity"},
      "rule": {"kind":"equal"},
      "severity": "error"
    }
  ]
}
```

Observations supplied separately:

```json
{"api":{"quantity":8},"ui":{"quantity":7}}
```

Observation-source `layer` is descriptive; it is **not authenticated identity**. Source `fields` optionally declare JSON-pointer types for limited compile-time checks. JSON inputs use RFC 6901 pointers.

### AST expression forms

| Kind | Shape | Output |
|---|---|---|
| `literal` | `{"kind":"literal","value":42}` | declared JSON type |
| `path` | `{"kind":"path","source":"ui","pointer":"/total"}` | declared type if known, otherwise unknown |
| `count` | `{"kind":"count","value":EXPR}` | number; argument must be array |
| `sum` | `{"kind":"sum","values":[EXPR,...]}` | number |
| `product` | `{"kind":"product","values":[EXPR,...]}` | number |
| `difference` | `{"kind":"difference","left":EXPR,"right":EXPR}` | number |

No free-form expressions, script evaluation, implicit casts, SQL, network access or functions.

### Relation forms

- `equal`: semantic deep JSON equality (safe numbers compared numerically; no string-number coercion).
- `near`: `{ "kind":"near", "tolerance":0.01 }` absolute numeric error, inclusive.
- `greater_or_equal`: numeric actual >= expected.
- `less_or_equal`: numeric actual <= expected.

This grammar is intentionally small. Implement only predicates that pass a real customer use case and are unambiguous under missing data.

### Static compiler

1. Parse JSON to typed Rust AST (`serde`). Unknown top-level/source/assertion/AST fields rejected.
2. Check supported version and identifiers; unique source/check ids; nonempty bounds.
3. Check pointer syntax and declared sources.
4. Reject invalid tolerances, empty arithmetic, excessive nesting.
5. Partial type inference for literal, arithmetic, count and optionally typed source fields; unknown field types remain unresolved until execution.
6. Emit a deterministic **plan**: contract identity, SHA-256, ordered assertions, sorted source dependencies and operators.

Not implemented: full static proof, units-of-measure typing, symbolic algebra, expression optimization, YAML parsing, version migration.

### Evaluation semantics

| Condition | Result | Explanation |
|---|---|---|
| Declared relation true | PASS | observed evidence is consistent under this rule |
| Both values present, relation false | FAIL | discrepancy detected |
| Source/pointer missing | UNKNOWN | no reliable observation; never assume success |
| Invalid input type for operator | UNKNOWN | unable to evaluate |
| Integer greater than binary64 exact range | UNKNOWN | avoid false numeric equivalence |
| Contract malformed | INPUT ERROR | exit 4, not a failed business assertion |

Overall aggregation: **FAIL > UNKNOWN > PASS** across assertions. The severity field is advisory metadata in v0.1, not a failure suppressor.

### Reproducibility/evidence

- SHA-256 of normalized contract and observation JSON.
- Source dependencies per assertion.
- Reproducible JSON report, no timestamps or nondeterministic ordering.
- Reports intentionally omit raw values to reduce copying sensitive data.
- Hashes are **identifiers only**, not proof of authenticity/trust/completeness.
- Inputs are trusted only to the extent that the **external collector is trusted**.

### Number rules

Use safe integers for monetary minor units and a dedicated `near` rule for floating measurements. Do not claim exact decimal-money arithmetic. Future financial use should adopt checked i128/fixed-decimal semantics, units, rounding rules and overflow tests.

### Input constraints

CLI files <= 4 MiB; at most 64 sources, 512 assertions, 128 operand nodes per arithmetic, 32 expression nesting levels. Deeper/shapeless inputs fail validation. No network side effects by design.

## CLI contract

- `validate` verifies static contract semantics.
- `compile` emits normalized execution plan.
- `check` evaluates JSON observations into PASS/FAIL/UNKNOWN.
- `corpus` checks all labelled synthetic scenarios.
- `--offline` accepted for compatibility; the v0.1 engine is always offline.

## First customer-grade acceptance tests

1. Apple visual count from **structured scene objects** vs UI label.
2. Cart total from API unit-price/quantity vs UI total in minor units.
3. UI saved banner vs database acknowledgement.
4. API stock vs UI stock.
5. Retry commits vs duplicate persisted rows.
6. Answer-key points vs UI score.

Corpus includes 144 synthetic scenarios with labelled expected outcomes. These establish evaluation logic, **not** real-world detection accuracy.

## Critical next step

Run `cargo fmt`, `cargo test`, `cargo clippy`, and 144-scenario corpus on a real Rust toolchain. Fix compile failures and record exact results before claiming M1 complete. Then design a local Playwright collector with explicit permission/ownership and test artifact redaction.
