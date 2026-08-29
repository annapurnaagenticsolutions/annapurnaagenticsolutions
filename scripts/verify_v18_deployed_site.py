#!/usr/bin/env python3
from __future__ import annotations
import sys,urllib.request,json
base=(sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8000/').rstrip('/')+'/'
checks={
 'index.html':['AI systems, learning products and digital experiences in motion.','stage-atmosphere','Connected journey','Current route'],
 'explore.html':['Product worlds'],
 'lab.html':['Interactive Lab','Change the inputs. Watch the system respond.'],
 'evidence.html':['Evidence'],
 'assets/site.css':['v1.8 — immersive rebalance'],
 'assets/site.js':['annapurnaLivingV18','mountHeroChoreography','renderFeaturedRoute'],
 'data/release-profile.json':['"release": "1.8"'],
 'data/immersive-experience.json':['experience-first','"worldCount": 6']
}
errors=[]
for path,markers in checks.items():
    try:
        body=urllib.request.urlopen(base+path,timeout=10).read().decode('utf-8')
    except Exception as e:errors.append(f'{path}: {e}');continue
    for m in markers:
        if m not in body:errors.append(f'{path}: missing {m}')
if errors:
    [print('FAIL',e) for e in errors];raise SystemExit(1)
print('PASS deployed v1.8 adaptive + immersive + interactive surface')
