#!/usr/bin/env python3
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
checks={
 'index.html':['id="cta-context"','continuity-cue','Connected.</span>'],
 'evidence.html':['evidence-path-strip','Limit / conflict'],
 'assets/site.css':['v4.0 — Triple Evaluation Stabilization','--rhythm-intro-top','--glass-blur'],
 'assets/site.js':['renderContinuityCue','evidence-note-label'],
 'data/release-profile.json':['"release": "4.0"'],
 'data/living-world-v39.json':['"release": "4.0"','"homeExitShowsCurrentTrail": true']
}
for rel,markers in checks.items():
    text=(ROOT/rel).read_text()
    for marker in markers: assert marker in text,(rel,marker)
print('PASS deployed v4.0 triple-evaluation stabilization contract')
