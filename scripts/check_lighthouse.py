#!/usr/bin/env python3
"""Fail CI when Lighthouse categories regress below agreed market-site floors."""
import json, sys
from pathlib import Path

path = Path(sys.argv[1] if len(sys.argv) > 1 else ".quality/lighthouse.json")
data = json.loads(path.read_text())
root = Path(__file__).resolve().parents[1]
profile = json.loads((root / "data" / "release-profile.json").read_text())
thresholds = {key: value / 100 for key, value in profile["lighthouseMinimums"].items()}
failed = []
for key, floor in thresholds.items():
    score = data["categories"][key]["score"]
    print(f"{key:15s} {score:.2f}  floor {floor:.2f}")
    if score < floor: failed.append(key)
if failed:
    print("FAIL categories:", ", ".join(failed))
    raise SystemExit(1)
print("PASS Lighthouse category floors")
