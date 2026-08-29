# Evidence Contract — v0.5

## Objective

Make market-facing proof inspectable without turning the website into a claims database or pretending every linked artifact is operational telemetry.

## Claim states

- `verified` — the cited public source directly supports the statement.
- `source_local` — the statement accurately reports what one public Annapurna source says, but another source may disagree.
- `reconciled` — a human-reviewed synthesis of multiple sources. Not currently used automatically.

## Evidence classes

- `public_page`
- `public_repository`
- `public_product`
- `live_demo`

These describe provenance, not product maturity.

## Required claim fields

```text
id
statement
status
evidenceClass
sourceName
sourceUrl
scope
note
conflictsWith[]? 
```

## Required artifact fields

```text
id
world
kind
title
subtitle
url
sourceUrl
facts[]
previewMode
sample?
```

## Invariants

1. Every evidence URL is explicit HTTPS.
2. Every claim shown in the Evidence Atlas must exist in the manifest.
3. Every manifest claim must be exposed to visitors.
4. Declared conflicts must point to real claims and are reciprocal.
5. Artifact embeds never become the source of truth; the manifest points to the authoritative public source.
6. `public_repository` facts such as commits/issues/forks do not imply maturity.
7. If an embed fails, the external source link remains usable.
8. JavaScript-off visitors retain normal source links.

## Current source conflict

`ai-two-listed-live` ↔ `axon-preproduction`

The synthesized homepage maturity remains **Prototype / pre-production**. The AI Solutions metric is deliberately phrased **tools listed Live**, reporting the source-local page classification rather than converting it into an independent maturity assertion.
