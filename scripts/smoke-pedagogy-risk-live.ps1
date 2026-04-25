param(
  [string]$ProjectRef = "exyewjzckgsesrsuqueh",
  [string]$ProjectUrl = "https://exyewjzckgsesrsuqueh.supabase.co",
  [string]$PublishableKey = $env:PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  [string]$ServiceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY,
  [string]$Email,
  [string]$Password,
  [string]$CourseSlug = "programa-empoderamiento-power-skills",
  [string]$CourseRunSlug = "power-skills-pilot-open",
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

function Invoke-RestStatus {
  param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("GET")]
    [string]$Method,

    [Parameter(Mandatory = $true)]
    [string]$Uri,

    [Parameter(Mandatory = $true)]
    [hashtable]$Headers
  )

  $tempFile = Join-Path ([System.IO.Path]::GetTempPath()) ("campus-risk-status-" + [Guid]::NewGuid().ToString("N") + ".json")

  try {
    $arguments = @(
      "--silent",
      "--show-error",
      "--location",
      "--request",
      $Method,
      "--output",
      $tempFile,
      "--write-out",
      "%{http_code}"
    )

    foreach ($entry in $Headers.GetEnumerator()) {
      $arguments += "--header"
      $arguments += "$($entry.Key): $($entry.Value)"
    }

    $arguments += $Uri
    $statusCodeText = (& curl.exe @arguments) -join ""
    if ($LASTEXITCODE -ne 0) {
      throw "curl.exe fallo con codigo $LASTEXITCODE para $Uri"
    }

    $content = ""
    if (Test-Path -LiteralPath $tempFile) {
      $content = Get-Content -Raw -LiteralPath $tempFile
    }

    return [pscustomobject]@{
      StatusCode = [int]$statusCodeText
      Content = $content
    }
  }
  finally {
    if (Test-Path -LiteralPath $tempFile) {
      Remove-Item -LiteralPath $tempFile -Force
    }
  }
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

function Get-ResultRows {
  param([AllowNull()]$Value)

  if ($null -eq $Value) {
    return @()
  }

  if ($Value -is [array]) {
    return $Value
  }

  return @($Value)
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
  $tempFile = Join-Path ([System.IO.Path]::GetTempPath()) ("campus-pedagogy-risk-smoke-" + [Guid]::NewGuid().ToString("N") + ".sql")

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
      throw "supabase db query --linked fallo durante el smoke de riesgo pedagogico: $errorText"
    }

    return ($output -join [Environment]::NewLine)
  }
  finally {
    if (Test-Path -LiteralPath $tempFile) {
      Remove-Item -LiteralPath $tempFile -Force
    }
  }
}

function New-RiskSeedSql {
  param(
    [Parameter(Mandatory = $true)]
    [string]$PersonId,

    [Parameter(Mandatory = $true)]
    [string]$Email,

    [Parameter(Mandatory = $true)]
    [string]$CourseSlug,

    [Parameter(Mandatory = $true)]
    [string]$CourseRunSlug
  )

  $personIdSql = ConvertTo-SqlLiteral $PersonId
  $emailSql = ConvertTo-SqlLiteral $Email
  $courseSlugSql = ConvertTo-SqlLiteral $CourseSlug
  $runSlugSql = ConvertTo-SqlLiteral $CourseRunSlug

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
  select run.id, run.course_id
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
    'Codex Pedagogy Risk Smoke',
    'codex-pedagogy-risk-smoke',
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
  select id, 'student', 'codex-pedagogy-risk-smoke'
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
    'codex-pedagogy-risk-smoke'
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
  'enrollment_id', (select id from enrollment_row)
) as risk_seed;
"@
}

function New-ForceOverdueSql {
  param(
    [Parameter(Mandatory = $true)]
    [string]$PersonId,

    [Parameter(Mandatory = $true)]
    [int]$CompetencyId
  )

  $personIdSql = ConvertTo-SqlLiteral $PersonId

  return @"
update learning.spaced_schedule
set next_review_at = now() - interval '1 day',
    updated_at = now()
where person_id = $personIdSql::uuid
  and competency_id = $CompetencyId
returning person_id, competency_id, next_review_at;
"@
}

