#!/usr/bin/env python3
from __future__ import annotations
import gzip,json,re,subprocess
from pathlib import Path
from html.parser import HTMLParser
ROOT=Path(__file__).resolve().parents[1]
PAGES=['index.html','explore.html','lab.html','evidence.html']
class P(HTMLParser):
    def __init__(self):super().__init__();self.ids=[];self.h1=0;self.scripts=[];self.csp=False
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a:self.ids.append(a['id'])
        if tag=='h1':self.h1+=1
        if tag=='script' and a.get('src'):self.scripts.append(a['src'])
        if tag=='meta' and a.get('http-equiv','').lower()=='content-security-policy':self.csp=True
def fail(m):print('FAIL',m);return 1
def main():
    errors=0;profile=json.loads((ROOT/'data/release-profile.json').read_text())
    if profile.get('release')!='1.8':errors+=fail('release profile must be 1.8')
    if profile.get('privacy',{}).get('localStorageKey')!='annapurnaLivingV18':errors+=fail('v1.8 local storage key mismatch')
    for fn in PAGES:
        path=ROOT/fn
        if not path.exists():errors+=fail(f'missing {fn}');continue
        parser=P();parser.feed(path.read_text(encoding='utf-8'))
        if parser.h1!=1:errors+=fail(f'{fn} must contain exactly one h1')
        if len(parser.ids)!=len(set(parser.ids)):errors+=fail(f'{fn} has duplicate ids')
        if not parser.csp:errors+=fail(f'{fn} missing CSP')
        if any(x.startswith('http') for x in parser.scripts):errors+=fail(f'{fn} loads third-party runtime scripts')
    home=(ROOT/'index.html').read_text(encoding='utf-8')
    if len(re.findall(r'<section\b',home))>6:errors+=fail('landing page section count regressed')
    for marker in ['intent-chooser','adaptive-primary','follow-connection','stage-atmosphere','route-track','data-adaptive-block="proof"','data-adaptive-block="capabilities"','data-adaptive-block="living"']:
        if marker not in home:errors+=fail(f'immersive/adaptive home missing {marker}')
    if len(re.findall(r'data-intent="(?:explore|enterprise|learning|msme|design)"',home))!=5:errors+=fail('five explicit intent controls required')
    js=(ROOT/'assets/site.js').read_text(encoding='utf-8')
    for marker in ['annapurnaLivingV18','deriveIntent','reorderAdaptivePages','filterContent','navigateToSection','highlightElement','explainCurrentView','adjustDepth','AnnapurnaPageAgent','followConnection','renderFeaturedRoute','mountHeroChoreography','PerformanceObserver','data-live-count']:
        if marker not in js:errors+=fail(f'v1.8 runtime missing {marker}')
    if 'fetch("http' in js or "fetch('http" in js:errors+=fail('runtime must not fetch remote endpoints')
    tests=['interaction_contract_test.py','adaptive_contract_test.py','temporal_sensory_contract_test.py','perceived_liveness_contract_test.py','immersive_experience_contract_test.py','public_copy_audit.py','comprehension_audit.py','performance_change_test.py','first_30s_market_test.py','validate_json_schemas.py']
    for script in tests:
        r=subprocess.run(['python',str(ROOT/'scripts'/script)],capture_output=True,text=True)
        if r.returncode:errors+=fail(f'{script}: '+(r.stderr.strip() or r.stdout.strip()))
    r=subprocess.run(['node','--check',str(ROOT/'assets/site.js')],capture_output=True,text=True)
    if r.returncode:errors+=fail('site.js syntax: '+r.stderr.strip())
    budgets=profile['performanceBudgetsGzip']
    for rel,limit in budgets.items():
        fp=ROOT/rel
        if not fp.exists():errors+=fail(f'budgeted file missing: {rel}');continue
        size=len(gzip.compress(fp.read_bytes(),9))
        if size>limit:errors+=fail(f'{rel} gzip {size}>{limit}')
    if not errors:
        print('PASS v1.8 immersive rebalance: adaptive structure + spatial world + page agent remain integrated')
        print('PASS visitor-copy policy: methodology removed from public pages; experience demonstrates the concept')
        print('PASS sensory discipline: scroll/pointer/user-state motion + reduced-motion fallback + no trope effects')
        print('PASS five-section professional IA + connected journey + evidence/privacy/history firewall')
    return 1 if errors else 0
if __name__=='__main__':raise SystemExit(main())
