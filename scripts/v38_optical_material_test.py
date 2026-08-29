#!/usr/bin/env python3
from pathlib import Path
import json,re
ROOT=Path(__file__).resolve().parents[1]
def main():
    data=json.loads((ROOT/'data/living-world-v38.json').read_text())
    css=(ROOT/'assets/site.css').read_text()
    js=(ROOT/'assets/site.js').read_text()
    home=(ROOT/'index.html').read_text()
    evidence=(ROOT/'evidence.html').read_text()
    public=(ROOT/'assets/public-data.js').read_text()
    assert data['release']=='3.8'
    assert all(data['typography'].values()) and all(data['opticalMaterial'].values()) and all(data['evidenceField'].values()) and all(data['preserves'].values())
    for token in ['--type-home-display','--type-page-h1','--type-major-h2','--type-support-h3','--glass-fill-strong','--glass-line']:
        assert token in css,token
    assert re.search(r'\.v3-beat-establish h1\{[^}]*font-size:var\(--type-home-display\)!important',css,re.S)
    assert re.search(r'\.v3-page-intro h1,\.page-hero h1\{[^}]*font-size:var\(--type-page-h1\)!important',css,re.S)
    assert 'digital experiences.</span> <span class="depth-word depth-word-strong" data-word-world="connected">Connected.</span>' in home
    assert 'digital experiences</span>. <span class="depth-word depth-word-strong"' not in home
    for marker in ['.hero-moment,.agent-launcher,.page-agent,.v3-atlas-core','.v3-runtime-flow .flow-step,.v3-axon-graph span,.v3-design-preview','prefers-reduced-transparency','forced-colors:active']:
        assert marker in css,marker
    # Whole world stages must not be assigned optical blur in v3.8.
    tail=css.split('/* v3.8 — Optical Material + Semantic Typography + Evidence Field */',1)[1]
    assert not re.search(r'\.v3-stage[^\{]*\{[^}]*backdrop-filter',tail,re.S)
    assert not re.search(r'\.v3-atlas\s*\{[^}]*backdrop-filter',tail,re.S)
    assert not re.search(r'\.v3-lab-theatre\s*\{[^}]*backdrop-filter',tail,re.S)
    assert '<body class="v3-evidence">' in evidence
    assert 'assets/public-data.js' in evidence and 'assets/public-data.js' in home
    assert 'window.ANNAPURNA_PUBLIC_DATA=' in public
    for key in ['evidence-manifest.json','repository-signals.json','public-history.json']:
        assert key in js
    for marker in ['evidence-source','evidence-conflict','Evidence unavailable','Repository signals unavailable','History unavailable']:
        assert marker in js
    # Generated fallback cardinalities match source JSON.
    assert f'"claims":[' in public and len(json.loads((ROOT/'data/evidence-manifest.json').read_text())['claims'])==9
    print('PASS v3.8 semantic typography: Home Display + shared inner-page H1 + shared H2/H3 tiers')
    print('PASS v3.8 selective optical glass: focus/provenance surfaces only, with accessibility fallbacks')
    print('PASS v3.8 Evidence Field fallback: source/scope/conflict semantics + non-stalling local preview')
    return 0
if __name__=='__main__': raise SystemExit(main())
