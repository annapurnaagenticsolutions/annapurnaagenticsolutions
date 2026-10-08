#!/usr/bin/env python3
"""Static synthetic HTML consistency checks. Does not replace real Playwright execution."""
from html.parser import HTMLParser
from pathlib import Path
import json
class Reader(HTMLParser):
    def __init__(self): super().__init__();self.nodes={};self.in_id=[];self.fruts=0
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='span' and 'fruit' in a.get('class','').split():self.fruts+=1
        if 'id' in a:self.nodes[a['id']]={'attributes':a,'text':''};self.in_id.append((tag,a['id']))
    def handle_data(self,data):
        for _,k in self.in_id:self.nodes[k]['text']+=data
    def handle_endtag(self,tag):
        for i in range(len(self.in_id)-1,-1,-1):
            if self.in_id[i][0]==tag:
                del self.in_id[i:];break
root=Path(__file__).parents[1]/'scenarios/demo/pages'
scenarios={
  'apples-bad':('fail',lambda x:len(json.loads(x.nodes['scene']['attributes']['data-objects'])),lambda x:int(x.nodes['label']['text'])),
  'apples-good':('pass',lambda x:len(json.loads(x.nodes['scene']['attributes']['data-objects'])),lambda x:int(x.nodes['label']['text'])),
  'apples-unknown':('unknown',lambda x:len(json.loads(x.nodes['scene']['attributes']['data-objects'])),lambda x:None),
  'cart-bad':('fail',lambda x:int(x.nodes['unit']['text'])*int(x.nodes['qty']['text']),lambda x:int(x.nodes['total']['text'])),
  'cart-good':('pass',lambda x:int(x.nodes['unit']['text'])*int(x.nodes['qty']['text']),lambda x:int(x.nodes['total']['text']))
}
for name,(label,ex,act) in scenarios.items():
    p=Reader();p.feed((root/f'{name}.html').read_text(encoding='utf-8'))
    observed=act(p);expected=ex(p)
    got='unknown' if observed is None else ('pass' if expected==observed else 'fail')
    assert got==label,(name,expected,observed,got)
print('Seeded static HTML PASS: 5 labelled scenarios; browser interaction requires Playwright')
