#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
node --version
python scripts/validate_corpus.py
python scripts/verify_seeded_pages.py
python scripts/scenariodb_smoke.py
node --test tests-js/*.test.mjs worker/test/*.test.mjs
if command -v cargo >/dev/null 2>&1; then
  cargo fmt --all -- --check
  cargo clippy --all-targets -- -D warnings
  cargo test --all-targets
  cargo run -- corpus corpus/manifest.json --offline
else
  echo 'Rust verification BLOCKED: cargo unavailable' >&2
  exit 3
fi
