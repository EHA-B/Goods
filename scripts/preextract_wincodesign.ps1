param()

$ErrorActionPreference = "Continue"

$cacheDir  = "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign"
$targetDir = Join-Path $cacheDir "winCodeSign-2.6.0"
$archiveUrl = "https://github.com/electron-userland/electron-builder-binaries/releases/download/winCodeSign-2.6.0/winCodeSign-2.6.0.7z"
$archivePath = Join-Path $cacheDir "winCodeSign-2.6.0.7z"
$sevenZa = Join-Path $PSScriptRoot "..\node_modules\7zip-bin\win\x64\7za.exe"

Write-Host "=== winCodeSign pre-extract script ==="

# Clear any broken partial extractions
if (Test-Path $targetDir) {
    Write-Host "Removing broken cache at $targetDir ..."
    Remove-Item $targetDir -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $cacheDir | Out-Null

# Download archive if needed
if (!(Test-Path $archivePath)) {
    Write-Host "Downloading winCodeSign-2.6.0.7z ..."
    Invoke-WebRequest -Uri $archiveUrl -OutFile $archivePath -UseBasicParsing
    Write-Host "Downloaded."
} else {
    Write-Host "Archive already cached."
}

# Extract — deliberately ignore exit code (symlink errors are non-fatal for our purposes)
Write-Host "Extracting (ignoring macOS symlink errors) ..."
New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
$proc = Start-Process -FilePath $sevenZa `
    -ArgumentList "x", "`"$archivePath`"", "-o`"$targetDir`"", "-y", "-bd" `
    -Wait -PassThru -NoNewWindow
Write-Host "7-Zip exited with code: $($proc.ExitCode) (2 = only symlink errors, safe to ignore)"

# Verify the Windows tools are present
$signtool = Join-Path $targetDir "windows\10\x64\signtool.exe"
if (Test-Path $signtool) {
    Write-Host "OK: signtool.exe found at $signtool"
} else {
    Write-Host "WARNING: signtool.exe not found, listing extracted contents:"
    Get-ChildItem $targetDir -Recurse -File | Select-Object FullName | Format-List
}

Write-Host "=== Pre-extraction complete. Now run npm run build. ==="
