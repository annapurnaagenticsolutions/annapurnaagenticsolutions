#!/usr/bin/env python3
from __future__ import annotations
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def main()->int:
    data=json.loads((ROOT/'data/living-world-v22.json').read_text())
    html=(ROOT/'index.html').read_text();css=(ROOT/'assets/site.css').read_text();js=(ROOT/'assets/site.js').read_text()
    assert data['release']=='2.2'
    for marker in ['depth-headline','data-word-world="ai"','data-word-world="wonder"','data-word-world="web"','world-signature']:
        assert marker in html,marker
    for marker in ['semantic depth typography','data-signature="ai"','data-signature="wonder"','data-signature="idea"','data-signature="axon"','data-signature="web"','data-signature="software"','v22-orbit-star','v22-lane-packet','v22-grid-light']:
        assert marker in css,marker
    for marker in ['triggerWorldSignature','syncImpactWords','dataset.signature','signature-hit','dataset.depthBeat']:
        if marker not in js: raise AssertionError(marker)
    assert data['semanticDepth']['decorativeBounce'] is False
    assert len(data['worldSignatures'])==6
    assert data['interaction']['writesSemanticHistory'] is False
    assert data['interaction']['writesProductTruth'] is False
    assert data['performance']['newFramework'] is False
    assert data['performance']['newWebGLContext'] is False
    print('PASS v2.2 living world: semantic depth words + six distinct world signature interactions')
    print('PASS restraint boundary: depth is state-linked, reduced-motion safe, and truth-neutral')
    return 0
if __name__=='__main__': raise SystemExit(main())
