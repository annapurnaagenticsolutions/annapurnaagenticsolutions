#!/usr/bin/env python3
from __future__ import annotations
import sys,urllib.request
base=(sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8000/').rstrip('/')+'/'
checks={
 'index.html':['depth-headline','world-signature','data-word-world="ai"','v2-stage','v2-journey'],
 'assets/site.css':['v2.2 — semantic depth typography','v22-orbit-star','v22-lane-packet','v22-grid-light'],
 'assets/site.js':['triggerWorldSignature','syncImpactWords','dataset.signature'],
 'data/release-profile.json':['"release": "2.2"'],
 'data/living-world-v22.json':['"release": "2.2"','"decorativeBounce": false']
}
errors=[]
for path,markers in checks.items():
    try: body=urllib.request.urlopen(base+path,timeout=10).read().decode('utf-8')
    except Exception as e: errors.append(f'{path}: {e}');continue
    for m in markers:
        if m not in body: errors.append(f'{path}: missing {m}')
if errors:
    [print('FAIL',e) for e in errors];raise SystemExit(1)
print('PASS deployed v2.2 semantic-depth + six world signatures')
