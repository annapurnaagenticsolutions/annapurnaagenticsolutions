#!/usr/bin/env python3
from urllib.request import urlopen
import sys
base=(sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8000/').rstrip('/')+'/'
checks={
 'index.html':['Annapurna Agentic Solutions','Explore the ecosystem'],
 'explore.html':['Six worlds. One connected field.','world-inspector'],
 'lab.html':['Change an input. Watch the system reorganize.','Runtime Integrity'],
 'evidence.html':['Marketing claims should have an evidence path.','evidence-focus'],
 'assets/site.js':['semanticWorldHref','mountPageContext','markActiveNavigation'],
 'assets/site.css':['page-intro-meta','context-resume','scroll-padding-top:calc(var(--header-h) + 18px)!important'],
 'data/living-world-v41.json':['"release": "4.1"']
}
for rel,markers in checks.items():
    with urlopen(base+rel,timeout=10) as r:
        assert r.status==200,(rel,r.status)
        text=r.read().decode('utf-8')
    for marker in markers:
        assert marker in text,(rel,marker)
print('PASS v4.1 local HTTP surface: routes + context/header integrity markers')
