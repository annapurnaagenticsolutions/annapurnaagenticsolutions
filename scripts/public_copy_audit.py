#!/usr/bin/env python3
from __future__ import annotations
import json
from html.parser import HTMLParser
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
PAGES=['index.html','explore.html','lab.html','evidence.html']
class Visible(HTMLParser):
    VOID={"area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr"}
    def __init__(self):super().__init__();self.hidden=0;self.parts=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs);starts_hidden=tag in {"script","style","template"} or a.get("aria-hidden")=="true" or "hidden" in a
        if self.hidden or starts_hidden:
            if tag not in self.VOID:self.hidden+=1
    def handle_startendtag(self,tag,attrs):
        return
    def handle_endtag(self,tag):
        if self.hidden:self.hidden=max(0,self.hidden-1)
    def handle_data(self,data):
        if not self.hidden:
            t=" ".join(data.split())
            if t:self.parts.append(t)
def main()->int:
    cfg=json.loads((ROOT/'data/immersive-experience.json').read_text())
    banned=list(cfg['visitorCopy']['forbiddenPhrases'])+['Living Lab']
    errors=[]
    for fn in PAGES:
        p=Visible();p.feed((ROOT/fn).read_text(encoding='utf-8'))
        text=' '.join(p.parts).lower()
        for phrase in banned:
            if phrase.lower() in text: errors.append(f'{fn}: visitor-facing methodology phrase leaked: {phrase}')
    if errors:
        for e in errors:print('FAIL',e)
        return 1
    print(f'PASS public copy audit: {len(PAGES)} pages demonstrate behavior without explaining living-website methodology')
    return 0
if __name__=='__main__':raise SystemExit(main())
