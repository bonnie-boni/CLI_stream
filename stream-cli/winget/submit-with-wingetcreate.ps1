param(
  [string]$Identifier = "BonnieBoni.CliMusic",
  [string]$Version = "0.1.1",
  [string]$InstallerUrl = "https://github.com/bonnie-boni/cli-player/releases/download/v0.1.1/cli-music-windows-x64.exe",
  [string]$PrTitle = "",
  [string]$Token = ""
)

$ErrorActionPreference = "Stop"

function Get-IdentifierPath {
  param([string]$Id)
  $parts = $Id.Split('.')
  return Join-Path (Join-Path $parts[0].Substring(0, 1).ToLower()) (Join-Path $parts[0] $parts[1])
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$manifestRoot = Join-Path $scriptDir "manifests"
$identifierPath = Get-IdentifierPath -Id $Identifier
$packageRoot = Join-Path $manifestRoot $identifierPath
$versionDir = Join-Path $packageRoot $Version

if (-not (Test-Path $versionDir)) {
  if (-not (Test-Path $packageRoot)) {
    throw "Manifest package folder not found: $packageRoot"
  }

  Write-Host "Version folder not found; creating from latest template..."
  $latest = Get-ChildItem -Path $packageRoot -Directory | Sort-Object Name -Descending | Select-Object -First 1
  if (-not $latest) {
    throw "No template manifest version folder found under: $packageRoot"
  }

  Copy-Item -Path $latest.FullName -Destination $versionDir -Recurse

  $oldVersion = $latest.Name
  $files = Get-ChildItem -Path $versionDir -File
  foreach ($f in $files) {
    $newName = $f.Name -replace [regex]::Escape($oldVersion), $Version
    if ($newName -ne $f.Name) {
      Rename-Item -Path $f.FullName -NewName $newName
    }
  }

  Get-ChildItem -Path $versionDir -File | ForEach-Object {
    $raw = Get-Content -Path $_.FullName -Raw
    $raw = [regex]::Replace($raw, '(?m)^PackageVersion:\s*.*$', "PackageVersion: $Version")
    Set-Content -Path $_.FullName -Value $raw -NoNewline
  }
}

$installerManifest = Join-Path $versionDir "$Identifier.installer.yaml"
if (-not (Test-Path $installerManifest)) {
  throw "Installer manifest not found: $installerManifest"
}

Write-Host "Downloading installer to compute SHA256..."
$tmp = Join-Path $env:TEMP ("cli-music-installer-" + [Guid]::NewGuid().ToString() + ".bin")
Invoke-WebRequest -Uri $InstallerUrl -OutFile $tmp
$sha256 = (Get-FileHash -Path $tmp -Algorithm SHA256).Hash.ToUpperInvariant()
Remove-Item $tmp -ErrorAction SilentlyContinue

Write-Host "Updating installer manifest URL and SHA256..."
$content = Get-Content -Path $installerManifest -Raw
$content = [regex]::Replace($content, '(?m)^\s*InstallerUrl:\s*.*$', "    InstallerUrl: $InstallerUrl")
$content = [regex]::Replace($content, '(?m)^\s*InstallerSha256:\s*.*$', "    InstallerSha256: $sha256")
Set-Content -Path $installerManifest -Value $content -NoNewline

Write-Host "Submitting manifests at: $versionDir"
$args = @("submit")
if ($PrTitle) {
  $args += @("--prtitle", $PrTitle)
}
if ($Token) {
  $args += @("--token", $Token)
}
$args += $versionDir

& wingetcreate @args
