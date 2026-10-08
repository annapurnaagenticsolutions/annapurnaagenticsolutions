#!/bin/sh
set -eu
cd "$(dirname "$0")"
command -v cargo >/dev/null || { echo 'Install Rust/Cargo: https://rustup.rs/' >&2; exit 4; }
cargo fmt --all
cargo test --all-targets
cargo clippy --all-targets
cargo build
BIN=./target/debug/invariantc
"$BIN" validate examples/apples.contract.json --offline
status=0
"$BIN" check examples/apples.contract.json --observations examples/apples.observations.json --offline || status=$?
[ "$status" -eq 2 ] || { echo "Expected apple FAIL exit 2, got $status" >&2; exit 4; }
"$BIN" check examples/checkout.contract.json --observations examples/checkout.observations.json --offline
status=0
"$BIN" check examples/apples.contract.json --observations examples/missing.observations.json --offline || status=$?
[ "$status" -eq 3 ] || { echo "Expected missing UNKNOWN exit 3, got $status" >&2; exit 4; }
"$BIN" corpus corpus/manifest.json --offline
printf 'Native build/test/CLI/corpus checks completed successfully.\n'
