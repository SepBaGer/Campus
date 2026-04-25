param(
  [string]$ProjectRef = "",
  [string]$RunSlug = "power-skills-pilot-open",
  [string[]]$RequiredTemplateSlugs = @(
    "bienvenida-cohorte-email",
    "recordatorio-inicio-secuencia-email",
    "alerta-sesion-web"
  ),
  [switch]$RequireLiveChannels,
  [switch]$RequireWebPushSubscriber,
  [switch]$RequireDispatchHistory,
  [switch]$PrintActivationHints
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

function Write-Check {
  param(
    [string]$Label,
    [bool]$Passed,
    [string]$Detail
  )

  $prefix = if ($Passed) { "OK  " } else { "MISS" }
  Write-Output "$prefix ${Label}: $Detail"
}

function Get-Int {
  param([object]$Value)
  $parsed = [int]0
  if ([int]::TryParse([string]$Value, [ref]$parsed)) {
    return $parsed
  }
  return 0
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
  to_regclass('identity.person_notification_preference') is not null as preference_table_present,
  to_regclass('identity.web_push_subscription') is not null as web_push_table_present,
  to_regclass('delivery.notification_template') is not null as template_table_present,
  to_regclass('delivery.notification_dispatch') is not null as dispatch_table_present;
"@

$schemaResult = Invoke-SupabaseJson -SupabaseCli $supabaseCli -SupabaseRoot $supabaseRoot -CliArguments @(
  "db", "query", "--linked", "-o", "json", $schemaSql
)
$schemaRow = @($schemaResult.rows)[0]

$preferenceTablePresent = [bool]$schemaRow.preference_table_present
$webPushTablePresent = [bool]$schemaRow.web_push_table_present
$templateTablePresent = [bool]$schemaRow.template_table_present
$dispatchTablePresent = [bool]$schemaRow.dispatch_table_present

$runRow = $null
if ($preferenceTablePresent -and $webPushTablePresent -and $templateTablePresent -and $dispatchTablePresent) {
  $runSlugLiteral = ConvertTo-SqlLiteral -Value $RunSlug
  $runSql = @"
with run_row as (
  select id, slug
  from delivery.course_run
  where slug = $runSlugLiteral
  limit 1
)
select
  run_row.slug,
  (
    select count(*)::integer
    from enrollment.enrollment as enrollment_row
    where enrollment_row.course_run_id = run_row.id
      and enrollment_row.status = 'active'
  ) as active_enrollment_count,
  (
    select count(*)::integer
    from delivery.notification_template as template
    where template.course_run_id = run_row.id
  ) as template_count,
  (
    select count(*)::integer
    from delivery.notification_template as template
    where template.course_run_id = run_row.id
      and template.status = 'active'
  ) as active_template_count,
  (
    select count(*)::integer
    from delivery.notification_template as template
    where template.course_run_id = run_row.id
      and template.status = 'active'
      and template.channel_code = 'email'
  ) as active_email_templates,
  (
    select count(*)::integer
    from delivery.notification_template as template
    where template.course_run_id = run_row.id
      and template.status = 'active'
      and template.channel_code = 'web'
  ) as active_web_templates,
  (
    select coalesce(string_agg(template.slug, ',' order by template.slug), '')
    from delivery.notification_template as template
    where template.course_run_id = run_row.id
      and template.status = 'active'
  ) as active_template_slugs,
  (
    select count(*)::integer
    from enrollment.enrollment as enrollment_row
    join identity.person_notification_preference as preference
      on preference.person_id = enrollment_row.person_id
     and preference.channel_code = 'email'
     and preference.is_enabled = true
    where enrollment_row.course_run_id = run_row.id
      and enrollment_row.status = 'active'
  ) as email_enabled_targets,
  (
    select count(*)::integer
    from enrollment.enrollment as enrollment_row
    join identity.person_notification_preference as preference
      on preference.person_id = enrollment_row.person_id
     and preference.channel_code = 'web'
     and preference.is_enabled = true
    where enrollment_row.course_run_id = run_row.id
      and enrollment_row.status = 'active'
  ) as web_enabled_targets,
  (
    select count(distinct subscription.person_id)::integer
    from enrollment.enrollment as enrollment_row
    join identity.web_push_subscription as subscription
      on subscription.person_id = enrollment_row.person_id
     and subscription.is_active = true
    where enrollment_row.course_run_id = run_row.id
      and enrollment_row.status = 'active'
  ) as active_web_push_subscribers,
  (
    select count(*)::integer
    from delivery.notification_dispatch as dispatch
    where dispatch.course_run_id = run_row.id
  ) as dispatch_count,
  (
    select count(*)::integer
    from delivery.notification_dispatch as dispatch
    where dispatch.course_run_id = run_row.id
      and dispatch.status = 'sent'
  ) as sent_dispatch_count,
  (
    select count(*)::integer
    from delivery.notification_dispatch as dispatch
    where dispatch.course_run_id = run_row.id
      and dispatch.status = 'failed'
  ) as failed_dispatch_count
from run_row;
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

function Get-FunctionBySlug {
  param([string]$Slug)
  return @($functions | Where-Object {
    $_.slug -eq $Slug -or $_.name -eq $Slug
  } | Select-Object -First 1)[0]
}

function Test-SecretPresent {
  param([string]$Name)
  return @($secrets | Where-Object { [string]$_.name -eq $Name }).Count -gt 0
}

$notificationPreferencesFunction = Get-FunctionBySlug -Slug "notification-preferences"
$cohortNotifyFunction = Get-FunctionBySlug -Slug "cohort-notify"
$adminCatalogFunction = Get-FunctionBySlug -Slug "admin-catalog"
$notificationPreferencesActive = $null -ne $notificationPreferencesFunction -and [string]$notificationPreferencesFunction.status -eq "ACTIVE"
$cohortNotifyActive = $null -ne $cohortNotifyFunction -and [string]$cohortNotifyFunction.status -eq "ACTIVE"
$adminCatalogActive = $null -ne $adminCatalogFunction -and [string]$adminCatalogFunction.status -eq "ACTIVE"

$siteUrlPresent = Test-SecretPresent -Name "SITE_URL"
$resendPresent = Test-SecretPresent -Name "RESEND_API_KEY"
$vapidPublicPresent = Test-SecretPresent -Name "VAPID_PUBLIC_KEY"
$vapidPrivatePresent = Test-SecretPresent -Name "VAPID_PRIVATE_KEY"
$vapidSubjectPresent = Test-SecretPresent -Name "VAPID_SUBJECT"

$activeTemplateSlugs = if ($runRow) {
  @(([string]$runRow.active_template_slugs).Split(",", [System.StringSplitOptions]::RemoveEmptyEntries))
} else {
  @()
}
$missingTemplateSlugs = @($RequiredTemplateSlugs | Where-Object { $activeTemplateSlugs -notcontains $_ })

$activeEnrollmentCount = if ($runRow) { Get-Int -Value $runRow.active_enrollment_count } else { 0 }
$templateCount = if ($runRow) { Get-Int -Value $runRow.template_count } else { 0 }
$activeTemplateCount = if ($runRow) { Get-Int -Value $runRow.active_template_count } else { 0 }
$activeEmailTemplates = if ($runRow) { Get-Int -Value $runRow.active_email_templates } else { 0 }
$activeWebTemplates = if ($runRow) { Get-Int -Value $runRow.active_web_templates } else { 0 }
$emailEnabledTargets = if ($runRow) { Get-Int -Value $runRow.email_enabled_targets } else { 0 }
$webEnabledTargets = if ($runRow) { Get-Int -Value $runRow.web_enabled_targets } else { 0 }
$activeWebPushSubscribers = if ($runRow) { Get-Int -Value $runRow.active_web_push_subscribers } else { 0 }
$dispatchCount = if ($runRow) { Get-Int -Value $runRow.dispatch_count } else { 0 }
$sentDispatchCount = if ($runRow) { Get-Int -Value $runRow.sent_dispatch_count } else { 0 }
$failedDispatchCount = if ($runRow) { Get-Int -Value $runRow.failed_dispatch_count } else { 0 }

Write-Output "Campus notifications G-13 readiness"
Write-Output "Project ref: $projectRef"
Write-Output "Linked DB run slug: $RunSlug"
Write-Output ""

Write-Check -Label "identity.person_notification_preference table" -Passed $preferenceTablePresent -Detail "required for email/web opt-in"
Write-Check -Label "identity.web_push_subscription table" -Passed $webPushTablePresent -Detail "required for browser push subscriptions"
Write-Check -Label "delivery.notification_template table" -Passed $templateTablePresent -Detail "required for cohort templates"
Write-Check -Label "delivery.notification_dispatch table" -Passed $dispatchTablePresent -Detail "required for dispatch audit"
Write-Check -Label "notification-preferences function" -Passed $notificationPreferencesActive -Detail ($(if ($notificationPreferencesFunction) { "status=$($notificationPreferencesFunction.status), version=$($notificationPreferencesFunction.version)" } else { "not deployed" }))
Write-Check -Label "cohort-notify function" -Passed $cohortNotifyActive -Detail ($(if ($cohortNotifyFunction) { "status=$($cohortNotifyFunction.status), version=$($cohortNotifyFunction.version)" } else { "not deployed" }))
Write-Check -Label "admin-catalog function" -Passed $adminCatalogActive -Detail ($(if ($adminCatalogFunction) { "status=$($adminCatalogFunction.status), version=$($adminCatalogFunction.version)" } else { "not deployed" }))
Write-Check -Label "course_run slug" -Passed ($null -ne $runRow) -Detail ($(if ($runRow) { $RunSlug } else { "not found" }))

if ($runRow) {
  Write-Check -Label "active templates" -Passed ($activeTemplateCount -gt 0) -Detail "$activeTemplateCount active of $templateCount total"
  Write-Check -Label "active email templates" -Passed ($activeEmailTemplates -gt 0) -Detail "$activeEmailTemplates"
  Write-Check -Label "active web templates" -Passed ($activeWebTemplates -gt 0) -Detail "$activeWebTemplates"
  Write-Check -Label "required template slugs" -Passed ($missingTemplateSlugs.Count -eq 0) -Detail ($(if ($missingTemplateSlugs.Count -eq 0) { ($RequiredTemplateSlugs -join ", ") } else { "missing: $($missingTemplateSlugs -join ', ')" }))
  Write-Output "Targets: active_enrollments=$activeEnrollmentCount, email_enabled=$emailEnabledTargets, web_enabled=$webEnabledTargets, active_web_push_subscribers=$activeWebPushSubscribers"
  Write-Output "Dispatch history: total=$dispatchCount, sent=$sentDispatchCount, failed=$failedDispatchCount"
}

Write-Check -Label "SITE_URL secret" -Passed $siteUrlPresent -Detail "used for portal links"
Write-Check -Label "RESEND_API_KEY secret" -Passed $resendPresent -Detail "required for email channel"
Write-Check -Label "VAPID_PUBLIC_KEY secret" -Passed $vapidPublicPresent -Detail "required for web push channel"
Write-Check -Label "VAPID_PRIVATE_KEY secret" -Passed $vapidPrivatePresent -Detail "required for web push channel"
Write-Check -Label "VAPID_SUBJECT secret" -Passed $vapidSubjectPresent -Detail "optional override; function defaults to mailto:campus@metodologia.info"

if ($PrintActivationHints) {
  Write-Output ""
  Write-Output "Notifications activation hints (do not commit real secrets):"
  Write-Output "  .\scripts\supabase-platform.ps1 secrets set RESEND_API_KEY=`"REDACTED_RESEND_API_KEY`" --project-ref $projectRef"
  Write-Output "  .\scripts\supabase-platform.ps1 secrets set VAPID_PUBLIC_KEY=`"REDACTED_VAPID_PUBLIC_KEY`" VAPID_PRIVATE_KEY=`"REDACTED_VAPID_PRIVATE_KEY`" VAPID_SUBJECT=`"mailto:campus@metodologia.info`" --project-ref $projectRef"
  Write-Output ""
  Write-Output "After secrets exist, rerun:"
  Write-Output "  .\scripts\check-notifications-readiness.ps1 -ProjectRef $projectRef -RunSlug $RunSlug -RequireLiveChannels"
  Write-Output ""
  Write-Output "After a real admin-triggered send, add -RequireDispatchHistory."
}

$failures = @()
if (-not $preferenceTablePresent) { $failures += "missing identity.person_notification_preference" }
if (-not $webPushTablePresent) { $failures += "missing identity.web_push_subscription" }
if (-not $templateTablePresent) { $failures += "missing delivery.notification_template" }
if (-not $dispatchTablePresent) { $failures += "missing delivery.notification_dispatch" }
if (-not $notificationPreferencesActive) { $failures += "notification-preferences is not ACTIVE" }
if (-not $cohortNotifyActive) { $failures += "cohort-notify is not ACTIVE" }
if (-not $adminCatalogActive) { $failures += "admin-catalog is not ACTIVE" }
if ($null -eq $runRow) { $failures += "course_run not found: $RunSlug" }
if ($runRow -and $activeTemplateCount -le 0) { $failures += "no active notification templates" }
if ($runRow -and $activeEmailTemplates -le 0) { $failures += "no active email notification templates" }
if ($runRow -and $activeWebTemplates -le 0) { $failures += "no active web notification templates" }
if ($missingTemplateSlugs.Count -gt 0) { $failures += "missing active template slugs: $($missingTemplateSlugs -join ', ')" }
if (-not $siteUrlPresent) { $failures += "SITE_URL secret not found" }
if (-not $resendPresent) { $failures += "RESEND_API_KEY secret not found" }
if (-not $vapidPublicPresent) { $failures += "VAPID_PUBLIC_KEY secret not found" }
if (-not $vapidPrivatePresent) { $failures += "VAPID_PRIVATE_KEY secret not found" }

if ($RequireLiveChannels -and $failures.Count -gt 0) {
  throw "Notifications live channels incomplete: $($failures -join '; ')"
}

if ($RequireWebPushSubscriber -and $activeWebPushSubscribers -le 0) {
  throw "Notifications web push has no active subscriber for run $RunSlug."
}

if ($RequireDispatchHistory -and $dispatchCount -le 0) {
  throw "Notifications dispatch history is empty for run $RunSlug."
}

Write-Output "Notifications readiness check completed."
