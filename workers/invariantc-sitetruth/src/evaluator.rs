use crate::compiler::{compile_contract, sha256_json};
use crate::model::{CheckResult, Contract, Expr, Issue, Outcome, Rule, RunReport, Summary};
use serde_json::{Number, Value};

const MAX_SAFE_INTEGER: u64 = 9_007_199_254_740_991;

#[derive(Debug)]
struct EvalError {
    code: &'static str,
    description: String,
}

impl EvalError {
    fn new(code: &'static str, description: impl Into<String>) -> Self {
        Self {
            code,
            description: description.into(),
        }
    }
}

fn numeric(value: &Value) -> Result<f64, EvalError> {
    match value {
        Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                if i.unsigned_abs() > MAX_SAFE_INTEGER {
                    return Err(EvalError::new("R_NUMERIC_RANGE", "integer exceeds exact binary64 range; represent large monetary values in safe minor units"));
                }
            } else if let Some(u) = n.as_u64() {
                if u > MAX_SAFE_INTEGER {
                    return Err(EvalError::new(
                        "R_NUMERIC_RANGE",
                        "integer exceeds exact binary64 range",
                    ));
                }
            }
            n.as_f64()
                .filter(|x| x.is_finite())
                .ok_or_else(|| EvalError::new("R_NUMERIC", "number must be finite"))
        }
        _ => Err(EvalError::new(
            "R_TYPE",
            "numeric operator requires a number (no string coercion)",
        )),
    }
}

fn json_number(n: f64) -> Result<Value, EvalError> {
    Number::from_f64(n)
        .map(Value::Number)
        .ok_or_else(|| EvalError::new("R_NUMERIC", "arithmetic overflow or nonfinite result"))
}

fn eval_expr(expr: &Expr, observations: &Value, depth: usize) -> Result<Value, EvalError> {
    if depth > 32 {
        return Err(EvalError::new("R_DEPTH", "expression depth exceeded"));
    }
    match expr {
        Expr::Literal { value } => Ok(value.clone()),
        Expr::Path { source, pointer } => {
            let root = observations.get(source).ok_or_else(|| {
                EvalError::new(
                    "R_MISSING_SOURCE",
                    format!("observation for source {source:?} is missing"),
                )
            })?;
            root.pointer(pointer).cloned().ok_or_else(|| {
                EvalError::new(
                    "R_MISSING_PATH",
                    format!("source {source:?} does not contain JSON pointer {pointer:?}"),
                )
            })
        }
        Expr::Count { value } => {
            let v = eval_expr(value, observations, depth + 1)?;
            match v.as_array() {
                Some(items) => Ok(Value::Number(Number::from(items.len() as u64))),
                None => Err(EvalError::new(
                    "R_TYPE",
                    "count expression requires a JSON array",
                )),
            }
        }
        Expr::Sum { values } | Expr::Product { values } => {
            let product = matches!(expr, Expr::Product { .. });
            let mut accumulator = if product { 1.0 } else { 0.0 };
            for item in values {
                let n = numeric(&eval_expr(item, observations, depth + 1)?)?;
                if product {
                    accumulator *= n;
                } else {
                    accumulator += n;
                }
                if !accumulator.is_finite() {
                    return Err(EvalError::new("R_NUMERIC", "arithmetic overflow"));
                }
            }
            json_number(accumulator)
        }
        Expr::Difference { left, right } => {
            let a = numeric(&eval_expr(left, observations, depth + 1)?)?;
            let b = numeric(&eval_expr(right, observations, depth + 1)?)?;
            json_number(a - b)
        }
    }
}

fn semantic_equal(a: &Value, b: &Value) -> Result<bool, EvalError> {
    match (a, b) {
        (Value::Number(_), Value::Number(_)) => Ok(numeric(a)? == numeric(b)?),
        (Value::Array(aa), Value::Array(bb)) => {
            if aa.len() != bb.len() {
                return Ok(false);
            }
            for (a, b) in aa.iter().zip(bb) {
                if !semantic_equal(a, b)? {
                    return Ok(false);
                }
            }
            Ok(true)
        }
        (Value::Object(aa), Value::Object(bb)) => {
            if aa.len() != bb.len() {
                return Ok(false);
            }
            for (key, a) in aa {
                let Some(b) = bb.get(key) else {
                    return Ok(false);
                };
                if !semantic_equal(a, b)? {
                    return Ok(false);
                }
            }
            Ok(true)
        }
        _ => Ok(a == b),
    }
}

