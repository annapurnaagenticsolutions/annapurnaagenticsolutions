#!/usr/bin/env python3
from __future__ import annotations
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def main()->int:
    data=json.loads((ROOT/'data/living-world-v24.json').read_text())
    model=json.loads((ROOT/'data/interaction-model.json').read_text())
    js=(ROOT/'assets/site.js').read_text()
    css=(ROOT/'assets/site.css').read_text()
    assert data['release']=='2.4'
    assert set(data['causalLinks'])==set(model['connections'])
    for source,links in data['causalLinks'].items():
        targets=[x['target'] for x in links]
        assert targets==model['connections'][source],(source,targets,model['connections'][source])
        assert len(set(targets))==2
        assert source not in targets
    for marker in [
      'consequenceRules','consequenceState','propagateConsequences','consumeConsequence',
      'refreshConsequenceNodes','renderInheritedConsequence'
    ]: assert marker in js,marker
    for marker in ['has-consequence','consequence-source','consequence-propagating','consequence-integrated','v24-echo-breathe']:
        assert marker in css,marker
    t=data['truthBoundary']
    assert not any(t.values())
    assert data['propagation']['persistsAcrossPageLoads'] is False
    assert data['propagation']['pendingPerTarget']==1
    assert 'localStorage.setItem' not in re.sub(r'function persist\([^}]*\}\s*','',js) or 'consequenceState' not in re.findall(r'localStorage\.setItem\([^;]+',js)[0] if re.findall(r'localStorage\.setItem\([^;]+',js) else True
    print('PASS v2.4 cross-world causality: all consequences follow the existing portfolio connection graph')
    print('PASS ephemerality: one pending consequence per target; no product/evidence/history/profile persistence')
    return 0
if __name__=='__main__': raise SystemExit(main())
