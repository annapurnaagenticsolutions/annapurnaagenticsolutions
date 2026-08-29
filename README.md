# Annapurna Agentic Solutions

The primary portal for [annapurnaagenticsolutions.com](https://annapurnaagenticsolutions.com/) — governed AI systems, interactive learning products, practical tools and immersive digital experiences.

## Getting started

- Visit [annapurnaagenticsolutions.com](https://annapurnaagenticsolutions.com/) for the live site.
- See docs/ for architecture and contract documentation.
- See scripts/ for local quality gates and verification tooling.

## Quality gates

Run before any push:
- python scripts/generate_temporal_state.py
- python scripts/generate_public_data.py
- python scripts/validate_json_schemas.py

## Post-deploy verification

Run after GitHub Pages publishes:
- python scripts/verify_v43_public_runtime.py https://annapurnaagenticsolutions.com/
