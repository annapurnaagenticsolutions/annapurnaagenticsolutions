#!/usr/bin/env python3
from __future__ import annotations
import sys,urllib.request
base=(sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8000/').rstrip('/')+'/'
checks={
 'index.html':['digital experiences.</span>','data-word-world="connected">Connected.</span>','assets/public-data.js'],
 'explore.html':['v35-atlas-shell','assets/public-data.js'],
 'lab.html':['v3-lab-theatre','assets/public-data.js'],
 'evidence.html':['class="v3-evidence"','Marketing claims should have an evidence path.','assets/public-data.js'],
 'assets/site.css':['--type-home-display','--type-page-h1','--glass-fill-strong','prefers-reduced-transparency'],
 'assets/site.js':['ANNAPURNA_PUBLIC_DATA','evidence-source','evidence-conflict'],
 'assets/public-data.js':['ANNAPURNA_PUBLIC_DATA','"claims"','"repositories"','"entries"'],
 'data/release-profile.json':['"release": "3.8"'],
 'data/living-world-v38.json':['"release": "3.8"','"selectiveNotGlobal": true']
}
errors=[]
for path,markers in checks.items():
    try: body=urllib.request.urlopen(base+path,timeout=10).read().decode('utf-8')
    except Exception as e: errors.append(f'{path}: {e}');continue
    for m in markers:
        if m not in body: errors.append(f'{path}: missing {m}')
if errors:
    [print('FAIL',e) for e in errors];raise SystemExit(1)
print('PASS deployed v3.8 optical material + semantic typography + Evidence Field contract')
