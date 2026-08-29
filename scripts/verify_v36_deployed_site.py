#!/usr/bin/env python3
from __future__ import annotations
import sys,urllib.request
base=(sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8000/').rstrip('/')+'/'
checks={
 'index.html':['v3-story-shell','data-structural-anchor="home-story"','v3-route-overlay'],
 'explore.html':['v35-atlas-shell','Six worlds. One connected field.'],
 'lab.html':['v3-lab-theatre','Change an input. Watch the system reorganize.'],
 'evidence.html':['Marketing claims should have an evidence path.'],
 'assets/site.css':['--type-display','v3.6 — Typography & Visual Rhythm','body:not([data-v3-beat="journey"])','stroke-dasharray:5 10'],
 'data/release-profile.json':['"release": "3.6"'],
 'data/living-world-v36.json':['"release": "3.6"','"routeOrderBadgesVisibleOnlyDuringJourney": true']
}
errors=[]
for path,markers in checks.items():
    try: body=urllib.request.urlopen(base+path,timeout=10).read().decode('utf-8')
    except Exception as e: errors.append(f'{path}: {e}');continue
    for m in markers:
        if m not in body: errors.append(f'{path}: missing {m}')
if errors:
    [print('FAIL',e) for e in errors];raise SystemExit(1)
print('PASS deployed v3.6 typography rhythm + Journey signal + responsive contract')
