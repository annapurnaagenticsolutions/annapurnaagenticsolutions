#!/usr/bin/env python3
from __future__ import annotations
import sys,urllib.request
base=(sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8000/').rstrip('/')+'/'
checks={
 'index.html':['v3-story-shell','v3-beat v3-beat-journey','cta-arrival-signal','material-canvas'],
 'explore.html':['v3-atlas','Six worlds. One connected field.'],
 'lab.html':['v3-lab-theatre','Change an input. Watch the system reorganize.'],
 'assets/site.css':['grid-template-areas:"story world"!important','v33-fracture','cta-arrival-signal','material-propagate'],
 'assets/site.js':['runMotionGrammar','dataset.runtimeState','dataset.axonState','material-propagate'],
 'assets/material.js':['ctx.lineTo(x,y)','launchMaterialResponse'],
 'data/release-profile.json':['"release": "3.3"'],
 'data/living-world-v33.json':['"release": "3.3"','"persistentStageThroughBeats": true','"particleTrails": true']
}
errors=[]
for path,markers in checks.items():
    try: body=urllib.request.urlopen(base+path,timeout=10).read().decode('utf-8')
    except Exception as e: errors.append(f'{path}: {e}');continue
    for m in markers:
        if m not in body: errors.append(f'{path}: missing {m}')
if errors:
    [print('FAIL',e) for e in errors];raise SystemExit(1)
print('PASS deployed v3.3 journey continuity + motion grammar + material visibility surface')
