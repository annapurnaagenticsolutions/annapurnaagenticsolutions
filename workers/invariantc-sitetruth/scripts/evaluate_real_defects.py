#!/usr/bin/env python3
"""Score an explicitly human-reviewed real-defect JSONL dataset; never accepts synthetic cases."""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any

REQUIRED_FIELDS = {
    "case_id", "site_id", "site_authorization_ref", "category", "source_layers", "predicate", "severity",
    "human_label", "prediction", "real_case", "label_source", "reviewer_count",
    "review_status", "report_sha256",
}
ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,128}$")
CATEGORY_RE = re.compile(r"^[a-z][a-z0-9_.-]{0,63}$")
SHA_RE = re.compile(r"^[0-9a-f]{64}$")
PREDICATES = {"equal", "near", "greater_or_equal", "less_or_equal"}


class DatasetError(ValueError):
    pass


def _unique_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise DatasetError("duplicate JSON object key")
        result[key] = value
    return result


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as stream:
        for line_number, line in enumerate(stream, 1):
            if not line.strip():
                continue
            try:
                record = json.loads(line, object_pairs_hook=_unique_object)
            except json.JSONDecodeError as exc:
                raise DatasetError(f"line {line_number}: invalid JSON") from exc
            except DatasetError as exc:
                raise DatasetError(f"line {line_number}: object contains a duplicate key") from exc
            if not isinstance(record, dict):
                raise DatasetError(f"line {line_number}: each row must be an object")
            records.append(record)
    return records


