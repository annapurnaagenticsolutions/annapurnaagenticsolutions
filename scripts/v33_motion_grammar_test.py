#!/usr/bin/env python3
from __future__ import annotations
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def main()->int:
    data=json.loads((ROOT/'data/living-world-v33.json').read_text())
    home=(ROOT/'index.html').read_text(); css=(ROOT/'assets/site.css').read_text(); js=(ROOT/'assets/site.js').read_text(); material=(ROOT/'assets/material.js').read_text()
    explore=(ROOT/'explore.html').read_text(); lab=(ROOT/'lab.html').read_text()
    assert data['release']=='3.3'
    assert home.count('class="living-stage v2-stage v3-stage"')==1
    assert 'grid-template-areas:"story world"!important' in css
    assert '.v3-story-shell{overflow:visible!important' in css
    assert 'grid-area:world!important;grid-row:1!important;grid-column:2!important' in css
    assert '<section class="v3-beat v3-beat-journey"' in home
    assert '</section>\n      <div aria-live="polite" class="living-receipt"' in home
    assert 'body[data-v3-beat="journey"] .v3-stage{display:block!important;visibility:visible!important;opacity:1!important}' in css
    assert 'v3-route-overlay' in home and 'cta-arrival-signal' in home
    assert data['motionGrammar']['phases']==['sense','anticipate','transform','propagate','settle']
    assert 'function runMotionGrammar' in js and "dataset.motionPhase='anticipate'" in js and "dataset.motionPhase='propagate'" in js
    assert 'particleTrails' in (ROOT/'data/living-world-v33.json').read_text() and 'ctx.lineTo(x,y)' in material
    assert "dataset.runtimeState=b.dataset.runtime" in js and 'v33-fracture' in css
    assert "dataset.axonState=b.dataset.axon" in js
    assert 'material-propagate' in css and 'material-propagate' in js
    assert '.depth-word:after{display:none!important;content:none!important}' in css
    assert '<u>' not in home.lower()
    assert data['journey']['persistentStageThroughBeats'] is True
    assert data['journey']['storyShellClipsStickyStage'] is False
    assert data['material']['newWebGLContext'] is False
    assert data['explore']['newPanelAdded'] is False
    assert not any(data['truthBoundary'].values())
    print('PASS v3.3 journey reconstruction: persistent stage is structurally preserved through Establish -> Focus -> Journey')
    print('PASS motion grammar/material visibility: anticipate -> transform -> propagate -> settle without new WebGL/framework')
    return 0
if __name__=='__main__': raise SystemExit(main())
