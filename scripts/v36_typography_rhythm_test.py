#!/usr/bin/env python3
from pathlib import Path
import json,re
ROOT=Path(__file__).resolve().parents[1]
def main():
    data=json.loads((ROOT/'data/living-world-v36.json').read_text())
    css=(ROOT/'assets/site.css').read_text()
    assert data['release']=='3.6'
    for token in ['--type-display','--type-section-display','--type-scene-title','--type-section-title','--type-lead']:
        assert token in css, token
    shared=re.search(r'\.v3-beat-establish h1,\s*\.v3-page-intro h1,\s*\.page-hero h1\{[^}]*font-size:var\(--type-display\)!important',css,re.S)
    assert shared,'display token must be shared across semantic H1 surfaces'
    assert 'body:not([data-v3-beat="journey"]) .v3-stage .world-node[data-route-order]:after' in css
    assert 'display:none!important;content:none!important' in css
    assert 'body[data-v3-beat="journey"] .v3-route-overlay .route-curve path' in css
    assert 'stroke-width:1.2!important' in css and 'stroke-dasharray:5 10!important' in css
    assert '.v35-atlas-shell{grid-template-columns:minmax(280px,320px) minmax(0,1fr)!important}' in css
    assert '.v3-atlas .atlas-node.active{transform:translate3d(0,-4px,18px)!important}' in css
    assert '--type-display:clamp(34px,9.4vw,40px)' in css and '@media(max-width:430px)' in css
    assert all(data['typography'].values()) and all(data['visualRhythm'].values()) and all(data['journeySignal'].values())
    assert all(data['preserves'].values())
    print('PASS v3.6 shared typography tokens + visual rhythm contract')
    print('PASS v3.6 Journey badges are state-scoped and route signal is quieter')
    print('PASS v3.6 responsive typography is explicitly bounded for tablet/mobile acceptance')
    return 0
if __name__=='__main__': raise SystemExit(main())
