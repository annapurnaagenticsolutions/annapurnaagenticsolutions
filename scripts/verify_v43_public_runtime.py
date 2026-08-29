#!/usr/bin/env python3
"""Post-publish HTTP gate. Run only after GitHub Pages deployment has completed."""
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.parse import urljoin
import json,sys,time
ROOT=Path(__file__).resolve().parents[1]

def fetch(url):
    req=Request(url,headers={'User-Agent':'Annapurna-v4.3-public-runtime-gate/1.0','Accept':'text/html,application/xhtml+xml,*/*;q=0.8'})
    with urlopen(req,timeout=20) as r:return r.status,r.geturl(),r.read().decode('utf-8','replace')

def check(url,marker=None,min_bytes=180):
    status,final,body=fetch(url)
    if status!=200:raise AssertionError(f'{url}: HTTP {status}')
    if marker and marker not in body:raise AssertionError(f'{url}: missing marker {marker!r}')
    if len(body.encode('utf-8'))<min_bytes:raise AssertionError(f'{url}: unexpectedly small response')
    print('PASS',status,final)

def main():
    profile=json.loads((ROOT/'data/release-profile.json').read_text());links=json.loads((ROOT/'data/public-links.json').read_text())
    base=sys.argv[1] if len(sys.argv)>1 else profile['canonicalBaseUrl']
    if not base.endswith('/'):base+='/'
    routes={'':'AI systems,','explore.html':'Six worlds. One connected field.','lab.html':'Change an input. Watch the system reorganize.','evidence.html':'Marketing claims should','about/':'We build systems that can be explored','contact/':'Bring the problem, constraints','sitemap.xml':'<urlset','robots.txt':'Sitemap:'}
    failed=[];seen=set()
    for rel,marker in routes.items():
        url=urljoin(base,rel);seen.add(url)
        try:check(url,marker)
        except Exception as e:failed.append((url,repr(e)))
        time.sleep(.1)
    # Runtime-check every configured GitHub Pages surface. Source-repository truth is a separate gate.
    for surface in links['surfaces']:
        url=surface['pagesUrl']
        if url in seen:continue
        seen.add(url)
        try:check(url)
        except Exception as e:failed.append((url,repr(e)))
        time.sleep(.1)
    for url in profile.get('criticalProofUrls',[]):
        if url in seen:continue
        seen.add(url)
        try:check(url)
        except Exception as e:failed.append((url,repr(e)))
        time.sleep(.1)
    if failed:
        for x in failed:print('FAIL',*x)
        return 1
    print('PASS v4.3 post-publish public runtime gate')
    return 0
if __name__=='__main__':raise SystemExit(main())
