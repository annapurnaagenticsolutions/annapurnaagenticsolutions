#!/usr/bin/env python3
from __future__ import annotations
import re
from html.parser import HTMLParser
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class P(HTMLParser):
    def __init__(self):super().__init__();self.text=[];self.in_h1=False;self.h1=[];self.sections=0;self.nav=False;self.nav_links=0;self.hidden=0
    def handle_starttag(self,tag,attrs):
        a=dict(attrs); classes=set(a.get('class','').split())
        starts_hidden=tag in {'script','style','template'} or a.get('aria-hidden')=='true' or 'hidden' in a
        if self.hidden or starts_hidden:
            if tag not in {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}:self.hidden+=1
            return
        if tag=='section':self.sections+=1
        if tag=='h1':self.in_h1=True
        if tag=='nav' and 'nav-links' in classes:self.nav=True
        if tag=='a' and self.nav:self.nav_links+=1
    def handle_endtag(self,tag):
        if self.hidden:
            self.hidden=max(0,self.hidden-1);return
        if tag=='h1':self.in_h1=False
        if tag=='nav' and self.nav:self.nav=False
    def handle_data(self,data):
        if self.hidden:return
        t=' '.join(data.split())
        if t:self.text.append(t)
        if self.in_h1 and t:self.h1.append(t)
def words(s):return re.findall(r"[A-Za-z0-9’'-]+",s)
def main()->int:
    errors=[];home=(ROOT/'index.html').read_text(encoding='utf-8');p=P();p.feed(home);all_text=' '.join(p.text);h1=' '.join(p.h1)
    if p.sections!=3:errors.append(f'home must have exactly 3 public acts, found {p.sections}')
    if p.nav_links>5:errors.append(f'primary nav links {p.nav_links}>5')
    if len(words(h1))>12:errors.append(f'home h1 too long: {len(words(h1))} words')
    if len(words(all_text))>520:errors.append(f'home visible text too dense: {len(words(all_text))} words')
    for jargon in ['JSON Schema','semantic history','release candidate','telemetry contract','rules-based','deterministic rehearsal','Why “living”']:
        if jargon.lower() in all_text.lower():errors.append(f'engineering/methodology language leaked onto home: {jargon}')
    for cue in ['select a world','trace its connections','swipe','connected journey']:
        if cue not in all_text.lower():errors.append(f'interaction/immersion cue missing: {cue}')
    if len(re.findall(r'class="world-node[^\"]*"',home))!=6:errors.append('home must present six world controls')
    explore=(ROOT/'explore.html').read_text(encoding='utf-8')
    if len(re.findall(r'data-world="(?:ai|wonder|idea|axon|web|software)"',explore))<6:errors.append('explore needs all six world states')
    if 'relationship-copy' not in explore or 'behavior-viz' not in explore:errors.append('explore needs behavior + relationship surface')
    lab=(ROOT/'lab.html').read_text(encoding='utf-8')
    if len(re.findall(r'role="group"',lab))<3:errors.append('lab needs three labelled control groups')
    if len(re.findall(r'class="sim-feedback"',lab))<3:errors.append('lab needs immediate feedback for each model')
    css=(ROOT/'assets/site.css').read_text(encoding='utf-8')
    for marker in ['font-size:clamp(38px,3.35vw,49px)','min-height:44px','touch-action:pan-y','stage-atmosphere','v2-route-track']:
        if marker not in css:errors.append(f'professional/immersive CSS guard missing: {marker}')
    if errors:
        for e in errors:print('FAIL',e)
        return 1
    print(f'PASS comprehension: {p.sections} home sections, {p.nav_links} nav links, {len(words(h1))}-word H1, {len(words(all_text))} visible words')
    print('PASS discoverability: six worlds + guided path + mobile swipe + connected journey')
    return 0
if __name__=='__main__':raise SystemExit(main())
