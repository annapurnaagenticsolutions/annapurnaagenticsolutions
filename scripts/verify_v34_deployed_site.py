#!/usr/bin/env python3
from __future__ import annotations
import sys,urllib.request
base=(sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8000/').rstrip('/')+'/'
checks={
 'index.html':['v3-story-shell','data-structural-anchor="home-story"','v3-beat v3-beat-journey','cta-arrival-signal','material-canvas'],
 'explore.html':['v3-atlas','Six worlds. One connected field.'],
 'lab.html':['v3-lab-theatre','Change an input. Watch the system reorganize.'],
 'assets/site.css':['grid-template-areas:"story world"!important','data-structural-anchor="home-story"','v33-fracture','cta-arrival-signal','material-propagate'],
 'assets/site.js':['runMotionGrammar','data-structural-anchor','el.parentElement===main','dataset.runtimeState','dataset.axonState','material-propagate'],
 'assets/material.js':['ctx.lineTo(x,y)','launchMaterialResponse'],
 'data/release-profile.json':['"release": "3.4"'],
 'data/living-world-v34.json':['"release": "3.4"','"journeyRemainsChildOfStoryCopy": true','"adaptivePriorityCanReparentAnchoredBlocks": false']
}
errors=[]
for path,markers in checks.items():
    try: body=urllib.request.urlopen(base+path,timeout=10).read().decode('utf-8')
    except Exception as e: errors.append(f'{path}: {e}');continue
    for m in markers:
        if m not in body: errors.append(f'{path}: missing {m}')
if errors:
    [print('FAIL',e) for e in errors];raise SystemExit(1)
print('PASS deployed v3.4 Journey frame ownership + inherited motion/material surface')
