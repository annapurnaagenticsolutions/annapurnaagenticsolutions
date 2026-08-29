# Source Reconciliation Policy

Living websites can surface multiple public sources that disagree. v0.5 treats disagreement as a data-quality/governance event, not a copywriting opportunity.

## Current example — AXON

At the 2026-08-25 verification point:

- the Annapurna AI Solutions page lists AXON under **Live**;
- the AXON repository describes the implementation as **Pre-production — sophisticated reference implementation**.

The Living Lab therefore uses a conservative synthesized maturity label: **Prototype / pre-production**, while preserving both source-local statements in the Evidence Atlas.

The homepage metric is intentionally phrased **“AI tools listed live”** because it reports how the AI Solutions page classifies its cards; it is not used as the maturity-map decision.

## Reconciliation rule

When public Annapurna sources disagree:

1. Preserve each source-local claim.
2. Bind each statement to its exact public source.
3. Explicitly connect conflicting claim IDs.
4. Do not silently merge contradictory labels.
5. Prefer the more conservative market-facing synthesized status until a human owner reconciles the sources.
6. Record reviewer/review time if a human reconciliation is later made.
7. Never use popularity/activity metrics as a maturity proxy.

## Future engine primitive

A reusable Living Website Engine should support a first-class `source_conflict` object containing entity, field, claims, sources, reconciliation policy, synthesized value and optional human-review metadata.
