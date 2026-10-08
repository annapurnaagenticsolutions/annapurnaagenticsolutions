# SiteTruth QA product positioning — pre-commercial

## One-sentence description

SiteTruth QA is a research-stage, API-first contract evaluator that checks typed software expectations against caller-supplied application observations and reports PASS, FAIL, or UNKNOWN.

## Target user and job

The initial hypothesis is for engineering teams maintaining education portals, commerce flows, and business dashboards. The job is to make a cross-layer correctness check explicit and replayable in a test pipeline. This audience and value proposition have not yet been validated with customers.

## What can be demonstrated today

- An offline Rust evaluator with compiled-WASM integration and a synthetic fixture set.
- A local browser collection CLI for owned/test sites; it is not a hosted scanner.
- An API-only staging Worker for caller-supplied JSON. GitHub run #19 passed synthetic local Workerd/D1 authentication, quota, revocation and 25,000-request acceptance; Cloudflare API deployment history confirms staging version `92c6912c-b071-443f-ad27-0fb3df1dd1a7` at 100%, and staging D1 schema through `0008` is installed with zero tenant/scan rows. The latest credential-free HTTP smoke failed before HTTP because local DNS returned `ENOTFOUND`; no tenant key is provisioned and authenticated staging evaluation is not enabled.
- A local page with embedded examples that performs no network request.

## What cannot be claimed

- Public SaaS availability, hosted browser scans, customer accounts, production deployment, or commercial support.
- Customer accuracy, demand, time saved, ROI, or precision/recall from the synthetic corpus.
- Independent truth, visual recognition, source attestation, legal compliance, or a security certification.
- A paid offering or validated price. No subscriptions, CRM, checkout, or billing should be introduced before the guided pilot.

## Proof sequence before commercial launch

1. CI has passed the six fixed synthetic browser scenarios, current Workerd/D1 acceptance and 25,000-request load, and bounded coverage-guided fuzzing in GitHub run #19. A passing local-emulator soak is not Cloudflare edge-capacity evidence. Continue with a reviewed deployed-runtime security test before any hosted scan.
2. Complete and independently test hosted browser-domain, egress, quota, retention and deletion controls before enabling any URL collector.
3. Evaluate 100+ human-labelled real defects over at least three authorized site applications; report precision, strict/known recall, UNKNOWN rate and categories.
4. Run 5–10 free guided sessions with consenting site owners; measure paired time, facilitator support, useful/false/unresolved alerts, reproducibility and willingness-to-pay.
5. Review security, operating cost, support load, terms/privacy copy and product claims. Only then decide on billing and public commercial availability.

## Public-safe framing

Use “research preview,” “synthetic example,” “API-only pilot candidate,” and “pilot gates remain open.” Avoid “production-ready,” “detects defects with X% accuracy,” “saves X hours,” “autonomous website scanner,” or any paid availability wording until supported by reviewed evidence.
