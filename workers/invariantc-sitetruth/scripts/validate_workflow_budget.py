#!/usr/bin/env python3
"""Require bounded timeouts for every GitHub Actions job."""

from __future__ import annotations

import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WORKFLOWS = ROOT / ".github" / "workflows"
JOB_HEADER = re.compile(r"^  ([A-Za-z0-9_-]+):\s*(?:#.*)?$")
TIMEOUT = re.compile(r"^    timeout-minutes:\s*(\d+)\s*(?:#.*)?$")
MAX_JOB_TIMEOUT_MINUTES = 60


def jobs_in(path: Path) -> list[tuple[str, int | None]]:
    lines = path.read_text(encoding="utf-8").splitlines()
    jobs_line = next((index for index, line in enumerate(lines) if line == "jobs:"), None)
    if jobs_line is None:
        return []

    jobs: list[tuple[str, int | None]] = []
    current_name: str | None = None
    current_timeout: int | None = None

    def finish_job() -> None:
        if current_name is not None:
            jobs.append((current_name, current_timeout))

    for line in lines[jobs_line + 1 :]:
        if line and not line[0].isspace() and not line.startswith("#"):
            break

        header = JOB_HEADER.fullmatch(line)
        if header:
            finish_job()
            current_name = header.group(1)
            current_timeout = None
            continue

        timeout = TIMEOUT.fullmatch(line)
        if timeout and current_name is not None:
            current_timeout = int(timeout.group(1))

    finish_job()
    return jobs


def main() -> int:
    workflow_files = sorted((*WORKFLOWS.glob("*.yml"), *WORKFLOWS.glob("*.yaml")))
    errors: list[str] = []
    job_count = 0

    if not workflow_files:
        print(f"No workflow files found in {WORKFLOWS}", file=sys.stderr)
        return 1

    for path in workflow_files:
        jobs = jobs_in(path)
        if not jobs:
            errors.append(f"{path.relative_to(ROOT)}: no jobs found")
            continue

        job_count += len(jobs)
        for name, timeout in jobs:
            if timeout is None:
                errors.append(f"{path.relative_to(ROOT)}: job {name} has no timeout-minutes")
            elif not 1 <= timeout <= MAX_JOB_TIMEOUT_MINUTES:
                errors.append(
                    f"{path.relative_to(ROOT)}: job {name} timeout {timeout} is outside 1..{MAX_JOB_TIMEOUT_MINUTES} minutes"
                )

    main_workflow = WORKFLOWS / "ci.yml"
    if main_workflow.is_file():
        content = main_workflow.read_text(encoding="utf-8")
        if not re.search(r"(?m)^concurrency:\s*\n(?:^  .*\n)*^  cancel-in-progress:\s*true\s*$", content):
            errors.append(".github/workflows/ci.yml: same-ref concurrency cancellation must be enabled")

    if errors:
        print("Workflow budget validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print(f"PASS: {job_count} jobs have explicit timeouts of at most {MAX_JOB_TIMEOUT_MINUTES} minutes")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
