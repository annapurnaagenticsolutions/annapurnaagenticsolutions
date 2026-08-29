#!/usr/bin/env python3
from __future__ import annotations
import argparse,json
from datetime import datetime,timezone
from pathlib import Path
from zoneinfo import ZoneInfo
ROOT=Path(__file__).resolve().parents[1]
PATH=ROOT/'data/temporal-state.json'
WORLD_BY_DAY={0:'axon',1:'ai',2:'web',3:'wonder',4:'idea',5:'software',6:'wonder'}
LABELS={
 'axon':('Structure day','Follow structure before speed.'),
 'ai':('Governance day','Trace the rules behind the system.'),
 'web':('Connection day','See how presentation and capability connect.'),
 'wonder':('Discovery day','Follow curiosity into the learning worlds.'),
 'idea':('Build day','Look for practical value in small systems.'),
 'software':('Experiment day','Inspect what is being tested and learned.')}
def parse_dt(value:str):return datetime.fromisoformat(value.replace('Z','+00:00'))
def main()->int:
 ap=argparse.ArgumentParser();ap.add_argument('--force',action='store_true');args=ap.parse_args()
 existing=json.loads(PATH.read_text()) if PATH.exists() else {}
 interval=max(1,int(existing.get('generationIntervalDays',2)))
 now=datetime.now(timezone.utc)
 last=existing.get('lastGeneratedAt')
 if last and not args.force and (now-parse_dt(last)).total_seconds()<interval*86400:
  print(f'SKIP temporal state remains valid for {interval} day interval');return 0
 tz_name=existing.get('authoritativeTimezone','Asia/Kolkata');local=now.astimezone(ZoneInfo(tz_name));world=WORLD_BY_DAY[local.weekday()];label,note=LABELS[world]
 state={'schemaVersion':1,'generationIntervalDays':interval,'lastGeneratedAt':now.replace(microsecond=0).isoformat().replace('+00:00','Z'),'authoritativeTimezone':tz_name,
 'sourcePolicy':'presentation-only shared temporal state; cannot alter product maturity, evidence, repository metrics, or semantic company history',
 'signals':{'date':local.date().isoformat(),'weekday':local.strftime('%A'),'weather':{'enabled':False,'reason':'No deliberate brand home-base weather location has been configured.'}},
 'presentation':{'key':f"{local.strftime('%A').lower()}-{world}",'label':label,'accentWorld':world,'fieldNote':note},
 'fallbackPolicy':'If regeneration fails, keep serving the last valid temporal-state.json. If no state exists, runtime uses a neutral local fallback.'}
 PATH.write_text(json.dumps(state,indent=2)+'\n');print('UPDATED',state['presentation']['key']);return 0
if __name__=='__main__':raise SystemExit(main())
