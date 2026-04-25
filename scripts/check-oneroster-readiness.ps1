param(
  [string]$ProjectRef = "",
  [string]$RunSlug = "power-skills-pilot-open",
  [string]$ExpectedSecretName = "ONEROSTER_POWER_SKILLS_TOKEN",
  [switch]$RequireLiveConfig,
  [switch]$RequireSyncHistory,
  [switch]$PrintActivationSql
)

$ErrorActionPreference = "Stop"

function Resolve-ProjectRef {
  param(
    [string]$ExplicitProjectRef,
    [string]$SupabaseRoot
  )

  if (-not [string]::IsNullOrWhiteSpace($ExplicitProjectRef)) {
    return $ExplicitProjectRef
  }

  if (-not [string]::IsNullOrWhiteSpace($env:CAMPUS_SUPABASE_PROJECT_REF)) {
    return $env:CAMPUS_SUPABASE_PROJECT_REF
  }

  $linkedRefPath = Join-Path $SupabaseRoot ".temp\project-ref"
  if (Test-Path -LiteralPath $linkedRefPath -PathType Leaf) {
    $linkedRef = (Get-Content -LiteralPath $linkedRefPath -Raw).Trim()
    if (-not [string]::IsNullOrWhiteSpace($linkedRef)) {
      return $linkedRef
    }
  }

  return "exyewjzckgsesrsuqueh"
}

function ConvertTo-SqlLiteral {
  param([string]$Value)
  return "'$($Value.Replace("'", "''"))'"
}

function ConvertFrom-SupabaseOutput {
  param(
    [object[]]$Output,
    [string]$CommandLabel
  )

  $text = (($Output | Out-String).Trim())
  $objectStart = $text.IndexOf("{")
  $arrayStart = $text.IndexOf("[")

  if ($objectStart -lt 0 -and $arrayStart -lt 0) {
    throw "Supabase CLI did not return JSON for: $CommandLabel"
  }

  if ($arrayStart -ge 0 -and ($objectStart -lt 0 -or $arrayStart -lt $objectStart)) {
    $start = $arrayStart
    $end = $text.LastIndexOf("]")
  } else {
    $start = $objectStart
    $end = $text.LastIndexOf("}")
  }

  if ($end -lt $start) {
    throw "Supabase CLI returned incomplete JSON for: $CommandLabel"
  }

  return $text.Substring($start, $end - $start + 1) | ConvertFrom-Json
}

function Invoke-SupabaseJson {
  param(
    [string]$SupabaseCli,
    [string]$SupabaseRoot,
    [string[]]$CliArguments
  )

  Push-Location $SupabaseRoot
  try {
    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $output = & $SupabaseCli @CliArguments 2>$null
    $exitCode = $LASTEXITCODE
    $ErrorActionPreference = $previousErrorActionPreference
    if ($exitCode -ne 0) {
      throw "Supabase CLI failed: $($CliArguments -join ' ')"
    }
  }
  finally {
    if ($previousErrorActionPreference) {
      $ErrorActionPreference = $previousErrorActionPreference
    }
    Pop-Location
  }

  return ConvertFrom-SupabaseOutput -Output $output -CommandLabel ($CliArguments -join " ")
}

function Get-Text {
  param(
    [object]$Value
  )

  if ($null -eq $Value) {
    return ""
  }

  return ([string]$Value).Trim()
}

