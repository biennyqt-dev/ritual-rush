[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

$secureKey = Read-Host "Paste your Ritual private key (with or without 0x)" -AsSecureString
$keyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)

try {
    $privateKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($keyPointer).Trim()

    if ($privateKey.StartsWith("0x", [StringComparison]::OrdinalIgnoreCase)) {
        $privateKey = $privateKey.Substring(2)
    }

    if ($privateKey -notmatch "^[0-9a-fA-F]{64}$") {
        throw "Private key must contain exactly 64 hexadecimal characters."
    }

    $environmentPath = Join-Path $PSScriptRoot ".env"
    $utf8WithoutBom = [Text.UTF8Encoding]::new($false)
    [IO.File]::WriteAllText(
        $environmentPath,
        "PRIVATE_KEY=0x$privateKey`n",
        $utf8WithoutBom
    )

    Write-Host "Deployment key saved locally to contracts/.env."
    Write-Host "The file is excluded from Git and will not be sent to Vercel."
}
finally {
    if ($keyPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($keyPointer)
    }

    $privateKey = $null
    $secureKey.Dispose()
}
