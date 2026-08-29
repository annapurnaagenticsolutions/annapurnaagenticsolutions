#!/usr/bin/env python3
from __future__ import annotations
import json,re
from html.parser import HTMLParser
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

class Counter(HTMLParser):
    def __init__(self):
        super().__init__();self.sections=0
    def handle_starttag(self,tag,attrs):
        if tag=='section':self.sections+=1

def main()->int:
    data=json.loads((ROOT/'data/living-world-v30.json').read_text())
    home=(ROOT/'index.html').read_text()
    explore=(ROOT/'explore.html').read_text()
    lab=(ROOT/'lab.html').read_text()
    css=(ROOT/'assets/site.css').read_text()
    js=(ROOT/'assets/site.js').read_text()

    assert data['release']=='3.0'
    p=Counter();p.feed(home);assert p.sections==3,p.sections
    assert home.count('class="living-stage v2-stage v3-stage"')==1
    for beat in ['establish','focus','journey']:
        assert f'data-v3-beat="{beat}"' in home
    assert 'v3-route-overlay' in home and home.index('v3-route-overlay')>home.index('v3-stage')
    assert '.depth-word:after{display:none!important;content:none!important}' in css
    assert '<u>' not in home.lower()
    assert data['home']['impactWords']['underlined'] is False

    assert 'v3-atlas' in explore and 'v3-atlas-nodes' in explore and 'v3-atlas-inspector' in explore
    assert 'worlds-layout' not in explore
    assert 'v3-lab-theatre' in lab and 'v3-lab-stage' in lab
    assert lab.count('data-sim-card=')==3
    assert 'The previous landing page tried' not in lab

    assert '#adaptive-context{display:none!important}' in css
    assert "function renderCrossPageContext(config)" in js and "$('#adaptive-context')?.remove()" in js
    assert 'activateLabMode' in js
    assert "document.body.dataset.v3Beat" in js
    assert data['sensory']['narrativeAwareTransitionsMaxMs']<=800
    assert data['sensory']['newWebGLContext'] is False
    assert data['truthBoundary']['presentationMayChangeProductTruth'] is False

    print('PASS v3.0 experience reconstruction: one persistent Home world + three directed beats')
    print('PASS impact typography: semantic depth with no underline treatment')
    print('PASS inner pages: spatial Explore atlas + single Interaction Theatre + hidden adaptive diagnostics')
    return 0

if __name__=='__main__': raise SystemExit(main())
