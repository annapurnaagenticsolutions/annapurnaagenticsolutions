use crate::model::{
    Assertion, Contract, Expr, FieldType, Issue, Plan, PlannedAssertion, Rule, Source,
};
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::collections::{BTreeSet, HashMap, HashSet};

pub fn sha256_json<T: Serialize>(value: &T) -> String {
    let bytes = serde_json::to_vec(value).expect("serializable typed input");
    let digest = Sha256::digest(&bytes);
    digest
        .iter()
        .map(|b| format!("{b:02x}"))
        .collect::<Vec<_>>()
        .join("")
}

fn issue(code: &str, at: impl Into<String>, message: impl Into<String>) -> Issue {
    Issue {
        code: code.into(),
        at: at.into(),
        message: message.into(),
    }
}

fn valid_id(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= 128
        && id
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_')
}

fn valid_pointer(pointer: &str) -> bool {
    if !pointer.is_empty() && !pointer.starts_with('/') {
        return false;
    }
    let bytes = pointer.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'~' {
            if i + 1 >= bytes.len() || !matches!(bytes[i + 1], b'0' | b'1') {
                return false;
            }
            i += 2;
        } else {
            i += 1;
        }
    }
    true
}

fn validate_expr(
    expr: &Expr,
    at: &str,
    depth: usize,
    sources: &HashSet<String>,
    deps: &mut BTreeSet<String>,
    problems: &mut Vec<Issue>,
) {
    if depth > 32 {
        problems.push(issue(
            "E_EXPR_DEPTH",
            at,
            "expression nesting exceeds maximum depth 32",
        ));
        return;
    }
    match expr {
        Expr::Literal { .. } => (),
        Expr::Path { source, pointer } => {
            if !sources.contains(source) {
                problems.push(issue(
                    "E_SOURCE_REF",
                    at,
                    format!("undeclared source {source:?}"),
                ));
            }
            if !valid_pointer(pointer) {
                problems.push(issue("E_POINTER", at, "invalid RFC 6901 JSON pointer"));
            }
            deps.insert(source.to_string());
        }
        Expr::Count { value } => validate_expr(value, at, depth + 1, sources, deps, problems),
        Expr::Sum { values } | Expr::Product { values } => {
            if values.is_empty() {
                problems.push(issue(
                    "E_EMPTY_ARITHMETIC",
                    at,
                    "arithmetic requires at least one operand",
                ));
            }
            if values.len() > 128 {
                problems.push(issue(
                    "E_ARITHMETIC_SIZE",
                    at,
                    "too many operands (max 128)",
                ));
            }
            for (i, value) in values.iter().enumerate() {
                validate_expr(
                    value,
                    &format!("{at}.values[{i}]"),
                    depth + 1,
                    sources,
                    deps,
                    problems,
                );
            }
        }
        Expr::Difference { left, right } => {
            validate_expr(
                left,
                &format!("{at}.left"),
                depth + 1,
                sources,
                deps,
                problems,
            );
            validate_expr(
                right,
                &format!("{at}.right"),
                depth + 1,
                sources,
                deps,
                problems,
            );
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum StaticKind {
    Unknown,
    Number,
    String,
    Boolean,
    Null,
    Array,
    Object,
}

fn kind_of_value(value: &serde_json::Value) -> StaticKind {
    match value {
        serde_json::Value::Null => StaticKind::Null,
        serde_json::Value::Bool(_) => StaticKind::Boolean,
        serde_json::Value::Number(_) => StaticKind::Number,
        serde_json::Value::String(_) => StaticKind::String,
        serde_json::Value::Array(_) => StaticKind::Array,
        serde_json::Value::Object(_) => StaticKind::Object,
    }
}

fn declared_kind(kind: FieldType) -> StaticKind {
    match kind {
        FieldType::Number => StaticKind::Number,
        FieldType::String => StaticKind::String,
        FieldType::Boolean => StaticKind::Boolean,
        FieldType::Null => StaticKind::Null,
        FieldType::Array => StaticKind::Array,
        FieldType::Object => StaticKind::Object,
    }
}

fn infer_type(
    expr: &Expr,
    at: &str,
    sources: &HashMap<String, &Source>,
    issues: &mut Vec<Issue>,
) -> StaticKind {
    match expr {
        Expr::Literal { value } => kind_of_value(value),
        Expr::Path { source, pointer } => sources
            .get(source)
            .and_then(|s| s.fields.get(pointer))
            .map(|k| declared_kind(*k))
            .unwrap_or(StaticKind::Unknown),
        Expr::Count { value } => {
            let arg = infer_type(value, at, sources, issues);
            if arg != StaticKind::Unknown && arg != StaticKind::Array {
                issues.push(issue(
                    "E_TYPE_COUNT",
                    at,
                    "count requires an array expression",
                ));
            }
            StaticKind::Number
        }
        Expr::Sum { values } | Expr::Product { values } => {
            for (idx, value) in values.iter().enumerate() {
                let ty = infer_type(value, &format!("{at}.values[{idx}]"), sources, issues);
                if ty != StaticKind::Unknown && ty != StaticKind::Number {
                    issues.push(issue(
                        "E_TYPE_ARITHMETIC",
                        format!("{at}.values[{idx}]"),
                        "arithmetic requires numeric expressions",
                    ));
                }
            }
            StaticKind::Number
        }
        Expr::Difference { left, right } => {
            for (name, value) in [("left", left), ("right", right)] {
                let ty = infer_type(value, &format!("{at}.{name}"), sources, issues);
                if ty != StaticKind::Unknown && ty != StaticKind::Number {
                    issues.push(issue(
                        "E_TYPE_ARITHMETIC",
                        format!("{at}.{name}"),
                        "difference requires numeric expressions",
                    ));
                }
            }
            StaticKind::Number
        }
    }
}

fn validate_assertion(
    assertion: &Assertion,
    i: usize,
    sources: &HashSet<String>,
    source_types: &HashMap<String, &Source>,
    problems: &mut Vec<Issue>,
) -> PlannedAssertion {
    let at = format!("assertions[{i}]");
    if !valid_id(&assertion.id) {
        problems.push(issue("E_ID", &at, "invalid assertion id"));
    }
    if let Rule::Near { tolerance } = &assertion.rule {
        if !tolerance.is_finite() || *tolerance < 0.0 {
            problems.push(issue(
                "E_TOLERANCE",
                &at,
                "tolerance must be finite and nonnegative",
            ));
        }
    }
    let mut deps = BTreeSet::new();
    validate_expr(
        &assertion.expected,
        &format!("{at}.expected"),
        0,
        sources,
        &mut deps,
        problems,
    );
    validate_expr(
        &assertion.actual,
        &format!("{at}.actual"),
        0,
        sources,
        &mut deps,
        problems,
    );
    let expected_type = infer_type(
        &assertion.expected,
        &format!("{at}.expected"),
        source_types,
        problems,
    );
    let actual_type = infer_type(
        &assertion.actual,
        &format!("{at}.actual"),
        source_types,
        problems,
    );
    if matches!(
        &assertion.rule,
        Rule::Near { .. } | Rule::GreaterOrEqual | Rule::LessOrEqual
    ) {
        for (name, ty) in [("expected", expected_type), ("actual", actual_type)] {
            if ty != StaticKind::Unknown && ty != StaticKind::Number {
                problems.push(issue(
                    "E_TYPE_RULE",
                    format!("{at}.{name}"),
                    "numeric comparison requires a number",
                ));
            }
        }
    }
    let rule = match &assertion.rule {
        Rule::Equal => "equal",
        Rule::Near { .. } => "near",
        Rule::GreaterOrEqual => "greater_or_equal",
        Rule::LessOrEqual => "less_or_equal",
    };
    PlannedAssertion {
        id: assertion.id.clone(),
        source_dependencies: deps.into_iter().collect(),
        rule: rule.into(),
    }
}

pub fn compile_contract(contract: &Contract) -> Result<Plan, Vec<Issue>> {
    let mut problems = Vec::new();
    if contract.version != 1 {
        problems.push(issue(
            "E_VERSION",
            "version",
            "only contract version 1 is supported",
        ));
    }
    if !valid_id(&contract.id) {
        problems.push(issue(
            "E_ID",
            "id",
            "contract id must be 1-128 ASCII letters/digits/_/-",
        ));
    }
    if contract.sources.is_empty() || contract.sources.len() > 64 {
        problems.push(issue(
            "E_SOURCE_COUNT",
            "sources",
            "source count must be 1..64",
        ));
    }
    if contract.assertions.is_empty() || contract.assertions.len() > 512 {
        problems.push(issue(
            "E_ASSERTION_COUNT",
            "assertions",
            "assertion count must be 1..512",
        ));
    }
    let mut source_ids = HashSet::new();
    let mut source_types = HashMap::new();
    for (i, source) in contract.sources.iter().enumerate() {
        source_types.insert(source.id.clone(), source);
        for pointer in source.fields.keys() {
            if !valid_pointer(pointer) {
                problems.push(issue(
                    "E_POINTER",
                    format!("sources[{i}].fields"),
                    "invalid declared field JSON pointer",
                ));
            }
        }
        if !valid_id(&source.id) {
            problems.push(issue("E_ID", format!("sources[{i}]"), "invalid source id"));
        }
        if source.layer.trim().is_empty() || source.layer.len() > 64 {
            problems.push(issue(
                "E_LAYER",
                format!("sources[{i}]"),
                "layer must be 1..64 characters",
            ));
        }
        if !source_ids.insert(source.id.clone()) {
            problems.push(issue(
                "E_DUPLICATE_SOURCE",
                format!("sources[{i}]"),
                "duplicate source id",
            ));
        }
    }
    let mut assertion_ids = HashSet::new();
    let mut plans = Vec::new();
    for (i, assertion) in contract.assertions.iter().enumerate() {
        if !assertion_ids.insert(assertion.id.clone()) {
            problems.push(issue(
                "E_DUPLICATE_ASSERTION",
                format!("assertions[{i}]"),
                "duplicate assertion id",
            ));
        }
        plans.push(validate_assertion(
            assertion,
            i,
            &source_ids,
            &source_types,
            &mut problems,
        ));
    }
    if !problems.is_empty() {
        return Err(problems);
    }
    Ok(Plan {
        plan_version: 1,
        contract_id: contract.id.clone(),
        contract_sha256: sha256_json(contract),
        assertions: plans,
        evaluator: "invariantc/0.1".into(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    fn c(v: serde_json::Value) -> Contract {
        serde_json::from_value(v).unwrap()
    }
    #[test]
    fn rejects_unknown_source_and_bad_pointer() {
        let contract = c(
            json!({"version":1,"id":"x","sources":[{"id":"ui","layer":"dom"}],"assertions":[{"id":"a","expected":{"kind":"path","source":"notthere","pointer":"oops"},"actual":{"kind":"literal","value":1},"rule":{"kind":"equal"}}]}),
        );
        let codes: Vec<_> = compile_contract(&contract)
            .unwrap_err()
            .into_iter()
            .map(|i| i.code)
            .collect();
        assert!(codes.contains(&"E_SOURCE_REF".to_string()));
        assert!(codes.contains(&"E_POINTER".to_string()));
    }
    #[test]
    fn reproducible_compilation_hash() {
        let contract = c(
            json!({"version":1,"id":"x","sources":[{"id":"ui","layer":"dom"}],"assertions":[{"id":"a","expected":{"kind":"literal","value":1},"actual":{"kind":"literal","value":1},"rule":{"kind":"equal"}}]}),
        );
        assert_eq!(
            compile_contract(&contract).unwrap().contract_sha256,
            compile_contract(&contract).unwrap().contract_sha256
        );
    }
    #[test]
    fn rejects_known_bad_literal_arithmetic() {
        let contract = c(
            json!({"version":1,"id":"bad_math","sources":[{"id":"ui","layer":"dom"}],"assertions":[{"id":"a","expected":{"kind":"sum","values":[{"kind":"literal","value":"not a number"}]},"actual":{"kind":"literal","value":1},"rule":{"kind":"equal"}}]}),
        );
        assert!(compile_contract(&contract)
            .unwrap_err()
            .iter()
            .any(|i| i.code == "E_TYPE_ARITHMETIC"));
    }
    #[test]
    fn checks_optional_declared_source_field_types() {
        let contract = c(
            json!({"version":1,"id":"bad_count","sources":[{"id":"ui","layer":"dom","fields":{"/title":"string"}}],"assertions":[{"id":"a","expected":{"kind":"count","value":{"kind":"path","source":"ui","pointer":"/title"}},"actual":{"kind":"literal","value":1},"rule":{"kind":"equal"}}]}),
        );
        assert!(compile_contract(&contract)
            .unwrap_err()
            .iter()
            .any(|i| i.code == "E_TYPE_COUNT"));
    }
    #[test]
    fn pointer_validation() {
        assert!(valid_pointer("/items/0/name"));
        assert!(valid_pointer("/a~1b/~0"));
        assert!(!valid_pointer("/bad~2escape"));
    }
}
