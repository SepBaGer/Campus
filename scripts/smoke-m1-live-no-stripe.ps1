param(
  [string]$ProjectRef = "exyewjzckgsesrsuqueh",
  [string]$ProjectUrl = "https://exyewjzckgsesrsuqueh.supabase.co",
  [string]$PublishableKey = $env:PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  [string]$ServiceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY,
  [string]$Email,
  [string]$Password,
  [string]$CourseSlug = "programa-empoderamiento-power-skills",
  [string]$CourseRunSlug = "power-skills-pilot-open",
  [string]$BadgeClassSlug = "badge-power-skills-pilot",
  [switch]$KeepAuthUser
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

function Resolve-ProjectRoot {
  return Split-Path -Parent $PSScriptRoot
}

function Assert-Condition {
  param(
    [Parameter(Mandatory = $true)]
    [bool]$Condition,

    [Parameter(Mandatory = $true)]
    [string]$Message
  )

  if (-not $Condition) {
    throw $Message
  }
}

function ConvertTo-SqlLiteral {
  param([AllowNull()][string]$Value)

  if ($null -eq $Value) {
    return "null"
  }

  return "'" + $Value.Replace("'", "''") + "'"
}

function Invoke-JsonRequest {
  param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("GET", "POST", "DELETE")]
    [string]$Method,

    [Parameter(Mandatory = $true)]
    [string]$Uri,

    [Parameter(Mandatory = $true)]
    [hashtable]$Headers,

    [object]$Body
  )

  try {
    if ($PSBoundParameters.ContainsKey("Body")) {
      $payload = $Body
      if ($Body -isnot [string]) {
        $payload = $Body | ConvertTo-Json -Depth 40
      }

      return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $Headers -Body $payload
    }

    return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $Headers
  }
  catch {
    $response = $_.Exception.Response
    if ($response) {
      $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
      $bodyText = $reader.ReadToEnd()
      throw "Request failed [$Method $Uri]: $bodyText"
    }

    throw
  }
}

function Invoke-TextRequest {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Uri,

    [Parameter(Mandatory = $true)]
    [hashtable]$Headers
  )

  $arguments = @("--silent", "--show-error", "--location", "--fail-with-body")
  foreach ($entry in $Headers.GetEnumerator()) {
    $arguments += "--header"
    $arguments += "$($entry.Key): $($entry.Value)"
  }
  $arguments += $Uri

  $content = & curl.exe @arguments
  if ($LASTEXITCODE -ne 0) {
    throw "curl.exe fallo con codigo $LASTEXITCODE para $Uri"
  }

  return [pscustomobject]@{ Content = ($content -join [Environment]::NewLine) }
}

function New-SchemaHeaders {
  param(
    [Parameter(Mandatory = $true)]
    [hashtable]$Headers,

    [Parameter(Mandatory = $true)]
    [string]$Schema
  )

  $schemaHeaders = @{}
  foreach ($entry in $Headers.GetEnumerator()) {
    $schemaHeaders[$entry.Key] = $entry.Value
  }

  $schemaHeaders["Accept-Profile"] = $Schema
  return $schemaHeaders
}

function Get-ValueCount {
  param([AllowNull()]$Value)

  if ($null -eq $Value) {
    return 0
  }

  if ($Value -is [array]) {
    return $Value.Count
  }

  return 1
}

function Get-ProjectApiKeys {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectRoot,

    [Parameter(Mandatory = $true)]
    [string]$ProjectRef
  )

  $platformDir = Join-Path $ProjectRoot "campus-platform"
  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $output = & npm --prefix $platformDir --silent run supabase -- projects api-keys --project-ref $ProjectRef -o json 2>&1
    $exitCode = $LASTEXITCODE
  }
  finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }

  if ($exitCode -ne 0) {
    $errorText = ($output | ForEach-Object { $_.ToString() }) -join [Environment]::NewLine
    throw "No se pudieron leer API keys via Supabase CLI para $ProjectRef. $errorText"
  }

  $jsonText = ($output -join [Environment]::NewLine).Trim()
  $jsonStart = $jsonText.IndexOf("[")
  $jsonEnd = $jsonText.LastIndexOf("]")
  if ($jsonStart -lt 0 -or $jsonEnd -lt $jsonStart) {
    throw "La salida de Supabase CLI no incluyo JSON de API keys."
  }

  $jsonText = $jsonText.Substring($jsonStart, $jsonEnd - $jsonStart + 1)
  $keys = $jsonText | ConvertFrom-Json
  $anon = @($keys | Where-Object { $_.name -eq "anon" } | Select-Object -First 1)
  $service = @($keys | Where-Object { $_.name -eq "service_role" } | Select-Object -First 1)

  Assert-Condition ($anon.Count -eq 1 -and -not [string]::IsNullOrWhiteSpace($anon[0].api_key)) "No se encontro anon key para $ProjectRef."
  Assert-Condition ($service.Count -eq 1 -and -not [string]::IsNullOrWhiteSpace($service[0].api_key)) "No se encontro service_role key para $ProjectRef."

  return [pscustomobject]@{
    PublishableKey = $anon[0].api_key
    ServiceRoleKey = $service[0].api_key
  }
}

