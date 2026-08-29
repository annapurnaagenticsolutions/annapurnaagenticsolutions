#!/usr/bin/env python3
from pathlib import Path
from urllib.parse import urljoin
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parents[1]

def assert_(cond,msg):
    if not cond: raise AssertionError(msg)

def main():
    js=(ROOT/'assets/site.js').read_text()
    css=(ROOT/'assets/site.css').read_text()
    evidence=(ROOT/'evidence.html').read_text()

    # Re-audit finding 1: selectable evidence articles must not use aria-selected.
    assert_('aria-selected' not in js,'aria-selected remains in site.js')
    assert_('aria-selected' not in css,'aria-selected remains in site.css')
    assert_('aria-selected' not in evidence,'aria-selected remains in evidence.html')
    assert_('.evidence-card[data-selected="true"]' in css,'visual selection is not data-state driven')
    assert_("x.setAttribute('aria-current','true')" in js,'selected evidence does not expose valid current-state semantics')

    # Re-audit finding 2: JSON fetches are project-subpath aware, not document-relative or domain-root absolute.
    assert_('siteScript=[...document.scripts]' in js and "new URL('../',siteScript.src)" in js,'site root is not derived from the loaded site.js URL')
    assert_('fetch(siteDataHref(path)' in js,'loadJSON does not use the project-aware data URL resolver')
    prod_script='https://annapurnaagenticsolutions.github.io/annapurna-portal/assets/site.js'
    prod_root=urljoin(prod_script,'../')
    assert_(urljoin(prod_root,'data/adaptive-model.json')=='https://annapurnaagenticsolutions.github.io/annapurna-portal/data/adaptive-model.json','project-subpath URL resolution is incorrect')

    # Shared data loads are scoped away from About/Contact, preventing invisible 404 churn.
    assert_("needsLivingModels=document.body.matches('.v2-home,.v3-home,.v3-explore')" in js,'living-model fetch gate missing')
    assert_("needsPublicSignals=Boolean($('.living-stage')||$('#evidence-list')||$('#repo-list')||$('#history-list')||$('#public-pulse'))" in js,'public-signal fetch gate missing')
    for rel in ['about/index.html','contact/index.html']:
        soup=BeautifulSoup((ROOT/rel).read_text(),'html.parser')
        assert_(not soup.select('.living-stage,#evidence-list,#repo-list,#history-list,#public-pulse'),f'{rel}: contains a public-signal surface unexpectedly')
        body=soup.body
        assert_(body and not ({'v2-home','v3-home','v3-explore'} & set(body.get('class',[]))),f'{rel}: accidentally matches living-model fetch gate')

    print('PASS independent re-audit closure: Evidence ARIA semantics + project-aware/scoped JSON loading')
    return 0

if __name__=='__main__': raise SystemExit(main())
