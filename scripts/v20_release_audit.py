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
    if profile.get('release')!='2.0':errors+=fail('release profile must be 2.0')
    if profile.get('privacy',{}).get('localStorageKey')!='annapurnaLivingV20':errors+=fail('v2.0 local storage key mismatch')
    for fn in PAGES:
        parser=P();parser.feed((ROOT/fn).read_text(encoding='utf-8'))
        if parser.h1!=1:errors+=fail(f'{fn} must contain exactly one h1')
        if len(parser.ids)!=len(set(parser.ids)):errors+=fail(f'{fn} has duplicate ids')
        if not parser.csp:errors+=fail(f'{fn} missing CSP')
        if any(x.startswith('http') for x in parser.scripts):errors+=fail(f'{fn} loads third-party runtime scripts')
    home=(ROOT/'index.html').read_text(encoding='utf-8')
    if len(re.findall(r'<section\b',home))!=3:errors+=fail('v2 Home must contain exactly three public acts')
    for marker in ['v2-stage','stage-atmosphere','ecosystem-core','follow-connection','trace-journey','v2-journey','v2-route-track','data-adaptive-block="living"']:
        if marker not in home:errors+=fail(f'v2 living world missing {marker}')
    for banned in ['proof-strip','focus-card','activity-card','public-pulse','Why “living”','Not more animation']:
        if banned.lower() in home.lower():errors+=fail(f'Home contains removed dashboard/methodology surface: {banned}')
    js=(ROOT/'assets/site.js').read_text(encoding='utf-8')
    for marker in ['annapurnaLivingV20','deriveIntent','filterContent','navigateToSection','highlightElement','adjustDepth','AnnapurnaPageAgent','followConnection','traceJourney','mountContinuityField','mountHeroChoreography','PerformanceObserver']:
        if marker not in js:errors+=fail(f'v2 runtime missing {marker}')
    tests=['interaction_contract_test.py','adaptive_contract_test.py','temporal_sensory_contract_test.py','perceived_liveness_contract_test.py','immersive_experience_contract_test.py','immersive_coherence_contract_test.py','v20_living_world_contract_test.py','public_copy_audit.py','comprehension_audit.py','performance_change_test.py','first_30s_market_test.py','validate_json_schemas.py']
    for script in tests:
        r=subprocess.run(['python',str(ROOT/'scripts'/script)],capture_output=True,text=True)
        if r.returncode:errors+=fail(f'{script}: '+(r.stderr.strip() or r.stdout.strip()))
    r=subprocess.run(['node','--check',str(ROOT/'assets/site.js')],capture_output=True,text=True)
    if r.returncode:errors+=fail('site.js syntax: '+r.stderr.strip())
    budgets=profile['performanceBudgetsGzip']
    for rel,limit in budgets.items():
        size=len(gzip.compress((ROOT/rel).read_bytes(),9))
        if size>limit:errors+=fail(f'{rel} gzip {size}>{limit}')
    if not errors:
        print('PASS v2.0 Living World: three-act Home + spatial points + connected sticky journey')
        print('PASS experience-first copy: dashboard metrics/methodology removed from Home')
        print('PASS adaptive/page-agent engine retained underneath the new presentation layer')
        print('PASS reduced-motion + privacy/evidence/history firewalls + gzip budgets')
    return 1 if errors else 0
if __name__=='__main__':raise SystemExit(main())
