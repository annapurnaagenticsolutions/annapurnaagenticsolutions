#!/usr/bin/env python3
from pathlib import Path
import subprocess,sys,json,gzip
ROOT=Path(__file__).resolve().parents[1];PY=sys.executable

def run(script,timeout=60):
    r=subprocess.run([PY,str(ROOT/'scripts'/script)],cwd=ROOT,capture_output=True,text=True,timeout=timeout)
    if r.returncode:raise AssertionError(f'{script}: '+(r.stderr or r.stdout).strip())

def main():
    profile=json.loads((ROOT/'data/release-profile.json').read_text());assert profile['release']=='4.3'
    inherited=['validate_json_schemas.py','interaction_contract_test.py','adaptive_contract_test.py','temporal_sensory_contract_test.py','perceived_liveness_contract_test.py','immersive_experience_contract_test.py','immersive_coherence_contract_test.py','v20_living_world_contract_test.py','v21_living_world_contract_test.py','v22_living_world_contract_test.py','v23_micro_scene_contract_test.py','v24_cross_world_contract_test.py','v24_ephemerality_test.py','v25_composite_scene_contract_test.py','v25_ephemerality_test.py','v30_experience_reconstruction_test.py','v31_visual_stability_test.py','v32_material_living_test.py','v33_motion_grammar_test.py','v34_journey_frame_test.py','v35_spatial_coherence_test.py','v36_typography_rhythm_test.py','v38_optical_material_test.py','v38_public_data_test.py','v39_triple_evaluation_test.py','v40_experience_system_test.py','v41_context_integrity_test.py','v42_company_integration_test.py','verify_v42_deployed_site.py','v43_production_cutover_test.py','public_copy_audit.py','comprehension_audit.py','first_30s_market_test.py','performance_change_test.py','verify_v43_http_surface.py']
    for script in inherited:run(script)
    for rel in ['assets/site.js','assets/material.js','assets/public-data.js']:
        r=subprocess.run(['node','--check',str(ROOT/rel)],cwd=ROOT,capture_output=True,text=True,timeout=30)
        if r.returncode:raise AssertionError(r.stderr)
    for rel,limit in profile['performanceBudgetsGzip'].items():
        p=ROOT/rel;assert p.exists(),rel
        size=len(gzip.compress(p.read_bytes(),9));assert size<=limit,(rel,size,limit)
    # No inline style/script is a security property of core production HTML pages (demos in sub-folders run client-side interactive sandboxes).
    for p in ROOT.rglob('*.html'):
        if 'demos' in p.parts and p.parent != ROOT / 'pramana' / 'demos':
            continue
        text=p.read_text(encoding='utf-8',errors='replace').lower();assert ' style=' not in text,(p,'inline style');
        import re
        assert not any('src=' not in m.group(0).lower() for m in re.finditer(r'<script\b[^>]*>',text)),(p,'inline script')
    print('PASS v4.3 release audit: production metadata + accessibility + strict CSP + Pages cutover + inherited contracts')
    return 0
if __name__=='__main__':raise SystemExit(main())
