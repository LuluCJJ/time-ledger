param(
    [Parameter(Mandatory = $true)][string]$Apk,
    [Parameter(Mandatory = $true)][string]$AndroidSdk,
    [Parameter(Mandatory = $true)][string]$ExpectedSignerSha256,
    [Parameter(Mandatory = $true)][string]$DependencyReport,
    [string]$SourceRoot = (Join-Path $PSScriptRoot '../..')
)

$ErrorActionPreference = 'Stop'
$apkPath = (Resolve-Path -LiteralPath $Apk).Path
$sourceRoot = (Resolve-Path -LiteralPath $SourceRoot).Path
$dependencyReportPath = (Resolve-Path -LiteralPath $DependencyReport).Path
$buildTools = Get-ChildItem -LiteralPath (Join-Path $AndroidSdk 'build-tools') -Directory |
    Sort-Object { [version]($_.Name -replace '[^0-9.]', '') } -Descending |
    Select-Object -First 1
if (-not $buildTools) { throw 'Android SDK build-tools are missing.' }
$apksigner = Join-Path $buildTools.FullName 'apksigner.bat'
$aapt = Join-Path $buildTools.FullName 'aapt.exe'
if (-not (Test-Path -LiteralPath $apksigner) -or -not (Test-Path -LiteralPath $aapt)) {
    throw 'Android SDK apksigner or aapt is missing.'
}

$signature = (& $apksigner verify --verbose --print-certs $apkPath 2>&1) -join "`n"
if ($LASTEXITCODE -ne 0 -or $signature -notmatch '(?m)^Verifies\s*$') { throw "APK signature verification failed: $signature" }
$actualSigner = [regex]::Match($signature, 'Signer #1 certificate SHA-256 digest:\s*([0-9a-fA-F]+)').Groups[1].Value.ToUpperInvariant()
$wantedSigner = ($ExpectedSignerSha256 -replace '[^0-9a-fA-F]', '').ToUpperInvariant()
if ($wantedSigner.Length -ne 64 -or $actualSigner -ne $wantedSigner) { throw 'APK signer certificate differs from the expected release certificate.' }

$badging = (& $aapt dump badging $apkPath 2>&1) -join "`n"
if ($LASTEXITCODE -ne 0) { throw "APK metadata inspection failed: $badging" }
if ($badging -notmatch "(?m)^package: name='app\.personal\.timeledger\.official' versionCode='1' versionName='1\.0'") {
    throw 'APK package ID or initial version differs from the approved release identity.'
}
if ($badging -notmatch "(?m)^application-label:'时间账 正式版'") { throw 'APK display name differs from the approved release label.' }
if ($badging -notmatch "(?m)^launchable-activity:.*label='时间账 正式版'") { throw 'APK launcher name differs from the approved release label.' }

Add-Type -AssemblyName System.IO.Compression
$sources = @{
    'PROJECT-LICENSE.txt' = Join-Path $sourceRoot 'LICENSE'
    'SHEETJS-LICENSE.txt' = Join-Path $sourceRoot 'web/vendor/SHEETJS-LICENSE.txt'
    'CAPACITOR-LICENSE.txt' = Join-Path $sourceRoot 'shells/node_modules/@capacitor/android/LICENSE'
    'ANDROID-DEPENDENCIES.txt' = Join-Path $sourceRoot 'docs/ANDROID_DEPENDENCIES.txt'
}
$listed = @(Get-Content -LiteralPath $sources['ANDROID-DEPENDENCIES.txt'] | Where-Object { $_ -match '^[A-Za-z0-9_.-]+:[A-Za-z0-9_.-]+:[0-9][A-Za-z0-9_.-]*$' } | Sort-Object -Unique)
$resolved = @()
foreach ($line in Get-Content -LiteralPath $dependencyReportPath) {
    if ($line -match '([A-Za-z0-9_.-]+):([A-Za-z0-9_.-]+):([0-9][A-Za-z0-9_.-]*)(?: -> ([0-9][A-Za-z0-9_.-]*))?') {
        $version = if ($matches[4]) { $matches[4] } else { $matches[3] }
        $resolved += "$($matches[1]):$($matches[2]):$version"
    }
}
$resolved = @($resolved | Sort-Object -Unique)
if ($listed.Count -eq 0 -or $resolved.Count -eq 0 -or (Compare-Object -ReferenceObject $listed -DifferenceObject $resolved)) {
    throw 'Bundled Android dependency attribution does not match the release runtime graph.'
}
$zip = [IO.Compression.ZipFile]::OpenRead($apkPath)
try {
    foreach ($name in $sources.Keys) {
        $entry = $zip.GetEntry("assets/public/legal/$name")
        if (-not $entry) { throw "APK is missing $name" }
        $stream = $entry.Open()
        try { $apkHash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($stream)) }
        finally { $stream.Dispose() }
        $sourceHash = (Get-FileHash -LiteralPath $sources[$name] -Algorithm SHA256).Hash
        if ($apkHash -ne $sourceHash) { throw "APK $name differs from its source license." }
    }
}
finally { $zip.Dispose() }

$file = Get-Item -LiteralPath $apkPath
if ($file.Length -le 0) { throw 'APK file is empty.' }
$apkHash = (Get-FileHash -LiteralPath $apkPath -Algorithm SHA256).Hash
Write-Output "Verified package: app.personal.timeledger.official (1 / 1.0)"
Write-Output 'Verified label: 时间账 正式版'
Write-Output "Verified signer SHA-256: $actualSigner"
Write-Output "Verified legal texts: $($sources.Count)"
Write-Output "Verified release dependency coordinates: $($resolved.Count)"
Write-Output "APK bytes: $($file.Length)"
Write-Output "APK SHA-256: $apkHash"
