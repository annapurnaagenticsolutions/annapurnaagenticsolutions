#!/usr/bin/env python3
from __future__ import annotations
import gzip,json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def run(cmd):
    r=subprocess.run(cmd,cwd=ROOT,capture_output=True,text=True,timeout=35)
    if r.returncode: raise AssertionError((r.stderr or r.stdout).strip())
def main()->int:
    profile=json.loads((ROOT/'data/release-profile.json').read_text())
    assert profile['release']=='2.1'
    for script in [
      'validate_json_schemas.py','interaction_contract_test.py','adaptive_contract_test.py',
      'temporal_sensory_contract_test.py','immersive_experience_contract_test.py',
      'immersive_coherence_contract_test.py','v20_living_world_contract_test.py',
      'v21_living_world_contract_test.py','public_copy_audit.py','comprehension_audit.py',
      'first_30s_market_test.py','performance_change_test.py'
    ]: run(['python',str(ROOT/'scripts'/script)])
    run(['node','--check',str(ROOT/'assets/site.js')])
    for rel,limit in profile['performanceBudgetsGzip'].items():
        size=len(gzip.compress((ROOT/rel).read_bytes(),9))
        assert size<=limit,(rel,size,limit)
    print('PASS v2.1 release audit: contracts + copy + performance + JS + three-act Home')
    return 0
if __name__=='__main__': raise SystemExit(main())
