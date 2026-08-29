#!/usr/bin/env python3
"""Validate all Living Lab JSON truth contracts against their draft-2020-12 schemas."""
from __future__ import annotations
import json
from pathlib import Path
from jsonschema import Draft202012Validator, FormatChecker

ROOT = Path(__file__).resolve().parents[1]
PAIRS = [
    ('site-signals.json', 'site-signals.schema.json'),
    ('repository-signals.json', 'repository-signals.schema.json'),
    ('evidence-manifest.json', 'evidence-manifest.schema.json'),
    ('public-history.json', 'public-history.schema.json'),
    ('composition-manifest.json', 'composition-manifest.schema.json'),
    ('world-presentation.json', 'world-presentation.schema.json'),
    ('cinematic-journey.json', 'cinematic-journey.schema.json'),
    ('micro-simulations.json', 'micro-simulations.schema.json'),
    ('release-profile.json', 'release-profile.schema.json'),
    ('interaction-model.json', 'interaction-model.schema.json'),
    ('adaptive-model.json', 'adaptive-model.schema.json'),
    ('living-performance.json', 'living-performance.schema.json'),
    ('temporal-state.json', 'temporal-state.schema.json'),
    ('sensory-model.json', 'sensory-model.schema.json'),
    ('perceived-liveness-model.json', 'perceived-liveness-model.schema.json'),
    ('first-30s-model.json', 'first-30s-model.schema.json'),
    ('immersive-experience.json', 'immersive-experience.schema.json'),
    ('immersive-coherence.json', 'immersive-coherence.schema.json'),
    ('living-world-v20.json', 'living-world-v20.schema.json'),
    ('living-world-v21.json', 'living-world-v21.schema.json'),
    ('living-world-v22.json', 'living-world-v22.schema.json'),
    ('living-world-v23.json', 'living-world-v23.schema.json'),
    ('living-world-v24.json', 'living-world-v24.schema.json'),
    ('living-world-v25.json', 'living-world-v25.schema.json'),
    ('living-world-v30.json', 'living-world-v30.schema.json'),
    ('living-world-v31.json', 'living-world-v31.schema.json'),
    ('living-world-v32.json', 'living-world-v32.schema.json'),
    ('living-world-v33.json', 'living-world-v33.schema.json'),
    ('living-world-v34.json', 'living-world-v34.schema.json'),
    ('living-world-v35.json', 'living-world-v35.schema.json'),
    ('living-world-v36.json', 'living-world-v36.schema.json'),
    ('living-world-v37.json', 'living-world-v37.schema.json'),
    ('living-world-v38.json', 'living-world-v38.schema.json'),
    ('living-world-v39.json', 'living-world-v39.schema.json'),
    ('living-world-v40.json', 'living-world-v40.schema.json'),
    ('living-world-v41.json', 'living-world-v41.schema.json'),
    ('living-world-v42.json', 'living-world-v42.schema.json'),
    ('living-world-v43.json', 'living-world-v43.schema.json'),
    ('public-links.json', 'public-links.schema.json'),
]

def main() -> int:
    failed = False
    for data_name, schema_name in PAIRS:
        data = json.loads((ROOT / 'data' / data_name).read_text(encoding='utf-8'))
        schema = json.loads((ROOT / 'data' / schema_name).read_text(encoding='utf-8'))
        validator = Draft202012Validator(schema, format_checker=FormatChecker())
        errors = sorted(validator.iter_errors(data), key=lambda e: list(e.path))
        if errors:
            failed = True
            for error in errors:
                print(f'FAIL {data_name} {list(error.path)}: {error.message}')
        else:
            print(f'PASS {data_name} against {schema_name}')
    return 1 if failed else 0

if __name__ == '__main__':
    raise SystemExit(main())
