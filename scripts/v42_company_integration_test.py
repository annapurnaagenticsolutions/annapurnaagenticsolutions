#!/usr/bin/env python3
from pathlib import Path
import json,re
from urllib.parse import urlparse
ROOT=Path(__file__).resolve().parents[1]

def read(p): return (ROOT/p).read_text(encoding='utf-8')

def main():
    cfg=json.loads(read(Path('data/living-world-v42.json')))
    links=json.loads(read(Path('data/public-links.json')))
    assert cfg['release']=='4.2' and all(cfg['enhancements'].values()) and all(cfg['integrityContracts'].values())
    assert links['organizationUrl']=='https://github.com/annapurnaagenticsolutions'
    assert links['contact']['email']=='annapurnaagenticsolutions@zohomail.in'
    ids={x['id'] for x in links['surfaces']}; assert {'portal','ai','wonder','idea','axon','web','software','mesh','mesh-demo'} <= ids
    for x in links['surfaces']:
        assert urlparse(x['pagesUrl']).scheme=='https'
        assert x['sourceUrl'].startswith('https://github.com/annapurnaagenticsolutions')
    about=read(Path('about/index.html')); contact=read(Path('contact/index.html'))
    for html in [about,contact]:
        assert '../assets/site.css' in html and '../assets/company.css' in html and '../assets/site.js' in html
        assert 'https://github.com/annapurnaagenticsolutions' in html
        for m in re.finditer(r'<a\b[^>]*target="_blank"[^>]*>',html,re.I):
            tag=m.group(0); assert 'rel="noopener noreferrer"' in tag
    assert '<form' not in contact.lower(), 'Contact must not ship a fake static form'
    assert '48 hour' not in contact.lower() and 'respond within' not in contact.lower()
    assert 'mailto:annapurnaagenticsolutions@zohomail.in' in contact
    assert 'Built in India' in about and 'Evidence before promotion' in about
    assert 'GitHub Pages' in about and 'See the live surface. Inspect the source.' in about
    assert 'No static form or hidden submission service' in contact
    # Core public pages are frozen except explicit footer source link integration.
    for name in ['index.html','explore.html','lab.html','evidence.html']:
        h=read(Path(name)); assert 'GitHub ↗' in h and '<main' in h and 'assets/company.css' not in h
    js=read(Path('assets/site.js'))
    for marker in ['nestedPublicPage','siteHref=path','active===\'about\'','active===\'contact\'','github:\'github\'']:
        assert marker in js, marker
    css=read(Path('assets/company.css'))
    assert 'v4.2' in css and '.v42-about' in css and '.v42-contact' in css
    print('PASS v4.2 company integration: About + Contact + public links + nested routing')
    return 0
if __name__=='__main__': raise SystemExit(main())
