#!/usr/bin/env python3
"""Validate a privacy-minimal guided-pilot JSONL ledger and emit aggregate-only metrics."""
from __future__ import annotations

import argparse
import json
import math
import re
import statistics
import sys
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path
from typing import Any

SESSION_FIELDS = {
    "format_version", "session_ref", "participant_ref", "site_ref",
    "site_authorization_ref", "consent_ref", "is_real_participant",
    "consent_recorded", "scope_authorized", "session_date", "product_version",
    "session_status", "tasks", "participant_usefulness", "reproducibility",
    "would_use_again", "purchase_intent", "willingness_to_pay_band", "pricing_period",
}
TASK_FIELDS = {
    "task_ref", "category", "status", "comparison_mode", "baseline_method",
    "baseline_minutes", "product_minutes", "support_minutes", "alerts_presented",
    "useful_alerts", "false_alerts", "unknown_alerts", "other_alerts",
    "critical_false_passes",
}
OPAQUE_ID = re.compile(r"^[A-Za-z0-9_-]{1,80}$")
SLUG = re.compile(r"^[a-z][a-z0-9_.-]{0,63}$")
VERSION = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}$")
SESSION_STATUSES = {"completed", "abandoned", "blocked"}
TASK_STATUSES = SESSION_STATUSES
BASELINE_METHODS = {"manual_playwright", "pact", "basic_checks", "llm_reviewer", "none"}
FEEDBACK_ENUMS = {
    "reproducibility": {"yes", "partially", "no", "not_collected"},
    "would_use_again": {"yes", "no", "unsure", "not_collected"},
    "purchase_intent": {"yes", "no", "unsure", "not_collected"},
    "willingness_to_pay_band": {"none", "below_alternative", "at_alternative", "above_alternative", "declined", "not_collected"},
    "pricing_period": {"per_run", "monthly", "annual", "not_applicable", "not_collected"},
}
COUNT_FIELDS = (
    "alerts_presented", "useful_alerts", "false_alerts", "unknown_alerts",
    "other_alerts", "critical_false_passes",
)
ALERT_LABEL_FIELDS = ("useful_alerts", "false_alerts", "unknown_alerts", "other_alerts")


class PilotDataError(ValueError):
    """The ledger is malformed or includes fields outside the privacy-minimal schema."""


def _bounded_id(value: Any, field: str, where: str) -> str:
    if not isinstance(value, str) or not OPAQUE_ID.fullmatch(value):
        raise PilotDataError(f"{where}: {field} must be an opaque bounded identifier")
    return value


