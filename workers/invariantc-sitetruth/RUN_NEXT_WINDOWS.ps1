$ErrorActionPreference='Stop'
Set-Location $PSScriptRoot
Write-Host "=== InvariantC M2-M4 local checks ==="
python scripts/validate_corpus.py
if ($LASTEXITCODE -ne 0) { throw 'Corpus label checks failed' }
python scripts/verify_seeded_pages.py
if ($LASTEXITCODE -ne 0) { throw 'Seeded pages check failed' }
python scripts/scenariodb_smoke.py
if ($LASTEXITCODE -ne 0) { throw 'SQLite smoke check failed' }
node --test tests-js/*.test.mjs worker/test/*.test.mjs
if ($LASTEXITCODE -ne 0) { throw 'Node tests failed' }
if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) { throw 'Cargo is not installed; Rust suite not verified' }
cargo fmt --all -- --check
if ($LASTEXITCODE -ne 0) { throw 'Cargo formatting check failed' }
cargo clippy --all-targets -- -D warnings
if ($LASTEXITCODE -ne 0) { throw 'Cargo lint failed' }
cargo test --all-targets
if ($LASTEXITCODE -ne 0) { throw 'Cargo tests failed' }
cargo run -- corpus corpus/manifest.json --offline
if ($LASTEXITCODE -ne 0) { throw 'Rust corpus run failed' }
Write-Host 'M2-M4 local non-WASM checks PASSED. Run wasm-pack and Playwright parity separately per CODEX_M2_M4_HANDOFF.md.'
