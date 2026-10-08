#!/usr/bin/env python3
"""Synthetic in-memory checks for pilot ledger validation and aggregate arithmetic only."""
import json

from summarize_pilot import PilotDataError, build_report, validate_records


def session(session_ref, participant_ref, site_ref, score, task):
    return {
        "format_version": 1,
        "session_ref": session_ref,
        "participant_ref": participant_ref,
        "site_ref": site_ref,
        "site_authorization_ref": f"auth_{site_ref}",
        "consent_ref": f"consent_{session_ref}",
        "is_real_participant": True,
        "consent_recorded": True,
        "scope_authorized": True,
        "session_date": "2026-10-01",
        "product_version": "local-smoke-1",
        "session_status": "completed",
        "tasks": [task],
        "participant_usefulness": score,
        "reproducibility": "yes",
        "would_use_again": "unsure",
        "purchase_intent": "not_collected",
        "willingness_to_pay_band": "not_collected",
        "pricing_period": "not_collected",
    }


def task(task_ref, mode, method, baseline, product, support, alerts, useful, false, unknown, other, critical=0):
    return {
        "task_ref": task_ref,
        "category": "checkout_flow",
        "status": "completed",
        "comparison_mode": mode,
        "baseline_method": method,
        "baseline_minutes": baseline,
        "product_minutes": product,
        "support_minutes": support,
        "alerts_presented": alerts,
        "useful_alerts": useful,
        "false_alerts": false,
        "unknown_alerts": unknown,
        "other_alerts": other,
        "critical_false_passes": critical,
    }


rows = [
    session("session_a", "owner_a", "site_a", 4, task("task_a", "paired", "manual_playwright", 40, 30, 5, 4, 2, 1, 1, 0, 1)),
    session("session_b", "owner_b", "site_b", 3, task("task_b", "unpaired", "none", 0, 20, 1, 2, 1, 0, 1, 0)),
]
report = build_report(validate_records(rows))
summary = report["summary"]
assert summary["sessions"]["distinct_participant_refs"] == 2
assert not summary["sessions"]["within_planned_5_to_10_participant_ref_range"]
assert summary["tasks"]["paired_completed"] == 1
assert summary["tasks"]["median_paired_minutes_saved"] == 10.0
assert summary["tasks"]["median_paired_percent_time_change"] == 25.0
assert summary["alert_dispositions"]["alerts_presented"] == 6
assert summary["alert_dispositions"]["useful_alerts"] == 3
assert summary["critical_false_passes"] == 1
assert summary["feedback"]["participant_usefulness_mean_1_to_5"] == 3.5
assert report["interpretation"]["readiness_decision"] is None
serialized = json.dumps(report)
for private_ref in ("session_a", "session_b", "owner_a", "owner_b", "site_a", "site_b", "auth_site_a", "consent_session_a"):
    assert private_ref not in serialized

synthetic = [dict(rows[0], is_real_participant=False), rows[1]]
try:
    validate_records(synthetic)
except PilotDataError:
    pass
else:
    raise AssertionError("synthetic participant marker must be rejected")

with_url = [dict(rows[0], url="https://example.invalid"), rows[1]]
try:
    validate_records(with_url)
except PilotDataError:
    pass
else:
    raise AssertionError("undeclared URL field must be rejected")

bad_pair = [session("bad_pair", "owner_c", "site_c", 4, task("task_c", "paired", "none", 0, 10, 0, 0, 0, 0, 0, 0)), rows[1]]
try:
    validate_records(bad_pair)
except PilotDataError:
    pass
else:
    raise AssertionError("paired task without a measured baseline must be rejected")

print("Pilot summary smoke PASSED: paired timing, aggregate alert/feedback counts, privacy rejection, and no readiness verdict.")
