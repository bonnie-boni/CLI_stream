param(
    [string]$Token = "",
    [string]$PrTitle = "Add BonnieBoni.CliMusic version 0.1.7"
)

$manifestDir = Join-Path $PSScriptRoot "manifests\b\BonnieBoni\CliMusic\0.1.7"

if (-not (Test-Path $manifestDir)) {
    Write-Error "Manifest directory not found: $manifestDir"
    exit 1
}

Write-Host "Submitting manifests..." -ForegroundColor Cyan
if ([string]::IsNullOrWhiteSpace($Token)) {
    wingetcreate submit --prtitle $PrTitle $manifestDir
} else {
    wingetcreate submit --prtitle $PrTitle --token $Token $manifestDir
}
