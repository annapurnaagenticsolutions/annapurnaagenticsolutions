//! Pure JSON boundary for edge/WASM adapters. No host networking or filesystem operations.
use crate::{compile_contract, run_contract, Contract};
use serde::Serialize;
use serde_json::{json, Value};

const MAX_JSON_INPUT: usize = 4 * 1024 * 1024;

#[derive(Serialize)]
struct ApiIssue {
    code: &'static str,
    message: String,
}

fn invalid(code: &'static str, message: impl Into<String>) -> String {
    serde_json::to_string(&json!({"ok":false,"issues":[ApiIssue{code,message:message.into()}]}))
        .expect("serializing a fixed error response")
}

fn parse_contract(raw: &str) -> Result<Contract, String> {
    if raw.len() > MAX_JSON_INPUT {
        return Err(invalid("E_SIZE", "contract exceeds the 4 MiB limit"));
    }
    serde_json::from_str::<Contract>(raw).map_err(|e| invalid("E_CONTRACT_JSON", e.to_string()))
}

pub fn compile_json(contract_json: &str) -> String {
    let contract = match parse_contract(contract_json) {
        Ok(c) => c,
        Err(e) => return e,
    };
    match compile_contract(&contract) {
        Ok(plan) => {
            serde_json::to_string(&json!({"ok":true,"plan":plan})).expect("serializing plan")
        }
        Err(issues) => {
            serde_json::to_string(&json!({"ok":false,"issues":issues})).expect("serializing issues")
        }
    }
}

pub fn check_json(contract_json: &str, observations_json: &str) -> String {
    let contract = match parse_contract(contract_json) {
        Ok(c) => c,
        Err(e) => return e,
    };
    if observations_json.len() > MAX_JSON_INPUT {
        return invalid("E_SIZE", "observations exceed the 4 MiB limit");
    }
    let observations = match serde_json::from_str::<Value>(observations_json) {
        Ok(v) => v,
        Err(e) => return invalid("E_OBSERVATIONS_JSON", e.to_string()),
    };
    match run_contract(&contract, &observations) {
        Ok(report) => {
            serde_json::to_string(&json!({"ok":true,"report":report})).expect("serializing report")
        }
        Err(issues) => {
            serde_json::to_string(&json!({"ok":false,"issues":issues})).expect("serializing issues")
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn json_api_tri_state_and_redaction() {
        let contract = r#"{"version":1,"id":"x","sources":[{"id":"ui","layer":"dom"}],"assertions":[{"id":"check","expected":{"kind":"literal","value":42},"actual":{"kind":"path","source":"ui","pointer":"/value"},"rule":{"kind":"equal"}}]}"#;
        for (observations, expected) in [
            (r#"{"ui":{"value":42}}"#, "pass"),
            (r#"{"ui":{"value":41}}"#, "fail"),
            (r#"{"ui":{}}"#, "unknown"),
        ] {
            let parsed: Value = serde_json::from_str(&check_json(contract, observations)).unwrap();
            assert_eq!(parsed["ok"], true);
            assert_eq!(parsed["report"]["outcome"], expected);
            assert!(!parsed.to_string().contains("secret-token"));
        }
    }
    #[test]
    fn rejects_malformed_inputs_without_panicking() {
        assert_eq!(
            serde_json::from_str::<Value>(&check_json("{", "{}")).unwrap()["ok"],
            false
        );
        assert_eq!(
            serde_json::from_str::<Value>(&check_json("{}", "{}")).unwrap()["ok"],
            false
        );
        assert_eq!(
            serde_json::from_str::<Value>(&check_json(&"x".repeat(MAX_JSON_INPUT + 1), "{}"))
                .unwrap()["ok"],
            false
        );
    }
}
