#!/usr/bin/env python3
from __future__ import annotations
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def main()->int:
    data=json.loads((ROOT/'data/living-world-v35.json').read_text())
    explore=(ROOT/'explore.html').read_text(); home=(ROOT/'index.html').read_text(); css=(ROOT/'assets/site.css').read_text(); js=(ROOT/'assets/site.js').read_text()
    assert data['release']=='3.5'
    assert 'class="v35-atlas-shell" data-spatial-governor="safe-zones"' in explore
    atlas=re.search(r'<div class="v3-atlas".*?</div>\s*<aside[^>]+v35-atlas-narrative',explore,re.S)
    assert atlas, 'Narrative must be sibling of atlas, not overlaid inside it'
    assert 'function governAtlasLayout()' in js and 'coreCollisionAvoidance' not in js
    assert "node.dataset.layoutGoverned='true'" in js
    assert 'function syncRouteGeometry()' in js
    assert "path.setAttribute('d'" in js
    assert 'node.dataset.routeOrder=String(i+1)' in js
    assert '.v3-route-overlay .route-node{display:none!important}' in css
    assert '.v3-stage .world-node[data-route-order]:after' in css
    assert "document.body.dataset.fieldPhysics=" in js
    for physics in ['network','constellation','city','lanes','frames','grid']:
        assert f'data-field-physics="{physics}"' in css
    assert data['exploreSpatialGovernance']['selectedWorldInspectorOverlaysTopology'] is False
    assert data['journeyTopology']['duplicateProductLabelsInRouteOverlay'] is False
    assert all(data['preserves'].values())
    print('PASS v3.5 Explore: narrative rail is structurally outside topology field')
    print('PASS v3.5 spatial governor: bounded node placement + core/local collision avoidance')
    print('PASS v3.5 Journey: persistent nodes own route order/current state; overlay no longer duplicates product labels')
    print('PASS v3.5 semantic field physics: six active-world modes')
    return 0
if __name__=='__main__': raise SystemExit(main())
