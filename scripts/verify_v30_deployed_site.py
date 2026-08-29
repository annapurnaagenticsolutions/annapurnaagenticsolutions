#!/usr/bin/env python3
from __future__ import annotations
import sys,urllib.request
base=(sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8000/').rstrip('/')+'/'
checks={
 'index.html':['v3-story-shell','data-v3-beat="establish"','data-v3-beat="focus"','data-v3-beat="journey"','v3-stage','v3-route-overlay'],
 'explore.html':['v3-atlas','v3-atlas-nodes','v3-atlas-inspector','Six worlds. One connected field.'],
 'lab.html':['v3-lab-theatre','data-lab-mode="runtime"','data-lab-mode="axon"','data-lab-mode="design"','Change an input. Watch the system reorganize.'],
 'assets/site.css':['v3.0 EXPERIENCE RECONSTRUCTION','.depth-word:after{display:none!important;content:none!important}','v3-lab-theatre'],
 'assets/site.js':['dataset.v3Beat','activateLabMode','atlas-related'],
 'data/release-profile.json':['"release": "3.0"'],
 'data/living-world-v30.json':['"release": "3.0"','"underlined": false','"presentation": "spatial-atlas"']
}
errors=[]
for path,markers in checks.items():
    try:body=urllib.request.urlopen(base+path,timeout=10).read().decode('utf-8')
    except Exception as e:errors.append(f'{path}: {e}');continue
    for m in markers:
        if m not in body:errors.append(f'{path}: missing {m}')
if errors:
    [print('FAIL',e) for e in errors];raise SystemExit(1)
print('PASS deployed v3.0 persistent-world / spatial-atlas / interaction-theatre surface')
