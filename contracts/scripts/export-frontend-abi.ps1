[CmdletBinding()]
param(
    [string]$ForgePath = "forge"
)

$ErrorActionPreference = "Stop"

$contractsRoot = Split-Path -Parent $PSScriptRoot
$projectRoot = Split-Path -Parent $contractsRoot
$outputPath = Join-Path $projectRoot "src\lib\generated\ritualRushAbi.ts"
$outputDirectory = Split-Path -Parent $outputPath

if (-not (Get-Command $ForgePath -ErrorAction SilentlyContinue)) {
    throw "Foundry forge was not found. Install the official Ritual Foundry toolchain and ensure forge is on PATH."
}

Push-Location $contractsRoot
try {
    & $ForgePath build
    if ($LASTEXITCODE -ne 0) {
        throw "forge build failed."
    }

    $abiJson = (& $ForgePath inspect RitualRush abi --json | Out-String).Trim()
    if ($LASTEXITCODE -ne 0 -or -not $abiJson.StartsWith("[")) {
        throw "forge inspect did not return a valid ABI JSON array."
    }

    $null = $abiJson | ConvertFrom-Json
    New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
    $contents = @"
// Generated from contracts/src/RitualRush.sol by Foundry forge inspect.
// Do not edit manually; run contracts/scripts/export-frontend-abi.ps1 after contract changes.
export const RITUAL_RUSH_CONTRACT_ABI = $abiJson as const;
"@
    $utf8WithoutBom = [Text.UTF8Encoding]::new($false)
    [IO.File]::WriteAllText($outputPath, $contents.TrimStart(), $utf8WithoutBom)
    Write-Host "Generated $outputPath from the official Foundry artifact."
}
finally {
    Pop-Location
}
