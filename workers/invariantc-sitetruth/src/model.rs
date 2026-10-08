use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Contract {
    pub version: u32,
    pub id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub sources: Vec<Source>,
    pub assertions: Vec<Assertion>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Source {
    pub id: String,
    /// Layer is informative, not a trust attestation.
    pub layer: String,
    /// Optional declared JSON pointer -> value type for partial compile-time checking.
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub fields: BTreeMap<String, FieldType>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FieldType {
    Number,
    String,
    Boolean,
    Null,
    Array,
    Object,
}

#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Severity {
    #[default]
    Error,
    Warning,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Assertion {
    pub id: String,
    pub expected: Expr,
    pub actual: Expr,
    pub rule: Rule,
    #[serde(default)]
    pub severity: Severity,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case", deny_unknown_fields)]
pub enum Expr {
    /// Literal may be any JSON value. Null is NOT the same as a missing path.
    Literal {
        value: Value,
    },
    /// RFC 6901 JSON pointer within a named observation source.
    Path {
        source: String,
        pointer: String,
    },
    /// Counts elements of an observed JSON array, not pixels in an image.
    Count {
        value: Box<Expr>,
    },
    Sum {
        values: Vec<Expr>,
    },
    Product {
        values: Vec<Expr>,
    },
    Difference {
        left: Box<Expr>,
        right: Box<Expr>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case", deny_unknown_fields)]
pub enum Rule {
    Equal,
    Near { tolerance: f64 },
    GreaterOrEqual,
    LessOrEqual,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Issue {
    pub code: String,
    pub at: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlannedAssertion {
    pub id: String,
    pub source_dependencies: Vec<String>,
    pub rule: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Plan {
    pub plan_version: u32,
    pub contract_id: String,
    pub contract_sha256: String,
    pub assertions: Vec<PlannedAssertion>,
    pub evaluator: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Outcome {
    Pass,
    Fail,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckResult {
    pub id: String,
    pub outcome: Outcome,
    pub severity: Severity,
    pub code: String,
    pub explanation: String,
    pub source_dependencies: Vec<String>,
    // Intentionally no raw values: default reports should avoid copying PII.
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Summary {
    pub passed: usize,
    pub failed: usize,
    pub unknown: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunReport {
    pub report_version: u32,
    pub contract_id: String,
    pub contract_sha256: String,
    pub observation_sha256: String,
    pub outcome: Outcome,
    pub summary: Summary,
    pub results: Vec<CheckResult>,
    pub evidence_notice: String,
}
