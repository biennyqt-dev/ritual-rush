[CmdletBinding()]
param(
    [string]$ForgePath = "forge"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command $ForgePath -ErrorAction SilentlyContinue)) {
    throw "Foundry forge was not found. Install the official Ritual Foundry toolchain and ensure forge is on PATH."
}

$environment = Get-Content (Join-Path $PSScriptRoot "..\.env") -Raw
$privateKey = ([regex]::Match($environment, "(?m)^PRIVATE_KEY=(0x[0-9a-fA-F]{64})\s*$")).Groups[1].Value
if (-not $privateKey) {
    throw "contracts/.env must contain a normalized PRIVATE_KEY."
}

$env:RITUAL_RPC_URL = "https://rpc.ritualfoundation.org"
$env:RITUAL_VERIFIER_URL = "https://rpc.ritualfoundation.org/api/verify"

Push-Location (Join-Path $PSScriptRoot "..")
try {
    & $ForgePath build
    if ($LASTEXITCODE -ne 0) {
        throw "forge build failed."
    }

    & $ForgePath create src/RitualRush.sol:RitualRush `
        --rpc-url $env:RITUAL_RPC_URL `
        --private-key $privateKey `
        --broadcast `
        --json
    if ($LASTEXITCODE -ne 0) {
        throw "forge create failed."
    }
}
finally {
    $privateKey = $null
    Pop-Location
}
