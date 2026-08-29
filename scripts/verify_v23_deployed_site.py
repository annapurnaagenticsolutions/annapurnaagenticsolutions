#!/usr/bin/env python3
from __future__ import annotations
import sys,urllib.request
base=(sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8000/').rstrip('/')+'/'
checks={
 'index.html':['micro-scene','data-micro-seed="0"','data-micro-seed="1"','data-micro-seed="2"','world-signature','v2-journey'],
 'assets/site.css':['v2.3 — persistent micro-scenes','data-micro-world="ai"','data-micro-world="wonder"','data-micro-world="idea"','data-micro-world="axon"','data-micro-world="web"','data-micro-world="software"'],
 'assets/site.js':['microScenes','renderMicroScene','activateMicroSeed','dataset.microStep'],
 'data/release-profile.json':['"release": "2.3"'],
 'data/living-world-v23.json':['"release": "2.3"','"persistsAcrossPageLoads": false','"writesSemanticHistory": false']
}
errors=[]
for path,markers in checks.items():
    try: body=urllib.request.urlopen(base+path,timeout=10).read().decode('utf-8')
    except Exception as e: errors.append(f'{path}: {e}');continue
    for m in markers:
        if m not in body: errors.append(f'{path}: missing {m}')
if errors:
    [print('FAIL',e) for e in errors];raise SystemExit(1)
print('PASS deployed v2.3 topology micro-scenes + ephemerality boundaries')
