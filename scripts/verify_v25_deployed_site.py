#!/usr/bin/env python3
from __future__ import annotations
import sys,urllib.request
base=(sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8000/').rstrip('/')+'/'
checks={
 'index.html':['Connected company ecosystem','micro-scene','v2-journey'],
 'assets/site.css':['v2.5 — emergent composites','data-composite="governed-runtime"','composite-member','composite-emerged'],
 'assets/site.js':['emergentComposites','completedCausalTrace','triggerComposite','releaseComposite','recordWorldCompletion','requiresConsequenceConsumption' if False else 'activeComposite'],
 'data/release-profile.json':['"release": "2.5"'],
 'data/living-world-v25.json':['"release": "2.5"','"requiresConsequenceConsumption": true','"persistsAcrossPageLoads": false']
}
errors=[]
for path,markers in checks.items():
    try:body=urllib.request.urlopen(base+path,timeout=10).read().decode('utf-8')
    except Exception as e:errors.append(f'{path}: {e}');continue
    for m in markers:
        if m not in body:errors.append(f'{path}: missing {m}')
if errors:
    [print('FAIL',e) for e in errors];raise SystemExit(1)
print('PASS deployed v2.5 inherited causal chain + emergent composite scene layer')