function Get-RiskRow {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectUrl,

    [Parameter(Mandatory = $true)]
    [hashtable]$Headers,

    [Parameter(Mandatory = $true)]
    [string]$ExpectedPersonId
  )

  $riskRows = Invoke-JsonRequest `
    -Method GET `
    -Uri "$ProjectUrl/rest/v1/v_student_risk?select=person_id,overdue_reviews,next_review_at,risk_label" `
    -Headers $Headers
  $rows = @(Get-ResultRows $riskRows)

  Assert-Condition ($rows.Count -eq 1) "v_student_risk debe devolver exactamente una fila bajo RLS para el usuario smoke."
  Assert-Condition ([string]$rows[0].person_id -eq $ExpectedPersonId) "v_student_risk devolvio una persona distinta al usuario autenticado."

  return $rows[0]
}

function Get-PortalSnapshot {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectUrl,

    [Parameter(Mandatory = $true)]
    [hashtable]$Headers
  )

  $portalRows = Invoke-JsonRequest `
    -Method GET `
    -Uri "$ProjectUrl/rest/v1/platform_portal_snapshot_v?select=enrolled_course_title,progress_percent,due_reviews_count,next_review_at,at_risk_label" `
    -Headers $Headers
  $rows = @(Get-ResultRows $portalRows)

  Assert-Condition ($rows.Count -eq 1) "El portal debe devolver exactamente un snapshot para el usuario smoke."
  return $rows[0]
}

$projectRoot = Resolve-ProjectRoot
$timestamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddHHmmss")
$smokeId = "codex-risk-smoke-$timestamp"

if ([string]::IsNullOrWhiteSpace($Email)) {
  $Email = "$smokeId@example.com"
}

if ([string]::IsNullOrWhiteSpace($Password)) {
  $Password = "CodexRisk!" + ([Guid]::NewGuid().ToString("N").Substring(0, 18))
}

