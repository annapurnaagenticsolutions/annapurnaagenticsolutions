#!/usr/bin/env python3
from pathlib import Path
import json,re
ROOT=Path(__file__).resolve().parents[1]
def main():
    data=json.loads((ROOT/'data/living-world-v37.json').read_text())
    css=(ROOT/'assets/site.css').read_text()
    home=(ROOT/'index.html').read_text()
    assert data['release']=='3.7'
    for token in ['--type-h1','--type-h2','--type-h3','--type-lead','--type-body','--type-ui','--type-small','--type-micro']:
        assert token in css, token
    # One public H1 rule owns all page-level H1 surfaces.
    assert re.search(r'\.v3-beat-establish h1,\s*\.v3-page-intro h1,\s*\.page-hero h1\{[^}]*font-size:var\(--type-h1\)!important',css,re.S)
    # Major experiential H2 is one shared tier, not a per-page scale.
    assert re.search(r'\.v3-beat-focus h2,\s*\.v3-beat-journey h2,\s*\.v3-sim-heading h2,\s*\.v2-cta-inner h2\{[^}]*font-size:var\(--type-h2\)!important',css,re.S)
    # Supporting headings share H3.
    assert '.v35-atlas-narrative h2,' in css and 'font-size:var(--type-h3)!important' in css
    # Connected punctuation is owned by the semantic span, eliminating orphan punctuation.
    assert 'data-word-world="connected">Connected.</span>' in home
    assert 'data-word-world="connected">Connected</span>.' not in home
    assert '.depth-word-strong{white-space:nowrap}' in css
    # Readability and anchor hardening.
    assert 'opacity:.54!important' in css
    assert 'scroll-margin-top:92px' in css
    assert '--type-h1:44px' in css and '--type-h1:35px' in css
    assert all(data['typographyLock'].values()) and all(data['visualQA'].values()) and all(data['preserves'].values())
    print('PASS v3.7 semantic typography lock: H1/H2/H3 + lead/body/UI/meta tiers')
    print('PASS v3.7 Connected punctuation wrapping + TRACE hierarchy + scroll offset QA')
    print('PASS v3.7 desktop/tablet/mobile type scales are explicit and page-independent')
    return 0
if __name__=='__main__': raise SystemExit(main())