def validate_records(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not records:
        raise DatasetError("dataset is empty")
    seen: set[str] = set()
    normalized = []
    for index, record in enumerate(records, 1):
        label = f"record {index}"
        missing = REQUIRED_FIELDS - record.keys()
        extra = record.keys() - REQUIRED_FIELDS
        if missing:
            raise DatasetError(f"{label}: missing required fields: {', '.join(sorted(missing))}")
        if extra:
            raise DatasetError(f"{label}: unexpected fields: {', '.join(sorted(extra))}; raw URLs and page data are prohibited")
        for field in ("case_id", "site_id", "site_authorization_ref"):
            value = record[field]
            if not isinstance(value, str) or not ID_RE.fullmatch(value):
                raise DatasetError(f"{label}: {field} must be a bounded pseudonymous identifier")
        if record["case_id"] in seen:
            raise DatasetError(f"{label}: duplicate case_id")
        seen.add(record["case_id"])
        if not CATEGORY_RE.fullmatch(record["category"] if isinstance(record["category"], str) else ""):
            raise DatasetError(f"{label}: category must be a normalized lowercase identifier")
        source_layers = record["source_layers"]
        if (
            not isinstance(source_layers, list)
            or not 1 <= len(source_layers) <= 16
            or any(not isinstance(layer, str) or not CATEGORY_RE.fullmatch(layer) for layer in source_layers)
            or len(set(source_layers)) != len(source_layers)
        ):
            raise DatasetError(f"{label}: source_layers must contain 1 to 16 unique normalized identifiers")
        if not isinstance(record["predicate"], str) or record["predicate"] not in PREDICATES:
            raise DatasetError(f"{label}: predicate must be a supported evaluator rule")
        if not isinstance(record["severity"], str) or record["severity"] not in {"low", "medium", "high"}:
            raise DatasetError(f"{label}: invalid severity")
        if not isinstance(record["human_label"], str) or record["human_label"] not in {"defect", "no_defect"}:
            raise DatasetError(f"{label}: human_label must be defect or no_defect")
        if not isinstance(record["prediction"], str) or record["prediction"] not in {"fail", "pass", "unknown"}:
            raise DatasetError(f"{label}: prediction must be fail, pass, or unknown")
        if record["real_case"] is not True or record["label_source"] != "human":
            raise DatasetError(f"{label}: only real cases with human labels are accepted")
        if type(record["reviewer_count"]) is not int or record["reviewer_count"] < 1:
            raise DatasetError(f"{label}: reviewer_count must be a positive integer")
        if not isinstance(record["review_status"], str) or record["review_status"] not in {"single_review", "consensus", "adjudicated"}:
            raise DatasetError(f"{label}: invalid review_status")
        if record["reviewer_count"] == 1 and record["review_status"] != "single_review":
            raise DatasetError(f"{label}: one reviewer requires single_review status")
        if record["reviewer_count"] > 1 and record["review_status"] == "single_review":
            raise DatasetError(f"{label}: multiple reviewers require consensus or adjudicated status")
        if not isinstance(record["report_sha256"], str) or not SHA_RE.fullmatch(record["report_sha256"]):
            raise DatasetError(f"{label}: report_sha256 must be 64 lowercase hexadecimal characters")
        normalized.append(record)
    if not any(row["human_label"] == "no_defect" for row in normalized):
        raise DatasetError("at least one human-labelled no_defect case is required to assess false positives")
    return normalized


def ratio(numerator: int, denominator: int) -> float | None:
    return round(numerator / denominator, 4) if denominator else None


def wilson_interval(successes: int, trials: int, z: float = 1.96) -> list[float] | None:
    if trials == 0:
        return None
    p = successes / trials
    denominator = 1 + z * z / trials
    center = (p + z * z / (2 * trials)) / denominator
    margin = z * ((p * (1 - p) / trials + z * z / (4 * trials * trials)) ** 0.5) / denominator
    return [round(max(0.0, center - margin), 4), round(min(1.0, center + margin), 4)]


def summarize(records: list[dict[str, Any]]) -> dict[str, Any]:
    counts = {
        "true_positive": 0, "false_positive": 0, "false_negative_pass": 0,
        "true_negative": 0, "unknown_defect": 0, "unknown_no_defect": 0,
        "cases": len(records),
    }
    by_category: dict[str, list[dict[str, Any]]] = defaultdict(list)
    by_source_layer: dict[str, list[dict[str, Any]]] = defaultdict(list)
    by_predicate: dict[str, list[dict[str, Any]]] = defaultdict(list)
    by_severity: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in records:
        by_category[row["category"]].append(row)
        for layer in row["source_layers"]:
            by_source_layer[layer].append(row)
        by_predicate[row["predicate"]].append(row)
        by_severity[row["severity"]].append(row)
        if row["human_label"] == "defect":
            if row["prediction"] == "fail":
                counts["true_positive"] += 1
            elif row["prediction"] == "pass":
                counts["false_negative_pass"] += 1
            else:
                counts["unknown_defect"] += 1
        elif row["prediction"] == "fail":
            counts["false_positive"] += 1
        elif row["prediction"] == "pass":
            counts["true_negative"] += 1
        else:
            counts["unknown_no_defect"] += 1

    def metrics(rows: list[dict[str, Any]]) -> dict[str, Any]:
        tp = fp = fn_pass = tn = unknown_defect = unknown_no_defect = 0
        for row in rows:
            if row["human_label"] == "defect":
                if row["prediction"] == "fail": tp += 1
                elif row["prediction"] == "pass": fn_pass += 1
                else: unknown_defect += 1
            elif row["prediction"] == "fail": fp += 1
            elif row["prediction"] == "pass": tn += 1
            else: unknown_no_defect += 1
        unknown = unknown_defect + unknown_no_defect
        predicted_defects = tp + fp
        actual_defects = tp + fn_pass + unknown_defect
        known_actual_defects = tp + fn_pass
        strict_missed = fn_pass + unknown_defect
        return {
            "cases": len(rows),
            "human_defects": actual_defects,
            "human_no_defects": tn + fp + unknown_no_defect,
            "true_positive": tp,
            "false_positive": fp,
            "false_negative_pass": fn_pass,
            "unknown_defect": unknown_defect,
            "true_negative": tn,
            "unknown_no_defect": unknown_no_defect,
            "precision": ratio(tp, predicted_defects),
            "precision_95ci_wilson": wilson_interval(tp, predicted_defects),
            "strict_recall_unknown_counts_as_missed": ratio(tp, actual_defects),
            "strict_recall_95ci_wilson": wilson_interval(tp, actual_defects),
            "known_outcome_recall": ratio(tp, known_actual_defects),
            "unknown_rate": ratio(unknown, len(rows)),
            "coverage": ratio(len(rows) - unknown, len(rows)),
            "unknown_cases": unknown,
            "missed_defects_including_unknown": strict_missed,
        }

    result = metrics(records)
    positive_sites = {row["site_id"] for row in records if row["human_label"] == "defect"}
    result["multi_reviewer_cases"] = sum(row["reviewer_count"] >= 2 for row in records)
    result["sites_with_human_defects"] = len(positive_sites)
    result["high_severity"] = metrics([row for row in records if row["severity"] == "high"])
    result["by_category"] = {key: metrics(rows) for key, rows in sorted(by_category.items())}
    result["by_source_layer"] = {key: metrics(rows) for key, rows in sorted(by_source_layer.items())}
    result["by_predicate"] = {key: metrics(rows) for key, rows in sorted(by_predicate.items())}
    result["by_severity"] = {key: metrics(rows) for key, rows in sorted(by_severity.items())}
    return result


def build_report(records: list[dict[str, Any]], minimum_defects: int, minimum_sites: int) -> dict[str, Any]:
    summary = summarize(records)
    positive_defects = summary["human_defects"]
    positive_sites = summary["sites_with_human_defects"]
    all_cases_multi_reviewed = summary["multi_reviewer_cases"] == summary["cases"]
    summary["gate"] = {
        "required_human_defects": minimum_defects,
        "required_sites_with_human_defects": minimum_sites,
        "required_multi_reviewer_cases": summary["cases"],
        "all_cases_multi_reviewed": all_cases_multi_reviewed,
        "meets_handoff_minimum": positive_defects >= minimum_defects and positive_sites >= minimum_sites and all_cases_multi_reviewed,
        "warning": "Site authorization, reviewer identity/independence, and human-label provenance require external review; this script validates recorded references and counts, not their truth.",
    }
    return {
        "format_version": 2,
        "classification_policy": {
            "predicted_defect": "FAIL",
            "predicted_no_defect": "PASS",
            "unknown_policy": "UNKNOWN is not an alert; it counts as a missed defect for strict recall and is also reported separately.",
            "source_layer_grouping": "A case with multiple source layers appears in every matching layer group; these groups are not additive.",
        },
        "summary": summary,
        "privacy": "Output contains aggregate counts and metrics only; input URLs, site identifiers, and raw page data are rejected or omitted.",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path, help="UTF-8 JSONL human-label dataset")
    parser.add_argument("--output", type=Path, help="write aggregate-only JSON report; default stdout")
    parser.add_argument("--minimum-defects", type=int, default=100)
    parser.add_argument("--minimum-sites", type=int, default=3)
    parser.add_argument("--require-gate", action="store_true", help="return exit code 3 if handoff minimum is not met")
    args = parser.parse_args()
    if args.minimum_defects < 1 or args.minimum_sites < 2:
        parser.error("minimum-defects must be positive and minimum-sites must be at least 2")
    if args.output:
        try:
            same_path = args.input.resolve(strict=False) == args.output.resolve(strict=False)
            same_file = args.input.exists() and args.output.exists() and args.input.samefile(args.output)
        except OSError:
            print("Evaluation input rejected: could not safely compare input and output paths", file=sys.stderr)
            return 2
        if same_path or same_file:
            print("Evaluation input rejected: --output must not refer to the input file", file=sys.stderr)
            return 2
    try:
        records = validate_records(load_jsonl(args.input))
    except (OSError, DatasetError) as exc:
        print(f"Evaluation input rejected: {exc}", file=sys.stderr)
        return 2
    report = build_report(records, args.minimum_defects, args.minimum_sites)
    serialized = json.dumps(report, indent=2, sort_keys=True) + "\n"
    if args.output:
        args.output.write_text(serialized, encoding="utf-8", newline="\n")
    else:
        print(serialized, end="")
    return 3 if args.require_gate and not report["summary"]["gate"]["meets_handoff_minimum"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
