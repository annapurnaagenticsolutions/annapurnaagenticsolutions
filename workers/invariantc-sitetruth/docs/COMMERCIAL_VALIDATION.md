# Commercial validation gate — SiteTruth QA

## ICP and unit of value

Initial customers: teams operating dynamic education portals, e-commerce product pages and business dashboards. Sell the **actionable discrepancy with a reproducible contract**, not a generic dashboard, website crawler or AI chatbot.

## Validation before paid SaaS

- Validate 100+ human-labelled real issues over at least three distinct site applications.
- Measure precision and recall by source/predicate, separately from UNKNOWN coverage.
- Compare setup cost and findings with equivalent manually authored Playwright assertions, Pact contracts, basic checks and an LLM-driven reviewer.
- Require ≥90% precision on high-severity deterministic findings in the target corpus before issuing externally visible alerts (proposed gate, not measured performance).
- Require browser scan quotas, verified site control and 7-day default redacted artifact retention before external onboarding.
- Pilot 5–10 site owners with free guided runs; collect buyer willingness-to-pay and actual saved time before implementing billing.

The local session protocol, privacy-minimal ledger schema, and aggregate-only summarizer are now prepared in [`PILOT_PROTOCOL.md`](PILOT_PROTOCOL.md), [`../schemas/pilot_session.schema.json`](../schemas/pilot_session.schema.json), and `scripts/summarize_pilot.py`. They prepare data handling and reporting only; no participants were recruited, no sessions were conducted, and the protocol entry gates remain uncleared.

## Real-defect evaluation protocol

The local scorer is `scripts/evaluate_real_defects.py`; each JSONL row must match [`schemas/real_defect_evaluation.schema.json`](../schemas/real_defect_evaluation.schema.json). The CLI rejects output paths that resolve to the input file. Run it only on an authorized, pseudonymized dataset:

```powershell
python scripts/evaluate_real_defects.py --input real-defects.jsonl --output aggregate-metrics.json --require-gate
```

Each JSONL row contains only: `case_id`, pseudonymous `site_id`, opaque `site_authorization_ref`, normalized non-identifying `category`, `source_layers`, evaluator `predicate`, `severity`, adjudicated `human_label` (`defect` or `no_defect`), evaluator `prediction` (`fail`, `pass`, or `unknown`), `real_case: true`, `label_source: human`, `reviewer_count`, `review_status`, and `report_sha256`. `source_layers` records the non-identifying `source.layer` labels used by the assertion; `predicate` is the evaluator rule (`equal`, `near`, `greater_or_equal`, or `less_or_equal`). Dimension labels must use a reviewer-approved taxonomy and must not encode site, customer, person, URL, or internal-system identifiers. The tool rejects duplicate JSON keys, synthetic rows, duplicate case IDs, extra fields (including URLs or observations), malformed identifiers/dimensions, and rows without a human no-defect comparison. The evidence gate requires at least 100 positive human-labelled defects across at least three sites and multi-review labels for every row (`reviewer_count >= 2`, with `consensus` or `adjudicated` status). Single-review rows can be summarized for exploration but do not pass the gate. The scorer cannot verify reviewer identity or independence, site ownership, authorization truth, or label provenance; those require external review.

FAIL is the only predicted-positive alert. UNKNOWN is not an alert and counts as a miss for strict recall; known-outcome recall is also reported, together with unknown rate, coverage, per-category/source-layer/predicate/severity metrics, and Wilson 95% intervals. Multi-layer rows appear in every applicable source-layer group, so source-layer groups overlap and must not be summed. The report omits case, site, authorization, and report identifiers and contains aggregate metrics only. The ≥90% high-severity precision target remains proposed and is not enforced by the scorer.

`npm run verify:evaluation-metrics` runs synthetic in-memory checks of the metric arithmetic, source-layer/predicate grouping, UNKNOWN edge cases, schema alignment, and privacy/input rejection. It does not constitute the required real-site evaluation.

## Non-goals

- No arbitrary internet scanning service.
- No "AI understands every screenshot" promise.
- No assertion that page-derived structured state is independent ground truth.
- No generic Playwright replacement.
- No general-purpose DBMS.
- No customer API tokens/cookies stored in the pilot.
