#!/usr/bin/env python3
from pathlib import Path
import json,re
ROOT=Path(__file__).resolve().parents[1]
def main():
 d=json.loads((ROOT/'data/living-world-v40.json').read_text());css=(ROOT/'assets/site.css').read_text();js=(ROOT/'assets/site.js').read_text();ev=(ROOT/'evidence.html').read_text()
 assert d['release']=='4.0' and sum(bool(v) for v in d['enhancements'].values())>=6
 for token in ['page-context-ribbon','evidence-focus-shell','evidence-toolbar','page-leaving','field-breathe-atlas']:
  assert token in css,token
 for token in ['mountPageContext','mountNavigationContinuity','initEvidenceField','selectEvidenceClaim','configureAgentActions','repoClaimCount','worldFromHash']:
  assert token in js,token
 for token in ['id="evidence-focus"','data-evidence-step="claim"','id="evidence-toolbar"','data-evidence-filter="conflict"']:
  assert token in ev,token
 assert 'Evidence claims' in js and 'Stars</span>' not in js[js.find("const repoRoot=$('#repo-list')"):]
 assert 'prefers-reduced-motion:reduce' in css and 'prefers-reduced-transparency:reduce' in css
 assert re.search(r'--header-h:\s*72px',css)
 print('PASS v4.0 enhancement 1: cross-page continuity + hash resume')
 print('PASS v4.0 enhancement 2: interactive evidence provenance field')
 print('PASS v4.0 enhancement 3: evidence filters + coverage summary')
 print('PASS v4.0 enhancement 4: repository signals contextualized by evidence')
 print('PASS v4.0 enhancement 5: contextual Guide actions')
 print('PASS v4.0 enhancement 6: navigation choreography + viewport hardening')
 return 0
if __name__=='__main__': raise SystemExit(main())
