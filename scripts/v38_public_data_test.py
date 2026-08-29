#!/usr/bin/env python3
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
def main():
    raw=(ROOT/'assets/public-data.js').read_text().strip()
    prefix='window.ANNAPURNA_PUBLIC_DATA='
    assert raw.startswith(prefix) and raw.endswith(';')
    got=json.loads(raw[len(prefix):-1])
    expected={
      'evidence':json.loads((ROOT/'data/evidence-manifest.json').read_text()),
      'repositories':json.loads((ROOT/'data/repository-signals.json').read_text()),
      'history':json.loads((ROOT/'data/public-history.json').read_text()),
    }
    assert got==expected,'static fallback drifted from versioned JSON'
    assert len(got['evidence']['claims'])>0 and len(got['repositories']['repositories'])>0 and len(got['history']['entries'])>0
    print('PASS v3.8 public-data fallback is byte-semantically synchronized with JSON sources')
    return 0
if __name__=='__main__': raise SystemExit(main())
