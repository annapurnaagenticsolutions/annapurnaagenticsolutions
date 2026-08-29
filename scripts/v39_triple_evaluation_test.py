#!/usr/bin/env python3
from pathlib import Path
import json,re
ROOT=Path(__file__).resolve().parents[1]
def main():
    data=json.loads((ROOT/'data/living-world-v39.json').read_text())
    css=(ROOT/'assets/site.css').read_text();js=(ROOT/'assets/site.js').read_text();home=(ROOT/'index.html').read_text();evidence=(ROOT/'evidence.html').read_text()
    assert data['release']=='4.0'
    for group in ['evaluationPasses','typography','opticalMaterial','continuity','preserves']:
        assert all(data[group].values()),group
    for token in ['--type-home-display','--type-page-h1','--type-major-h2','--type-support-h3','--rhythm-intro-top','--glass-blur']:
        assert token in css,token
    tail=css.split('/* v4.0 — Triple Evaluation Stabilization',1)[1]
    assert re.search(r'\.v3-beat-establish h1\{[^}]*font-size:var\(--type-home-display\)!important',tail,re.S)
    assert re.search(r'\.v3-page-intro h1,\.page-hero h1\{[^}]*font-size:var\(--type-page-h1\)!important',tail,re.S)
    assert 'mobileStickyHeaderBlurDisabled' in (ROOT/'data/living-world-v39.json').read_text()
    assert re.search(r'@media\(max-width:760px\)[\s\S]*?\.site-header\{[^}]*backdrop-filter:none!important',tail)
    assert not re.search(r'\.v3-stage[^\{]*\{[^}]*backdrop-filter',tail,re.S)
    assert 'id="cta-context"' in home and 'continuity-cue' in home
    assert 'renderContinuityCue' in js and "Current trail ·" in js
    assert 'evidence-path-strip' in evidence and 'Limit / conflict' in evidence
    assert 'evidence-note-label' in js and 'Evidence note' in js
    assert 'transform:none!important' in tail and '.v3-evidence .evidence-card:hover' in tail
    print('PASS v4.0 evaluation 1: semantic typography + cross-page visual rhythm')
    print('PASS v4.0 evaluation 2: selective glass restraint + mobile cost reduction')
    print('PASS v4.0 evaluation 3: journey-exit continuity + explicit Evidence inspection grammar')
    return 0
if __name__=='__main__': raise SystemExit(main())
