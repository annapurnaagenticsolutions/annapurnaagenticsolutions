#!/usr/bin/env python3
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
checks={
 'evidence.html':['id="evidence-focus"','id="evidence-toolbar"','data-evidence-filter="conflict"'],
 'assets/site.css':['page-context-ribbon','evidence-focus-shell','page-leaving','field-breathe-atlas'],
 'assets/site.js':['mountPageContext','mountNavigationContinuity','initEvidenceField','configureAgentActions','repoClaimCount'],
 'data/living-world-v40.json':['"release": "4.0"','"interactiveEvidenceField": true'],
 'data/release-profile.json':['"release": "4.0"']
}
for rel,markers in checks.items():
 text=(ROOT/rel).read_text()
 for marker in markers: assert marker in text,(rel,marker)
print('PASS deployed v4.0 six-system enhancement contract')
