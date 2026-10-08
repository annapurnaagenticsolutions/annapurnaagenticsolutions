#!/usr/bin/env python3
"""Generate a deterministic synthetic defect corpus. Standard library only."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / 'corpus'
CASES = ROOT / 'cases'
CASES.mkdir(parents=True, exist_ok=True)

def path(source, pointer):
    return {'kind':'path','source':source,'pointer':pointer}

def lit(value):
    return {'kind':'literal','value':value}

def assertion(id,expected,actual,rule=None):
    return {'id':id,'expected':expected,'actual':actual,'rule':rule or {'kind':'equal'}}

def contract(cid,sources,a):
    return {'version':1,'id':cid,'sources':[{'id':key,'layer':kind} for key,kind in sources], 'assertions':[a]}

families=['apples_count','cart_total_minor','save_ack_vs_db','inventory_display','retry_idempotence','quiz_score']
manifest={'version':1,'description':'Synthetic cross-layer defect scenarios; 6 families * 24 cases. Not real website evidence.','cases':[]}
for family in families:
    for i in range(24):
        variant=i%6
        expected_outcome = 'pass' if variant<2 else ('fail' if variant<5 else 'unknown')
        cid=f'{family}_{i:02d}'
        if family == 'apples_count':
            n=4+(i%3)
            c=contract(cid,[('ui','dom'),('scene','structured_scene')],assertion('label_matches_objects',path('ui','/label_count'),{'kind':'count','value':path('scene','/objects')}))
            ui={'label_count':n if expected_outcome=='pass' else n+1}
            if expected_outcome=='unknown': ui={}
            obs={'ui':ui,'scene':{'objects':list(range(n))}}
        elif family == 'cart_total_minor':
            price_minor=125+(i%5)*25; qty=2+(i%4); total=price_minor*qty
            c=contract(cid,[('cart','api'),('ui','dom')],assertion('ui_total_matches_api_calculation',{'kind':'product','values':[path('cart','/unit_price_minor'),path('cart','/qty')]},path('ui','/total_minor')))
            ui={'total_minor':total if expected_outcome=='pass' else total+75}
            if expected_outcome=='unknown': ui={}
            obs={'cart':{'unit_price_minor':price_minor,'qty':qty},'ui':ui}
        elif family == 'save_ack_vs_db':
            c=contract(cid,[('ui','dom'),('db','snapshot')],assertion('saved_banner_matches_persistence',path('ui','/saved_banner'),path('db','/persisted')))
            obs={'ui':{'saved_banner':True},'db':{'persisted':expected_outcome=='pass'}}
            if expected_outcome=='unknown': obs['db']={}
        elif family == 'inventory_display':
            stock=3+(i%8)
            c=contract(cid,[('api','api'),('ui','dom')],assertion('stock_matches',path('api','/available'),path('ui','/available')))
            obs={'api':{'available':stock},'ui':{'available':stock if expected_outcome=='pass' else stock+2}}
            if expected_outcome=='unknown': obs['ui']={}
        elif family == 'retry_idempotence':
            c=contract(cid,[('workflow','event'),('db','snapshot')],assertion('single_order_created',path('workflow','/intended_commits'),{'kind':'count','value':path('db','/order_rows')}))
            obs={'workflow':{'intended_commits':1},'db':{'order_rows':[{'id':1}] if expected_outcome=='pass' else [{'id':1},{'id':1}]}}
            if expected_outcome=='unknown': obs['db']={}
        elif family == 'quiz_score':
            points=[1,2,3+(i%3)]
            total=sum(points)
            c=contract(cid,[('answer_key','fixture'),('ui','dom')],assertion('quiz_score_matches_calculated',{'kind':'sum','values':[path('answer_key',f'/points/{idx}') for idx in range(len(points))]},path('ui','/displayed_score')))
            obs={'answer_key':{'points':points},'ui':{'displayed_score':total if expected_outcome=='pass' else total+2}}
            if expected_outcome=='unknown': obs['ui']={}
        else: raise AssertionError('unexpected family')
        target=CASES/f'{cid}.json'
        target.write_text(json.dumps({'contract':c,'observations':obs},indent=2,sort_keys=True)+'\n',encoding='utf-8')
        manifest['cases'].append({'id':cid,'file':f'cases/{cid}.json','family':family,'expected_outcome':expected_outcome,'synthetic':True})
(ROOT/'manifest.json').write_text(json.dumps(manifest,indent=2,sort_keys=True)+'\n',encoding='utf-8')
print(f'Generated {len(manifest["cases"])} deterministic synthetic scenarios')