fn evaluate_rule(rule: &Rule, expected: &Value, actual: &Value) -> Result<bool, EvalError> {
    match rule {
        Rule::Equal => semantic_equal(expected, actual),
        Rule::Near { tolerance } => {
            let a = numeric(expected)?;
            let b = numeric(actual)?;
            Ok((a - b).abs() <= *tolerance)
        }
        Rule::GreaterOrEqual => Ok(numeric(actual)? >= numeric(expected)?),
        Rule::LessOrEqual => Ok(numeric(actual)? <= numeric(expected)?),
    }
}

pub fn run_contract(contract: &Contract, observations: &Value) -> Result<RunReport, Vec<Issue>> {
    let plan = compile_contract(contract)?;
    if !observations.is_object() {
        return Err(vec![Issue {
            code: "E_OBSERVATIONS".into(),
            at: "observations".into(),
            message: "observations must be an object keyed by declared source ids".into(),
        }]);
    }
    let mut results = Vec::with_capacity(contract.assertions.len());
    let mut summary = Summary::default();
    for (assertion, planned) in contract.assertions.iter().zip(plan.assertions.iter()) {
        let result = (|| {
            let expected = eval_expr(&assertion.expected, observations, 0)?;
            let actual = eval_expr(&assertion.actual, observations, 0)?;
            evaluate_rule(&assertion.rule, &expected, &actual)
        })();
        let (outcome, code, explanation) = match result {
            Ok(true) => (
                Outcome::Pass,
                "R_OK".to_string(),
                "declared relation holds".to_string(),
            ),
            Ok(false) => (
                Outcome::Fail,
                "R_MISMATCH".to_string(),
                "declared relation does not hold".to_string(),
            ),
            Err(e) => (Outcome::Unknown, e.code.to_string(), e.description),
        };
        match outcome {
            Outcome::Pass => summary.passed += 1,
            Outcome::Fail => summary.failed += 1,
            Outcome::Unknown => summary.unknown += 1,
        }
        results.push(CheckResult {
            id: assertion.id.clone(),
            outcome,
            severity: assertion.severity,
            code,
            explanation,
            source_dependencies: planned.source_dependencies.clone(),
        });
    }
    let outcome = if summary.failed > 0 {
        Outcome::Fail
    } else if summary.unknown > 0 {
        Outcome::Unknown
    } else {
        Outcome::Pass
    };
    Ok(RunReport {
        report_version: 1,
        contract_id: contract.id.clone(),
        contract_sha256: plan.contract_sha256,
        observation_sha256: sha256_json(observations),
        outcome, summary, results,
        evidence_notice: "Hashes identify the supplied bytes after JSON normalization; they do not attest to the truth or origin of observations.".into(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    fn contract(rule: Value, expected: Value, actual: Value) -> Contract {
        serde_json::from_value(json!({
            "version":1,"id":"sample",
            "sources":[{"id":"ui","layer":"dom"},{"id":"api","layer":"api"}],
            "assertions":[{"id":"test","expected":expected,"actual":actual,"rule":rule}]
        }))
        .unwrap()
    }
    fn path(source: &str, pointer: &str) -> Value {
        json!({"kind":"path","source":source,"pointer":pointer})
    }
    #[test]
    fn four_apples_five_label_fails() {
        let c = contract(
            json!({"kind":"equal"}),
            path("ui", "/label_count"),
            json!({"kind":"count","value":path("api","/objects")}),
        );
        assert_eq!(
            run_contract(
                &c,
                &json!({"ui":{"label_count":5},"api":{"objects":[1,2,3,4]}})
            )
            .unwrap()
            .outcome,
            Outcome::Fail
        );
    }
    #[test]
    fn missing_path_is_unknown() {
        let c = contract(
            json!({"kind":"equal"}),
            path("ui", "/missing"),
            path("api", "/total"),
        );
        assert_eq!(
            run_contract(&c, &json!({"ui":{},"api":{"total":2}}))
                .unwrap()
                .outcome,
            Outcome::Unknown
        );
    }
    #[test]
    fn present_null_is_not_missing() {
        let c = contract(
            json!({"kind":"equal"}),
            path("ui", "/null"),
            json!({"kind":"literal","value":null}),
        );
        assert_eq!(
            run_contract(&c, &json!({"ui":{"null":null}}))
                .unwrap()
                .outcome,
            Outcome::Pass
        );
    }
    #[test]
    fn rejects_string_to_number_coercion() {
        let c = contract(
            json!({"kind":"equal"}),
            path("ui", "/total"),
            path("api", "/total"),
        );
        assert_eq!(
            run_contract(&c, &json!({"ui":{"total":"12"},"api":{"total":12}}))
                .unwrap()
                .outcome,
            Outcome::Fail
        );
    }
    #[test]
    fn arithmetic_in_minor_units() {
        let c = contract(
            json!({"kind":"equal"}),
            json!({"kind":"product","values":[path("api","/unit_minor"),path("api","/quantity")]}),
            path("ui", "/total_minor"),
        );
        assert_eq!(
            run_contract(
                &c,
                &json!({"ui":{"total_minor":400},"api":{"unit_minor":100,"quantity":4}})
            )
            .unwrap()
            .outcome,
            Outcome::Pass
        );
    }
    #[test]
    fn near_tolerance() {
        let c = contract(
            json!({"kind":"near","tolerance":0.02}),
            json!({"kind":"literal","value":0.3}),
            path("ui", "/total"),
        );
        assert_eq!(
            run_contract(&c, &json!({"ui":{"total":0.301}}))
                .unwrap()
                .outcome,
            Outcome::Pass
        );
    }
    #[test]
    fn numeric_type_error_becomes_unknown() {
        let c = contract(
            json!({"kind":"near","tolerance":1.0}),
            json!({"kind":"literal","value":1}),
            path("ui", "/total"),
        );
        assert_eq!(
            run_contract(&c, &json!({"ui":{"total":"1"}}))
                .unwrap()
                .outcome,
            Outcome::Unknown
        );
    }
    #[test]
    fn nested_object_numeric_semantics() {
        let c = contract(
            json!({"kind":"equal"}),
            json!({"kind":"literal","value":{"n":1}}),
            json!({"kind":"literal","value":{"n":1.0}}),
        );
        assert_eq!(run_contract(&c, &json!({})).unwrap().outcome, Outcome::Pass);
    }
    #[test]
    fn forbids_unsafe_integer_comparisons() {
        let c = contract(
            json!({"kind":"equal"}),
            json!({"kind":"literal","value":9007199254740993u64}),
            json!({"kind":"literal","value":9007199254740992u64}),
        );
        assert_eq!(
            run_contract(&c, &json!({})).unwrap().outcome,
            Outcome::Unknown
        );
    }
    #[test]
    fn hashes_remain_stable_for_identical_inputs() {
        let c = contract(
            json!({"kind":"equal"}),
            json!({"kind":"literal","value":1}),
            json!({"kind":"literal","value":1}),
        );
        let r1 = run_contract(&c, &json!({})).unwrap();
        let r2 = run_contract(&c, &json!({})).unwrap();
        assert_eq!(
            serde_json::to_string(&r1).unwrap(),
            serde_json::to_string(&r2).unwrap()
        );
    }
    #[test]
    fn count_requires_array() {
        let c = contract(
            json!({"kind":"equal"}),
            json!({"kind":"literal","value":1}),
            json!({"kind":"count","value":path("ui","/foo")}),
        );
        assert_eq!(
            run_contract(&c, &json!({"ui":{"foo":{"a":1}}}))
                .unwrap()
                .outcome,
            Outcome::Unknown
        );
    }
}
