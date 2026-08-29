#!/usr/bin/env python3
from __future__ import annotations
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
WORLD_IDS={"ai","wonder","idea","axon","web","software"}
def main()->int:
    data=json.loads((ROOT/"data/interaction-model.json").read_text())
    if data.get("schemaVersion")!=2: raise AssertionError("interaction model must be schema v2")
    if data["storage"]["key"]!="annapurnaLivingV19": raise AssertionError("v1.9 storage key mismatch")
    phases=data["phases"]; mins=[p["minExplored"] for p in phases]
    if mins!=sorted(mins) or mins[0]!=0: raise AssertionError("phase thresholds must ascend from 0")
    returns=data["returnStates"]; sessions=[p["minSessions"] for p in returns]
    if sessions!=sorted(sessions) or sessions[0]!=1: raise AssertionError("return thresholds must ascend from session 1")
    if len({p["key"] for p in returns})!=4: raise AssertionError("four unique return states required")
    if not (30<=data["sessionPolicy"]["gapMinutes"]<=1440): raise AssertionError("session gap outside safe bounds")
    if "normal page navigation does not increment" not in data["sessionPolicy"]["semantics"]: raise AssertionError("session semantics must reject page-view inflation")
    gestures=data["gestures"]
    if not gestures["horizontalSwipe"] or not gestures["corePulse"]: raise AssertionError("touch swipe and core pulse must remain available")
    con=data["connections"]
    if set(con)!=WORLD_IDS: raise AssertionError("connections must cover six worlds")
    for src,targets in con.items():
        if src in targets: raise AssertionError(f"{src} must not connect to itself")
        if any(t not in WORLD_IDS for t in targets): raise AssertionError(f"unknown connection from {src}")
    if "cannot alter product maturity" not in data["historyPolicy"]: raise AssertionError("history firewall must be explicit")
    if "no identity tracking" not in data["trackingPolicy"].lower(): raise AssertionError("tracking boundary must be explicit")
    print("PASS interaction contract: exploration phases + return sessions + touch gestures + 6-world graph; no scoring/history mutation")
    return 0
if __name__=="__main__": raise SystemExit(main())
