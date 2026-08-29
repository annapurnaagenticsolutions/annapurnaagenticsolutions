#!/usr/bin/env python3
from __future__ import annotations
import sys,urllib.request
base=(sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8000/').rstrip('/')+'/'
checks={
 'index.html':['micro-scene','v2-journey','Connected company ecosystem'],
 'assets/site.css':['v2.4 — cross-world consequences','has-consequence','consequence-integrated'],
 'assets/site.js':['consequenceRules','consequenceState','propagateConsequences','consumeConsequence','renderInheritedConsequence'],
 'data/release-profile.json':['"release": "2.4"'],
 'data/living-world-v24.json':['"release": "2.4"','"persistsAcrossPageLoads": false','"writesSemanticHistory": false']
}
errors=[]
for path,markers in checks.items():
    try:body=urllib.request.urlopen(base+path,timeout=10).read().decode('utf-8')
    except Exception as e:errors.append(f'{path}: {e}');continue
    for m in markers:
        if m not in body:errors.append(f'{path}: missing {m}')
if errors:
    [print('FAIL',e) for e in errors];raise SystemExit(1)
print('PASS deployed v2.4 cross-world consequence layer')
