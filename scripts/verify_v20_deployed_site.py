#!/usr/bin/env python3
from __future__ import annotations
import sys,urllib.request
base=(sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8000/').rstrip('/')+'/'
checks={
 'index.html':['AI systems, learning products and digital experiences—connected.','v2-stage','Trace its connections','Connected journey','v2-route-track'],
 'explore.html':['Six product worlds','world-card'],
 'lab.html':['Interactive Lab','Change the inputs. Watch the system respond.'],
 'evidence.html':['Evidence'],
 'assets/site.css':['v2.0 — Living World presentation','v2-journey-shell','offset-path:path'],
 'assets/site.js':['annapurnaLivingV20','traceJourney','mountContinuityField','mountHeroChoreography'],
 'data/release-profile.json':['"release": "2.0"'],
 'data/living-world-v20.json':['"release": "2.0"','"publicMetricsOnHome": false'],
 'data/immersive-experience.json':['experience-first','"guidedJourney": true']
}
errors=[]
for path,markers in checks.items():
    try:body=urllib.request.urlopen(base+path,timeout=10).read().decode('utf-8')
    except Exception as e:errors.append(f'{path}: {e}');continue
    for m in markers:
        if m not in body:errors.append(f'{path}: missing {m}')
if errors:
    [print('FAIL',e) for e in errors];raise SystemExit(1)
print('PASS deployed v2.0 three-act living world + spatial ecosystem + connected journey surface')
