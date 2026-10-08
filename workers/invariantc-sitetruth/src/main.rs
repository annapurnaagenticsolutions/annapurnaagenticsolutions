use invariantc_core::{compile_contract, run_contract, Contract, Outcome};
use serde::Deserialize;
use serde_json::Value;
use std::fs;
use std::path::{Component, Path, PathBuf};

const MAX_INPUT_BYTES: u64 = 4 * 1024 * 1024;

#[derive(Debug, Deserialize)]
struct CorpusManifest {
    cases: Vec<CorpusEntry>,
}
#[derive(Debug, Deserialize)]
struct CorpusEntry {
    id: String,
    file: String,
    expected_outcome: Outcome,
}
#[derive(Debug, Deserialize)]
struct CorpusFixture {
    contract: Contract,
    observations: Value,
}

fn usage() {
    eprintln!("invariantc 0.2 (always offline; no network/model calls)\n\
usage:\n\
  invariantc validate CONTRACT.json [--offline]\n\
  invariantc compile CONTRACT.json [--output PLAN.json] [--offline]\n\
  invariantc check CONTRACT.json --observations OBS.json [--output REPORT.json] [--offline]\n\
  invariantc corpus CORPUS/manifest.json [--offline]\n\
  invariantc version\n\
Exit codes: 0 = success/PASS, 2 = FAIL, 3 = UNKNOWN, 4 = invalid contract/input or test-corpus mismatch.\n\
Reports omit raw observed values by default.");
}

fn read_json<T: serde::de::DeserializeOwned>(path: &Path) -> Result<T, String> {
    let meta = fs::metadata(path).map_err(|e| format!("cannot stat {}: {e}", path.display()))?;
    if meta.len() > MAX_INPUT_BYTES {
        return Err(format!("{} exceeds 4 MiB input limit", path.display()));
    }
    let bytes = fs::read(path).map_err(|e| format!("cannot read {}: {e}", path.display()))?;
    serde_json::from_slice(&bytes).map_err(|e| format!("invalid JSON {}: {e}", path.display()))
}

fn emit<T: serde::Serialize>(value: &T, output: Option<&str>) -> Result<(), String> {
    let serialized = serde_json::to_string_pretty(value).map_err(|e| e.to_string())? + "\n";
    match output {
        Some(path) => fs::write(path, serialized).map_err(|e| format!("cannot write {path}: {e}")),
        None => {
            print!("{serialized}");
            Ok(())
        }
    }
}

fn format_issues(problems: &[invariantc_core::model::Issue]) {
    for p in problems {
        eprintln!("{} at {}: {}", p.code, p.at, p.message);
    }
}

fn safe_relative(file: &str) -> bool {
    let path = Path::new(file);
    !file.is_empty() && path.components().all(|x| matches!(x, Component::Normal(_)))
}

fn command(args: Vec<String>) -> Result<i32, String> {
    if args.is_empty() {
        usage();
        return Ok(4);
    }
    let name = &args[0];
    if name == "version" {
        println!("invariantc 0.2.0");
        return Ok(0);
    }
    if name == "help" || name == "--help" {
        usage();
        return Ok(0);
    }
    if !matches!(name.as_str(), "validate" | "compile" | "check" | "corpus") {
        usage();
        return Err(format!("unsupported command {name:?}"));
    }
    let mut positional: Vec<&str> = Vec::new();
    let mut output: Option<&str> = None;
    let mut observations_path: Option<&str> = None;
    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "--offline" => i += 1,
            "--output" | "--observations" => {
                let flag = args[i].as_str();
                i += 1;
                let value = args
                    .get(i)
                    .ok_or_else(|| format!("missing value for {flag}"))?;
                if flag == "--output" {
                    output = Some(value);
                } else {
                    observations_path = Some(value);
                }
                i += 1;
            }
            other if other.starts_with('-') => return Err(format!("unsupported flag: {other}")),
            other => {
                positional.push(other);
                i += 1;
            }
        }
    }
    if positional.len() != 1 {
        usage();
        return Err("supply exactly one contract/manifest path".into());
    }
    let path = PathBuf::from(positional[0]);
    if name == "corpus" {
        if observations_path.is_some() || output.is_some() {
            return Err("corpus only accepts --offline".into());
        }
        let manifest: CorpusManifest = read_json(&path)?;
        if manifest.cases.is_empty() {
            return Err("empty corpus".into());
        }
        let parent = path.parent().unwrap_or(Path::new("."));
        let mut passed = 0;
        for entry in &manifest.cases {
            if !safe_relative(&entry.file) {
                return Err(format!("invalid manifest path: {}", entry.file));
            }
            let fixture: CorpusFixture = read_json(&parent.join(&entry.file))?;
            let report = run_contract(&fixture.contract, &fixture.observations)
                .map_err(|issues| format!("case {} did not compile: {:?}", entry.id, issues))?;
            if report.outcome != entry.expected_outcome {
                return Err(format!(
                    "case {} expected {:?}, got {:?}",
                    entry.id, entry.expected_outcome, report.outcome
                ));
            }
            passed += 1;
        }
        println!("corpus PASS: {passed} labelled scenarios matched expected outcomes");
        return Ok(0);
    }
    let contract: Contract = read_json(&path)?;
    let plan = match compile_contract(&contract) {
        Ok(p) => p,
        Err(issues) => {
            format_issues(&issues);
            return Ok(4);
        }
    };
    if name == "validate" {
        if observations_path.is_some() || output.is_some() {
            return Err("validate only accepts --offline".into());
        }
        println!(
            "VALID: {} ({} assertions)",
            plan.contract_id,
            plan.assertions.len()
        );
        return Ok(0);
    }
    if name == "compile" {
        if observations_path.is_some() {
            return Err("compile does not accept --observations".into());
        }
        emit(&plan, output)?;
        return Ok(0);
    }
    let obs_path =
        observations_path.ok_or_else(|| "check requires --observations OBS.json".to_string())?;
    let observations: Value = read_json(Path::new(obs_path))?;
    let report = match run_contract(&contract, &observations) {
        Ok(r) => r,
        Err(issues) => {
            format_issues(&issues);
            return Ok(4);
        }
    };
    emit(&report, output)?;
    Ok(match report.outcome {
        Outcome::Pass => 0,
        Outcome::Fail => 2,
        Outcome::Unknown => 3,
    })
}

fn main() {
    let code = match command(std::env::args().skip(1).collect()) {
        Ok(code) => code,
        Err(e) => {
            eprintln!("ERROR: {e}");
            4
        }
    };
    std::process::exit(code);
}
