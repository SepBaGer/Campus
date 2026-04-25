param(
  [ValidateSet("codex", "claude-desktop")]
  [string]$Environment = "codex",
  [switch]$IncludeVestigialBackup
)

$ErrorActionPreference = "Stop"

function Resolve-PythonCommand {
  foreach ($candidate in @("python3", "python")) {
    $command = Get-Command $candidate -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }
  }
  throw "Missing Python 3 interpreter (`python3` or `python`)."
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$pythonCommand = Resolve-PythonCommand

Write-Output "Doctor mode: repo"
Write-Output "Environment target: $Environment"

& (Join-Path $scriptDir "check-capabilities.ps1") -Environment $Environment

Push-Location $projectRoot
try {
  & $pythonCommand -m unittest discover -s tests
  if ($LASTEXITCODE -ne 0) {
    throw "Repository contract tests failed."
  }
}
finally {
  Pop-Location
}

Push-Location (Join-Path $projectRoot "campus-platform")
try {
  & npm.cmd run test
  if ($LASTEXITCODE -ne 0) {
    throw "Campus Platform tests failed."
  }

  & npm.cmd run build
  if ($LASTEXITCODE -ne 0) {
    throw "Campus Platform build failed."
  }
}
finally {
  Pop-Location
}

if ($IncludeVestigialBackup.IsPresent) {
  Push-Location (Join-Path $projectRoot "campus-v2")
  try {
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) {
      throw "Vestigial Campus v2 build failed."
    }
  }
  finally {
    Pop-Location
  }
} else {
  Write-Output "SKIP cmd: campus-v2 build (vestigial backup validation not requested)"
}

Write-Output "Doctor completed successfully."
