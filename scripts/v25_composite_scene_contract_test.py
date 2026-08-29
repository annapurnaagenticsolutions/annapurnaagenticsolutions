#!/usr/bin/env python3
from __future__ import annotations
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def main()->int:
    data=json.loads((ROOT/'data/living-world-v25.json').read_text())
    graph=json.loads((ROOT/'data/interaction-model.json').read_text())['connections']
    js=(ROOT/'assets/site.js').read_text();css=(ROOT/'assets/site.css').read_text()
    assert data['release']=='2.5'
    assert len(data['composites'])==4
    for combo in data['composites']:
        seq=combo['sequence']
        assert len(seq)==3 and len(set(seq))==3
        for a,b in zip(seq,seq[1:]):
            assert b in graph[a],f'{combo["id"]}: {a}->{b} is not an existing connection'
    for marker in ['emergentComposites','completedCausalTrace','triggerComposite','releaseComposite','recordWorldCompletion','activeComposite']:
        assert marker in js,marker
    for marker in ['data-composite="governed-runtime"','data-composite="learning-experience"','data-composite="prototype-system"','data-composite="experience-action"','composite-member','composite-emerged']:
        assert marker in css,marker
    assert not any(data['truthBoundary'].values())
    assert data['unlock']['persistsAcrossPageLoads'] is False
    assert data['unlock']['menuOrBadgeRequired'] is False
    assert data['unlock']['requiresConnectedEdges'] is True
    assert data['unlock']['requiresConsequenceConsumption'] is True
    assert 'completedCausalTrace' in js and 'inheritedFrom' in js
    print('PASS v2.5 emergent composites: four exact connected three-world sequences')
    print('PASS presentation boundary: composite scenes are ephemeral and do not claim live product composition')
    return 0
if __name__=='__main__': raise SystemExit(main())
