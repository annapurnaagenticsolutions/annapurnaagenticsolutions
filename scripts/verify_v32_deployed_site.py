#!/usr/bin/env python3
from __future__ import annotations
import sys,urllib.request
base=(sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8000/').rstrip('/')+'/'
checks={
 'index.html':['material-canvas','v3-story-shell','Connected</span>.','v3-stage'],
 'explore.html':['v3-atlas','Six worlds. One connected field.'],
 'lab.html':['v3-lab-theatre','Change an input. Watch the system reorganize.'],
 'assets/site.css':['v3.2 MATERIAL LIVING LAYER','material-word-active','v3-atlas.material-hit','v3-lab-theatre.material-hit'],
 'assets/site.js':['launchMaterialResponse',"import('./material.js')","launchMaterialResponse(id,'interaction')"],
 'assets/material.js':['launchMaterialResponse','function targets','function draw'],
 'data/release-profile.json':['"release": "3.2"'],
 'data/living-world-v32.json':['"release": "3.2"','"bridgeRenderer": "Canvas2D"','"semanticWordUnderline": false']
}
errors=[]
for path,markers in checks.items():
    try: body=urllib.request.urlopen(base+path,timeout=10).read().decode('utf-8')
    except Exception as e: errors.append(f'{path}: {e}');continue
    for m in markers:
        if m not in body: errors.append(f'{path}: missing {m}')
if errors:
    [print('FAIL',e) for e in errors];raise SystemExit(1)
print('PASS deployed v3.2 material living surface')
