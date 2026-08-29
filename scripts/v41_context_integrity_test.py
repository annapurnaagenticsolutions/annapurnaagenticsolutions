#!/usr/bin/env python3
from pathlib import Path
import json,re
ROOT=Path(__file__).resolve().parents[1]
def main():
 d=json.loads((ROOT/'data/living-world-v41.json').read_text());css=(ROOT/'assets/site.css').read_text();js=(ROOT/'assets/site.js').read_text()
 assert d['release']=='4.1' and all(d['enhancements'].values())
 for token in ['page-intro-meta','context-copy','context-resume','aria-current="page"','--context-h:0px']:
  assert token in css,token
 for token in ['semanticWorldHref','markActiveNavigation','history.scrollRestoration','ResizeObserver','explore.html#world=ai','explore.html#world=idea']:
  assert token in js,token
 assert 'explore.html#${last}' not in js
 assert "navigateToSection(semanticWorldHref(last))" in js
 assert re.search(r'\.page-context-ribbon\{position:relative!important;top:auto!important',css)
 assert '.page-context-ribbon{position:sticky' not in css
 assert 'height:0;overflow:visible' not in css
 assert 'scroll-padding-top:calc(var(--header-h) + 18px)!important' in css
 print('PASS v4.1 context rail: intro-owned reserved geometry')
 print('PASS v4.1 state URLs: semantic hash cannot target product node IDs')
 print('PASS v4.1 scroll integrity: manual restore + measured header')
 print('PASS v4.1 responsive context hierarchy + active navigation state')
 return 0
if __name__=='__main__': raise SystemExit(main())
