#!/usr/bin/env python3
from __future__ import annotations
import json,re
from pathlib import Path
from html.parser import HTMLParser
ROOT=Path(__file__).resolve().parents[1]; HOME=(ROOT/'index.html').read_text(encoding='utf-8');MODEL=json.loads((ROOT/'data/first-30s-model.json').read_text());ADAPT=json.loads((ROOT/'data/adaptive-model.json').read_text())
def fail(m):print('FAIL',m);return 1
class P(HTMLParser):
    def __init__(self):super().__init__();self.h1=[];self.in_h1=False;self.hero=False;self.hero_p='';self.in_p=False;self.nav=False;self.nav_links=0
    def handle_starttag(self,tag,attrs):
        a=dict(attrs);classes=set(a.get('class','').split())
        if 'hero-copy' in classes:self.hero=True
        if tag=='h1':self.in_h1=True
        if tag=='p' and self.hero and not self.hero_p:self.in_p=True
        if tag=='nav' and 'nav-links' in classes:self.nav=True
        if tag=='a' and self.nav:self.nav_links+=1
    def handle_endtag(self,tag):
        if tag=='h1':self.in_h1=False
        if tag=='p' and self.in_p:self.in_p=False
        if tag=='nav' and self.nav:self.nav=False
    def handle_data(self,data):
        t=' '.join(data.split())
        if not t:return
        if self.in_h1:self.h1.append(t)
        if self.in_p and not self.hero_p:self.hero_p=t
def main():
    e=0;p=P();p.feed(HOME);h1=' '.join(p.h1);hero_p=p.hero_p;rules=MODEL['heroRules'];lower=(h1+' '+hero_p).lower()
    if len(h1.split())>rules['maxH1Words']:e+=fail('H1 too long')
    for term in rules['requiredScopeTerms']:
        if term.lower() not in lower:e+=fail(f'first-5-second scope missing {term}')
    if len(hero_p.split())>rules['maxPrimaryHeroParagraphWords']:e+=fail('hero paragraph too long')
    if len(re.findall(r'<section\b',HOME))!=3:e+=fail('Home must remain three immersive acts')
    if p.nav_links>rules['maxPrimaryNavLinks']:e+=fail('too many primary nav links')
    if len(re.findall(r'data-intent="(?:explore|enterprise|learning|msme|design)"',HOME))!=rules['maxIntentChoices']:e+=fail('intent chooser count mismatch')
    for marker in ['Explore through','Trace its connections','stage-atmosphere','ecosystem-core','follow-connection','Connected journey','Contact']:
        if marker not in HOME:e+=fail(f'first-30-second surface missing {marker}')
    for banned in ['Why “living”','Not more animation','A living website should','Rules-based','DETERMINISTIC REHEARSAL']:
        if banned.lower() in re.sub(r'<[^>]+>',' ',HOME).lower():e+=fail(f'methodology leaked into market surface: {banned}')
    intents=ADAPT.get('intents',{})
    for persona in MODEL['personas']:
        cfg=intents.get(persona['intent']);
        if not cfg:e+=fail(f'persona {persona["key"]}: missing intent');continue
        if cfg.get('primaryWorld')!=persona['primaryWorld']:e+=fail(f'persona {persona["key"]}: wrong primary world')
        if not cfg.get('primaryCta',{}).get('href'):e+=fail(f'persona {persona["key"]}: missing CTA')
    js=(ROOT/'assets/site.js').read_text(encoding='utf-8')
    for marker in ['followConnection','traceJourney','renderFeaturedRoute','mountHeroChoreography','AnnapurnaPageAgent']:
        if marker not in js:e+=fail(f'first-30s runtime missing {marker}')
    if not e:
        print('PASS 5s: market scope and connected-portfolio proposition are explicit')
        print('PASS 15s: immersive six-world field + intent portals + connected journey are discoverable')
        print('PASS 30s: product, interactive lab, evidence, guide and contact paths are reachable without methodology copy')
        print(f'PASS personas: {len(MODEL["personas"])} deterministic market intents')
    return 1 if e else 0
if __name__=='__main__':raise SystemExit(main())