def _finite_minutes(value: Any, field: str, where: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not 0 <= value <= 480:
        raise PilotDataError(f"{where}: {field} must be a finite number from 0 to 480")
    return float(value)


def _count(value: Any, field: str, where: str) -> int:
    if type(value) is not int or not 0 <= value <= 100000:
        raise PilotDataError(f"{where}: {field} must be a non-negative integer no greater than 100000")
    return value


def _enum(value: Any, allowed: set[str], field: str, where: str) -> str:
    if not isinstance(value, str) or value not in allowed:
        raise PilotDataError(f"{where}: invalid {field}")
    return value


def validate_records(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not records:
        raise PilotDataError("ledger is empty")
    seen_sessions: set[str] = set()
    seen_tasks: set[tuple[str, str]] = set()
    clean: list[dict[str, Any]] = []

    for index, original in enumerate(records, start=1):
        where = f"session row {index}"
        if not isinstance(original, dict):
            raise PilotDataError(f"{where}: each row must be an object")
        missing, extra = SESSION_FIELDS - original.keys(), original.keys() - SESSION_FIELDS
        if missing:
            raise PilotDataError(f"{where}: missing fields: {', '.join(sorted(missing))}")
        if extra:
            raise PilotDataError(f"{where}: undeclared fields: {', '.join(sorted(extra))}; URLs, free text, and personal data are prohibited")
        row = dict(original)
        if type(row["format_version"]) is not int or row["format_version"] != 1:
            raise PilotDataError(f"{where}: unsupported format_version")
        for field in ("session_ref", "participant_ref", "site_ref", "site_authorization_ref", "consent_ref"):
            _bounded_id(row[field], field, where)
        if row["session_ref"] in seen_sessions:
            raise PilotDataError(f"{where}: duplicate session_ref")
        seen_sessions.add(row["session_ref"])
        for field in ("is_real_participant", "consent_recorded", "scope_authorized"):
            if row[field] is not True:
                raise PilotDataError(f"{where}: {field} must be true; the summarizer cannot verify the assertion")
        if not isinstance(row["session_date"], str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", row["session_date"]):
            raise PilotDataError(f"{where}: session_date must be YYYY-MM-DD")
        try:
            date.fromisoformat(row["session_date"])
        except ValueError as exc:
            raise PilotDataError(f"{where}: session_date must be YYYY-MM-DD") from exc
        if not isinstance(row["product_version"], str) or not VERSION.fullmatch(row["product_version"]):
            raise PilotDataError(f"{where}: product_version must be a bounded version identifier")
        row["session_status"] = _enum(row["session_status"], SESSION_STATUSES, "session_status", where)
        score = row["participant_usefulness"]
        if score is not None and (type(score) is not int or not 1 <= score <= 5):
            raise PilotDataError(f"{where}: participant_usefulness must be null or an integer from 1 to 5")
        for field, allowed in FEEDBACK_ENUMS.items():
            row[field] = _enum(row[field], allowed, field, where)

        tasks = row["tasks"]
        if not isinstance(tasks, list) or not 1 <= len(tasks) <= 12:
            raise PilotDataError(f"{where}: tasks must contain 1 to 12 task records")
        task_refs: set[str] = set()
        completed_tasks = 0
        for task_index, task in enumerate(tasks, start=1):
            tw = f"{where}, task {task_index}"
            if not isinstance(task, dict):
                raise PilotDataError(f"{tw}: task must be an object")
            missing_task, extra_task = TASK_FIELDS - task.keys(), task.keys() - TASK_FIELDS
            if missing_task:
                raise PilotDataError(f"{tw}: missing fields: {', '.join(sorted(missing_task))}")
            if extra_task:
                raise PilotDataError(f"{tw}: undeclared fields: {', '.join(sorted(extra_task))}; free text and page data are prohibited")
            task = dict(task)
            _bounded_id(task["task_ref"], "task_ref", tw)
            if task["task_ref"] in task_refs or (row["session_ref"], task["task_ref"]) in seen_tasks:
                raise PilotDataError(f"{tw}: duplicate task_ref")
            task_refs.add(task["task_ref"])
            seen_tasks.add((row["session_ref"], task["task_ref"]))
            if not isinstance(task["category"], str) or not SLUG.fullmatch(task["category"]):
                raise PilotDataError(f"{tw}: category must be a normalized lowercase identifier")
            task["status"] = _enum(task["status"], TASK_STATUSES, "status", tw)
            task["comparison_mode"] = _enum(task["comparison_mode"], {"paired", "unpaired"}, "comparison_mode", tw)
            task["baseline_method"] = _enum(task["baseline_method"], BASELINE_METHODS, "baseline_method", tw)
            for field in ("baseline_minutes", "product_minutes", "support_minutes"):
                task[field] = _finite_minutes(task[field], field, tw)
            if task["comparison_mode"] == "paired":
                if task["baseline_method"] == "none" or task["baseline_minutes"] <= 0:
                    raise PilotDataError(f"{tw}: paired comparisons require a baseline method and positive baseline time")
            elif task["baseline_method"] != "none" or task["baseline_minutes"] != 0:
                raise PilotDataError(f"{tw}: unpaired comparisons require baseline_method=none and baseline_minutes=0")
            if task["status"] == "completed":
                completed_tasks += 1
                if task["product_minutes"] <= 0:
                    raise PilotDataError(f"{tw}: completed tasks require positive product_minutes")
            for field in COUNT_FIELDS:
                task[field] = _count(task[field], field, tw)
            if sum(task[field] for field in ALERT_LABEL_FIELDS) != task["alerts_presented"]:
                raise PilotDataError(f"{tw}: alert dispositions must sum to alerts_presented")
            tasks[task_index - 1] = task
        if row["session_status"] == "completed" and completed_tasks == 0:
            raise PilotDataError(f"{where}: completed session requires at least one completed task")
        row["tasks"] = tasks
        clean.append(row)
    return clean


def _median(values: list[float]) -> float | None:
    return round(statistics.median(values), 2) if values else None


def _counts(values: list[str], allowed: set[str]) -> dict[str, int]:
    counter = Counter(values)
    return {value: counter.get(value, 0) for value in sorted(allowed)}


def summarize(records: list[dict[str, Any]]) -> dict[str, Any]:
    all_tasks = [task for row in records for task in row["tasks"]]
    completed = [task for task in all_tasks if task["status"] == "completed"]
    paired = [task for task in completed if task["comparison_mode"] == "paired"]
    labels = {field: sum(task[field] for task in all_tasks) for field in ALERT_LABEL_FIELDS}
    critical_false_passes = sum(task["critical_false_passes"] for task in all_tasks)
    savings = [task["baseline_minutes"] - task["product_minutes"] for task in paired]
    savings_percent = [100 * (task["baseline_minutes"] - task["product_minutes"]) / task["baseline_minutes"] for task in paired]
    categories: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for task in all_tasks:
        categories[task["category"]].append(task)

    usefulness = [row["participant_usefulness"] for row in records if row["participant_usefulness"] is not None]
    owner_count = len({row["participant_ref"] for row in records})
    return {
        "sessions": {
            "total": len(records),
            "by_status": _counts([row["session_status"] for row in records], SESSION_STATUSES),
            "distinct_participant_refs": owner_count,
            "distinct_site_refs": len({row["site_ref"] for row in records}),
            "within_planned_5_to_10_participant_ref_range": 5 <= owner_count <= 10,
        },
        "tasks": {
            "total": len(all_tasks),
            "completed": len(completed),
            "by_status": _counts([task["status"] for task in all_tasks], TASK_STATUSES),
            "paired_completed": len(paired),
            "median_product_minutes_completed": _median([task["product_minutes"] for task in completed]),
            "median_baseline_minutes_paired": _median([task["baseline_minutes"] for task in paired]),
            "median_product_minutes_paired": _median([task["product_minutes"] for task in paired]),
            "median_paired_minutes_saved": _median(savings),
            "median_paired_percent_time_change": _median(savings_percent),
            "median_facilitator_support_minutes": _median([task["support_minutes"] for task in all_tasks]),
            "by_category": {
                category: {
                    "tasks": len(rows),
                    "completed": sum(task["status"] == "completed" for task in rows),
                    "alerts_presented": sum(task["alerts_presented"] for task in rows),
                }
                for category, rows in sorted(categories.items())
            },
        },
        "alert_dispositions": {
            "alerts_presented": labels["useful_alerts"] + labels["false_alerts"] + labels["unknown_alerts"] + labels["other_alerts"],
            **labels,
        },
        "critical_false_passes": critical_false_passes,
        "feedback": {
            "participant_usefulness_mean_1_to_5": round(statistics.mean(usefulness), 2) if usefulness else None,
            "participant_usefulness_responses": len(usefulness),
            "reproducibility": _counts([row["reproducibility"] for row in records], FEEDBACK_ENUMS["reproducibility"]),
            "would_use_again": _counts([row["would_use_again"] for row in records], FEEDBACK_ENUMS["would_use_again"]),
            "purchase_intent": _counts([row["purchase_intent"] for row in records], FEEDBACK_ENUMS["purchase_intent"]),
            "willingness_to_pay_band": _counts([row["willingness_to_pay_band"] for row in records], FEEDBACK_ENUMS["willingness_to_pay_band"]),
            "pricing_period": _counts([row["pricing_period"] for row in records], FEEDBACK_ENUMS["pricing_period"]),
        },
    }


def build_report(records: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "format_version": 1,
        "summary": summarize(records),
        "interpretation": {
            "readiness_decision": None,
            "note": "Pilot feedback is directional. This aggregate does not clear browser, hosted safety, real-defect, security, legal, or release gates.",
            "provenance": "Participant, consent, and site-scope flags/references are operator assertions; the local summarizer cannot verify them.",
            "comparison": "Time differences use completed paired task rows only. Negative minutes saved means the product took longer than the recorded baseline.",
            "privacy": "Aggregate counts only; source identifiers, dates, and task references are omitted.",
        },
    }


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as stream:
        for line_number, line in enumerate(stream, start=1):
            if not line.strip():
                continue
            try:
                record = json.loads(line)
            except json.JSONDecodeError as exc:
                raise PilotDataError(f"line {line_number}: invalid JSON") from exc
            if not isinstance(record, dict):
                raise PilotDataError(f"line {line_number}: each row must be an object")
            records.append(record)
    return records


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path, help="UTF-8 JSONL following schemas/pilot_session.schema.json")
    parser.add_argument("--output", type=Path, help="aggregate-only JSON output; defaults to stdout")
    parser.add_argument("--require-minimum-participant-refs", action="store_true", help="return 3 unless at least five distinct participant references are present; does not verify owner identity")
    args = parser.parse_args()
    try:
        records = validate_records(load_jsonl(args.input))
    except (OSError, PilotDataError) as exc:
        print(f"Pilot ledger rejected: {exc}", file=sys.stderr)
        return 2
    report = build_report(records)
    serialized = json.dumps(report, indent=2, sort_keys=True, allow_nan=False) + "\n"
    if args.output:
        args.output.write_text(serialized, encoding="utf-8", newline="\n")
    else:
        print(serialized, end="")
    if args.require_minimum_participant_refs and report["summary"]["sessions"]["distinct_participant_refs"] < 5:
        return 3
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
