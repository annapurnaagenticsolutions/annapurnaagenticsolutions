#!/usr/bin/env python3
"""Independent corpus-label sanity check. Does NOT run or validate the Rust implementation."""
import json
from collections import Counter
from pathlib import Path

root=Path(__file__).resolve().parents[1]/'corpus'
manifest=json.loads((root/'manifest.json').read_text())
counts=Counter()
for entry in manifest['cases']:
    fixture=json.loads((root/entry['file']).read_text())
    obs=fixture['observations']; family=entry['family']
    if family=='apples_count':
        actual=len(obs['scene']['objects']); observed=obs['ui'].get('label_count')
    elif family=='cart_total_minor':
        actual=obs['cart']['unit_price_minor']*obs['cart']['qty']; observed=obs['ui'].get('total_minor')
    elif family=='save_ack_vs_db':
        actual=obs['ui']['saved_banner']; observed=obs['db'].get('persisted')
    elif family=='inventory_display':
        actual=obs['api']['available']; observed=obs['ui'].get('available')
    elif family=='retry_idempotence':
        actual=obs['workflow']['intended_commits']; rows=obs['db'].get('order_rows'); observed=len(rows) if rows is not None else None
    elif family=='quiz_score':
        actual=sum(obs['answer_key']['points']); observed=obs['ui'].get('displayed_score')
    else: raise AssertionError(family)
    result='unknown' if observed is None else ('pass' if actual==observed else 'fail')
    assert result==entry['expected_outcome'],(entry['id'],result,entry['expected_outcome'])
    counts[result]+=1
assert len(manifest['cases'])==144
assert counts==Counter({'pass':48,'fail':72,'unknown':24}),counts
print(f'Corpus-label sanity check PASSED: {len(manifest["cases"])} cases; '+', '.join(f'{k}={v}' for k,v in sorted(counts.items())))
print('Note: this independently checks fixture labels only; Rust compilation/tests have not run.')