Assert-Condition ($Email -match "codex-risk-smoke|pedagogy-risk|disposable") "El email debe ser claramente desechable para este smoke: $Email."

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
        smoke_kind = "pedagogy-risk-live"
        smoke_id = $smokeId
      }
    }

  $createdUserId = $createdUser.id
  Assert-Condition (-not [string]::IsNullOrWhiteSpace($createdUserId)) "Auth Admin no devolvio id de usuario."

  $seedSql = New-RiskSeedSql `
    -PersonId $createdUserId `
    -Email $Email `
    -CourseSlug $CourseSlug `
    -CourseRunSlug $CourseRunSlug
  [void](Invoke-LinkedSql -ProjectRoot $projectRoot -Sql $seedSql)

  $anonLearningHeaders = New-SchemaHeaders -Headers $publicHeaders -Schema "learning"
  $anonRiskProbe = Invoke-RestStatus `
    -Method GET `
    -Uri "$ProjectUrl/rest/v1/v_student_risk?select=person_id,overdue_reviews,next_review_at,risk_label&limit=1" `
    -Headers $anonLearningHeaders
  Assert-Condition (($anonRiskProbe.StatusCode -eq 401) -or ($anonRiskProbe.StatusCode -eq 403)) "v_student_risk no debe estar disponible para anon."

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
  $learningAuthHeaders = New-SchemaHeaders -Headers $authHeaders -Schema "learning"

  $portalBefore = Get-PortalSnapshot -ProjectUrl $ProjectUrl -Headers $authHeaders
  Assert-Condition ([int]$portalBefore.progress_percent -eq 0) "El progreso inicial del portal debe empezar en 0%."
  Assert-Condition ([int]$portalBefore.due_reviews_count -eq 0) "El portal inicial no debe tener repasos vencidos."

  $blocks = Invoke-JsonRequest `
    -Method GET `
    -Uri "$ProjectUrl/rest/v1/platform_course_blocks_v?course_slug=eq.$CourseSlug&select=block_id,block_slug,block_title,block_order,block_kind&order=block_order.asc&limit=1" `
    -Headers $authHeaders
  $blockRows = @(Get-ResultRows $blocks)
  Assert-Condition ($blockRows.Count -eq 1) "platform_course_blocks_v no devolvio un primer bloque para $CourseSlug."
  $block = $blockRows[0]

  $attempt = Invoke-JsonRequest `
    -Method POST `
    -Uri "$ProjectUrl/functions/v1/attempt-complete" `
    -Headers $authHeaders `
    -Body @{
      content_block_id = [int64]$block.block_id
      correct = $true
      submission_text = "Smoke FSRS risk evidence $smokeId"
      learner_note = "Created by scripts/smoke-pedagogy-risk-live.ps1"
      submission_payload = @{
        smoke_id = $smokeId
        source = "smoke-pedagogy-risk-live"
        block_slug = $block.block_slug
        no_stripe = $true
      }
      payload = @{
        smoke_id = $smokeId
        no_stripe = $true
      }
    }

  Assert-Condition ($attempt.status -eq "completed") "attempt-complete no marco completed."
  Assert-Condition (-not [string]::IsNullOrWhiteSpace($attempt.next_review_at)) "attempt-complete no devolvio next_review_at."
  Assert-Condition ([int]$attempt.competency_id -gt 0) "attempt-complete no devolvio competency_id."

  $riskHealthyInitial = Get-RiskRow -ProjectUrl $ProjectUrl -Headers $learningAuthHeaders -ExpectedPersonId $createdUserId
  Assert-Condition ($riskHealthyInitial.risk_label -eq "healthy") "v_student_risk debe iniciar healthy despues del primer intento correcto."
  Assert-Condition ([int]$riskHealthyInitial.overdue_reviews -eq 0) "v_student_risk no debe iniciar con repasos vencidos."

  $forceOverdueSql = New-ForceOverdueSql -PersonId $createdUserId -CompetencyId ([int]$attempt.competency_id)
  [void](Invoke-LinkedSql -ProjectRoot $projectRoot -Sql $forceOverdueSql)

  $riskOverdue = Get-RiskRow -ProjectUrl $ProjectUrl -Headers $learningAuthHeaders -ExpectedPersonId $createdUserId
  Assert-Condition ($riskOverdue.risk_label -eq "at-risk") "v_student_risk no marco at-risk despues de forzar repaso vencido."
  Assert-Condition ([int]$riskOverdue.overdue_reviews -ge 1) "v_student_risk no conto el repaso vencido."

  $portalOverdue = Get-PortalSnapshot -ProjectUrl $ProjectUrl -Headers $authHeaders
  Assert-Condition ([int]$portalOverdue.due_reviews_count -ge 1) "El portal no reflejo repasos vencidos."
  Assert-Condition ($portalOverdue.at_risk_label -eq "Atencion requerida") "El portal no reflejo Atencion requerida."

  $recalculated = Invoke-JsonRequest `
    -Method POST `
    -Uri "$ProjectUrl/functions/v1/fsrs-schedule" `
    -Headers $authHeaders `
    -Body @{
      content_block_id = [int64]$block.block_id
      correct = $true
    }

  Assert-Condition (-not [string]::IsNullOrWhiteSpace($recalculated.next_review_at)) "fsrs-schedule no devolvio next_review_at."

  $riskHealthyFinal = Get-RiskRow -ProjectUrl $ProjectUrl -Headers $learningAuthHeaders -ExpectedPersonId $createdUserId
  Assert-Condition ($riskHealthyFinal.risk_label -eq "healthy") "v_student_risk no volvio a healthy despues de fsrs-schedule."
  Assert-Condition ([int]$riskHealthyFinal.overdue_reviews -eq 0) "v_student_risk conserva repasos vencidos despues de fsrs-schedule."

  $portalFinal = Get-PortalSnapshot -ProjectUrl $ProjectUrl -Headers $authHeaders
  Assert-Condition ([int]$portalFinal.due_reviews_count -eq 0) "El portal conserva repasos vencidos despues de fsrs-schedule."
  Assert-Condition ($portalFinal.at_risk_label -eq "Ritmo saludable") "El portal no volvio a Ritmo saludable."

  $enrollmentHeaders = New-SchemaHeaders -Headers $serviceHeaders -Schema "enrollment"
  $checkoutRows = Invoke-JsonRequest `
    -Method GET `
    -Uri "$ProjectUrl/rest/v1/checkout_intent?person_id=eq.$createdUserId&select=id,status,plan_code" `
    -Headers $enrollmentHeaders
  Assert-Condition ((Get-ValueCount $checkoutRows) -eq 0) "El smoke FSRS/riesgo no debe crear checkout_intent."

  [pscustomobject]@{
    project_ref = $ProjectRef
    project_url = $ProjectUrl
    smoke_id = $smokeId
    person_id = $createdUserId
    email = $Email
    course_slug = $CourseSlug
    course_run_slug = $CourseRunSlug
    block = @{
      block_id = [int64]$block.block_id
      block_slug = $block.block_slug
      block_title = $block.block_title
    }
    rls = @{
      anon_status = $anonRiskProbe.StatusCode
      authenticated_rows = 1
    }
    fsrs = @{
      initial_next_review_at = $attempt.next_review_at
      forced_risk_label = $riskOverdue.risk_label
      forced_overdue_reviews = [int]$riskOverdue.overdue_reviews
      recalculated_next_review_at = $recalculated.next_review_at
      final_risk_label = $riskHealthyFinal.risk_label
      final_overdue_reviews = [int]$riskHealthyFinal.overdue_reviews
    }
    portal = @{
      initial_due_reviews_count = [int]$portalBefore.due_reviews_count
      forced_due_reviews_count = [int]$portalOverdue.due_reviews_count
      forced_at_risk_label = $portalOverdue.at_risk_label
      final_due_reviews_count = [int]$portalFinal.due_reviews_count
      final_at_risk_label = $portalFinal.at_risk_label
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
