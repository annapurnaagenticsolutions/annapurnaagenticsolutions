#!/usr/bin/env python3
from __future__ import annotations
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def main()->int:
 temporal=json.loads((ROOT/'data/temporal-state.json').read_text());sensory=json.loads((ROOT/'data/sensory-model.json').read_text());js=(ROOT/'assets/site.js').read_text();css=(ROOT/'assets/site.css').read_text();home=(ROOT/'index.html').read_text()
 if temporal['generationIntervalDays']<1:raise AssertionError('temporal interval must be configurable and positive')
 policy=temporal['sourcePolicy'].lower()
 for phrase in ['cannot alter product maturity','semantic company history']:
  if phrase not in policy:raise AssertionError('temporal truth firewall missing '+phrase)
 if temporal['signals']['weather']['enabled'] is not False:raise AssertionError('weather must remain disabled until deliberate home-base configuration')
 if len(sensory['scrollBeats'])<3 or len(sensory['scrollBeats'])>5:raise AssertionError('3-5 discrete scroll beats required')
 if sensory['narrativeTransitions']['maxDurationMs']>800:raise AssertionError('narrative transition exceeds 800ms')
 skipped=' '.join(sensory['explicitlySkipped']).lower()
 for bad in ['cursor trails','magnetic hover buttons','custom cursor','confetti','parallax-everything']:
  if bad not in skipped:raise AssertionError('explicit skip missing '+bad)
 for marker in ['applyTemporalState','applyLocalMoment','mountScrollChoreography','temporal-state.json','sensory-model.json','dataset.motion','explainTemporalState']:
  if marker not in js:raise AssertionError('runtime missing '+marker)
 for marker in ['local-moment','shared-temporal','sensory-beat']:
  if marker not in home:raise AssertionError('home missing '+marker)
 if '@media(prefers-reduced-motion:reduce)' not in css or 'core-breathe' not in css:raise AssertionError('reduced-motion/breathing contract missing')
 print('PASS temporal + sensory contract: authoritative shared state, local ambience, 3-5 scroll beats, safe motion fallbacks')
 return 0
if __name__=='__main__':raise SystemExit(main())
