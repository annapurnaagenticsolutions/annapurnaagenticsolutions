#!/usr/bin/env python3
"""Append a semantic public-state history entry only when factual state changes.

Verification timestamps are intentionally excluded from the digest. This prevents scheduled refreshes
from becoming fake product milestones. The history file is still static and auditable.
"""
from __future__ import annotations
import hashlib, json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'
HISTORY = DATA / 'public-history.json'


def load(name): return json.loads((DATA/name).read_text(encoding='utf-8'))

def semantic_state():
    site, repos, evidence = load('site-signals.json'), load('repository-signals.json'), load('evidence-manifest.json')
    stages = {x['id']: x['stage'] for x in site.get('portfolios', [])}
    repo_map = {
        r['id']: {k:int(r.get(k,0)) for k in ('commits','openIssues','stars','forks')}
        for r in repos.get('repositories', [])
    }
    claims = {c['id']:{k:c.get(k) for k in ('statement','status','evidenceClass','sourceUrl')} for c in evidence.get('claims', [])}
    artifacts = {a['id']:{'kind':a.get('kind'),'url':a.get('url'),'facts':a.get('facts',[])} for a in evidence.get('artifacts', [])}
    state = {
        'metrics': site.get('metrics', {}), 'stages': stages, 'repositories': repo_map,
        'claims': claims, 'artifacts': artifacts,
    }
    raw = json.dumps(state, sort_keys=True, separators=(',',':'), ensure_ascii=False).encode()
    return state, hashlib.sha256(raw).hexdigest()


def build_entry(state, digest):
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00','Z')
    repos = state['repositories']
    totals = {k:sum(v.get(k,0) for v in repos.values()) for k in ('commits','openIssues','stars','forks')}
    metrics = state['metrics']
    return {
      'id': now.replace(':','').replace('-','') + '-' + digest[:10], 'capturedAt': now, 'kind':'change',
      'label':'Verified public state changed',
      'summary':'A semantic change was detected in curated product state, repository evidence, claims or inspectable artifacts.',
      'semanticDigest':digest,
      'metrics': {
        'portfolioLines':int(metrics.get('portfolioLines',0)), 'websiteDemos':int(metrics.get('websiteDemos',0)),
        'liveAiTools':int(metrics.get('liveAiTools',0)), 'trackedRepositories':len(repos),
        'sourcedClaims':len(state['claims']), 'inspectableArtifacts':len(state['artifacts'])
      },
      'stages':state['stages'], 'repositoryTotals':totals
    }


def main():
    history = json.loads(HISTORY.read_text(encoding='utf-8'))
    state, digest = semantic_state()
    last = history.get('entries', [])[-1] if history.get('entries') else None
    if last and last.get('semanticDigest') == digest:
        print('Semantic public state unchanged; history not appended.')
        return 0
    entry = build_entry(state,digest)
    history.setdefault('entries', []).append(entry); history['updatedAt']=entry['capturedAt']
    HISTORY.write_text(json.dumps(history,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    print(f"Appended semantic history entry {entry['id']}")
    return 0

if __name__=='__main__': raise SystemExit(main())
