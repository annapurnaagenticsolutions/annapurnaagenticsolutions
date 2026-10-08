use invariantc_core::json_api::{check_json, compile_json};
use serde_json::Value;

const VALID_CONTRACT: &str = r#"{"version":1,"id":"fuzz","sources":[{"id":"ui","layer":"dom"}],"assertions":[{"id":"check","expected":{"kind":"literal","value":1},"actual":{"kind":"path","source":"ui","pointer":"/value"},"rule":{"kind":"equal"}}]}"#;

fn parse_result(raw: &str) -> Value {
    serde_json::from_str(raw).expect("the JSON API must always return valid JSON")
}

fn next_random(state: &mut u64) -> u64 {
    *state = state
        .wrapping_mul(6_364_136_223_846_793_005)
        .wrapping_add(1_442_695_040_888_963_407);
    *state
}

fn fuzz_json_text(state: &mut u64, max_len: usize) -> String {
    const ALPHABET: &[u8] = b"{}[],:\"0123456789-+eEtruefalsnul \\u";
    let len = (next_random(state) as usize) % (max_len + 1);
    (0..len)
        .map(|_| ALPHABET[(next_random(state) as usize) % ALPHABET.len()] as char)
        .collect()
}

fn literal(raw_value: &str) -> String {
    format!(r#"{{"kind":"literal","value":{raw_value}}}"#)
}

fn literal_contract(expected: &str, actual: &str, rule: &str) -> String {
    format!(
        r#"{{"version":1,"id":"numeric-edge","sources":[{{"id":"ui","layer":"dom"}}],"assertions":[{{"id":"check","expected":{},"actual":{},"rule":{}}}]}}"#,
        literal(expected),
        literal(actual),
        rule
    )
}

#[test]
fn seeded_json_mutations_never_panic_or_return_malformed_json() {
    let mut state = 0x5eed_cafe_d00d_f00d;
    for _ in 0..2_000 {
        let contract = fuzz_json_text(&mut state, 384);
        parse_result(&compile_json(&contract));

        let observations = fuzz_json_text(&mut state, 384);
        parse_result(&check_json(VALID_CONTRACT, &observations));
    }
}

#[test]
fn deeply_nested_json_is_rejected_as_data_not_a_panic() {
    let nested = format!("{}0{}", "[".repeat(160), "]".repeat(160));
    let deep_contract = literal_contract(&nested, "0", r#"{"kind":"equal"}"#);
    let contract_result = parse_result(&compile_json(&deep_contract));
    assert_eq!(contract_result["ok"], false);

    let observations = format!(r#"{{"ui":{{"value":{nested}}}}}"#);
    let observation_result = parse_result(&check_json(VALID_CONTRACT, &observations));
    assert_eq!(observation_result["ok"], false);
}

#[test]
fn numeric_boundaries_and_non_finite_arithmetic_are_unknown_or_rejected() {
    let equal = r#"{"kind":"equal"}"#;
    let safe = literal_contract("9007199254740991", "9007199254740991", equal);
    assert_eq!(
        parse_result(&check_json(&safe, "{}"))
            .pointer("/report/outcome")
            .unwrap(),
        "pass"
    );

    let unsafe_integer = literal_contract("9007199254740993", "9007199254740993", equal);
    let unsafe_result = parse_result(&check_json(&unsafe_integer, "{}"));
    assert_eq!(unsafe_result.pointer("/report/outcome").unwrap(), "unknown");
    assert_eq!(
        unsafe_result.pointer("/report/results/0/code").unwrap(),
        "R_NUMERIC_RANGE"
    );

    let overflow = format!(
        r#"{{"version":1,"id":"overflow","sources":[{{"id":"ui","layer":"dom"}}],"assertions":[{{"id":"check","expected":{{"kind":"product","values":[{{"kind":"literal","value":1e308}},{{"kind":"literal","value":1e308}}]}},"actual":{{"kind":"literal","value":1}},"rule":{equal}}}]}}"#
    );
    let overflow_result = parse_result(&check_json(&overflow, "{}"));
    assert_eq!(
        overflow_result.pointer("/report/outcome").unwrap(),
        "unknown"
    );
    assert_eq!(
        overflow_result.pointer("/report/results/0/code").unwrap(),
        "R_NUMERIC"
    );

    let invalid_number = literal_contract("1e309", "1", equal);
    assert_eq!(
        parse_result(&check_json(&invalid_number, "{}"))["ok"],
        false
    );
}

#[test]
fn large_equal_literal_near_worker_body_budget_completes_deterministically() {
    let values = std::iter::repeat_n("0", 40_000)
        .collect::<Vec<_>>()
        .join(",");
    let equal = r#"{"kind":"equal"}"#;
    let contract = format!(
        r#"{{"version":1,"id":"large-equality","sources":[{{"id":"ui","layer":"dom"}}],"assertions":[{{"id":"check","expected":{{"kind":"literal","value":[{values}]}},"actual":{{"kind":"literal","value":[{values}]}},"rule":{equal}}}]}}"#
    );
    assert!(
        contract.len() < 256 * 1024,
        "fixture must fit the Worker request budget"
    );
    let result = parse_result(&check_json(&contract, "{}"));
    assert_eq!(result.pointer("/report/outcome").unwrap(), "pass");
}
