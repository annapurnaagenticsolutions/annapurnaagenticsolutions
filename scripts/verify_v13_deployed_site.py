#!/usr/bin/env python3
from __future__ import annotations
import sys,urllib.request
from urllib.parse import urljoin
BASE=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8000/'
if not BASE.endswith('/'): BASE+='/'
checks={
 '':'Digital systems that explain themselves',
 'explore.html':'Connected worlds',
 'lab.html':'Small simulations with visible cause and effect',
 'evidence.html':'Marketing claims should have an evidence path',
 'assets/site.css':'v1.3 — interaction quality + return-visit evolution',
 'assets/site.js':'annapurnaLivingV13',
 'data/evidence-manifest.json':'"claims"',
 'data/repository-signals.json':'"repositories"',
 'data/public-history.json':'"entries"',
 'data/release-profile.json':'"release": "1.3"',
 'data/interaction-model.json':'"returnStates"',
 'data/world-presentation.json':'"sceneArchetype"',
}
for path,marker in checks.items():
    url=urljoin(BASE,path)
    with urllib.request.urlopen(url,timeout=15) as r:
        body=r.read().decode('utf-8','replace')
        if r.status!=200 or marker not in body: raise SystemExit(f'FAIL {url}')
    print('PASS',url)
print('PASS deployed v1.3 living surface')
