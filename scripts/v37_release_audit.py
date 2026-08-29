#!/usr/bin/env python3
from pathlib import Path
import subprocess,sys,json,gzip
ROOT=Path(__file__).resolve().parents[1];PY=sys.executable
def run(script):
    r=subprocess.run([PY,str(ROOT/'scripts'/script)],cwd=ROOT,capture_output=True,text=True,timeout=45)
    if r.returncode: raise AssertionError(f'{script}: '+(r.stderr or r.stdout).strip())
def main():
    profile=json.loads((ROOT/'data/release-profile.json').read_text());assert profile['release']=='3.7'
    scripts=['validate_json_schemas.py','interaction_contract_test.py','adaptive_contract_test.py','temporal_sensory_contract_test.py','perceived_liveness_contract_test.py','immersive_experience_contract_test.py','immersive_coherence_contract_test.py','v20_living_world_contract_test.py','v21_living_world_contract_test.py','v22_living_world_contract_test.py','v23_micro_scene_contract_test.py','v24_cross_world_contract_test.py','v24_ephemerality_test.py','v25_composite_scene_contract_test.py','v25_ephemerality_test.py','v30_experience_reconstruction_test.py','v31_visual_stability_test.py','v32_material_living_test.py','v33_motion_grammar_test.py','v34_journey_frame_test.py','v35_spatial_coherence_test.py','v36_typography_rhythm_test.py','v37_typography_lock_test.py','public_copy_audit.py','comprehension_audit.py','first_30s_market_test.py','performance_change_test.py']
    for script in scripts: run(script)
    for rel in ['assets/site.js','assets/material.js']:
        r=subprocess.run(['node','--check',str(ROOT/rel)],cwd=ROOT,capture_output=True,text=True,timeout=30)
        if r.returncode: raise AssertionError(r.stderr)
    for rel,limit in profile['performanceBudgetsGzip'].items():
        size=len(gzip.compress((ROOT/rel).read_bytes(),9));assert size<=limit,(rel,size,limit)
    print('PASS v3.7 release audit: typography lock + visual QA + inherited contracts + budgets')
    return 0
if __name__=='__main__': raise SystemExit(main())
