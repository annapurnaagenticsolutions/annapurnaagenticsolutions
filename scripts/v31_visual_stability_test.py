#!/usr/bin/env python3
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
def main():
    data=json.loads((ROOT/'data/living-world-v31.json').read_text())
    home=(ROOT/'index.html').read_text(); css=(ROOT/'assets/site.css').read_text(); js=(ROOT/'assets/site.js').read_text(); lab=(ROOT/'lab.html').read_text()
    assert data['release']=='3.1'
    assert 'v3-beat v3-beat-journey route-section' not in home
    assert 'digital experiences</span>—' not in home
    assert ('>Connected</span>.' in home) or ('>Connected.</span>' in home)
    assert '.v3-story-grid{' in css and 'align-items:stretch!important' in css
    assert '.v3-world-rail{' in css and 'align-self:stretch!important' in css
    assert "const section=$('#living-response'),track=$('#route-track');" in js
    assert "beat==='journey'&&path.includes(n.dataset.world)" in js
    assert '.depth-word:after{display:none!important;content:none!important}' in css
    assert '.v3-atlas .atlas-node:not(.active):not(.atlas-related){opacity:.64!important}' in css
    assert 'position:sticky!important' in css and 'top:84px!important' in css
    assert 'The previous landing page tried' not in lab
    assert data['scope']['newFeatureLayer'] is False
    assert data['scope']['truthModelChanged'] is False
    print('PASS v3.1 visual stability: sticky world persists through Journey and legacy route coupling is removed')
    print('PASS typography/inner pages: no underline, no dash artifact, readable Atlas states, compact sticky Lab rail')
    return 0
if __name__=='__main__': raise SystemExit(main())
