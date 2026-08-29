#!/usr/bin/env python3
"""Generate the no-network public data fallback used by local/file previews."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
bundle={
    'evidence':json.loads((ROOT/'data/evidence-manifest.json').read_text()),
    'repositories':json.loads((ROOT/'data/repository-signals.json').read_text()),
    'history':json.loads((ROOT/'data/public-history.json').read_text()),
}
out='window.ANNAPURNA_PUBLIC_DATA='+json.dumps(bundle,separators=(',',':'),ensure_ascii=False)+';\n'
(ROOT/'assets/public-data.js').write_text(out)
print('PASS generated assets/public-data.js from versioned public evidence data')
