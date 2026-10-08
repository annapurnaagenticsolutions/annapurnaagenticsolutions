use invariantc_core::{run_contract, Contract, Outcome};
use serde::Deserialize;
use serde_json::Value;
use std::fs;
use std::path::Path;

#[derive(Deserialize)]
struct Manifest {
    cases: Vec<Case>,
}
#[derive(Deserialize)]
struct Case {
    id: String,
    file: String,
    expected_outcome: Outcome,
}
#[derive(Deserialize)]
struct Fixture {
    contract: Contract,
    observations: Value,
}

#[test]
fn labelled_corpus_consistency() {
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("corpus");
    let manifest: Manifest =
        serde_json::from_slice(&fs::read(root.join("manifest.json")).unwrap()).unwrap();
    assert!(manifest.cases.len() >= 100, "need at least 100 cases");
    let mut pass = 0;
    let mut fail = 0;
    let mut unknown = 0;
    for case in &manifest.cases {
        let fixture: Fixture =
            serde_json::from_slice(&fs::read(root.join(&case.file)).unwrap()).unwrap();
        let report = run_contract(&fixture.contract, &fixture.observations)
            .unwrap_or_else(|e| panic!("{} compilation: {:?}", case.id, e));
        assert_eq!(
            report.outcome, case.expected_outcome,
            "label mismatch for {}",
            case.id
        );
        match report.outcome {
            Outcome::Pass => pass += 1,
            Outcome::Fail => fail += 1,
            Outcome::Unknown => unknown += 1,
        }
    }
    assert!(pass > 0 && fail > 0 && unknown > 0);
}

#[test]
fn no_raw_observations_leak_into_reports() {
    let c:Contract=serde_json::from_value(serde_json::json!({
        "version":1,"id":"redaction_test","sources":[{"id":"x","layer":"api"}],
        "assertions":[{"id":"check","expected":{"kind":"path","source":"x","pointer":"/secret"},"actual":{"kind":"literal","value":"not-the-secret"},"rule":{"kind":"equal"}}]
    })).unwrap();
    let report = run_contract(
        &c,
        &serde_json::json!({"x":{"secret":"sensitive-token-ABC123"}}),
    )
    .unwrap();
    let json = serde_json::to_string(&report).unwrap();
    assert!(!json.contains("sensitive-token-ABC123"));
}
