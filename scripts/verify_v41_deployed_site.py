#!/usr/bin/env python3
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
checks={
 'assets/site.css':['page-intro-meta','context-copy','context-resume','scroll-padding-top:calc(var(--header-h) + 18px)!important'],
 'assets/site.js':['semanticWorldHref','markActiveNavigation','history.scrollRestoration','ResizeObserver'],
 'data/living-world-v41.json':['"release": "4.1"','"introOwnedContextRail": true'],
 'data/release-profile.json':['"release": "4.1"']
}
for rel,markers in checks.items():
 text=(ROOT/rel).read_text()
 for marker in markers: assert marker in text,(rel,marker)
print('PASS deployed v4.1 context/header integrity contract')
