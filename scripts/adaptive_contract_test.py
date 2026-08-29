#!/usr/bin/env python3
from __future__ import annotations
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
INTENTS={'explore','enterprise','learning','msme','design'}
BLOCKS={'living'}
FAMILIES={'ai','learning','experience'}
def main()->int:
    data=json.loads((ROOT/'data/adaptive-model.json').read_text())
    if data.get('decisionMode')!='deterministic-rules-first': raise AssertionError('rules-first decision mode required')
    if len(data.get('signals',[]))!=4: raise AssertionError('exactly four explicit adaptive signals required')
    if set(data.get('intents',{}))!=INTENTS: raise AssertionError('five adaptive intents required')
    for key,cfg in data['intents'].items():
        if set(cfg['structuralOrder'])!=BLOCKS: raise AssertionError(f'{key}: v2 home structural order must keep the single immersive journey act')
        if set(cfg['focusOrder'])!=FAMILIES: raise AssertionError(f'{key}: focus order must cover all families')
        if set(cfg['worldOrder'])!={'ai','wonder','idea','axon','web','software','pramana'}: raise AssertionError(f'{key}: world order must cover six worlds')
        if set(cfg['labOrder'])!={'runtime','axon','design'}: raise AssertionError(f'{key}: lab order must cover three rehearsals')
    if 'cannot alter product maturity' not in data['historyPolicy']: raise AssertionError('truth/history firewall missing')
    if 'no identity tracking' not in data['privacyPolicy'].lower(): raise AssertionError('privacy boundary missing')
    home=(ROOT/'index.html').read_text()
    if len(re.findall(r'data-intent="(?:explore|enterprise|learning|msme|design)"',home))!=5: raise AssertionError('home must expose five explicit intent controls')
    if set(re.findall(r'data-adaptive-block="([^"]+)"',home))!=BLOCKS: raise AssertionError('adaptive home blocks do not match model')
    js=(ROOT/'assets/site.js').read_text()
    for marker in ['deriveIntent','applyIntent','filterContent','navigateToSection','highlightElement','explainCurrentView','adjustDepth','AnnapurnaPageAgent']:
        if marker not in js: raise AssertionError(f'embedded page agent missing tool: {marker}')
    if 'fetch("http' in js or "fetch('http" in js: raise AssertionError('adaptive/agent layer must not call remote runtime endpoints')
    print('PASS adaptive contract: 4 real signals -> 5 deterministic intents -> world/depth/CTA + deeper-page ordering changes')
    print('PASS embedded page agent tools + static/remote-failure safety boundary')
    return 0
if __name__=='__main__': raise SystemExit(main())
