#!/usr/bin/env python3
from __future__ import annotations
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def main():
    cfg=json.loads((ROOT/'data/immersive-coherence.json').read_text())
    home=(ROOT/'index.html').read_text()
    css=(ROOT/'assets/site.css').read_text()
    js=(ROOT/'assets/site.js').read_text()
    if cfg['release']!='1.9': raise AssertionError('coherence release must be 1.9')
    for marker in ['trace-journey','scene-word','journey-progress']:
        if marker not in home: raise AssertionError(f'missing {marker}')
    for marker in ['traceJourney','buildJourney','mountContinuityField','--world-accent','--scene-x']:
        if marker not in js+css: raise AssertionError(f'missing immersive coherence runtime/style marker {marker}')
    if not re.search(r'<div(?=[^>]*id="living-receipt")(?=[^>]*hidden)[^>]*>',home): raise AssertionError('internal adaptive receipt must not be visible')
    if not re.search(r'<span(?=[^>]*class="stage-status[^"]*")(?=[^>]*hidden)[^>]*>',home): raise AssertionError('internal phase status must not be visible')
    if "source==='journey'" in js: raise AssertionError('journey auto-steps must not be persisted as deliberate interaction')
    if "source==='interaction'||source==='related'||source==='swipe'" not in js: raise AssertionError('memory boundary changed unexpectedly')
    if '.world-card:before' not in css: raise AssertionError('Explore mini-scene preview missing')
    print('PASS v1.9 immersive coherence: scene reframing + user-triggered path + explore scene previews + hidden methodology state')
    return 0
if __name__=='__main__': raise SystemExit(main())
