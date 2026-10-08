#![no_main]

use libfuzzer_sys::fuzz_target;
use serde_json::Value;

// Compile the production modules into the fuzz crate so Windows does not try
// to link the library's separate WASM-facing cdylib as a fuzz DLL.
#[path = "../../src/compiler.rs"]
pub mod compiler;
#[path = "../../src/evaluator.rs"]
pub mod evaluator;
#[path = "../../src/json_api.rs"]
pub mod json_api;
#[path = "../../src/model.rs"]
pub mod model;

pub use compiler::compile_contract;
pub use evaluator::run_contract;
pub use model::{Contract, Outcome, RunReport};

const SEPARATOR: &[u8] = b"\n--- observations ---\n";
const MAX_FUZZ_INPUT: usize = 8 * 1024 * 1024;

fn split_input(data: &[u8]) -> (&[u8], &[u8]) {
    if let Some(index) = data
        .windows(SEPARATOR.len())
        .position(|window| window == SEPARATOR)
    {
        let observations_start = index + SEPARATOR.len();
        (&data[..index], &data[observations_start..])
    } else {
        (data, b"{}")
    }
}

fn assert_json_response(response: &str) {
    assert!(
        serde_json::from_str::<Value>(response).is_ok(),
        "JSON API returned malformed JSON"
    );
}

fuzz_target!(|data: &[u8]| {
    if data.len() > MAX_FUZZ_INPUT {
        return;
    }

    let (contract_bytes, observation_bytes) = split_input(data);
    let contract = String::from_utf8_lossy(contract_bytes);
    let observations = String::from_utf8_lossy(observation_bytes);

    assert_json_response(&json_api::compile_json(&contract));
    assert_json_response(&json_api::check_json(&contract, &observations));
});
