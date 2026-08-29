#!/usr/bin/env python3
from pathlib import Path
from bs4 import BeautifulSoup
import re

ROOT=Path(__file__).resolve().parents[1]
PAGES=['index.html','explore.html','lab.html','evidence.html','about/index.html','contact/index.html']
WORLD_LINKS={
 'AI Solutions':'ai-solutions/',
 'WonderHub':'wonderhub-by-AnnapurnaAgenticSolutions/',
 'Idea Hub':'idea-hub/',
 'AXON':'axon/',
 'Website Studio':'website-studio/',
 'Software Lab':'software-lab/',
}

def assert_(cond,msg):
    if not cond: raise AssertionError(msg)

def heading_levels(soup):
    return [int(h.name[1]) for h in soup.find_all(re.compile(r'^h[1-6]$'))]

def srgb(v):
    v=v/255
    return v/12.92 if v<=0.04045 else ((v+0.055)/1.055)**2.4

def lum(hexv):
    h=hexv.lstrip('#'); r,g,b=[int(h[i:i+2],16) for i in (0,2,4)]
    return .2126*srgb(r)+.7152*srgb(g)+.0722*srgb(b)

def contrast(a,b='#ffffff'):
    x,y=lum(a),lum(b); hi,lo=max(x,y),min(x,y)
    return (hi+.05)/(lo+.05)

def main():
    home=BeautifulSoup((ROOT/'index.html').read_text(),'html.parser')
    explore=BeautifulSoup((ROOT/'explore.html').read_text(),'html.parser')
    js=(ROOT/'assets/site.js').read_text()
    css=(ROOT/'assets/site.css').read_text()

    # Critical 2: state selectors must not include body merely because body carries data-* state.
    assert_("$$('[data-intent]')" not in js,'broad [data-intent] selector can set aria-pressed on body')
    assert_("$$('[data-lab-mode]')" not in js,'broad [data-lab-mode] selector can set aria-pressed on body')
    assert_(".intent-options [data-intent]" in js,'intent aria state is not scoped to controls')
    assert_(".v3-lab-modes [data-lab-mode]" in js,'lab-mode aria state is not scoped to controls')

    # Critical 3: visible labels are the accessible names for constellation controls.
    core=home.select_one('#ecosystem-core')
    assert_(core and not core.has_attr('aria-label'),'core has an aria-label that can diverge from visible label')
    nodes=home.select('.world-node[data-world]')
    assert_(len(nodes)==7,'expected seven Home world nodes')
    assert_(all(not n.has_attr('aria-label') for n in nodes),'world node aria-label overrides visible label')

    # Critical 4: independently reported inspector contrast tokens are now >= 4.5:1 on white.
    for color in ['#667085','#5f6b7a']:
        assert_(contrast(color)>=4.5,f'{color} contrast is {contrast(color):.2f}:1')
    assert_('.v35-atlas-narrative .v35-rail-label' in css and 'color:#667085' in css,'rail label contrast token missing')
    assert_('#inspect-copy{font-size:14px!important;line-height:1.62;color:#5f6b7a}' in css,'inspector copy contrast token missing')
    assert_('.v35-atlas-narrative .related-block>small{color:#667085!important}' in css,'inspector small-text contrast token missing')

    # High 5: Explore world labels are not headings; heading sequence must never jump downward by >1.
    assert_(not explore.select('.atlas-node h3'),'atlas node labels must not create heading-order noise')
    for rel in PAGES:
        soup=BeautifulSoup((ROOT/rel).read_text(),'html.parser')
        levels=heading_levels(soup)
        for a,b in zip(levels,levels[1:]):
            assert_(b<=a+1,f'{rel}: heading order jumps h{a}->h{b}')

    # High 6: raw Home + Explore HTML expose all six canonical product destinations as real anchors.
    for rel,soup in [('index.html',home),('explore.html',explore)]:
        direct=soup.select_one('nav.world-direct-links')
        assert_(direct is not None,f'{rel}: direct product link index missing')
        hrefs={a.get('href') for a in direct.find_all('a')}
        assert_(# pramana is self-origin, skip external link check for now
    all_six = {k:v for k,v in WORLD_LINKS.items() if k!='pramana'}
    if not set(all_six.values()).issubset(hrefs),f'{rel}: not all six product hrefs are raw anchors')

    # High 7: every public page has a no-JS escape path covering worlds and core pages.
    for rel in PAGES:
        raw=(ROOT/rel).read_text(); soup=BeautifulSoup(raw,'html.parser')
        ns=soup.find('noscript')
        assert_(ns is not None,f'{rel}: noscript fallback missing')
        txt=ns.get_text(' ',strip=True)
        for label in WORLD_LINKS:
            assert_(label in txt,f'{rel}: noscript missing {label}')
        for label in ['Home','Explore','Interactive Lab','Evidence','About','Contact']:
            assert_(label in txt,f'{rel}: noscript missing core page {label}')

    # Medium 8: trail continuity ages independently of ordinary page loads.
    assert_('trailUpdatedAt' in js,'trailUpdatedAt migration/state missing')
    assert_('trailAge>90*DAY' in js,'expired trail suppression missing')
    assert_("trailAge>30*DAY" in js and 'Revisit ${worlds[last].short}' in js,'stale trail relabeling missing')

    print('PASS independent audit remediation: ARIA + label-in-name + contrast + headings + crawlability + noscript + stale continuity')
    return 0

if __name__=='__main__':
    raise SystemExit(main())
