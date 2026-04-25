param(
  [string]$ProjectRef = "exyewjzckgsesrsuqueh",
  [string]$ProjectUrl = "https://exyewjzckgsesrsuqueh.supabase.co",
  [string]$PublishableKey = $env:PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  [string]$ServiceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY,
  [string]$Email,
  [string]$Password,
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
        $payload = $Body | ConvertTo-Json -Depth 30
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

function Assert-EmptyCollection {
  param(
    [AllowNull()]$Value,
    [Parameter(Mandatory = $true)]
    [string]$Label
  )

  $count = Get-ValueCount -Value $Value
  Assert-Condition ($count -eq 0) "$Label debe quedar vacio despues de dsar-delete; count=$count."
}

function Assert-AllMatch {
  param(
    [AllowNull()]$Value,
    [Parameter(Mandatory = $true)]
    [string]$Property,
    [Parameter(Mandatory = $true)]
    [string]$Expected,
    [Parameter(Mandatory = $true)]
    [string]$Label
  )

  foreach ($entry in @($Value)) {
    if ($null -eq $entry) {
      continue
    }

    Assert-Condition ([string]$entry.$Property -eq $Expected) "$Label debe tener $Property=$Expected."
  }
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
    throw "No se pudieron leer API keys via Supabase CLI para $ProjectRef."
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
  $tempFile = Join-Path ([System.IO.Path]::GetTempPath()) ("campus-dsar-smoke-" + [Guid]::NewGuid().ToString("N") + ".sql")

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
      throw "supabase db query --linked fallo durante el seed DSAR: $errorText"
    }

    return ($output -join [Environment]::NewLine)
  }
  finally {
    if (Test-Path -LiteralPath $tempFile) {
      Remove-Item -LiteralPath $tempFile -Force
    }
  }
}

