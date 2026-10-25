param(
    [Parameter(Mandatory = $true)][string]$SourceDirectory,
    [Parameter(Mandatory = $true)][string]$DestinationDirectory
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..')).TrimEnd([IO.Path]::DirectorySeparatorChar)
$sourceRoot = (Resolve-Path -LiteralPath $SourceDirectory).Path.TrimEnd([IO.Path]::DirectorySeparatorChar)
$destinationRoot = (Resolve-Path -LiteralPath $DestinationDirectory).Path.TrimEnd([IO.Path]::DirectorySeparatorChar)
$separator = [IO.Path]::DirectorySeparatorChar
foreach ($path in @($sourceRoot, $destinationRoot)) {
    if ($path.Equals($repositoryRoot, [StringComparison]::OrdinalIgnoreCase) -or
        $path.StartsWith("$repositoryRoot$separator", [StringComparison]::OrdinalIgnoreCase)) {
        throw 'Signing material must stay outside the public repository.'
    }
}
if ($sourceRoot.Equals($destinationRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Choose a separate destination for the recovery copy.'
}
$names = @('time-ledger-official.p12', 'signing-credentials.json')
foreach ($name in $names) {
    $file = Get-Item -LiteralPath (Join-Path $sourceRoot $name) -ErrorAction Stop
    if ($file.Length -le 0) { throw 'A required signing file is empty.' }
}
$folder = Join-Path $destinationRoot ('time-ledger-signing-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
if (Test-Path -LiteralPath $folder) { throw 'Recovery folder already exists; refusing to overwrite it.' }
New-Item -ItemType Directory -Path $folder -ErrorAction Stop | Out-Null
foreach ($name in $names) {
    $original = Join-Path $sourceRoot $name
    $copy = Join-Path $folder $name
    Copy-Item -LiteralPath $original -Destination $copy -ErrorAction Stop
    if ((Get-FileHash -LiteralPath $original -Algorithm SHA256).Hash -ne
        (Get-FileHash -LiteralPath $copy -Algorithm SHA256).Hash) {
        throw 'Recovery copy verification failed.'
    }
}
@'
Time Ledger Android signing recovery copy

Keep both files together on an offline drive. They are needed to sign future updates
with the same Android app identity. Do not commit, publish, or share them.
Store the drive separately from the computer and periodically check that both files
are readable. This recovery copy is not a replacement for phone data backups.
'@ | Set-Content -LiteralPath (Join-Path $folder 'README.txt') -Encoding utf8
Write-Output 'Signing recovery copy verified. Store the destination drive offline.'
Write-Output "Recovery folder: $folder"
