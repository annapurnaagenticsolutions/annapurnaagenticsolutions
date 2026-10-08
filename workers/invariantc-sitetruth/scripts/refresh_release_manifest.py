#!/usr/bin/env python3
"""Refresh or verify the curated source-release manifest and SHA256SUMS."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import date
from pathlib import Path, PurePosixPath


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "RELEASE_MANIFEST.json"
CHECKSUMS_PATH = ROOT / "SHA256SUMS.txt"
REQUIRED_RELEASE_PATHS = (
    ".github/dependabot.yml",
    ".github/workflows/ci.yml",
    ".github/workflows/fuzz-smoke.yml",
    "api/openapi.yaml",
    "collector/observation.mjs",
    "collector/pairing-core.mjs",
    "collector/pairing.mjs",
    "docs/BROWSER_RUNTIME_REVIEW.md",
    "docs/CODEX_M2_M4_HANDOFF.md",
    "docs/COMMERCIAL_VALIDATION.md",
    "docs/COMMERCIAL_SAAS_RELEASE_PLAN.md",
    "docs/EGRESS_DENY_PROTOTYPE.md",
    "docs/HOSTED_COLLECTOR_CONTROLS.md",
    "docs/LOCAL_VALIDATION_RESULTS.md",
    "docs/LOCAL_VERIFIED_BASELINE.md",
    "docs/PILOT_PROTOCOL.md",
    "docs/PRODUCT_POSITIONING.md",
    "docs/QUALITY_STATUS_M2_M4.md",
    "docs/REMAINING_RISKS.md",
    "docs/RELEASE_NOTES_M2_M4.md",
    "docs/SAAS_PILOT_DEPLOYMENT.md",
    "docs/SCAN_INTAKE_OPERATIONS.md",
    "evidence/pack.mjs",
    "evidence/verify.mjs",
    "schemas/real_defect_evaluation.schema.json",
    "scripts/scan_retention_schema_smoke.py",
    "scripts/evaluate_real_defects.py",
    "scripts/evaluation_metrics_smoke.py",
    "scripts/egress_container_ci.mjs",
    "scripts/egress_prototype_config_smoke.py",
    "scripts/refresh_release_manifest.py",
    "scripts/staging_readonly_smoke.mjs",
    "scripts/validate_workflow_budget.py",
    "scripts/validate_workflow_pins.py",
    "scripts/worker_config_smoke.py",
    "worker/migrations/0008_scan_job_dispatch_outbox.sql",
    "worker/src/handler.mjs",
    "worker/src/scan-intake.mjs",
    "worker/src/scan-outbox.mjs",
    "worker/src/scan-outbox-scheduler.mjs",
    "worker/src/scan-payload-crypto.mjs",
    "worker/src/scan-job-retention.mjs",
    "worker/src/scheduled.mjs",
    "worker/egress-prototype/probe.mjs",
    "worker/egress-prototype/src/index.mjs",
    "worker/egress-prototype/src/pinned-tls.mjs",
    "worker/egress-prototype/src/policy.mjs",
    "worker/test/egress-policy.test.mjs",
    "worker/test/pinned-tls.test.mjs",
    "worker/test/handler.test.mjs",
    "worker/test/egress-policy.test.mjs",
    "worker/test/pinned-tls.test.mjs",
    "worker/test/scan-intake.test.mjs",
    "worker/test/scan-job-authorization.test.mjs",
    "worker/test/scan-job-retention.test.mjs",
    "tests-js/staging_readonly_smoke.test.mjs",
    "tests-js/evidence.test.mjs",
    "worker/test/fixtures/retention-db.mjs",
    "worker/test/worker-entry.test.mjs",
    "worker/wrangler.toml",
)


def digest(path: Path) -> str:
    hasher = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            hasher.update(block)
    return hasher.hexdigest()


def checked_source_path(relative: str) -> Path:
    posix_path = PurePosixPath(relative)
    if posix_path.is_absolute() or ".." in posix_path.parts or "\\" in relative:
        raise ValueError(f"unsafe manifest path: {relative!r}")
    candidate = ROOT.joinpath(*posix_path.parts)
    if candidate.is_symlink() or not candidate.is_file():
        raise ValueError(f"manifest source is missing or is a symlink: {relative}")
    if ROOT not in candidate.resolve().parents:
        raise ValueError(f"manifest source escapes repository root: {relative}")
    return candidate


def calculate(manifest: dict) -> tuple[list[dict], str]:
    existing = manifest.get("entries")
    if not isinstance(existing, list):
        raise ValueError("manifest entries must be a list")

    paths = {entry.get("path") for entry in existing if isinstance(entry, dict)}
    if len(paths) != len(existing) or None in paths:
        raise ValueError("manifest entries contain duplicate or missing paths")
    paths.update(REQUIRED_RELEASE_PATHS)

    entries: list[dict] = []
    for relative in sorted(paths):
        source = checked_source_path(relative)
        entries.append({"path": relative, "bytes": source.stat().st_size, "sha256": digest(source)})

    checksums = "".join(f"{entry['sha256']}  {entry['path']}\n" for entry in entries)
    return entries, checksums


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true", help="verify current files without writing")
    mode.add_argument("--refresh", action="store_true", help="rewrite the manifest and checksum list")
    args = parser.parse_args()

    try:
        manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
        if not isinstance(manifest, dict):
            raise ValueError("manifest root must be an object")
        if manifest.get("rust_verified") is not False or manifest.get("browser_verified") is not False:
            raise ValueError("refusing to refresh while Rust or browser verification is marked true")
        entries, checksums = calculate(manifest)
    except (OSError, json.JSONDecodeError, TypeError, ValueError) as error:
        print(f"Release manifest error: {error}", file=sys.stderr)
        return 1

    if args.refresh:
        manifest["date"] = date.today().isoformat()
        manifest["count"] = len(entries)
        manifest["entries"] = entries
        MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        CHECKSUMS_PATH.write_text(checksums, encoding="utf-8", newline="\n")
        print(f"REFRESHED: {len(entries)} source files; Rust/browser verification flags preserved")
        return 0

    current_checksums = CHECKSUMS_PATH.read_text(encoding="utf-8")
    mismatches: list[str] = []
    if manifest.get("count") != len(entries) or manifest.get("entries") != entries:
        mismatches.append("RELEASE_MANIFEST.json is stale or has an incorrect count")
    if current_checksums != checksums:
        mismatches.append("SHA256SUMS.txt is stale or differs from the manifest")
    if manifest.get("rust_verified") is not False or manifest.get("browser_verified") is not False:
        mismatches.append("synthetic source manifest must not claim Rust or browser verification")

    if mismatches:
        for mismatch in mismatches:
            print(f"FAIL: {mismatch}", file=sys.stderr)
        return 1

    print(f"PASS: {len(entries)} source files match RELEASE_MANIFEST.json and SHA256SUMS.txt")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