function New-DsarSeedSql {
  param(
    [Parameter(Mandatory = $true)]
    [string]$PersonId,

    [Parameter(Mandatory = $true)]
    [string]$Email,

    [Parameter(Mandatory = $true)]
    [string]$CourseRunSlug,

    [Parameter(Mandatory = $true)]
    [string]$BadgeClassSlug,

    [Parameter(Mandatory = $true)]
    [string]$SmokeId
  )

  $personIdSql = ConvertTo-SqlLiteral $PersonId
  $emailSql = ConvertTo-SqlLiteral $Email
  $runSlugSql = ConvertTo-SqlLiteral $CourseRunSlug
  $badgeSlugSql = ConvertTo-SqlLiteral $BadgeClassSlug
  $smokeIdSql = ConvertTo-SqlLiteral $SmokeId
  $pushEndpointSql = ConvertTo-SqlLiteral "https://example.com/campus-dsar-smoke/$SmokeId"

  return @"
with run_row as (
  select id, course_id
  from delivery.course_run
  where slug = $runSlugSql
  limit 1
),
block_row as (
  select block.id
  from catalog.content_block as block
  join run_row
    on run_row.course_id = block.course_id
  order by block.position, block.id
  limit 1
),
competency_row as (
  select mapping.competency_id
  from catalog.content_block_competency as mapping
  join block_row
    on block_row.id = mapping.content_block_id
  where mapping.is_primary
  union
  select course_competency.competency_id
  from catalog.course_competency as course_competency
  join run_row
    on run_row.course_id = course_competency.course_id
  order by competency_id
  limit 1
),
badge_class_row as (
  select id
  from credentials.badge_class
  where slug = $badgeSlugSql
  limit 1
),
template_row as (
  select template.id
  from delivery.notification_template as template
  join run_row
    on run_row.id = template.course_run_id
  where template.status = 'active'
  order by template.channel_code, template.id
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
    'Codex DSAR Smoke',
    'codex-dsar-smoke',
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
  select id, 'student', 'codex-dsar-smoke'
  from person_row
  on conflict (person_id, role_code) do nothing
  returning person_id
),
consent_row as (
  insert into identity.person_consent (person_id, consent_code, status)
  select id, 'privacy-policy', 'granted'
  from person_row
  on conflict (person_id, consent_code) do update
    set status = excluded.status,
        recorded_at = now()
  returning id
),
preference_rows as (
  insert into identity.person_notification_preference (person_id, channel_code, is_enabled)
  select id, channel_code, true
  from person_row
  cross join (values ('email'), ('web')) as channel(channel_code)
  on conflict (person_id, channel_code) do update
    set is_enabled = excluded.is_enabled,
        updated_at = now()
  returning person_id
),
push_row as (
  insert into identity.web_push_subscription (
    person_id,
    endpoint,
    p256dh_key,
    auth_key,
    user_agent,
    is_active
  )
  select
    id,
    $pushEndpointSql,
    'codex-p256dh',
    'codex-auth',
    'codex-dsar-smoke',
    true
  from person_row
  on conflict (endpoint) do update
    set person_id = excluded.person_id,
        is_active = excluded.is_active,
        last_seen_at = now(),
        updated_at = now()
  returning id
),
entitlement_row as (
  insert into enrollment.entitlement (
    person_id,
    code,
    status,
    source,
    metadata
  )
  select
    id,
    'premium-membership',
    'active',
    'codex-dsar-smoke',
    jsonb_build_object('smoke_id', $smokeIdSql)
  from person_row
  on conflict (person_id, code) do update
    set status = excluded.status,
        source = excluded.source,
        metadata = excluded.metadata,
        ends_at = null,
        updated_at = now()
  returning id
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
    'codex-dsar-smoke'
  from person_row
  cross join run_row
  on conflict (person_id, course_run_id) do update
    set status = excluded.status,
        source = excluded.source,
        updated_at = now()
  returning id
),
checkout_row as (
  insert into enrollment.checkout_intent (
    person_id,
    course_run_id,
    idempotency_key,
    plan_code,
    status,
    checkout_url
  )
  select
    person_row.id,
    run_row.id,
    'codex-dsar-smoke-' || $smokeIdSql,
    'premium',
    'created',
    'https://example.com/checkout/' || $smokeIdSql
  from person_row
  cross join run_row
  on conflict (idempotency_key) do update
    set status = excluded.status,
        updated_at = now()
  returning id
),
allocation_row as (
  insert into enrollment.payment_allocation (
    checkout_intent_id,
    person_id,
    course_run_id,
    settlement_mode,
    allocation_status,
    plan_code,
    currency,
    gross_amount_minor,
    net_amount_minor,
    teacher_amount_minor,
    platform_amount_minor,
    recognized_at
  )
  select
    checkout_row.id,
    person_row.id,
    run_row.id,
    'manual_monthly',
    'recognized',
    'premium',
    'usd',
    2900,
    2900,
    2030,
    870,
    now()
  from checkout_row
  cross join person_row
  cross join run_row
  returning id
),
attempt_row as (
  insert into learning.attempt (
    person_id,
    content_block_id,
    status,
    score,
    xp_earned
  )
  select
    person_row.id,
    block_row.id,
    'completed',
    100,
    100
  from person_row
  cross join block_row
  on conflict (person_id, content_block_id) do update
    set status = excluded.status,
        score = excluded.score,
        xp_earned = excluded.xp_earned,
        completed_at = now(),
        updated_at = now()
  returning id
),
mastery_row as (
  insert into learning.mastery_state (
    person_id,
    competency_id,
    level,
    repetitions,
    interval_days,
    ease_factor,
    last_reviewed_at,
    next_review_at
  )
  select
    person_row.id,
    competency_row.competency_id,
    1.00,
    1,
    3,
    2.50,
    now(),
    now() + interval '3 days'
  from person_row
  cross join competency_row
  on conflict (person_id, competency_id) do update
    set level = excluded.level,
        repetitions = excluded.repetitions,
        interval_days = excluded.interval_days,
        ease_factor = excluded.ease_factor,
        last_reviewed_at = excluded.last_reviewed_at,
        next_review_at = excluded.next_review_at,
        updated_at = now()
  returning person_id
),
schedule_row as (
  insert into learning.spaced_schedule (
    person_id,
    competency_id,
    source_content_block_id,
    next_review_at,
    stability,
    difficulty,
    last_reviewed_at
  )
  select
    person_row.id,
    competency_row.competency_id,
    block_row.id,
    now() + interval '3 days',
    3,
    2.50,
    now()
  from person_row
  cross join competency_row
  cross join block_row
  on conflict (person_id, competency_id) do update
    set source_content_block_id = excluded.source_content_block_id,
        next_review_at = excluded.next_review_at,
        stability = excluded.stability,
        difficulty = excluded.difficulty,
        last_reviewed_at = excluded.last_reviewed_at,
        updated_at = now()
  returning id
),
xapi_row as (
  insert into learning.xapi_statement (
    person_id,
    verb,
    object_id,
    payload
  )
  select
    person_row.id,
    'completed',
    'urn:campus:dsar-smoke:' || $smokeIdSql,
    jsonb_build_object('smoke_id', $smokeIdSql)
  from person_row
  returning id
),
project_row as (
  insert into learning.project_submission (
    person_id,
    content_block_id,
    attempt_id,
    status,
    submission_text,
    learner_note
  )
  select
    person_row.id,
    block_row.id,
    attempt_row.id,
    'submitted',
    'DSAR smoke evidence ' || $smokeIdSql,
    'Created by scripts/smoke-dsar-dedicated.ps1'
  from person_row
  cross join block_row
  cross join attempt_row
  on conflict (person_id, content_block_id) do update
    set status = excluded.status,
        submission_text = excluded.submission_text,
        learner_note = excluded.learner_note,
        attempt_id = excluded.attempt_id,
        updated_at = now()
  returning id
),
badge_row as (
  insert into credentials.badge_assertion (
    badge_class_id,
    person_id,
    enrollment_id,
    status,
    public_note,
    metadata
  )
  select
    badge_class_row.id,
    person_row.id,
    enrollment_row.id,
    'issued',
    'DSAR smoke credential',
    jsonb_build_object('smoke_id', $smokeIdSql)
  from badge_class_row
  cross join person_row
  cross join enrollment_row
  on conflict (badge_class_id, person_id) do update
    set status = excluded.status,
        revoked_at = null,
        public_note = excluded.public_note,
        metadata = excluded.metadata,
        updated_at = now()
  returning id
),
dispatch_row as (
  insert into delivery.notification_dispatch (
    template_id,
    course_run_id,
    person_id,
    channel_code,
    scheduled_for,
    status,
    rendered_subject,
    rendered_body,
    metadata
  )
  select
    template_row.id,
    run_row.id,
    person_row.id,
    'email',
    now() + interval '5 minutes',
    'pending',
    'DSAR smoke',
    'DSAR smoke dispatch ' || $smokeIdSql,
    jsonb_build_object('smoke_id', $smokeIdSql)
  from template_row
  cross join run_row
  cross join person_row
  returning id
)
select jsonb_build_object(
  'person_id', (select id from person_row),
  'course_run_id', (select id from run_row),
  'content_block_id', (select id from block_row),
  'competency_id', (select competency_id from competency_row),
  'checkout_intent_id', (select id from checkout_row),
  'payment_allocation_id', (select id from allocation_row),
  'notification_dispatch_id', (select id from dispatch_row),
  'smoke_id', $smokeIdSql
) as dsar_seed;
"@
}

