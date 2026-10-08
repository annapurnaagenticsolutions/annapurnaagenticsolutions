//! Optional WASM bindings; enable with --features wasm for wasm32-unknown-unknown.
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn check_json(contract_json: &str, observations_json: &str) -> String {
    crate::json_api::check_json(contract_json, observations_json)
}

#[wasm_bindgen]
pub fn compile_json(contract_json: &str) -> String {
    crate::json_api::compile_json(contract_json)
}
