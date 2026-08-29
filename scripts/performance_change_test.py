#!/usr/bin/env python3
from __future__ import annotations
import gzip,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def main()->int:
    data=json.loads((ROOT/'data/living-performance.json').read_text())
    baseline=data['baselineGzipBytes']; profile=json.loads((ROOT/'data/release-profile.json').read_text())
    print(f"Static transfer comparison vs v{data['baselineRelease']}:")
    for rel,old in baseline.items():
        new=len(gzip.compress((ROOT/rel).read_bytes(),9)); delta=(new-old)/old*100
        print(f'  {rel}: {old} -> {new} bytes ({delta:+.1f}%)')
        if new>profile['performanceBudgetsGzip'][rel]: raise AssertionError(f'{rel} exceeds release budget')
    if data['maxBrowserRegressionPercent']!={'LCP':10,'INP':10}: raise AssertionError('LCP/INP 10% regression policy required')
    print('PASS static budgets; LCP/INP <=10% regression remains a browser CI/deployment promotion gate')
    return 0
if __name__=='__main__': raise SystemExit(main())
