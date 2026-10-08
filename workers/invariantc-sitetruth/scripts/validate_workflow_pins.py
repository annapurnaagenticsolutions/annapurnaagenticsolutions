#!/usr/bin/env python3
"""Fail when a GitHub Actions workflow references a mutable action ref."""

from __future__ import annotations

import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WORKFLOWS = ROOT / ".github" / "workflows"
USE_LINE = re.compile(r"^\s*(?:-\s*)?uses:\s*([^\s#]+)(?:\s+#\s*(.*))?\s*$")
COMMIT_SHA = re.compile(r"^[0-9a-fA-F]{40}$")
IMAGE_DIGEST = re.compile(r"^sha256:[0-9a-fA-F]{64}$")


def main() -> int:
    workflow_files = sorted((*WORKFLOWS.glob("*.yml"), *WORKFLOWS.glob("*.yaml")))
    if not workflow_files:
        print(f"No workflow files found in {WORKFLOWS}", file=sys.stderr)
        return 1

    errors: list[str] = []
    pinned = 0

    for path in workflow_files:
        lines = path.read_text(encoding="utf-8").splitlines()
        for line_index, line in enumerate(lines):
            line_number = line_index + 1
            match = USE_LINE.match(line)
            if not match:
                continue

            action_ref, annotation = match.groups()
            if action_ref.startswith("./"):
                continue

            if "@" not in action_ref:
                errors.append(f"{path.relative_to(ROOT)}:{line_number}: action has no immutable ref")
                continue

            reference = action_ref.rsplit("@", 1)[1]
            if not (COMMIT_SHA.fullmatch(reference) or IMAGE_DIGEST.fullmatch(reference)):
                errors.append(
                    f"{path.relative_to(ROOT)}:{line_number}: action ref is mutable: {action_ref}"
                )
                continue

            if not annotation:
                errors.append(
                    f"{path.relative_to(ROOT)}:{line_number}: immutable ref needs a version annotation"
                )
                continue

            if action_ref.startswith("actions/checkout@"):
                step_indent = len(line) - len(line.lstrip())
                step_lines: list[str] = []
                for following_line in lines[line_index + 1 :]:
                    if following_line.strip() and len(following_line) - len(following_line.lstrip()) <= step_indent:
                        break
                    step_lines.append(following_line)
                if not any(
                    re.match(r"^\s*persist-credentials:\s*false\s*(?:#.*)?$", item)
                    for item in step_lines
                ):
                    errors.append(
                        f"{path.relative_to(ROOT)}:{line_number}: checkout must set persist-credentials: false"
                    )

            pinned += 1

    if errors:
        print("GitHub Actions pin validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print(f"PASS: {pinned} immutable action references across {len(workflow_files)} workflows")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
