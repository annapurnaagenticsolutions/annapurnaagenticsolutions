#!/usr/bin/env python3
from __future__ import annotations
import json,re
from pathlib import Path
from html.parser import HTMLParser
ROOT=Path(__file__).resolve().parents[1]

class TreeProbe(HTMLParser):
    def __init__(self):
        super().__init__(); self.stack=[]; self.stage_detail_inside=False; self.sections=0
    def handle_starttag(self,tag,attrs):
        a=dict(attrs); classes=set(a.get('class','').split()); inside_stage=any('living-stage' in c for c in self.stack)
        if tag=='section': self.sections+=1
        if a.get('id')=='stage-detail' and inside_stage: self.stage_detail_inside=True
        marker='living-stage' if 'living-stage' in classes else ''
        if tag not in {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}: self.stack.append(marker)
    def handle_endtag(self,tag):
        if tag not in {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'} and self.stack:self.stack.pop()

def main()->int:
    cfg=json.loads((ROOT/'data/living-world-v20.json').read_text())
    home=(ROOT/'index.html').read_text(encoding='utf-8'); css=(ROOT/'assets/site.css').read_text(encoding='utf-8'); js=(ROOT/'assets/site.js').read_text(encoding='utf-8')
    p=TreeProbe();p.feed(home)
    if cfg['release']!='2.0': raise AssertionError('v2 living-world contract release mismatch')
    if p.sections!=3: raise AssertionError(f'Home must contain exactly three public acts, found {p.sections}')
    if p.stage_detail_inside: raise AssertionError('selected-world detail must stay outside the spatial field')
    if len(re.findall(r'class="world-node[^"]*"',home))!=7: raise AssertionError('seven spatial world controls required')
    for banned in ['proof-strip','focus-card','activity-card','public-pulse']:
        if banned in home: raise AssertionError(f'dashboard-style Home element leaked back: {banned}')
    for marker in ['v2-stage','v2-journey','v2-route-track','route-curve','Trace its connections','Explore through']:
        if marker not in home: raise AssertionError(f'v2 public experience missing {marker}')
    for marker in ['.v2-stage .world-node','background:transparent!important','v2-journey-shell','position:sticky','offset-path:path','v2-field-line']:
        if marker not in css: raise AssertionError(f'v2 spatial style missing {marker}')
    for marker in ['traceJourney','activateRouteStep','mountHeroChoreography','mountContinuityField','AnnapurnaPageAgent','annapurnaLivingV20']:
        if marker not in js: raise AssertionError(f'v2 runtime missing {marker}')
    if 'source===\'journey\'' in js: raise AssertionError('guided auto-steps must not persist as deliberate exploration')
    print('PASS v2.0 living world: 3-act Home, detail outside field, six spatial points, sticky connected journey')
    print('PASS no dashboard relapse: public metrics/capability-card blocks removed from Home')
    return 0
if __name__=='__main__': raise SystemExit(main())
