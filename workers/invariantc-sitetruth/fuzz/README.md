# JSON API fuzz target

`json_api` fuzzes the production Rust JSON boundary used by the compiler and evaluator. Each input contains a contract, the literal separator `\n--- observations ---\n`, and an observations document. Without the separator, the whole input is treated as a contract and observations default to `{}`. The target checks that both API responses remain valid JSON and that the functions do not panic.

The source modules are included directly from `../src/` so the fuzz build exercises the same implementation without asking the Windows linker to produce the library's separate WASM-facing `cdylib`. The seed corpus includes valid equality and numeric-expression cases.

Install nightly Rust and cargo-fuzz, then run:

```powershell
cargo +nightly install --locked --version 0.12.0 cargo-fuzz
cargo +nightly fuzz build json_api
cargo +nightly fuzz run json_api -- -max_total_time=120 -max_len=1048576
```

The workflow at `.github/workflows/fuzz-smoke.yml` runs the same bounded target on Ubuntu. A successful target build is not a fuzz run; retain the fuzzer output and any crash artifacts with the validation record.
