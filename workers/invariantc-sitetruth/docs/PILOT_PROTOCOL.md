# SiteTruth guided pilot protocol

**Status:** preparation only. No participant sessions have been run. This protocol does not authorize outreach, hosted scans, deployment, or collection of customer data.

## Entry gates

Do not schedule or begin an actual-user pilot until all of these are independently cleared and recorded:

1. The six browser capture acceptance scenarios pass in an organization-approved environment. The current localhost browser-policy block must not be bypassed.
2. Hosted collection controls are implemented and security-tested end to end, or the pilot is explicitly constrained to a reviewed local-only setup that does not send data to a hosted service. DNS and scan schemas are installed in staging, but there is no authenticated scan queue, active retention service, D1 route/transaction test, or network-enforced browser egress. Schema installation and fake-tested deletion do not clear this gate.
3. At least 100 human-labelled real defects across at least three authorized site applications have been evaluated under `COMMERCIAL_VALIDATION.md`, including source/predicate metrics, UNKNOWN rate, and the proposed high-severity precision review.
4. An operator has reviewed the participant consent record, site-specific scope authorization, data owner, retention/deletion path, and incident contact. The pilot must not use customer passwords, cookies, bearer tokens, or real customer account data.
5. The exact product build, task set, baseline method, and stop conditions are fixed before sessions begin. No subscriptions, CRM, or AI judge are part of this pilot.

These are gates, not results. Passing local smoke checks or preparing this kit does not clear them.

## Pilot shape

- Recruit 5–10 distinct site owners for free, guided sessions. Record an opaque participant reference; do not put names or contact details in the data file.
- Use only an individually authorized site and a pre-approved task scope. Prefer an owner-controlled test environment with synthetic accounts and content.
- For each task, capture whether the product and baseline run were comparable, elapsed minutes, facilitator support, and aggregate counts of useful, false, unresolved, and other alerts. A facilitator should adjudicate counts after the session; do not record page text or screenshots in the pilot ledger.
- Ask the same short feedback questions for each session: usefulness (1–5), reproducibility, whether they would use the product again, purchase intent, and willingness-to-pay band relative to their current alternative. Do not invent price points; if asking a numeric amount outside this ledger, define currency and period in the reviewed survey and keep those answers out of this aggregate tool.
- Keep baseline tasks and product tasks equivalent. Record the baseline method (`manual_playwright`, `pact`, `basic_checks`, or `llm_reviewer`) and paired elapsed time. Label unpaired comparisons explicitly; never combine them into time-saved statistics.
- Before interpreting results, review saved time together with support time, usefulness, false alerts, unresolved alerts, reproducibility, and willingness-to-pay responses. Small-sample feedback is directional, not evidence of broad demand or product readiness.

## Immediate stop conditions

Stop the affected session, preserve only a minimal incident reference, and follow the approved incident process if any of these occurs:

- a request leaves the specifically authorized host/scope, including a redirect, popup, or subresource;
- credentials, real customer data, screenshots, full DOM, or raw observations enter the run, logs, or pilot ledger;
- a tenant/site boundary, quota, retention, or deletion control is bypassed or cannot be confirmed;
- a critical expected behavior is incorrectly shown as passing, or the participant reports a severe false alert;
- consent or site authorization is withdrawn, unclear, or cannot be verified.

Do not use this ledger as an incident log. Record only an opaque incident reference in the separately controlled incident process.

## Data contract and aggregation

Each UTF-8 JSONL line is one session with one or more task rows and only opaque references. The canonical field contract is [`../schemas/pilot_session.schema.json`](../schemas/pilot_session.schema.json). The local tool is:

```powershell
python scripts/summarize_pilot.py --input approved-pilot-sessions.jsonl --output pilot-aggregate.json
```

The command rejects undeclared fields, URLs/free text, duplicate session/task IDs, synthetic-participant assertions, invalid consent/scope flags, malformed counts, and inconsistent paired baselines. It writes aggregate counts only; it does not verify that a participant is real, that a consent or authorization reference is valid, or that the underlying session occurred. Those checks remain an operator's responsibility.

Delete the working JSONL and any temporary copies according to the independently approved retention schedule after the aggregate has been reviewed. The script does not enforce deletion or access control. Never commit participant JSONL or reports containing small-group breakdowns. Share only a reviewed aggregate with groups small enough to reduce re-identification risk.

## Interpretation boundary

The report shows observed session counts, paired time differences, feedback distributions, and aggregate alert dispositions. It is not the 100-defect evaluation, a statistical product-market validation, a safety certification, a production-readiness gate, or authorization to bill users. The report deliberately has no automatic `pilot_pass` or launch decision.
