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
    errors=0
    profile=json.loads((ROOT/'data/release-profile.json').read_text())
    if profile.get('release')!='1.7':errors+=fail('release profile must be 1.7')
    if profile.get('privacy',{}).get('localStorageKey')!='annapurnaLivingV17':errors+=fail('v1.7 local storage key mismatch')
    for fn in PAGES:
        path=ROOT/fn
        if not path.exists():errors+=fail(f'missing {fn}');continue
        parser=P();parser.feed(path.read_text(encoding='utf-8'))
        if parser.h1!=1:errors+=fail(f'{fn} must contain exactly one h1')
        if len(parser.ids)!=len(set(parser.ids)):errors+=fail(f'{fn} has duplicate ids')
        if not parser.csp:errors+=fail(f'{fn} missing CSP')
        if any(x.startswith('http') for x in parser.scripts):errors+=fail(f'{fn} loads third-party runtime scripts')
    home=(ROOT/'index.html').read_text(encoding='utf-8')
    if len(re.findall(r'<section\b',home))>7:errors+=fail('landing page has regressed into section dumping')
    for marker in ['intent-chooser','why-view','adaptive-primary','adaptive-rationale','follow-connection','stage-connection','data-adaptive-block="proof"','data-adaptive-block="capabilities"','data-adaptive-block="living"']:
        if marker not in home:errors+=fail(f'adaptive home missing {marker}')
    if len(re.findall(r'data-intent="(?:explore|enterprise|learning|msme|design)"',home))!=5:errors+=fail('five explicit intent controls required')
    js=(ROOT/'assets/site.js').read_text(encoding='utf-8')
    for marker in ['annapurnaLivingV17','deriveIntent','reorderAdaptivePages','filterContent','navigateToSection','highlightElement','explainCurrentView','adjustDepth','AnnapurnaPageAgent','followConnection','PerformanceObserver','data-live-count']:
        if marker not in js:errors+=fail(f'v1.7 runtime missing {marker}')
    if re.search(r"fetch\(['\"]https?://",js):errors+=fail('runtime adaptive/agent layer must not fetch remote endpoints')
    for script in ['interaction_contract_test.py','adaptive_contract_test.py','temporal_sensory_contract_test.py','perceived_liveness_contract_test.py','comprehension_audit.py','performance_change_test.py','first_30s_market_test.py']:
        r=subprocess.run(['python',str(ROOT/'scripts'/script)],capture_output=True,text=True)
        if r.returncode:errors+=fail(f'{script}: '+(r.stderr.strip() or r.stdout.strip()))
    r=subprocess.run(['python',str(ROOT/'scripts/validate_json_schemas.py')],capture_output=True,text=True)
    if r.returncode:errors+=fail('schema validation: '+(r.stderr.strip() or r.stdout.strip()))
    r=subprocess.run(['node','--check',str(ROOT/'assets/site.js')],capture_output=True,text=True)
    if r.returncode:errors+=fail('site.js syntax: '+r.stderr.strip())
    budgets=profile['performanceBudgetsGzip']
    for rel,limit in budgets.items():
        fp=ROOT/rel
        if not fp.exists():errors+=fail(f'budgeted file missing: {rel}');continue
        size=len(gzip.compress(fp.read_bytes(),9))
        if size>limit:errors+=fail(f'{rel} gzip {size}>{limit}')
    if not errors:
        print('PASS v1.7 first-30-seconds adaptive living release: 4 signals -> structure/depth/order/CTA')
        print('PASS embedded page agent: real page tools, rules-first, local-only, safe fallback')
        print('PASS shared temporal state + sensory choreography + compact visible adaptive response')
        print('PASS live-data transition + performance observation + 10% LCP/INP promotion policy')
        print('PASS four-page IA + guided portfolio connections + first-30s market gate + privacy/history firewall')
    return 1 if errors else 0
if __name__=='__main__':raise SystemExit(main())
