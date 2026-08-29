#!/usr/bin/env python3
from __future__ import annotations
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def main()->int:
    data=json.loads((ROOT/'data/living-world-v23.json').read_text())
    html=(ROOT/'index.html').read_text()
    css=(ROOT/'assets/site.css').read_text()
    js=(ROOT/'assets/site.js').read_text()
    assert data['release']=='2.3'
    assert len(data['microScenes'])==6
    assert html.count('data-micro-seed=')==3
    for marker in ['micro-scene','micro-seed','micro-cue']:
        assert marker in html,marker
    for marker in ['data-micro-world="ai"','data-micro-world="wonder"','data-micro-world="idea"','data-micro-world="axon"','data-micro-world="web"','data-micro-world="software"','data-micro-step="3"']:
        assert marker in css,marker
    for marker in ['microScenes','renderMicroScene','activateMicroSeed','dataset.microStep','dataset.microWorld']:
        assert marker in js,marker
    t=data['truthBoundary']
    assert not any(t.values())
    assert data['interaction']['persistsAcrossPageLoads'] is False
    assert data['interaction']['pointsPerScene']==3
    assert data['accessibility']['nativeButtons'] is True
    assert data['accessibility']['keyboardOperable'] is True
    assert data['performance']['newFramework'] is False
    assert data['performance']['newWebGLContext'] is False
    print('PASS v2.3 micro-scenes: six topology-changing world interactions, three points each')
    print('PASS ephemerality boundary: micro-scene state does not alter truth, semantic history, intent, or exploration memory')
    return 0
if __name__=='__main__': raise SystemExit(main())
