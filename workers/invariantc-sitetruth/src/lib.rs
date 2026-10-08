//! Offline-first, deterministic correctness contract compilation and evaluation.
//! No networking, browser, model or telemetry operations occur in this crate.
pub mod compiler;
pub mod evaluator;
pub mod json_api;
pub mod model;
#[cfg(all(feature = "wasm", target_arch = "wasm32"))]
mod wasm;

pub use compiler::compile_contract;
pub use evaluator::run_contract;
pub use model::{Contract, Outcome, RunReport};
