#!/usr/bin/env python3
"""Synthetic in-memory checks for evaluation math, schema, and privacy boundaries."""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

from evaluate_real_defects import DatasetError, build_report, validate_records

HASH = "a" * 64

def row(case_id, site_id, category, severity, label, prediction, source_layers=None, predicate="equal"):
    return {
        "case_id": case_id,
        "site_id": site_id,
        "site_authorization_ref": f"auth_{site_id}",
        "category": category,
        "source_layers": source_layers or ["api", "dom"],
        "predicate": predicate,
        "severity": severity,
        "human_label": label,
        "prediction": prediction,
        "real_case": True,
        "label_source": "human",
        "reviewer_count": 2,
        "review_status": "consensus",
        "report_sha256": HASH,
    }

sample = [
    row("c1", "s1", "price_total", "high", "defect", "fail", ["api", "dom"], "equal"),
    row("c2", "s1", "price_total", "high", "defect", "pass", ["dom"], "near"),
    row("c3", "s2", "price_total", "high", "defect", "unknown", ["structured_scene", "dom"], "equal"),
    row("c4", "s2", "inventory", "medium", "no_defect", "fail", ["api"], "greater_or_equal"),
    row("c5", "s3", "inventory", "low", "no_defect", "pass", ["dom"], "equal"),
    row("c6", "s3", "inventory", "low", "no_defect", "unknown", ["dom"], "less_or_equal"),
]
report = build_report(validate_records(sample), minimum_defects=3, minimum_sites=2)
summary = report["summary"]
assert summary["true_positive"] == 1
assert summary["false_positive"] == 1
assert summary["false_negative_pass"] == 1
assert summary["unknown_defect"] == 1
assert summary["precision"] == 0.5
assert summary["strict_recall_unknown_counts_as_missed"] == 0.3333
assert summary["known_outcome_recall"] == 0.5
assert summary["unknown_rate"] == 0.3333
assert summary["gate"]["meets_handoff_minimum"]
assert summary["gate"]["all_cases_multi_reviewed"]
assert not build_report(validate_records(sample), minimum_defects=3, minimum_sites=3)["summary"]["gate"]["meets_handoff_minimum"]
single_review_sample = [dict(sample[0], reviewer_count=1, review_status="single_review")] + sample[1:]
single_review_gate = build_report(validate_records(single_review_sample), 3, 2)["summary"]["gate"]
assert not single_review_gate["all_cases_multi_reviewed"]
assert not single_review_gate["meets_handoff_minimum"]
assert summary["by_source_layer"]["api"]["cases"] == 2
assert summary["by_source_layer"]["api"]["true_positive"] == 1
assert summary["by_source_layer"]["api"]["false_positive"] == 1
assert summary["by_predicate"]["near"]["cases"] == 1
assert summary["by_predicate"]["near"]["false_negative_pass"] == 1

serialized = json.dumps(report, sort_keys=True)
for private_value in ("c1", "s1", "auth_s1", HASH, "case_id", "site_id", "report_sha256"):
    assert private_value not in serialized, f"aggregate report leaked {private_value}"

synthetic = [dict(sample[0], case_id="synthetic", real_case=False)] + sample[1:]
try:
    validate_records(synthetic)
except DatasetError:
    pass
else:
    raise AssertionError("synthetic fixtures must not enter the real-defect evaluation")

with_url = [dict(sample[0], case_id="url", url="https://example.invalid")] + sample[1:]
try:
    validate_records(with_url)
except DatasetError:
    pass
else:
    raise AssertionError("raw URLs must be rejected from the annotation input")

bad_layers = [dict(sample[0], case_id="bad-layers", source_layers=["dom", "dom"])] + sample[1:]
try:
    validate_records(bad_layers)
except DatasetError:
    pass
else:
    raise AssertionError("duplicate source layer assignments must be rejected")

bad_predicate = [dict(sample[0], case_id="bad-predicate", predicate="contains_personal_data")] + sample[1:]
try:
    validate_records(bad_predicate)
except DatasetError:
    pass
else:
    raise AssertionError("unrecognized evaluator predicates must be rejected")

all_unknown = [
    row("u1", "u_site_1", "unknown_case", "high", "defect", "unknown", ["dom"], "equal"),
    row("u2", "u_site_2", "unknown_case", "low", "no_defect", "unknown", ["api"], "near"),
]
unknown_metrics = build_report(validate_records(all_unknown), 1, 2)["summary"]
assert unknown_metrics["precision"] is None
assert unknown_metrics["strict_recall_unknown_counts_as_missed"] == 0.0
assert unknown_metrics["coverage"] == 0.0

schema = json.loads((Path(__file__).resolve().parents[1] / "schemas" / "real_defect_evaluation.schema.json").read_text(encoding="utf-8"))
assert set(schema["required"]) == set(sample[0].keys())
assert set(schema["properties"]["predicate"]["enum"]) == {"equal", "near", "greater_or_equal", "less_or_equal"}
assert schema["additionalProperties"] is False

scratch_root = Path(__file__).resolve().parents[1] / "target"
scratch_root.mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(prefix="sitetruth-evaluation-smoke-", dir=scratch_root) as temp_dir:
    input_path = Path(temp_dir) / "synthetic-evaluation.jsonl"
    output_path = Path(temp_dir) / "aggregate.json"
    input_path.write_text("\n".join(json.dumps(item) for item in sample) + "\n", encoding="utf-8")
    scorer = Path(__file__).with_name("evaluate_real_defects.py")
    base_command = [
        sys.executable, str(scorer), "--input", str(input_path), "--output", str(output_path),
        "--minimum-sites", "2", "--require-gate",
    ]
    accepted = subprocess.run(base_command + ["--minimum-defects", "3"], capture_output=True, text=True, check=False)
    assert accepted.returncode == 0, accepted.stderr
    assert json.loads(output_path.read_text(encoding="utf-8"))["summary"]["gate"]["meets_handoff_minimum"]
    rejected = subprocess.run(base_command + ["--minimum-defects", "4"], capture_output=True, text=True, check=False)
    assert rejected.returncode == 3, f"unsatisfied evidence gate must exit 3, got {rejected.returncode}: {rejected.stderr}"
    assert not json.loads(output_path.read_text(encoding="utf-8"))["summary"]["gate"]["meets_handoff_minimum"]
    original_input = input_path.read_bytes()
    overwrite = subprocess.run(
        [sys.executable, str(scorer), "--input", str(input_path), "--output", str(input_path)],
        capture_output=True,
        text=True,
        check=False,
    )
    assert overwrite.returncode == 2 and "must not refer to the input file" in overwrite.stderr
    assert input_path.read_bytes() == original_input, "the scorer must preserve its input file"
    duplicate_input = Path(temp_dir) / "duplicate-key.jsonl"
    duplicate_input.write_text('{"case_id":"first","case_id":"second"}\n', encoding="utf-8")
    duplicate = subprocess.run([sys.executable, str(scorer), "--input", str(duplicate_input)], capture_output=True, text=True, check=False)
    assert duplicate.returncode == 2 and "duplicate key" in duplicate.stderr

print("Evaluation metrics smoke PASSED: aggregate confusion metrics, source-layer/predicate groups, UNKNOWN and multi-review gates, schema alignment, CLI JSONL acceptance/exit codes, and privacy/input rejection.")
