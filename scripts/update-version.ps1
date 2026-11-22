[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Version
)

$ErrorActionPreference = "Stop"

if ($Version -notmatch '^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$') {
    throw "Invalid version '$Version'. Expected a semantic version such as 2.1.0 or 2.1.0-beta.1."
}

$root = Split-Path -Parent $PSScriptRoot
$files = @{
    PackageJson = Join-Path $root "package.json"
    CargoToml = Join-Path $root "src-tauri/Cargo.toml"
    CargoLock = Join-Path $root "src-tauri/Cargo.lock"
    TauriConfig = Join-Path $root "src-tauri/tauri.conf.json"
}

function Update-TextFile {
    param(
        [string]$Path,
        [string]$Pattern,
        [string]$Replacement,
        [string]$Description
    )

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "Required file not found: $Path"
    }

    $content = [System.IO.File]::ReadAllText($Path)
    if (-not [regex]::IsMatch($content, $Pattern)) {
        throw "Could not find the expected version entry in $Description ($Path)"
    }

    $updated = [regex]::Replace($content, $Pattern, $Replacement, 1)
    if ($updated -ne $content) {
        [System.IO.File]::WriteAllText($Path, $updated, [System.Text.UTF8Encoding]::new($false))
    }

    Write-Host "Updated $Description to $Version"
}

Update-TextFile `
    -Path $files.PackageJson `
    -Pattern '("version"\s*:\s*")([^"\r\n]+)(")' `
    -Replacement ('${1}' + $Version + '${3}') `
    -Description "package.json"

Update-TextFile `
    -Path $files.CargoToml `
    -Pattern '(?s)(\[package\].*?\bversion\s*=\s*")([^"]+)(")' `
    -Replacement ('${1}' + $Version + '${3}') `
    -Description "src-tauri/Cargo.toml"

Update-TextFile `
    -Path $files.CargoLock `
    -Pattern '(?s)(\[\[package\]\]\s*\r?\nname\s*=\s*"app"\s*\r?\nversion\s*=\s*")([^"]+)(")' `
    -Replacement ('${1}' + $Version + '${3}') `
    -Description "src-tauri/Cargo.lock app package"

Update-TextFile `
    -Path $files.TauriConfig `
    -Pattern '("version"\s*:\s*")([^"\r\n]+)(")' `
    -Replacement ('${1}' + $Version + '${3}') `
    -Description "src-tauri/tauri.conf.json"

Write-Host "Project version is now $Version."
