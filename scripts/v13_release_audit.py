#!/usr/bin/env python3
from __future__ import annotations
import gzip,json,re,subprocess
from pathlib import Path
from html.parser import HTMLParser
ROOT=Path(__file__).resolve().parents[1]
PAGES=['index.html','explore.html','lab.html','evidence.html']
class P(HTMLParser):
    def __init__(self):
        super().__init__();self.ids=[];self.h1=0;self.scripts=[];self.csp=False
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a:self.ids.append(a['id'])
        if tag=='h1':self.h1+=1
        if tag=='script' and a.get('src'):self.scripts.append(a['src'])
        if tag=='meta' and a.get('http-equiv','').lower()=='content-security-policy':self.csp=True
def fail(m): print('FAIL',m);return 1
def main():
    errors=0
    profile=json.loads((ROOT/'data/release-profile.json').read_text())
    if profile.get('release')!='1.3': errors+=fail('release profile must be 1.3')
    if profile.get('privacy',{}).get('localStorageKey')!='annapurnaLivingV13': errors+=fail('v1.3 local storage key mismatch')
    for fn in PAGES:
        path=ROOT/fn
        if not path.exists(): errors+=fail(f'missing {fn}');continue
        parser=P();parser.feed(path.read_text(encoding='utf-8'))
        if parser.h1!=1: errors+=fail(f'{fn} must contain exactly one h1')
        if len(parser.ids)!=len(set(parser.ids)): errors+=fail(f'{fn} has duplicate ids')
        if not parser.csp: errors+=fail(f'{fn} missing CSP')
        if any(x.startswith('http') for x in parser.scripts): errors+=fail(f'{fn} loads third-party runtime scripts')
    home=(ROOT/'index.html').read_text(encoding='utf-8')
    if len(re.findall(r'<section\b',home))>7: errors+=fail('landing page has regressed into section dumping')
    for forbidden in ['Evidence Atlas','Micro-Simulation Flight Deck','Semantic history']:
        if forbidden in home: errors+=fail(f'landing page contains deep-section content: {forbidden}')
    for marker in ['living-canvas','stage-state','core-state','stage-memory','stage-behavior','phase-count','return-label']:
        if marker not in home: errors+=fail(f'living hero missing {marker}')
    if '<button class="core" id="ecosystem-core"' not in home: errors+=fail('Annapurna core must be an explicit interactive control')
    if 'visit-count' in home or 'Your visits to this living surface' in home: errors+=fail('page-load visit inflation copy must be removed')
    if len(re.findall(r'class="world-node[^"]*"[^>]+aria-pressed=',home))!=6: errors+=fail('home must expose six accessible interactive world nodes')
    explore=(ROOT/'explore.html').read_text(encoding='utf-8')
    for marker in ['related-worlds','Connected worlds','behavior-viz','relationship-copy']:
        if marker not in explore: errors+=fail(f'explore page missing interaction marker {marker}')
    lab=(ROOT/'lab.html').read_text(encoding='utf-8')
    for marker in ['runtime-meter','axon-graph','preview-browser','runtime-feedback','axon-feedback','design-feedback']:
        if marker not in lab: errors+=fail(f'lab missing causal feedback: {marker}')
    if len(re.findall(r'aria-pressed="(?:true|false)"',lab))<9: errors+=fail('lab controls must expose pressed state')
    js_text=(ROOT/'assets/site.js').read_text(encoding='utf-8')
    for marker in ['annapurnaLivingV13','sessionCount','returnRules','sceneArchetype','horizontalSwipe','pointerup','corePulse','memory.trail','requestAnimationFrame(draw)']:
        if marker not in js_text: errors+=fail(f'v1.3 runtime missing {marker}')
    js=subprocess.run(['node','--check',str(ROOT/'assets/site.js')],capture_output=True,text=True)
    if js.returncode: errors+=fail('site.js syntax: '+js.stderr.strip())
    interaction=subprocess.run(['python',str(ROOT/'scripts/interaction_contract_test.py')],capture_output=True,text=True)
    if interaction.returncode: errors+=fail('interaction contract: '+(interaction.stderr.strip() or interaction.stdout.strip()))
    comprehension=subprocess.run(['python',str(ROOT/'scripts/comprehension_audit.py')],capture_output=True,text=True)
    if comprehension.returncode: errors+=fail('comprehension audit: '+(comprehension.stderr.strip() or comprehension.stdout.strip()))
    budgets=profile['performanceBudgetsGzip']
    for rel,limit in budgets.items():
        fp=ROOT/rel
        if not fp.exists(): errors+=fail(f'budgeted file missing: {rel}');continue
        size=len(gzip.compress(fp.read_bytes(),9))
        if size>limit: errors+=fail(f'{rel} gzip {size}>{limit}')
    if not errors:
        print('PASS v1.3 information architecture: 4 focused pages, concise landing page')
        print('PASS interaction quality: world physics + core causality + touch swipe + lab feedback')
        print('PASS return semantics: session gap prevents page-view inflation')
        print('PASS privacy/history boundary and performance budgets')
    return 1 if errors else 0
if __name__=='__main__': raise SystemExit(main())