$projectRoot = Resolve-ProjectRoot
$timestamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddHHmmss")
$smokeId = "codex-dsar-smoke-$timestamp"

if ([string]::IsNullOrWhiteSpace($Email)) {
  $Email = "$smokeId@example.com"
}

if ([string]::IsNullOrWhiteSpace($Password)) {
  $Password = "CodexDsar!" + ([Guid]::NewGuid().ToString("N").Substring(0, 18))
}

Assert-Condition ($Email -match "codex-dsar-smoke|dsar-smoke|disposable") "El email debe ser claramente desechable para este smoke: $Email."

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
        smoke_kind = "dsar-dedicated"
        smoke_id = $smokeId
      }
    }

  $createdUserId = $createdUser.id
  Assert-Condition (-not [string]::IsNullOrWhiteSpace($createdUserId)) "Auth Admin no devolvio id de usuario."

  $seedSql = New-DsarSeedSql `
    -PersonId $createdUserId `
    -Email $Email `
    -CourseRunSlug $CourseRunSlug `
    -BadgeClassSlug $BadgeClassSlug `
    -SmokeId $smokeId

  [void](Invoke-LinkedSql -ProjectRoot $projectRoot -Sql $seedSql)

  $tokenResponse = Invoke-JsonRequest `
    -Method POST `
    -Uri "$ProjectUrl/auth/v1/token?grant_type=password" `
    -Headers $publicHeaders `
    -Body @{
      email = $Email
      password = $Password
    }

  Assert-Condition (-not [string]::IsNullOrWhiteSpace($tokenResponse.access_token)) "No se obtuvo access_token para el usuario DSAR."

  $authHeaders = @{
    apikey = $PublishableKey
    Authorization = "Bearer $($tokenResponse.access_token)"
    "Content-Type" = "application/json"
  }

  $beforeExport = Invoke-JsonRequest -Method POST -Uri "$ProjectUrl/functions/v1/dsar-export" -Headers $authHeaders -Body @{}
  Assert-Condition ($beforeExport.identity.person.id -eq $createdUserId) "dsar-export no devolvio la persona esperada antes del delete."
  Assert-Condition ($beforeExport.identity.person.email -eq $Email) "dsar-export no devolvio el email esperado antes del delete."
  Assert-Condition (-not [string]::IsNullOrWhiteSpace($beforeExport.dsar_request.id)) "dsar-export no devolvio dsar_request.id."
  Assert-Condition ($beforeExport.dsar_request.status -eq "exported") "dsar-export no cerro dsar_request como exported."
  Assert-Condition (-not [string]::IsNullOrWhiteSpace($beforeExport.dsar_request.export_sha256)) "dsar-export no devolvio export_sha256."
  Assert-Condition ((Get-ValueCount $beforeExport.identity.consents) -gt 0) "dsar-export no incluyo consentimientos."
  Assert-Condition ((Get-ValueCount $beforeExport.identity.dsar_requests) -gt 0) "dsar-export no incluyo historial dsar_requests."
  Assert-Condition ((Get-ValueCount $beforeExport.identity.notification_preferences) -gt 0) "dsar-export no incluyo preferencias de notificacion."
  Assert-Condition ((Get-ValueCount $beforeExport.identity.web_push_subscriptions) -gt 0) "dsar-export no incluyo suscripcion web push."
  Assert-Condition ((Get-ValueCount $beforeExport.delivery.notification_dispatches) -gt 0) "dsar-export no incluyo dispatch de notificacion."
  Assert-Condition ((Get-ValueCount $beforeExport.learning.attempts) -gt 0) "dsar-export no incluyo attempts."
  Assert-Condition ((Get-ValueCount $beforeExport.learning.mastery_states) -gt 0) "dsar-export no incluyo mastery_states."
  Assert-Condition ((Get-ValueCount $beforeExport.learning.spaced_schedule) -gt 0) "dsar-export no incluyo spaced_schedule."
  Assert-Condition ((Get-ValueCount $beforeExport.learning.xapi_statements) -gt 0) "dsar-export no incluyo xapi_statements."
  Assert-Condition ((Get-ValueCount $beforeExport.learning.project_submissions) -gt 0) "dsar-export no incluyo project_submissions."
  Assert-Condition ((Get-ValueCount $beforeExport.credentials) -gt 0) "dsar-export no incluyo credentials."

  $deleteResponse = Invoke-JsonRequest -Method POST -Uri "$ProjectUrl/functions/v1/dsar-delete" -Headers $authHeaders -Body @{}
  Assert-Condition ($deleteResponse.status -eq "archived") "dsar-delete no devolvio status archived."
  Assert-Condition ($deleteResponse.person_id -eq $createdUserId) "dsar-delete devolvio otra persona."
  Assert-Condition (-not [string]::IsNullOrWhiteSpace($deleteResponse.dsar_request.id)) "dsar-delete no devolvio dsar_request.id."
  Assert-Condition ($deleteResponse.dsar_request.status -eq "deleted") "dsar-delete no cerro dsar_request como deleted."
  Assert-Condition (-not [string]::IsNullOrWhiteSpace($deleteResponse.dsar_request.delete_confirmed_at)) "dsar-delete no marco delete_confirmed_at."

  $afterExport = Invoke-JsonRequest -Method POST -Uri "$ProjectUrl/functions/v1/dsar-export" -Headers $authHeaders -Body @{}
  Assert-Condition ($afterExport.identity.person.id -eq $createdUserId) "dsar-export no devolvio la persona esperada despues del delete."
  Assert-Condition ($afterExport.identity.person.status -eq "archived") "La persona no quedo archived."
  Assert-Condition ($null -eq $afterExport.identity.person.email) "La persona no quedo con email null."
  Assert-Condition ($afterExport.identity.person.full_name -eq "deleted-user") "La persona no quedo con full_name redacted."
  Assert-Condition (-not [string]::IsNullOrWhiteSpace($afterExport.dsar_request.id)) "El dsar-export posterior no devolvio dsar_request.id."
  Assert-Condition ($afterExport.dsar_request.status -eq "exported") "El dsar-export posterior no cerro dsar_request como exported."

  Assert-EmptyCollection $afterExport.identity.consents "identity.consents"
  Assert-EmptyCollection $afterExport.identity.notification_preferences "identity.notification_preferences"
  Assert-EmptyCollection $afterExport.identity.web_push_subscriptions "identity.web_push_subscriptions"
  Assert-EmptyCollection $afterExport.delivery.notification_dispatches "delivery.notification_dispatches"
  Assert-EmptyCollection $afterExport.learning.attempts "learning.attempts"
  Assert-EmptyCollection $afterExport.learning.mastery_states "learning.mastery_states"
  Assert-EmptyCollection $afterExport.learning.spaced_schedule "learning.spaced_schedule"
  Assert-EmptyCollection $afterExport.learning.xapi_statements "learning.xapi_statements"
  Assert-EmptyCollection $afterExport.learning.project_submissions "learning.project_submissions"

  Assert-AllMatch $afterExport.enrollment.entitlements "status" "inactive" "enrollment.entitlements"
  Assert-AllMatch $afterExport.enrollment.enrollments "status" "cancelled" "enrollment.enrollments"
  Assert-AllMatch $afterExport.credentials "status" "revoked" "credentials"

  $identityHeaders = New-SchemaHeaders -Headers $serviceHeaders -Schema "identity"
  $auditHeaders = New-SchemaHeaders -Headers $serviceHeaders -Schema "audit"
  $requestRows = Invoke-JsonRequest `
    -Method GET `
    -Uri "$ProjectUrl/rest/v1/dsar_request?person_id=eq.$createdUserId&select=id,kind,status,export_sha256,delete_confirmed_at&order=requested_at.asc" `
    -Headers $identityHeaders
  $eventRows = Invoke-JsonRequest `
    -Method GET `
    -Uri "$ProjectUrl/rest/v1/event?subject_person_id=eq.$createdUserId&select=event_type,dsar_request_id&order=created_at.asc" `
    -Headers $auditHeaders

  $requestRows = @($requestRows)
  $eventRows = @($eventRows)
  $eventTypes = @($eventRows | ForEach-Object { $_.event_type })
  Assert-Condition ($requestRows.Count -ge 3) "identity.dsar_request debe registrar al menos export/delete/export."
  Assert-Condition (@($requestRows | Where-Object { $_.kind -eq "access" -and $_.status -eq "exported" }).Count -ge 2) "identity.dsar_request no registro exports cerrados."
  Assert-Condition (@($requestRows | Where-Object { $_.kind -eq "deletion" -and $_.status -eq "deleted" }).Count -ge 1) "identity.dsar_request no registro delete cerrado."
  foreach ($expectedEvent in @("dsar_export_requested", "dsar_export_completed", "dsar_delete_requested", "dsar_delete_completed")) {
    Assert-Condition ($eventTypes -contains $expectedEvent) "audit.event no registro $expectedEvent."
  }

  [pscustomobject]@{
    project_ref = $ProjectRef
    project_url = $ProjectUrl
    smoke_id = $smokeId
    person_id = $createdUserId
    email = $Email
    export_before = @{
      consents = Get-ValueCount $beforeExport.identity.consents
      notification_preferences = Get-ValueCount $beforeExport.identity.notification_preferences
      web_push_subscriptions = Get-ValueCount $beforeExport.identity.web_push_subscriptions
      notification_dispatches = Get-ValueCount $beforeExport.delivery.notification_dispatches
      attempts = Get-ValueCount $beforeExport.learning.attempts
      mastery_states = Get-ValueCount $beforeExport.learning.mastery_states
      spaced_schedule = Get-ValueCount $beforeExport.learning.spaced_schedule
      xapi_statements = Get-ValueCount $beforeExport.learning.xapi_statements
      project_submissions = Get-ValueCount $beforeExport.learning.project_submissions
      credentials = Get-ValueCount $beforeExport.credentials
      checkout_intents = Get-ValueCount $beforeExport.enrollment.checkout_intents
      payment_allocations = Get-ValueCount $beforeExport.enrollment.payment_allocations
      dsar_requests = Get-ValueCount $beforeExport.identity.dsar_requests
    }
    delete_status = $deleteResponse.status
    export_after = @{
      person_status = $afterExport.identity.person.status
      person_email_is_null = ($null -eq $afterExport.identity.person.email)
      retained_checkout_intents = Get-ValueCount $afterExport.enrollment.checkout_intents
      retained_payment_allocations = Get-ValueCount $afterExport.enrollment.payment_allocations
      entitlements = Get-ValueCount $afterExport.enrollment.entitlements
      enrollments = Get-ValueCount $afterExport.enrollment.enrollments
      credentials = Get-ValueCount $afterExport.credentials
    }
    audit = @{
      dsar_requests = $requestRows.Count
      events = $eventRows.Count
      event_types = $eventTypes
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
