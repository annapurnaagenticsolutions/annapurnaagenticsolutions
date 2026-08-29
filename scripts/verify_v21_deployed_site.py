#!/usr/bin/env python3
from __future__ import annotations
import sys, urllib.request
base=(sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8000/').rstrip('/')+'/'
checks={
 'index.html':['AI systems, learning products and digital experiences—connected.','v2-stage','continuity-thread','journey-step-copy','v2-route-track'],
 'explore.html':['Six product worlds','world-card'],
 'lab.html':['Interactive Lab','Change the inputs. Watch the system respond.'],
 'evidence.html':['Evidence'],
 'assets/site.css':['v2.1 — environmental continuity','v21-point-breathe','v21-route-current'],
 'assets/site.js':['publicActivity','renderWorldDrivenRoute','repository-signals.json','--handoff-progress'],
 'data/release-profile.json':['"release": "2.1"'],
 'data/living-world-v21.json':['"release": "2.1"','"showsMetricsOnHome": false']
}
errors=[]
for path,markers in checks.items():
    try:body=urllib.request.urlopen(base+path,timeout=10).read().decode('utf-8')
    except Exception as e:errors.append(f'{path}: {e}');continue
    for m in markers:
        if m not in body:errors.append(f'{path}: missing {m}')
if errors:
    [print('FAIL',e) for e in errors];raise SystemExit(1)
print('PASS deployed v2.1 environmental continuity + real-state current + cross-act response')
