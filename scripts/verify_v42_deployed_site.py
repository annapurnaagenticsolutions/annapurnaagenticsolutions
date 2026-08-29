#!/usr/bin/env python3
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlparse
ROOT=Path(__file__).resolve().parents[1]
LEGACY_PUBLIC_PREFIXES={'ai-solutions','axon','wonderhub-by-AnnapurnaAgenticSolutions','idea-hub','website-studio','software-lab'}
PAGES=['index.html','explore.html','lab.html','evidence.html','about/index.html','contact/index.html','404.html']
class P(HTMLParser):
    def __init__(self): super().__init__(); self.ids=[]; self.links=[]; self.target_blank=[]
    def handle_starttag(self,tag,attrs):
        d=dict(attrs)
        if d.get('id'): self.ids.append(d['id'])
        if tag=='a' and d.get('href'):
            self.links.append(d['href'])
            if d.get('target')=='_blank': self.target_blank.append(d)

def resolve_local(page,href):
    if href.startswith('#') or href.startswith(('mailto:','tel:','javascript:')): return None
    u=urlparse(href)
    if u.scheme or u.netloc: return None
    path=(ROOT/page).parent/u.path
    if u.path.endswith('/') or not Path(u.path).suffix: path=path/'index.html'
    return path.resolve()

def main():
    for page in PAGES:
        path=ROOT/page; assert path.exists(),page
        parser=P(); parser.feed(path.read_text(encoding='utf-8'))
        assert len(parser.ids)==len(set(parser.ids)),f'duplicate id: {page}'
        for a in parser.target_blank:
            rel=set((a.get('rel') or '').split()); assert {'noopener','noreferrer'}<=rel,(page,a)
        for href in parser.links:
            target=resolve_local(page,href)
            if target is not None and not target.exists():
                first=(urlparse(href).path.strip('/').split('/') or [''])[0]
                assert first in LEGACY_PUBLIC_PREFIXES,f'{page}: missing {href} -> {target}'
    # Sitemap must include new public pages.
    sm=(ROOT/'sitemap.xml').read_text(); assert '/about/' in sm and '/contact/' in sm
    print('PASS v4.2 deployed surface: local navigation, unique IDs, external-link safety, sitemap')
    return 0
if __name__=='__main__': raise SystemExit(main())
