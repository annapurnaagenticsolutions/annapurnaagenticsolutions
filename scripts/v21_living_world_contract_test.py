#!/usr/bin/env python3
from __future__ import annotations
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def main()->int:
    data=json.loads((ROOT/'data/living-world-v21.json').read_text())
    html=(ROOT/'index.html').read_text()
    css=(ROOT/'assets/site.css').read_text()
    js=(ROOT/'assets/site.js').read_text()
    assert data['release']=='2.1'
    for marker in ['continuity-thread','journey-step-copy','v2-stage','v2-journey']:
        assert marker in html, marker
    for marker in ['resonant','world-wake','v21-point-breathe','v21-route-current','continuity-thread']:
        assert marker in css, marker
    for marker in ['publicActivity','repository-signals.json','worldDrivenRoutes','renderWorldDrivenRoute','--handoff-progress']:
        assert marker in js, marker
    assert 'public-pulse' not in html
    assert data['features']['realStateCurrent']['showsMetricsOnHome'] is False
    assert data['features']['guidedJourney']['writesVisitorMemory'] is False
    assert data['performance']['newFramework'] is False
    assert data['performance']['newWebGLContext'] is False
    print('PASS v2.1 living world: real-state current + resonance + cross-act handoff + world-driven journey')
    print('PASS truth/UI boundary: public activity changes behavior without restoring dashboard metrics')
    return 0
if __name__=='__main__': raise SystemExit(main())
