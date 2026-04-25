param(
  [string]$SiteUrl = "",
  [switch]$IncludeQualityGates,
  [switch]$SkipLegacyBackup
)

$ErrorActionPreference = "Stop"
$script:Failures = 0

function Write-Check {
  param(
    [string]$Label,
    [bool]$Passed,
    [string]$Detail
  )

  $prefix = if ($Passed) { "OK  " } else { "MISS" }
  Write-Output "$prefix ${Label}: $Detail"
  if (-not $Passed) {
    $script:Failures += 1
  }
}

function Invoke-NpmScript {
  param(
    [string]$WorkingDirectory,
    [string[]]$Arguments,
    [string]$Label
  )

  Push-Location $WorkingDirectory
  try {
    & npm.cmd @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "$Label failed."
    }
  }
  finally {
    Pop-Location
  }
}

function Test-RelativeFile {
  param(
    [string]$Root,
    [string]$RelativePath,
    [string]$Label = $RelativePath
  )

  $fullPath = Join-Path $Root $RelativePath
  Write-Check -Label $Label -Passed (Test-Path -LiteralPath $fullPath -PathType Leaf) -Detail $RelativePath
}

function Invoke-HttpProbe {
  param(
    [string]$BaseUrl,
    [string]$Path
  )

  $uri = "$($BaseUrl.TrimEnd('/'))/$($Path.TrimStart('/'))"
  try {
    $statusCode = & curl.exe -sS -L -o NUL -w "%{http_code}" $uri
    if ($LASTEXITCODE -ne 0) {
      throw "curl failed with exit code $LASTEXITCODE"
    }

    $status = [int]$statusCode
    $ok = $status -ge 200 -and $status -lt 400
    Write-Check -Label "public route $Path" -Passed $ok -Detail "HTTP $status $uri"
  } catch {
    Write-Check -Label "public route $Path" -Passed $false -Detail "$uri -> $($_.Exception.Message)"
  }
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$platformRoot = Join-Path $projectRoot "campus-platform"
$legacyRoot = Join-Path $projectRoot "campus-v2"
$platformDist = Join-Path $platformRoot "dist"
$legacyDist = Join-Path $legacyRoot "dist"

Write-Output "Cutover target: campus-platform"
Write-Output "Legacy rollback package: campus-v2"

Write-Check -Label "active app package" -Passed (Test-Path -LiteralPath (Join-Path $platformRoot "package.json") -PathType Leaf) -Detail "campus-platform/package.json"
Write-Check -Label "legacy app package" -Passed (Test-Path -LiteralPath (Join-Path $legacyRoot "package.json") -PathType Leaf) -Detail "campus-v2/package.json"
Write-Check -Label "legacy supabase inactive" -Passed (-not (Test-Path -LiteralPath (Join-Path $legacyRoot "supabase\config.toml") -PathType Leaf)) -Detail "campus-v2/supabase/config.toml must stay absent"

if ($script:Failures -gt 0) {
  throw "Cutover prerequisites failed."
}

if ($IncludeQualityGates.IsPresent) {
  Invoke-NpmScript -WorkingDirectory $platformRoot -Arguments @("run", "test:a11y") -Label "Campus Platform a11y gate"
  Invoke-NpmScript -WorkingDirectory $platformRoot -Arguments @("run", "test:perf") -Label "Campus Platform performance gate"
} else {
  Invoke-NpmScript -WorkingDirectory $platformRoot -Arguments @("run", "build") -Label "Campus Platform build"
}

$platformRoutes = @(
  "index.html",
  "catalogo\index.html",
  "curso\programa-empoderamiento-power-skills\index.html",
  "curso\programa-empoderamiento-power-skills\preview\index.html",
  "acceso\index.html",
  "portal\index.html",
  "admin\index.html",
  "verify\index.html",
  "verify\demo-badge-power-skills\index.html",
  "lti\authorize\index.html",
  "offline\index.html",
  ".htaccess",
  "manifest.webmanifest",
  "push-sw.js"
)

foreach ($route in $platformRoutes) {
  Test-RelativeFile -Root $platformDist -RelativePath $route -Label "platform artifact"
}

$htaccessPath = Join-Path $platformDist ".htaccess"
$hasVerifyRewrite = (Test-Path -LiteralPath $htaccessPath -PathType Leaf) -and
  (Select-String -Path $htaccessPath -Pattern "RewriteRule \^verify/\[\^/\]\+/\?\$ verify/index.html" -Quiet)
Write-Check -Label "verify token rewrite" -Passed $hasVerifyRewrite -Detail "dist/.htaccess rewrites /verify/<token>"

if (-not $SkipLegacyBackup.IsPresent) {
  Invoke-NpmScript -WorkingDirectory $legacyRoot -Arguments @("run", "build") -Label "Campus v2 rollback build"
  Test-RelativeFile -Root $legacyDist -RelativePath "index.html" -Label "legacy rollback artifact"
  Test-RelativeFile -Root $legacyDist -RelativePath ".htaccess" -Label "legacy rollback artifact"
}

if (-not [string]::IsNullOrWhiteSpace($SiteUrl)) {
  foreach ($path in @("/", "/catalogo/", "/verify/", "/lti/authorize/", "/offline/")) {
    Invoke-HttpProbe -BaseUrl $SiteUrl -Path $path
  }
}

if ($script:Failures -gt 0) {
  throw "Cutover readiness failed with $script:Failures issue(s)."
}

Write-Output "Cutover readiness passed."
