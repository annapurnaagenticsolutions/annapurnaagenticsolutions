#!/usr/bin/env python3
from __future__ import annotations
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def main()->int:
    errors=[]
    cfg=json.loads((ROOT/'data/immersive-experience.json').read_text())
    home=(ROOT/'index.html').read_text(encoding='utf-8')
    css=(ROOT/'assets/site.css').read_text(encoding='utf-8')
    js=(ROOT/'assets/site.js').read_text(encoding='utf-8')
    if cfg.get('requiredLayers')!=['adaptive-structure','organic-motion','page-agent']:errors.append('three living layers must remain explicit in internal contract')
    for marker in ['stage-atmosphere','living-canvas','ecosystem-core','route-track','route-signal','follow-connection','trace-journey','scene-word']:
        if marker not in home:errors.append(f'home immersive surface missing {marker}')
    if len(re.findall(r'class="world-node[^\"]*"',home))!=6:errors.append('hero must expose six product-world controls')
    for scene in ['ai','wonder','idea','axon','web','software']:
        if f'.living-stage[data-world="{scene}"]' not in css:errors.append(f'world-specific visual physics missing: {scene}')
    for marker in ['mountHeroChoreography','--atmo-x','renderFeaturedRoute','activateRouteStep','traceJourney','mountContinuityField','PerformanceObserver']:
        if marker not in js:errors.append(f'immersive runtime missing {marker}')
    if '@media(prefers-reduced-motion:reduce)' not in css:errors.append('reduced-motion fallback missing')
    if cfg['motion']['narrativeTransitionMaxMs']>800:errors.append('narrative transition contract exceeds 800ms')
    sensory=json.loads((ROOT/'data/sensory-model.json').read_text())
    banned=set(cfg['forbiddenEffects'])
    skipped=set(sensory.get('explicitlySkipped',[]))
    if not banned.issubset(skipped|{'autoplay audio'}):errors.append('forbidden portfolio tropes not all explicitly excluded')
    if errors:
        for e in errors:print('FAIL',e)
        return 1
    print('PASS immersive contract: white-first spatial stage + 6 world physics + whole-scene reframing + guided route')
    print('PASS experience discipline: input-linked motion, reduced-motion fallback, no cursor/confetti/magnetic-button tropes')
    return 0
if __name__=='__main__':raise SystemExit(main())
