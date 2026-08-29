#!/usr/bin/env python3
from __future__ import annotations
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def main():
    model=json.loads((ROOT/'data/perceived-liveness-model.json').read_text())
    home=(ROOT/'index.html').read_text()
    js=(ROOT/'assets/site.js').read_text()
    css=(ROOT/'assets/site.css').read_text()
    if 'id="living-receipt"' not in home or not re.search(r'<div(?=[^>]*id="living-receipt")(?=[^>]*hidden)[^>]*>',home): raise AssertionError('adaptive receipt must remain runtime-only/hidden in v1.9')
    for marker in ['scene-word','trace-journey','journey-progress','stage-atmosphere','first-visit-cue']:
        if marker not in home: raise AssertionError(f'missing perceived-liveness marker: {marker}')
    if len(model.get('signals',[]))<4 or len(model.get('responses',[]))<4: raise AssertionError('need >=4 real signals and responses')
    if not model.get('motionPolicy',{}).get('causeEffectOnly'): raise AssertionError('motion must be cause/effect tied')
    if model.get('motionPolicy',{}).get('autoplayLoops') is not False: raise AssertionError('autoplay loops must remain off')
    for marker in ['renderCrossPageContext','animateStructuralResponse','annapurnaLivingV19','traceJourney','mountContinuityField']:
        if marker not in js: raise AssertionError(f'JS missing {marker}')
    if "source!=='explicit'" not in js: raise AssertionError('structural motion must only trigger for explicit intent')
    for forbidden in ['cursor-trail','custom-cursor','confetti','magnetic-button']:
        if forbidden in css.lower() or forbidden in js.lower(): raise AssertionError(f'forbidden trope found: {forbidden}')
    if 'prefers-reduced-motion:reduce' not in css: raise AssertionError('reduced motion policy missing')
    print('PASS perceived liveness: whole-scene reframing + guided path + local continuity without visible methodology receipt')
    print('PASS causality boundary: structural motion follows explicit user intent; no autoplay/trope effects')
    return 0
if __name__=='__main__': raise SystemExit(main())
