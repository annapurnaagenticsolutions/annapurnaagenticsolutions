$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

function Invoke-CargoStep {
  param([string[]] $CargoArgs)
  Write-Host "cargo $($CargoArgs -join ' ')"
  & cargo @CargoArgs
  if ($LASTEXITCODE -ne 0) { throw "Cargo step failed with exit code $LASTEXITCODE" }
}

if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
  throw 'Rust/Cargo not installed. Install via https://rustup.rs/ and restart the terminal.'
}

Write-Host 'InvariantC — Offline-only M1 verification'
Invoke-CargoStep -CargoArgs @('fmt', '--all')
Invoke-CargoStep -CargoArgs @('test', '--all-targets')
Invoke-CargoStep -CargoArgs @('clippy', '--all-targets')
Invoke-CargoStep -CargoArgs @('build')

$binary = Join-Path $PSScriptRoot 'target\debug\invariantc.exe'
if (-not (Test-Path $binary)) { throw "Binary not produced: $binary" }

function Assert-Exit {
  param([string[]] $Arguments, [int] $Expected)
  & $binary @Arguments
  $actual = $LASTEXITCODE
  if ($actual -ne $Expected) { throw "Wrong exit code: expected $Expected, got $actual for $($Arguments -join ' ')" }
}

Assert-Exit -Arguments @('validate', 'examples/apples.contract.json','--offline') -Expected 0
Assert-Exit -Arguments @('check', 'examples/apples.contract.json','--observations','examples/apples.observations.json','--offline') -Expected 2
Assert-Exit -Arguments @('check', 'examples/checkout.contract.json','--observations','examples/checkout.observations.json','--offline') -Expected 0
Assert-Exit -Arguments @('check', 'examples/apples.contract.json','--observations','examples/missing.observations.json','--offline') -Expected 3
Assert-Exit -Arguments @('corpus', 'corpus/manifest.json','--offline') -Expected 0

Write-Host 'All requested native Rust build/test/CLI/corpus checks completed successfully.'