function Write-Check {
  param(
    [string]$Label,
    [bool]$Passed,
    [string]$Detail
  )

  $prefix = if ($Passed) { "OK  " } else { "MISS" }
  Write-Output "$prefix ${Label}: $Detail"
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$platformRoot = Join-Path $projectRoot "campus-platform"
$supabaseRoot = Join-Path $platformRoot "supabase"
$supabaseCli = Join-Path $platformRoot "node_modules\supabase\bin\supabase.exe"
$projectRef = Resolve-ProjectRef -ExplicitProjectRef $ProjectRef -SupabaseRoot $supabaseRoot

if (-not (Test-Path -LiteralPath $supabaseCli -PathType Leaf)) {
  throw "Missing local Supabase CLI. Run npm install inside campus-platform first."
}

$schemaSql = @"
select
  to_regclass('delivery.course_run') is not null as course_run_present,
  to_regclass('delivery.course_run_roster_sync') is not null as roster_sync_table_present,
  to_regclass('delivery.course_run_roster_seat') is not null as roster_seat_table_present;
"@

$schemaResult = Invoke-SupabaseJson -SupabaseCli $supabaseCli -SupabaseRoot $supabaseRoot -CliArguments @(
  "db", "query", "--linked", "-o", "json", $schemaSql
)
$schemaRow = @($schemaResult.rows)[0]

$courseRunPresent = [bool]$schemaRow.course_run_present
$syncTablePresent = [bool]$schemaRow.roster_sync_table_present
$seatTablePresent = [bool]$schemaRow.roster_seat_table_present

$runRow = $null
if ($courseRunPresent) {
  $runSlugLiteral = ConvertTo-SqlLiteral -Value $RunSlug
  $syncCountSelect = if ($syncTablePresent) {
    "(select count(*)::integer from delivery.course_run_roster_sync as sync where sync.course_run_id = cr.id) as sync_count,"
  } else {
    "null::integer as sync_count,"
  }
  $seatCountSelect = if ($seatTablePresent) {
    "(select count(*)::integer from delivery.course_run_roster_seat as seat where seat.course_run_id = cr.id) as seat_count,"
  } else {
    "null::integer as seat_count,"
  }
  $latestSyncSelect = if ($syncTablePresent) {
    "(select status from delivery.course_run_roster_sync as sync where sync.course_run_id = cr.id order by sync.started_at desc limit 1) as latest_sync_status"
  } else {
    "null::text as latest_sync_status"
  }

  $runSql = @"
select
  cr.id,
  cr.slug,
  cr.oneroster_manifest,
  $syncCountSelect
  $seatCountSelect
  $latestSyncSelect
from delivery.course_run as cr
where cr.slug = $runSlugLiteral
limit 1;
"@

  $runResult = Invoke-SupabaseJson -SupabaseCli $supabaseCli -SupabaseRoot $supabaseRoot -CliArguments @(
    "db", "query", "--linked", "-o", "json", $runSql
  )
  $runRow = @($runResult.rows)[0]
}

$functions = Invoke-SupabaseJson -SupabaseCli $supabaseCli -SupabaseRoot $supabaseRoot -CliArguments @(
  "functions", "list", "--project-ref", $projectRef, "-o", "json"
)
$secrets = Invoke-SupabaseJson -SupabaseCli $supabaseCli -SupabaseRoot $supabaseRoot -CliArguments @(
  "secrets", "list", "--project-ref", $projectRef, "-o", "json"
)

$onerosterFunction = @($functions | Where-Object {
  $_.slug -eq "oneroster-sync" -or $_.name -eq "oneroster-sync"
} | Select-Object -First 1)[0]
$functionActive = $null -ne $onerosterFunction -and [string]$onerosterFunction.status -eq "ACTIVE"

$secretNames = @($secrets | ForEach-Object { [string]$_.name })
$manifest = if ($runRow) { $runRow.oneroster_manifest } else { $null }
$auth = if ($manifest) { $manifest.auth } else { $null }
$sourcedIds = if ($manifest) { $manifest.sourced_ids } else { $null }

$manifestEnabled = $manifest -and [bool]$manifest.enabled
$baseUrl = if ($manifest) { Get-Text -Value $manifest.base_url } else { "" }
$schoolSourcedId = if ($sourcedIds) { Get-Text -Value $sourcedIds.school } else { "" }
$classSourcedId = if ($sourcedIds) { Get-Text -Value $sourcedIds.class } else { "" }
$manifestSecretName = if ($auth) { Get-Text -Value $auth.token_secret_name } else { "" }
$secretNameToCheck = if (-not [string]::IsNullOrWhiteSpace($manifestSecretName)) {
  $manifestSecretName
} else {
  $ExpectedSecretName
}
$secretPresent = -not [string]::IsNullOrWhiteSpace($secretNameToCheck) -and ($secretNames -contains $secretNameToCheck)
$syncCount = if ($runRow -and $null -ne $runRow.sync_count) { [int]$runRow.sync_count } else { 0 }
$seatCount = if ($runRow -and $null -ne $runRow.seat_count) { [int]$runRow.seat_count } else { 0 }
$latestSyncStatus = if ($runRow) { Get-Text -Value $runRow.latest_sync_status } else { "" }

$manifestComplete = $manifestEnabled `
  -and -not [string]::IsNullOrWhiteSpace($baseUrl) `
  -and -not [string]::IsNullOrWhiteSpace($schoolSourcedId) `
  -and -not [string]::IsNullOrWhiteSpace($classSourcedId) `
  -and -not [string]::IsNullOrWhiteSpace($manifestSecretName)

Write-Output "Campus OneRoster G-07 readiness"
Write-Output "Project ref: $projectRef"
Write-Output "Linked DB run slug: $RunSlug"
Write-Output ""

Write-Check -Label "delivery.course_run table" -Passed $courseRunPresent -Detail "required for oneroster_manifest"
Write-Check -Label "delivery.course_run_roster_sync table" -Passed $syncTablePresent -Detail "required for sync audit"
Write-Check -Label "delivery.course_run_roster_seat table" -Passed $seatTablePresent -Detail "required for staged seats"
Write-Check -Label "oneroster-sync function" -Passed $functionActive -Detail ($(if ($onerosterFunction) { "status=$($onerosterFunction.status), version=$($onerosterFunction.version)" } else { "not deployed" }))
Write-Check -Label "course_run slug" -Passed ($null -ne $runRow) -Detail ($(if ($runRow) { $RunSlug } else { "not found" }))

if ($runRow) {
  Write-Check -Label "manifest enabled" -Passed $manifestEnabled -Detail ($(if ($manifestEnabled) { "enabled=true" } else { "enabled=false" }))
  Write-Check -Label "base_url" -Passed (-not [string]::IsNullOrWhiteSpace($baseUrl)) -Detail ($(if ($baseUrl) { $baseUrl } else { "missing" }))
  Write-Check -Label "sourced_ids.school" -Passed (-not [string]::IsNullOrWhiteSpace($schoolSourcedId)) -Detail ($(if ($schoolSourcedId) { $schoolSourcedId } else { "missing" }))
  Write-Check -Label "sourced_ids.class" -Passed (-not [string]::IsNullOrWhiteSpace($classSourcedId)) -Detail ($(if ($classSourcedId) { $classSourcedId } else { "missing" }))
  Write-Check -Label "auth.token_secret_name" -Passed (-not [string]::IsNullOrWhiteSpace($manifestSecretName)) -Detail ($(if ($manifestSecretName) { $manifestSecretName } else { "missing; expected $ExpectedSecretName" }))
  Write-Check -Label "remote secret present" -Passed $secretPresent -Detail ($(if ($secretNameToCheck) { $secretNameToCheck } else { "no secret name to check" }))
  Write-Output "Sync history: $syncCount run(s), $seatCount staged seat(s), latest status=$(if ($latestSyncStatus) { $latestSyncStatus } else { "none" })"
}

if ($PrintActivationSql) {
  $activationSecretName = if (-not [string]::IsNullOrWhiteSpace($secretNameToCheck)) {
    $secretNameToCheck
  } else {
    "ONEROSTER_POWER_SKILLS_TOKEN"
  }

  Write-Output ""
  Write-Output "OneRoster activation template (do not commit real tokens):"
  Write-Output "  .\scripts\supabase-platform.ps1 secrets set $activationSecretName=`"REDACTED_REAL_BEARER_TOKEN`" --project-ref $projectRef"
  Write-Output ""
  Write-Output "  update delivery.course_run"
  Write-Output "  set oneroster_manifest = private.normalize_course_run_oneroster_manifest(jsonb_build_object("
  Write-Output "    'enabled', true,"
  Write-Output "    'provider', 'oneroster',"
  Write-Output "    'version', '1.2',"
  Write-Output "    'base_url', 'https://CLIENT-SIS/ims/oneroster/rostering/v1p2',"
  Write-Output "    'auth', jsonb_build_object('method', 'bearer', 'token_secret_name', '$activationSecretName'),"
  Write-Output "    'sourced_ids', jsonb_build_object('school', 'SCHOOL-SOURCED-ID', 'class', 'CLASS-SOURCED-ID'),"
  Write-Output "    'sync_direction', 'pull',"
  Write-Output "    'provision_mode', 'match_only',"
  Write-Output "    'invite_redirect_path', '/portal',"
  Write-Output "    'sync_teacher_roles', false,"
  Write-Output "    'request_options', jsonb_build_object('limit', 100, 'timeout_ms', 15000)"
  Write-Output "  ))"
  Write-Output "  where slug = '$($RunSlug.Replace("'", "''"))';"
}

$failures = @()
if (-not $courseRunPresent) { $failures += "missing delivery.course_run" }
if (-not $syncTablePresent) { $failures += "missing delivery.course_run_roster_sync" }
if (-not $seatTablePresent) { $failures += "missing delivery.course_run_roster_seat" }
if (-not $functionActive) { $failures += "oneroster-sync is not ACTIVE" }
if ($null -eq $runRow) { $failures += "course_run not found: $RunSlug" }
if ($runRow -and -not $manifestEnabled) { $failures += "oneroster_manifest.enabled=false" }
if ($runRow -and [string]::IsNullOrWhiteSpace($baseUrl)) { $failures += "missing oneroster_manifest.base_url" }
if ($runRow -and [string]::IsNullOrWhiteSpace($schoolSourcedId)) { $failures += "missing sourced_ids.school" }
if ($runRow -and [string]::IsNullOrWhiteSpace($classSourcedId)) { $failures += "missing sourced_ids.class" }
if ($runRow -and [string]::IsNullOrWhiteSpace($manifestSecretName)) { $failures += "missing auth.token_secret_name" }
if ($runRow -and -not $secretPresent) { $failures += "remote secret not found: $secretNameToCheck" }

if ($RequireLiveConfig -and $failures.Count -gt 0) {
  throw "OneRoster live config incomplete: $($failures -join '; ')"
}

if ($RequireSyncHistory -and $syncCount -le 0) {
  throw "OneRoster sync history is empty for run $RunSlug."
}

Write-Output "OneRoster readiness check completed."
