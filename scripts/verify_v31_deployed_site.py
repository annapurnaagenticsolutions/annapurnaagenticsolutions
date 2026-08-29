#!/usr/bin/env python3
import sys,urllib.request
base=(sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8000/').rstrip('/')+'/'
checks={
 'index.html':['v3-story-shell','v3-beat v3-beat-journey','>Connected</span>.'],
 'explore.html':['v3-atlas','Six worlds. One connected field.'],
 'lab.html':['v3-lab-theatre','Change an input. Watch the system reorganize.'],
 'assets/site.css':['v3.1 VISUAL / STABILITY CORRECTION','align-self:stretch!important','.v3-atlas .atlas-node:not(.active):not(.atlas-related){opacity:.64!important}'],
 'assets/site.js':["const section=$('#living-response'),track=$('#route-track');","beat==='journey'&&path.includes(n.dataset.world)"],
 'data/release-profile.json':['"release": "3.1"'],
 'data/living-world-v31.json':['"release": "3.1"','"newFeatureLayer": false']
}
errors=[]
for path,markers in checks.items():
    try: body=urllib.request.urlopen(base+path,timeout=10).read().decode('utf-8')
    except Exception as e: errors.append(f'{path}: {e}');continue
    for m in markers:
        if m not in body: errors.append(f'{path}: missing {m}')
if errors:
    [print('FAIL',e) for e in errors];raise SystemExit(1)
print('PASS deployed v3.1 corrected persistent-world / Atlas / Lab surface')
