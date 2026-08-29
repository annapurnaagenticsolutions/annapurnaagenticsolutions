#!/usr/bin/env python3
"""Generate static public repository telemetry for selected Annapurna repositories.

The production browser remains backend-free: CI calls GitHub, writes JSON, then Pages serves JSON.
Committed seed data remains usable if refresh fails.
"""
from __future__ import annotations

import json, os, re, sys, urllib.error, urllib.request
from datetime import datetime, timezone
from pathlib import Path

OWNER = os.environ.get("ANNAPURNA_GITHUB_OWNER", "annapurnaagenticsolutions")
REPOSITORIES = [
    ("portal", "web", os.environ.get("ANNAPURNA_PORTAL_REPO", "annapurna-portal")),
    ("axon", "axon", os.environ.get("ANNAPURNA_AXON_REPO", "axon")),
    ("mesh", "ai", os.environ.get("ANNAPURNA_MESH_REPO", "open-enterprise-agentops-mesh")),
]
ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data" / "repository-signals.json"


def request_json(url: str):
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "annapurna-living-lab-signal-generator/2.0",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    token = os.environ.get("GITHUB_TOKEN")
    if token: headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=20) as response:
        return json.loads(response.read().decode("utf-8")), dict(response.headers.items())


def commit_count(api: str, owner: str, repo: str) -> tuple[int, dict | None]:
    items, headers = request_json(f"{api}/commits?per_page=1")
    count = len(items)
    match = re.search(r'[?&]page=(\d+)>; rel="last"', headers.get("Link", ""))
    if match: count = int(match.group(1))
    latest = None
    if items:
        item = items[0]; commit = item.get("commit", {}); author = commit.get("author") or commit.get("committer") or {}
        message = (commit.get("message") or "").splitlines()[0].strip(); date = author.get("date")
        if message and date:
            latest = {"sha": item.get("sha", "")[:12], "message": message[:160], "date": date,
                      "htmlUrl": item.get("html_url", f"https://github.com/{owner}/{repo}/commits")}
    return count, latest


def open_issue_count(api: str) -> int:
    url = f"{api}/issues?state=open&per_page=100"; count = 0
    while url:
        items, headers = request_json(url)
        count += sum(1 for item in items if "pull_request" not in item)
        match = re.search(r'<([^>]+)>; rel="next"', headers.get("Link", ""))
        url = match.group(1) if match else ""
    return count


def fetch_repository(repo_id: str, world: str, name: str) -> dict:
    api = f"https://api.github.com/repos/{OWNER}/{name}"
    repo, _ = request_json(api)
    commits, latest = commit_count(api, OWNER, name)
    issues = open_issue_count(api)
    return {
        "id": repo_id, "world": world, "owner": OWNER, "name": name,
        "fullName": repo.get("full_name", f"{OWNER}/{name}"),
        "htmlUrl": repo.get("html_url", f"https://github.com/{OWNER}/{name}"),
        "commits": commits, "stars": int(repo.get("stargazers_count", 0)),
        "forks": int(repo.get("forks_count", 0)), "openIssues": issues, "latestCommit": latest,
    }


def main() -> int:
    try:
        repositories = [fetch_repository(*spec) for spec in REPOSITORIES]
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, KeyError) as exc:
        print(f"Signal refresh failed; keeping committed snapshot: {exc}", file=sys.stderr)
        return 2

    payload = {
        "schemaVersion": 2,
        "generatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "sourceLabel": "CI-generated GitHub public repository snapshots",
        "repositories": repositories,
    }
    if OUTPUT.exists():
        try:
            previous = json.loads(OUTPUT.read_text(encoding="utf-8"))
            if previous.get("repositories") == payload["repositories"]:
                print("Public repository state unchanged; keeping existing snapshot timestamp.")
                return 0
        except (json.JSONDecodeError, OSError): pass
    OUTPUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {OUTPUT.relative_to(ROOT)} for {len(repositories)} repositories")
    return 0


if __name__ == "__main__": raise SystemExit(main())