function Invoke-LinkedSql {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectRoot,

    [Parameter(Mandatory = $true)]
    [string]$Sql
  )

  $platformDir = Join-Path $ProjectRoot "campus-platform"
  $tempFile = Join-Path ([System.IO.Path]::GetTempPath()) ("campus-m1-no-stripe-smoke-" + [Guid]::NewGuid().ToString("N") + ".sql")

  try {
    [System.IO.File]::WriteAllText($tempFile, $Sql, (New-Object System.Text.UTF8Encoding($false)))
    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
      $output = & npm --prefix $platformDir --silent run supabase -- db query --linked --file $tempFile -o json 2>&1
      $exitCode = $LASTEXITCODE
    }
    finally {
      $ErrorActionPreference = $previousErrorActionPreference
    }

    if ($exitCode -ne 0) {
      $errorText = ($output | ForEach-Object { $_.ToString() }) -join [Environment]::NewLine
      throw "supabase db query --linked fallo durante el seed M1 no-Stripe: $errorText"
    }

    return ($output -join [Environment]::NewLine)
  }
  finally {
    if (Test-Path -LiteralPath $tempFile) {
      Remove-Item -LiteralPath $tempFile -Force
    }
  }
}

function New-M1SeedSql {
  param(
    [Parameter(Mandatory = $true)]
    [string]$PersonId,

    [Parameter(Mandatory = $true)]
    [string]$Email,

    [Parameter(Mandatory = $true)]
    [string]$CourseSlug,

    [Parameter(Mandatory = $true)]
    [string]$CourseRunSlug,

    [Parameter(Mandatory = $true)]
    [string]$SmokeId
  )

  $personIdSql = ConvertTo-SqlLiteral $PersonId
  $emailSql = ConvertTo-SqlLiteral $Email
  $courseSlugSql = ConvertTo-SqlLiteral $CourseSlug
  $runSlugSql = ConvertTo-SqlLiteral $CourseRunSlug
  $smokeIdSql = ConvertTo-SqlLiteral $SmokeId

  return @"
do `$`$
begin
  if not exists (
    select 1
    from delivery.course_run as run
    join catalog.course as course
      on course.id = run.course_id
    where run.slug = $runSlugSql
      and course.slug = $courseSlugSql
  ) then
    raise exception 'No existe course_run % para course %', $runSlugSql, $courseSlugSql;
  end if;
end;
`$`$;

with run_row as (
  select run.id, run.course_id, run.title
  from delivery.course_run as run
  join catalog.course as course
    on course.id = run.course_id
  where run.slug = $runSlugSql
    and course.slug = $courseSlugSql
  limit 1
),
person_row as (
  insert into identity.person (
    id,
    email,
    full_name,
    source,
    status
  )
  values (
    $personIdSql::uuid,
    $emailSql,
    'Codex M1 Smoke',
    'codex-m1-no-stripe-smoke',
    'active'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        source = excluded.source,
        status = 'active',
        updated_at = now()
  returning id
),
role_row as (
  insert into identity.person_role (person_id, role_code, source)
  select id, 'student', 'codex-m1-no-stripe-smoke'
  from person_row
  on conflict (person_id, role_code) do nothing
  returning person_id
),
enrollment_row as (
  insert into enrollment.enrollment (
    person_id,
    course_run_id,
    status,
    source
  )
  select
    person_row.id,
    run_row.id,
    'active',
    'codex-m1-no-stripe-smoke'
  from person_row
  cross join run_row
  on conflict (person_id, course_run_id) do update
    set status = excluded.status,
        source = excluded.source,
        updated_at = now()
  returning id
)
select jsonb_build_object(
  'person_id', (select id from person_row),
  'course_run_id', (select id from run_row),
  'enrollment_id', (select id from enrollment_row),
  'smoke_id', $smokeIdSql
) as m1_seed;
"@
}

$projectRoot = Resolve-ProjectRoot
$timestamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddHHmmss")
$smokeId = "codex-m1-smoke-$timestamp"

if ([string]::IsNullOrWhiteSpace($Email)) {
  $Email = "$smokeId@example.com"
}

if ([string]::IsNullOrWhiteSpace($Password)) {
  $Password = "CodexM1!" + ([Guid]::NewGuid().ToString("N").Substring(0, 18))
}

Assert-Condition ($Email -match "codex-m1-smoke|m1-smoke|disposable") "El email debe ser claramente desechable para este smoke: $Email."

if ([string]::IsNullOrWhiteSpace($PublishableKey) -or [string]::IsNullOrWhiteSpace($ServiceRoleKey)) {
  $keys = Get-ProjectApiKeys -ProjectRoot $projectRoot -ProjectRef $ProjectRef
  if ([string]::IsNullOrWhiteSpace($PublishableKey)) {
    $PublishableKey = $keys.PublishableKey
  }
  if ([string]::IsNullOrWhiteSpace($ServiceRoleKey)) {
    $ServiceRoleKey = $keys.ServiceRoleKey
  }
}

$publicHeaders = @{
  apikey = $PublishableKey
  "Content-Type" = "application/json"
}

$serviceHeaders = @{
  apikey = $ServiceRoleKey
  Authorization = "Bearer $ServiceRoleKey"
  "Content-Type" = "application/json"
}

$createdUserId = $null
$cleanupStatus = "not_started"

try {
  $createdUser = Invoke-JsonRequest `
    -Method POST `
    -Uri "$ProjectUrl/auth/v1/admin/users" `
    -Headers $serviceHeaders `
    -Body @{
      email = $Email
      password = $Password
      email_confirm = $true
      user_metadata = @{
        smoke_kind = "m1-live-no-stripe"
        smoke_id = $smokeId
      }
    }

  $createdUserId = $createdUser.id
  Assert-Condition (-not [string]::IsNullOrWhiteSpace($createdUserId)) "Auth Admin no devolvio id de usuario."

  $seedSql = New-M1SeedSql `
    -PersonId $createdUserId `
    -Email $Email `
    -CourseSlug $CourseSlug `
    -CourseRunSlug $CourseRunSlug `
    -SmokeId $smokeId

  [void](Invoke-LinkedSql -ProjectRoot $projectRoot -Sql $seedSql)

  $runOpen = Invoke-JsonRequest `
    -Method GET `
    -Uri "$ProjectUrl/functions/v1/run-open?course_slug=$CourseSlug" `
    -Headers $publicHeaders
  $runs = @($runOpen.runs)
  Assert-Condition ($runs.Count -gt 0) "run-open no devolvio cohortes abiertas para $CourseSlug."

  $icalResponse = Invoke-TextRequest `
    -Uri "$ProjectUrl/functions/v1/ical-feed?course_slug=$CourseSlug" `
    -Headers $publicHeaders
  Assert-Condition ($icalResponse.Content -match "BEGIN:VCALENDAR") "ical-feed no devolvio un calendario valido."

  $tokenResponse = Invoke-JsonRequest `
    -Method POST `
    -Uri "$ProjectUrl/auth/v1/token?grant_type=password" `
    -Headers $publicHeaders `
    -Body @{
      email = $Email
      password = $Password
    }

  Assert-Condition (-not [string]::IsNullOrWhiteSpace($tokenResponse.access_token)) "No se obtuvo access_token."

  $authHeaders = @{
    apikey = $PublishableKey
    Authorization = "Bearer $($tokenResponse.access_token)"
    "Content-Type" = "application/json"
  }

  $portalBefore = Invoke-JsonRequest `
    -Method GET `
    -Uri "$ProjectUrl/rest/v1/platform_portal_snapshot_v?select=*" `
    -Headers $authHeaders
  $portalBeforeRows = @($portalBefore)
  Assert-Condition ($portalBeforeRows.Count -eq 1) "El portal no devolvio snapshot inicial para el usuario smoke."
  Assert-Condition ([int]$portalBeforeRows[0].progress_percent -eq 0) "El progreso inicial del portal debe empezar en 0%."

  $blocks = Invoke-JsonRequest `
    -Method GET `
    -Uri "$ProjectUrl/rest/v1/platform_course_blocks_v?course_slug=eq.$CourseSlug&select=block_id,block_slug,block_title,block_order,block_kind,rubric_slug&order=block_order.asc" `
    -Headers $authHeaders
  $blocks = @($blocks)
  Assert-Condition ($blocks.Count -gt 0) "platform_course_blocks_v no devolvio bloques para $CourseSlug."

  $attemptResults = @()
  foreach ($block in $blocks) {
    $blockSlug = if ($block.block_slug) { [string]$block.block_slug } else { "block-$($block.block_id)" }
    $attemptResults += Invoke-JsonRequest `
      -Method POST `
      -Uri "$ProjectUrl/functions/v1/attempt-complete" `
      -Headers $authHeaders `
      -Body @{
        content_block_id = [int64]$block.block_id
        correct = $true
        badge_class_slug = $BadgeClassSlug
        submission_text = "Smoke M1 no-Stripe evidence $smokeId for $blockSlug"
        learner_note = "Created by scripts/smoke-m1-live-no-stripe.ps1"
        submission_payload = @{
          smoke_id = $smokeId
          source = "smoke-m1-live-no-stripe"
          block_slug = $blockSlug
          no_stripe = $true
        }
        payload = @{
          smoke_id = $smokeId
          no_stripe = $true
        }
      }

    $lastAttempt = $attemptResults | Select-Object -Last 1
    Assert-Condition ($lastAttempt.status -eq "completed") "attempt-complete no marco completed para $blockSlug."
    Assert-Condition (-not [string]::IsNullOrWhiteSpace($lastAttempt.xapi_statement_id)) "attempt-complete no devolvio xapi_statement_id para $blockSlug."
    Assert-Condition (-not [string]::IsNullOrWhiteSpace($lastAttempt.next_review_at)) "attempt-complete no devolvio next_review_at para $blockSlug."
  }

  $lastAttempt = $attemptResults | Select-Object -Last 1
  Assert-Condition ([int]$lastAttempt.completed_blocks -eq $blocks.Count) "No se completaron todos los bloques esperados."
  Assert-Condition ([int]$lastAttempt.total_blocks -eq $blocks.Count) "El total de bloques reportado no coincide."
  Assert-Condition ([int]$lastAttempt.progress_percent -eq 100) "El progreso final no llego a 100%."

  $credentialResponse = $lastAttempt.credential
  if (-not $credentialResponse) {
    $credentialResponse = Invoke-JsonRequest `
      -Method POST `
      -Uri "$ProjectUrl/functions/v1/credential-issue" `
      -Headers $authHeaders `
      -Body @{
        badge_class_slug = $BadgeClassSlug
      }
  }

  $token = $credentialResponse.token
  Assert-Condition (-not [string]::IsNullOrWhiteSpace($token)) "No se obtuvo token de credencial despues de completar M1."

  $verificationResponse = Invoke-JsonRequest `
    -Method GET `
    -Uri "$ProjectUrl/functions/v1/verify-credential?token=$([uri]::EscapeDataString($token))" `
    -Headers $publicHeaders
  Assert-Condition ($verificationResponse.credential.status -eq "issued") "verify-credential no devolvio status issued."

  $portalAfter = Invoke-JsonRequest `
    -Method GET `
    -Uri "$ProjectUrl/rest/v1/platform_portal_snapshot_v?select=*" `
    -Headers $authHeaders
  $portalAfterRows = @($portalAfter)
  Assert-Condition ($portalAfterRows.Count -eq 1) "El portal no devolvio snapshot final."
  Assert-Condition ([int]$portalAfterRows[0].progress_percent -eq 100) "El portal no refleja progreso 100%."
  Assert-Condition (-not [string]::IsNullOrWhiteSpace($portalAfterRows[0].next_review_at)) "El portal no refleja next_review_at."

  $enrollmentHeaders = New-SchemaHeaders -Headers $serviceHeaders -Schema "enrollment"
  $learningHeaders = New-SchemaHeaders -Headers $serviceHeaders -Schema "learning"
  $credentialsHeaders = New-SchemaHeaders -Headers $serviceHeaders -Schema "credentials"

  $enrollmentRows = Invoke-JsonRequest `
    -Method GET `
    -Uri "$ProjectUrl/rest/v1/enrollment?person_id=eq.$createdUserId&select=id,status,source" `
    -Headers $enrollmentHeaders
  $checkoutRows = Invoke-JsonRequest `
    -Method GET `
    -Uri "$ProjectUrl/rest/v1/checkout_intent?person_id=eq.$createdUserId&select=id,status,plan_code" `
    -Headers $enrollmentHeaders
  $attemptRows = Invoke-JsonRequest `
    -Method GET `
    -Uri "$ProjectUrl/rest/v1/attempt?person_id=eq.$createdUserId&select=id,content_block_id,status" `
    -Headers $learningHeaders
  $xapiRows = Invoke-JsonRequest `
    -Method GET `
    -Uri "$ProjectUrl/rest/v1/xapi_statement?person_id=eq.$createdUserId&select=id,verb" `
    -Headers $learningHeaders
  $masteryRows = Invoke-JsonRequest `
    -Method GET `
    -Uri "$ProjectUrl/rest/v1/mastery_state?person_id=eq.$createdUserId&select=competency_id,next_review_at" `
    -Headers $learningHeaders
  $scheduleRows = Invoke-JsonRequest `
    -Method GET `
    -Uri "$ProjectUrl/rest/v1/spaced_schedule?person_id=eq.$createdUserId&select=competency_id,next_review_at" `
    -Headers $learningHeaders
  $projectRows = Invoke-JsonRequest `
    -Method GET `
    -Uri "$ProjectUrl/rest/v1/project_submission?person_id=eq.$createdUserId&select=id,status" `
    -Headers $learningHeaders
  $badgeRows = Invoke-JsonRequest `
    -Method GET `
    -Uri "$ProjectUrl/rest/v1/badge_assertion?person_id=eq.$createdUserId&select=id,status,verification_token" `
    -Headers $credentialsHeaders

  Assert-Condition ((Get-ValueCount $enrollmentRows) -ge 1) "No se encontro matricula live para el usuario smoke."
  Assert-Condition ((Get-ValueCount $attemptRows) -eq $blocks.Count) "El numero de attempts no coincide con los bloques."
  Assert-Condition ((Get-ValueCount $xapiRows) -ge $blocks.Count) "No se registraron suficientes xAPI statements."
  Assert-Condition ((Get-ValueCount $masteryRows) -gt 0) "No se registraron mastery_state rows."
  Assert-Condition ((Get-ValueCount $scheduleRows) -gt 0) "No se registraron spaced_schedule rows."
  Assert-Condition ((Get-ValueCount $badgeRows) -ge 1) "No se encontro badge_assertion emitida."
  Assert-Condition ((Get-ValueCount $checkoutRows) -eq 0) "El smoke no-Stripe no debe crear checkout_intent."

  [pscustomobject]@{
    project_ref = $ProjectRef
    project_url = $ProjectUrl
    smoke_id = $smokeId
    person_id = $createdUserId
    email = $Email
    course_slug = $CourseSlug
    course_run_slug = $CourseRunSlug
    public_access = @{
      open_runs = $runs.Count
      ical_ok = $true
    }
    portal = @{
      before_progress_percent = [int]$portalBeforeRows[0].progress_percent
      after_progress_percent = [int]$portalAfterRows[0].progress_percent
      next_review_at = $portalAfterRows[0].next_review_at
    }
    learning = @{
      blocks = $blocks.Count
      attempted_blocks = $attemptResults.Count
      attempts = Get-ValueCount $attemptRows
      xapi_statements = Get-ValueCount $xapiRows
      mastery_states = Get-ValueCount $masteryRows
      spaced_schedule = Get-ValueCount $scheduleRows
      project_submissions = Get-ValueCount $projectRows
    }
    credential = @{
      token = $token
      verify_status = $verificationResponse.credential.status
      reused = $credentialResponse.reused
    }
    no_stripe = @{
      checkout_intents = Get-ValueCount $checkoutRows
    }
    auth_user_cleanup = if ($KeepAuthUser.IsPresent) { "skipped" } else { "will_delete_after_verification" }
  } | ConvertTo-Json -Depth 20
}
finally {
  if (-not [string]::IsNullOrWhiteSpace($createdUserId) -and -not $KeepAuthUser.IsPresent) {
    try {
      [void](Invoke-JsonRequest `
        -Method DELETE `
        -Uri "$ProjectUrl/auth/v1/admin/users/$createdUserId" `
        -Headers $serviceHeaders)
      $cleanupStatus = "deleted"
    }
    catch {
      $cleanupStatus = "failed: $($_.Exception.Message)"
    }

    Write-Output "auth_user_cleanup=$cleanupStatus"
  }
}
