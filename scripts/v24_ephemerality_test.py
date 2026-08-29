#!/usr/bin/env python3
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
js=(ROOT/'assets/site.js').read_text()
for forbidden in [
    'memory.consequence','memory.consequences','consequenceState:',
    '"consequenceState"','annapurnaConsequence'
]:
    if forbidden in js:
        raise SystemExit(f'FAIL consequence persistence marker found: {forbidden}')
if 'const consequenceState=Object.create(null);' not in js:
    raise SystemExit('FAIL consequenceState is not ephemeral in-memory state')
print('PASS cross-world consequences are represented only as in-memory page state')
