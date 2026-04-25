param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Arguments
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$platformRoot = Join-Path $projectRoot "campus-platform"

Push-Location $platformRoot
try {
  $command = @("run", "supabase", "--") + $Arguments
  & npm.cmd @command
  exit $LASTEXITCODE
}
finally {
  Pop-Location
}
