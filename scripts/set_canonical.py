#!/usr/bin/env python3
"""Retarget Annapurna Living World v4.0 canonical URLs to a production HTTPS base."""
from __future__ import annotations
import json,re,sys
from pathlib import Path
from urllib.parse import urlparse
ROOT=Path(__file__).resolve().parents[1]
def fail(m): raise SystemExit(f"ERROR: {m}")
def main():
    if len(sys.argv)!=2: fail("usage: set_canonical.py https://example.com/")
    base=sys.argv[1].strip(); p=urlparse(base)
    if p.scheme!="https" or not p.netloc or p.query or p.fragment: fail("canonical base must be an absolute HTTPS URL without query/fragment")
    if not base.endswith("/"): base+="/"
    profile_path=ROOT/"data/release-profile.json"; profile=json.loads(profile_path.read_text(encoding="utf-8")); old=profile["canonicalBaseUrl"]; profile["canonicalBaseUrl"]=base; profile_path.write_text(json.dumps(profile,indent=2)+"\n",encoding="utf-8")
    pages={"index.html":"","explore.html":"explore.html","lab.html":"lab.html","evidence.html":"evidence.html","about/index.html":"about/","contact/index.html":"contact/"}
    for fn,suffix in pages.items():
        path=ROOT/fn; html=path.read_text(encoding="utf-8")
        m=re.search(r'<link\b(?=[^>]*\brel="canonical")[^>]*>',html,re.I)
        if not m: fail(f"canonical tag missing in {fn}")
        tag=m.group(0)
        if 'href=' in tag:
            newtag=re.sub(r'href="[^"]*"',f'href="{base}{suffix}"',tag,count=1)
        else:
            newtag=tag[:-1]+f' href="{base}{suffix}">'
        html=html[:m.start()]+newtag+html[m.end():]
        # also update og:url
        html=re.sub(r'(<meta\b[^>]*property=["\']og:url["\'][^>]*content=["\'])[^"\']*',rf'\g<1>{base}{suffix}',html,flags=re.I)
        html=re.sub(r'(<meta\b[^>]*content=["\'])[^"\']*(["\'][^>]*property=["\']og:url["\'])',rf'\g<1>{base}{suffix}\g<2>',html,flags=re.I)
        path.write_text(html,encoding="utf-8")
    sm=ROOT/"sitemap.xml"; x=sm.read_text(encoding="utf-8"); x=x.replace(old,base).replace("https://annapurnaagenticsolutions.github.io/annapurna-portal/",base); sm.write_text(x,encoding="utf-8")
    rb=ROOT/"robots.txt"; x=rb.read_text(encoding="utf-8"); rb.write_text(re.sub(r'^Sitemap:\s+\S+$',f'Sitemap: {base}sitemap.xml',x,flags=re.M),encoding="utf-8")
    er=ROOT/"404.html"; x=er.read_text(encoding="utf-8"); x=x.replace(old,base).replace("https://annapurnaagenticsolutions.github.io/annapurna-portal/",base); er.write_text(x,encoding="utf-8")
    print(f"PASS canonical cutover: {old} -> {base}")
    return 0
if __name__=="__main__": raise SystemExit(main())
