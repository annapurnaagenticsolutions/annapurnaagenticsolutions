#!/usr/bin/env python3
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
js=(ROOT/'assets/site.js').read_text()
for marker in ['memory.completedCausalTrace','memory.activeComposite','localStorage.setItem("composite','localStorage.setItem("completedWorld']:
    if marker in js: raise SystemExit(f'FAIL persistent composite marker: {marker}')
for marker in ['const completedCausalTrace=[]','let activeComposite=null']:
    if marker not in js: raise SystemExit(f'FAIL missing ephemeral state marker: {marker}')
print('PASS composite sequence and active composite exist only in page memory')
