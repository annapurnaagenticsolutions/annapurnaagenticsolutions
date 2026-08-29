# Semantic History Contract

## Purpose

A living website should change when the underlying organisation changes, but it must not manufacture activity merely because a scheduler ran.

## Contract

`public-history.json` is append-only in normal operation. A new entry is created only when the semantic digest changes.

The digest includes:

- portfolio metrics;
- portfolio maturity stage per world;
- selected public repository counts;
- sourced claim statement/status/class/source;
- inspectable artifact kind/URL/facts.

The digest excludes:

- verification timestamps;
- page render time;
- visitor state;
- ambient/daypart state;
- animation state;
- local visit count;
- Lighthouse scores;
- repository snapshot generation timestamp by itself.

## Initial-baseline rule

v0.6 begins on 2026-08-25. Earlier historical events are not reconstructed from memory or approximate project chronology.

## Mutation rule

Human-curated product/evidence changes may alter the digest. CI-generated public repository changes may also alter it. In both cases the resulting history entry is a record that **the public semantic state changed**, not a claim about business impact.

## Persistence caveat

The Actions template attempts to commit changed `repository-signals.json` and `public-history.json`. If branch protection blocks bot writes, deployment still works with the updated artifact but durable cross-deployment history requires an approved write path.
