#!/usr/bin/env python3
from __future__ import annotations
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def main()->int:
    data=json.loads((ROOT/'data/living-world-v34.json').read_text())
    home=(ROOT/'index.html').read_text(); css=(ROOT/'assets/site.css').read_text(); js=(ROOT/'assets/site.js').read_text()
    assert data['release']=='3.4'
    assert 'class="v3-story-copy" data-structural-anchor="home-story"' in home
    story=re.search(r'<div class="v3-story-copy" data-structural-anchor="home-story">(.*?)<div class="v3-world-rail">',home,re.S)
    assert story and 'id="living-response"' in story.group(1), 'Journey must remain inside story copy'
    assert "!el.closest('[data-structural-anchor]')&&el.parentElement===main" in js
    assert "main.insertBefore(el,cta)" in js
    assert 'data.adaptiveRank' not in js
    assert 'el.dataset.adaptiveRank=i' in js
    assert '.v3-story-copy[data-structural-anchor="home-story"] > #living-response' in css
    assert 'body[data-v3-beat="journey"] .v3-world-rail' in css
    assert 'v3-route-overlay' in home
    assert data['journeyFrame']['adaptivePriorityCanReparentAnchoredBlocks'] is False
    assert data['adaptiveStructure']['nestedAnchoredBlocksMayReorder'] is False
    assert data['adaptiveStructure']['intentStillChangesRoute'] is True
    assert all(data['preserves'].values())
    assert not any(data['truthBoundary'].values())
    print('PASS v3.4 Journey ownership: adaptive priority cannot detach Journey from story/world grid')
    print('PASS v3.4 alignment contract: Journey remains wrapped left while persistent world rail remains right')
    return 0
if __name__=='__main__': raise SystemExit(main())
