#!/usr/bin/env python3
from __future__ import annotations
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def main()->int:
    data=json.loads((ROOT/'data/living-world-v32.json').read_text())
    home=(ROOT/'index.html').read_text()
    explore=(ROOT/'explore.html').read_text()
    lab=(ROOT/'lab.html').read_text()
    css=(ROOT/'assets/site.css').read_text()
    js=(ROOT/'assets/site.js').read_text(); material=(ROOT/'assets/material.js').read_text()
    assert data['release']=='3.2'
    assert 'id="material-canvas"' in home and home.count('id="material-canvas"')==1
    assert data['home']['bridgeRenderer']=='Canvas2D' and data['home']['lazyLoaded'] is True
    assert data['home']['newWebGLContext'] is False
    assert data['home']['semanticWordUnderline'] is False
    assert '.depth-word:after{display:none!important;content:none!important}' in css
    assert '<u>' not in home.lower()
    assert "import('./material.js')" in js
    for marker in ['launchMaterialResponse','targets','draw','particles','material-word-active']:
        assert marker in material,marker
    for marker in ['material-canvas','material-word-active','v3-stage.material-hit','v3-atlas.material-hit','v3-lab-theatre.material-hit']:
        assert marker in css,marker
    for marker in ["launchMaterialResponse(id,'interaction')","launchMaterialResponse(activeWorld,'scroll')","theatre.classList.add('material-hit')","atlas.classList.add('material-hit')"]:
        assert marker in js,marker
    assert data['motion']['autoplayLoopWithoutSignal'] is False
    assert data['motion']['reducedMotionDisablesBridgeCanvas'] is True
    assert data['motion']['mobileDisablesBridgeCanvas'] is True
    assert not any(data['truthBoundary'].values())
    assert data['performance']['newFramework'] is False
    assert data['performance']['thirdPartyRuntimeAdded'] is False
    assert data['performance']['newWebGLContext'] is False
    assert 'material-canvas' not in explore and 'material-canvas' not in lab
    print('PASS v3.2 material living layer: state-linked Canvas2D bridge forms world-specific structures and settles')
    print('PASS restraint/truth boundary: no underline, no new WebGL/framework, no persisted material state or product/evidence writes')
    return 0
if __name__=='__main__': raise SystemExit(main())
