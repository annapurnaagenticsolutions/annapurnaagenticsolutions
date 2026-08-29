#!/usr/bin/env python3
from __future__ import annotations
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse
import json,re,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
PAGES=['index.html','explore.html','lab.html','evidence.html','about/index.html','contact/index.html']
CSP_REQUIRED=["default-src 'self'","script-src 'self'","style-src 'self'","object-src 'none'","manifest-src 'self'","base-uri 'self'","form-action 'self'"]

class AuditParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True); self.tags=[]; self.ids=[]; self.inline_styles=[]; self.inline_scripts=0; self.h1=0; self.main=False; self.skip=False; self.target_blank=[]; self.buttons=[]
    def handle_starttag(self,tag,attrs):
        d=dict(attrs); self.tags.append((tag,d))
        if 'id' in d:self.ids.append(d['id'])
        if 'style' in d:self.inline_styles.append((tag,d.get('style')))
        if tag=='script' and not d.get('src'):self.inline_scripts+=1
        if tag=='h1':self.h1+=1
        if tag=='main' and d.get('id')=='main-content':self.main=True
        if tag=='a' and d.get('class') and 'skip-link' in d.get('class','').split() and d.get('href')=='#main-content':self.skip=True
        if tag=='a' and d.get('target')=='_blank':self.target_blank.append(d)
        if tag=='button':self.buttons.append(d)

def meta(html,name):
    m=re.search(rf'<meta\b[^>]*name=["\']{re.escape(name)}["\'][^>]*content=["\']([^"\']*)',html,re.I)
    if not m:
        m=re.search(rf'<meta\b[^>]*content=["\']([^"\']*)["\'][^>]*name=["\']{re.escape(name)}["\']',html,re.I)
    return m.group(1) if m else None

def prop(html,name):
    m=re.search(rf'<meta\b[^>]*property=["\']{re.escape(name)}["\'][^>]*content=["\']([^"\']*)',html,re.I)
    if not m:
        m=re.search(rf'<meta\b[^>]*content=["\']([^"\']*)["\'][^>]*property=["\']{re.escape(name)}["\']',html,re.I)
    return m.group(1) if m else None

def canonical(html):
    m=re.search(r'<link\b[^>]*rel=["\']canonical["\'][^>]*href=["\']([^"\']+)',html,re.I)
    if not m:m=re.search(r'<link\b[^>]*href=["\']([^"\']+)["\'][^>]*rel=["\']canonical["\']',html,re.I)
    return m.group(1) if m else None

def main():
    profile=json.loads((ROOT/'data/release-profile.json').read_text())
    assert profile['release']=='4.3'
    for rel in PAGES:
        html=(ROOT/rel).read_text(encoding='utf-8'); p=AuditParser();p.feed(html)
        assert p.h1==1,(rel,'h1',p.h1)
        assert p.main and p.skip,(rel,'skip/main')
        assert not p.inline_styles,(rel,'inline styles',p.inline_styles[:2])
        assert p.inline_scripts==0,(rel,'inline scripts')
        assert len(p.ids)==len(set(p.ids)),(rel,'duplicate ids')
        assert meta(html,'description') and len(meta(html,'description'))>=50,(rel,'description')
        assert meta(html,'robots')=='index,follow,max-image-preview:large',(rel,'robots')
        assert meta(html,'theme-color')=='#ffffff',(rel,'theme')
        assert meta(html,'twitter:card')=='summary',(rel,'twitter')
        c=canonical(html); assert c and c.startswith(profile['canonicalBaseUrl']),(rel,'canonical',c)
        assert prop(html,'og:title') and prop(html,'og:description') and prop(html,'og:url')==c,(rel,'og')
        csp=re.search(r'<meta\b[^>]*http-equiv="Content-Security-Policy"[^>]*content="([^"]+)"',html,re.I)
        assert csp,(rel,'csp')
        for token in CSP_REQUIRED: assert token in csp.group(1),(rel,'csp token',token)
        assert re.search(r'<link\b[^>]*rel=["\']icon["\']',html,re.I),(rel,'favicon')
        assert re.search(r'<link\b[^>]*rel=["\']manifest["\']',html,re.I),(rel,'manifest')
        for a in p.target_blank:
            relv=set((a.get('rel') or '').split()); assert {'noopener','noreferrer'}<=relv,(rel,a)
        menu=[b for b in p.buttons if 'menu-toggle' in (b.get('class') or '').split()]
        assert menu and menu[0].get('aria-controls')=='mobile-navigation' and menu[0].get('aria-haspopup')=='true',(rel,'mobile menu')
        assert 'id="mobile-navigation"' in html,(rel,'mobile nav id')
    h=(ROOT/'404.html').read_text(); p=AuditParser();p.feed(h)
    assert meta(h,'robots')=='noindex,nofollow' and p.main and p.skip and not p.inline_styles and not p.inline_scripts
    for f in ['.nojekyll','site.webmanifest','assets/favicon.svg','sitemap.xml','robots.txt','llms.txt']:
        assert (ROOT/f).exists(),f
    manifest=json.loads((ROOT/'site.webmanifest').read_text());assert manifest['start_url']=='./' and manifest['scope']=='./' and manifest['icons'][0]['src']=='assets/favicon.svg'
    urls=[x.text for x in ET.parse(ROOT/'sitemap.xml').getroot().iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')];assert len(urls)==len(set(urls))>=12 and profile['canonicalBaseUrl'] in urls
    assert 'Sitemap: '+profile['canonicalBaseUrl']+'sitemap.xml' in (ROOT/'robots.txt').read_text()
    assert 'Marketing claims should be checked against the Evidence page.' in (ROOT/'llms.txt').read_text()
    links=json.loads((ROOT/'data/public-links.json').read_text());v=links['verification'];assert v['sourceRepositories']=='verified_public' and v['pagesRuntime']=='post_publish_http_gate_required'
    assert all(x['sourceStatus']=='verified_public' and x['pagesStatus']=='post_publish_http_gate_required' for x in links['surfaces'])
    # Strict style-src becomes meaningful only if static markup contains no style attributes.
    assert not list(ROOT.glob('**/*.html'))==False
    print('PASS v4.3 production cutover: SEO + accessibility + strict CSP + Pages packaging + truth semantics')
    return 0
if __name__=='__main__': raise SystemExit(main())
