param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectRef,

  [Parameter(Mandatory = $true)]
  [string]$SiteUrl,

  [string]$FunctionsEnvFile = "",
  [string]$FrontendEnvFile = ""
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$platformRoot = Join-Path $projectRoot "campus-platform"
$platformSupabaseRoot = Join-Path $platformRoot "supabase"
$supabaseWrapper = Join-Path $scriptDir "supabase-platform.ps1"
$localSupabase = Join-Path $platformRoot "node_modules\.bin\supabase.cmd"

if ([string]::IsNullOrWhiteSpace($FunctionsEnvFile)) {
  $FunctionsEnvFile = Join-Path $platformSupabaseRoot ".env.functions"
}

if ([string]::IsNullOrWhiteSpace($FrontendEnvFile)) {
  $FrontendEnvFile = Join-Path $platformRoot ".env.production"
}

$requiredPaths = @(
  (Join-Path $platformRoot "README-DEPLOY.md"),
  (Join-Path $platformRoot ".env.production.example"),
  (Join-Path $platformSupabaseRoot ".env.functions.example"),
  (Join-Path $platformSupabaseRoot "config.toml")
)

foreach ($path in $requiredPaths) {
  if (-not (Test-Path $path)) {
    throw "Missing required path: $path"
  }
}

Write-Output "Campus Platform v3 remote deploy plan"
Write-Output "Project ref: $ProjectRef"
Write-Output "Site URL: $SiteUrl"
Write-Output "Frontend env file: $FrontendEnvFile"
Write-Output "Functions env file: $FunctionsEnvFile"
Write-Output ""

if (Test-Path $localSupabase) {
  Write-Output "Detected local Supabase CLI: $localSupabase"
  & $localSupabase --version
  Write-Output ""
} else {
  Write-Warning "Local Supabase CLI is not installed yet. Run `npm.cmd install` inside campus-platform."
  Write-Output ""
}

Write-Output "1. Prepare frontend env:"
Write-Output "   Copy $(Join-Path $platformRoot '.env.production.example') -> $FrontendEnvFile"
Write-Output "   Ensure PUBLIC_CAMPUS_PLATFORM_MODE=live"
Write-Output "   Ensure PUBLIC_CAMPUS_PLATFORM_SITE_URL=$SiteUrl"
Write-Output ""

Write-Output "2. Prepare function secrets:"
Write-Output "   Copy $(Join-Path $platformSupabaseRoot '.env.functions.example') -> $FunctionsEnvFile"
Write-Output "   Fill PLATFORM_BOOTSTRAP_ADMIN_EMAILS and provider secrets"
Write-Output ""

Write-Output "3. Supabase remote commands:"
Write-Output "   & `"$supabaseWrapper`" login"
Write-Output "   & `"$supabaseWrapper`" link --project-ref $ProjectRef"
Write-Output "   & `"$supabaseWrapper`" db push --dry-run"
Write-Output "   & `"$supabaseWrapper`" db push --include-seed"
Write-Output "   & `"$supabaseWrapper`" config push --project-ref $ProjectRef"
Write-Output "   & `"$supabaseWrapper`" secrets set --env-file `"$FunctionsEnvFile`" --project-ref $ProjectRef"
Write-Output "   & `"$supabaseWrapper`" secrets list --project-ref $ProjectRef"
Write-Output "   & `"$supabaseWrapper`" functions deploy --project-ref $ProjectRef"
Write-Output ""

Write-Output "4. Frontend build and publish:"
Write-Output "   cd `"$platformRoot`""
Write-Output "   npm.cmd run build"
Write-Output "   Publish dist/ to the static host"
Write-Output ""

Write-Output "5. Post-deploy smoke test:"
Write-Output "   /acceso -> /portal -> completar bloque -> verificar FSRS -> emitir badge -> /verify/<token>"
Write-Output "   Also test /verify/?token=<token>, run-open and ical-feed"
