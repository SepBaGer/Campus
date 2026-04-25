param(
  [string]$ProjectRef = "exyewjzckgsesrsuqueh",
  [string]$ProjectUrl = "https://exyewjzckgsesrsuqueh.supabase.co",
  [string]$PublishableKey = $env:PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  [string]$ServiceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY,
  [string]$TeacherEmail,
  [string]$StudentEmail,
  [string]$TeacherPassword,
  [string]$StudentPassword,
  [string]$CourseSlug = "programa-empoderamiento-power-skills",
  [string]$CourseRunSlug = "power-skills-pilot-open",
  [string]$BadgeClassSlug = "badge-power-skills-pilot",
  [switch]$KeepAuthUsers
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
  $tempFile = Join-Path ([System.IO.Path]::GetTempPath()) ("campus-teacher-report-smoke-" + [Guid]::NewGuid().ToString("N") + ".sql")

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
      throw "supabase db query --linked fallo durante el smoke docente: $errorText"
    }

    return ($output -join [Environment]::NewLine)
  }
  finally {
    if (Test-Path -LiteralPath $tempFile) {
      Remove-Item -LiteralPath $tempFile -Force
    }
  }
}

function New-ReportingSeedSql {
  param(
    [Parameter(Mandatory = $true)]
    [string]$TeacherId,

    [Parameter(Mandatory = $true)]
    [string]$StudentId,

    [Parameter(Mandatory = $true)]
    [string]$TeacherEmail,

    [Parameter(Mandatory = $true)]
    [string]$StudentEmail,

    [Parameter(Mandatory = $true)]
    [string]$CourseSlug,

    [Parameter(Mandatory = $true)]
    [string]$CourseRunSlug,

    [Parameter(Mandatory = $true)]
    [string]$SmokeId
  )

  $teacherIdSql = ConvertTo-SqlLiteral $TeacherId
  $studentIdSql = ConvertTo-SqlLiteral $StudentId
  $teacherEmailSql = ConvertTo-SqlLiteral $TeacherEmail
  $studentEmailSql = ConvertTo-SqlLiteral $StudentEmail
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
  select run.id, run.course_id
  from delivery.course_run as run
  join catalog.course as course
    on course.id = run.course_id
  where run.slug = $runSlugSql
    and course.slug = $courseSlugSql
  limit 1
),
teacher_person as (
  insert into identity.person (id, email, full_name, source, status)
  values ($teacherIdSql::uuid, $teacherEmailSql, 'Codex Teacher Reporting Smoke', 'codex-teacher-report-smoke', 'active')
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        source = excluded.source,
        status = 'active',
        updated_at = now()
  returning id
),
student_person as (
  insert into identity.person (id, email, full_name, source, status)
  values ($studentIdSql::uuid, $studentEmailSql, 'Codex Student Reporting Smoke', 'codex-teacher-report-smoke', 'active')
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        source = excluded.source,
        status = 'active',
        updated_at = now()
  returning id
),
teacher_role as (
  insert into identity.person_role (person_id, role_code, source)
  select id, 'teacher', 'codex-teacher-report-smoke'
  from teacher_person
  on conflict (person_id, role_code) do nothing
  returning person_id
),
student_role as (
  insert into identity.person_role (person_id, role_code, source)
  select id, 'student', 'codex-teacher-report-smoke'
  from student_person
  on conflict (person_id, role_code) do nothing
  returning person_id
),
enrollment_row as (
  insert into enrollment.enrollment (person_id, course_run_id, status, source)
  select student_person.id, run_row.id, 'active', 'codex-teacher-report-smoke'
  from student_person
  cross join run_row
  on conflict (person_id, course_run_id) do update
    set status = excluded.status,
        source = excluded.source,
        updated_at = now()
  returning id
)
select jsonb_build_object(
  'teacher_id', (select id from teacher_person),
  'student_id', (select id from student_person),
  'course_run_id', (select id from run_row),
  'enrollment_id', (select id from enrollment_row),
  'smoke_id', $smokeIdSql
) as teacher_reporting_seed;
"@
}

function New-RealtimePublicationSql {
  return @"
select count(*)::int as realtime_tables
from pg_publication_tables
where pubname = 'supabase_realtime'
  and (
    (schemaname = 'enrollment' and tablename = 'enrollment')
    or (schemaname = 'learning' and tablename = 'attempt')
    or (schemaname = 'learning' and tablename = 'mastery_state')
    or (schemaname = 'learning' and tablename = 'spaced_schedule')
    or (schemaname = 'learning' and tablename = 'xapi_statement')
    or (schemaname = 'learning' and tablename = 'project_submission')
    or (schemaname = 'credentials' and tablename = 'badge_assertion')
  );
"@
}

function New-ReportingCleanupSql {
  param(
    [AllowNull()][string]$TeacherId,
    [AllowNull()][string]$StudentId
  )

  $ids = @($TeacherId, $StudentId) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
  if (-not $ids.Count) {
    return ""
  }

  $idList = ($ids | ForEach-Object { (ConvertTo-SqlLiteral $_) + "::uuid" }) -join ", "
  return @"
delete from identity.person
where source = 'codex-teacher-report-smoke'
  and id in ($idList);
"@
}

function New-AuthUser {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectUrl,

    [Parameter(Mandatory = $true)]
    [hashtable]$Headers,

    [Parameter(Mandatory = $true)]
    [string]$Email,

    [Parameter(Mandatory = $true)]
    [string]$Password,

    [Parameter(Mandatory = $true)]
    [string]$SmokeId,

    [Parameter(Mandatory = $true)]
    [string]$Role
  )

  $createdUser = Invoke-JsonRequest `
    -Method POST `
    -Uri "$ProjectUrl/auth/v1/admin/users" `
    -Headers $Headers `
    -Body @{
      email = $Email
      password = $Password
      email_confirm = $true
      user_metadata = @{
        smoke_kind = "teacher-reporting-live"
        smoke_id = $SmokeId
        smoke_role = $Role
      }
    }

  Assert-Condition (-not [string]::IsNullOrWhiteSpace($createdUser.id)) "Auth Admin no devolvio id para $Role."
  return $createdUser
}

function New-PasswordSession {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectUrl,

    [Parameter(Mandatory = $true)]
    [hashtable]$Headers,

    [Parameter(Mandatory = $true)]
    [string]$Email,

    [Parameter(Mandatory = $true)]
    [string]$Password
  )

  $tokenResponse = Invoke-JsonRequest `
    -Method POST `
    -Uri "$ProjectUrl/auth/v1/token?grant_type=password" `
    -Headers $Headers `
    -Body @{
      email = $Email
      password = $Password
    }

  Assert-Condition (-not [string]::IsNullOrWhiteSpace($tokenResponse.access_token)) "No se obtuvo access_token para $Email."
  return $tokenResponse
}

$projectRoot = Resolve-ProjectRoot
$timestamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddHHmmss")
$smokeId = "codex-teacher-report-smoke-$timestamp"

if ([string]::IsNullOrWhiteSpace($TeacherEmail)) {
  $TeacherEmail = "$smokeId-teacher@example.com"
}

if ([string]::IsNullOrWhiteSpace($StudentEmail)) {
  $StudentEmail = "$smokeId-student@example.com"
}

if ([string]::IsNullOrWhiteSpace($TeacherPassword)) {
  $TeacherPassword = "CodexTeacher!" + ([Guid]::NewGuid().ToString("N").Substring(0, 18))
}

if ([string]::IsNullOrWhiteSpace($StudentPassword)) {
  $StudentPassword = "CodexStudent!" + ([Guid]::NewGuid().ToString("N").Substring(0, 18))
}

Assert-Condition ($TeacherEmail -match "codex-teacher-report-smoke|teacher-report|disposable") "El email docente debe ser desechable para este smoke: $TeacherEmail."
Assert-Condition ($StudentEmail -match "codex-teacher-report-smoke|teacher-report|disposable") "El email estudiante debe ser desechable para este smoke: $StudentEmail."

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

$createdTeacherId = $null
$createdStudentId = $null
$cleanupStatus = "not_started"
$domainCleanupStatus = "not_started"

try {
  $publicationOutput = Invoke-LinkedSql -ProjectRoot $projectRoot -Sql (New-RealtimePublicationSql)
  Assert-Condition ($publicationOutput -match '"realtime_tables"\s*:\s*7') "La publicacion supabase_realtime no contiene las 7 tablas esperadas."

  $teacherUser = New-AuthUser -ProjectUrl $ProjectUrl -Headers $serviceHeaders -Email $TeacherEmail -Password $TeacherPassword -SmokeId $smokeId -Role "teacher"
  $studentUser = New-AuthUser -ProjectUrl $ProjectUrl -Headers $serviceHeaders -Email $StudentEmail -Password $StudentPassword -SmokeId $smokeId -Role "student"
  $createdTeacherId = $teacherUser.id
  $createdStudentId = $studentUser.id

  $seedSql = New-ReportingSeedSql `
    -TeacherId $createdTeacherId `
    -StudentId $createdStudentId `
    -TeacherEmail $TeacherEmail `
    -StudentEmail $StudentEmail `
    -CourseSlug $CourseSlug `
    -CourseRunSlug $CourseRunSlug `
    -SmokeId $smokeId
  [void](Invoke-LinkedSql -ProjectRoot $projectRoot -Sql $seedSql)

  $teacherSession = New-PasswordSession -ProjectUrl $ProjectUrl -Headers $publicHeaders -Email $TeacherEmail -Password $TeacherPassword
  $studentSession = New-PasswordSession -ProjectUrl $ProjectUrl -Headers $publicHeaders -Email $StudentEmail -Password $StudentPassword

  $teacherHeaders = @{
    apikey = $PublishableKey
    Authorization = "Bearer $($teacherSession.access_token)"
    "Content-Type" = "application/json"
  }
  $studentHeaders = @{
    apikey = $PublishableKey
    Authorization = "Bearer $($studentSession.access_token)"
    "Content-Type" = "application/json"
  }

  $blocks = Invoke-JsonRequest `
    -Method GET `
    -Uri "$ProjectUrl/rest/v1/platform_course_blocks_v?course_slug=eq.$CourseSlug&select=block_id,block_slug,block_title,block_order,block_kind,rubric_slug&order=block_order.asc" `
    -Headers $studentHeaders
  $blockRows = @(Get-ResultRows $blocks)
  Assert-Condition ($blockRows.Count -gt 0) "platform_course_blocks_v no devolvio bloques para $CourseSlug."

  $attemptResults = @()
  foreach ($block in $blockRows) {
    $attemptResults += Invoke-JsonRequest `
      -Method POST `
      -Uri "$ProjectUrl/functions/v1/attempt-complete" `
      -Headers $studentHeaders `
      -Body @{
        content_block_id = [int64]$block.block_id
        correct = $true
        badge_class_slug = $BadgeClassSlug
        submission_text = "Smoke teacher reporting evidence $smokeId for $($block.block_slug)"
        learner_note = "Created by scripts/smoke-teacher-reporting-live.ps1"
        submission_payload = @{
          smoke_id = $smokeId
          source = "smoke-teacher-reporting-live"
          block_slug = $block.block_slug
          no_stripe = $true
        }
        payload = @{
          smoke_id = $smokeId
          no_stripe = $true
          reporting = $true
        }
      }

    $lastAttempt = $attemptResults | Select-Object -Last 1
    Assert-Condition ($lastAttempt.status -eq "completed") "attempt-complete no marco completed para $($block.block_slug)."
    Assert-Condition (-not [string]::IsNullOrWhiteSpace($lastAttempt.xapi_statement_id)) "attempt-complete no devolvio xapi_statement_id para $($block.block_slug)."
  }

  $lastCompleted = $attemptResults | Select-Object -Last 1
  Assert-Condition ([int]$lastCompleted.completed_blocks -eq $blockRows.Count) "No se completaron todos los bloques esperados."

  $adminSnapshot = Invoke-JsonRequest `
    -Method POST `
    -Uri "$ProjectUrl/functions/v1/admin-catalog" `
    -Headers $teacherHeaders `
    -Body @{
      action = "snapshot"
      course_slug = $CourseSlug
    }
  $reports = @(Get-ResultRows $adminSnapshot.teacher_reports)
  Assert-Condition ($reports.Count -ge 1) "admin-catalog no devolvio teacher_reports."
  $runReport = @($reports | Where-Object { $_.run_slug -eq $CourseRunSlug } | Select-Object -First 1)
  Assert-Condition ($runReport.Count -eq 1) "teacher_reports no incluye la cohorte $CourseRunSlug."
  $runReport = $runReport[0]
  Assert-Condition ([int]$runReport.total_learners -ge 1) "teacher_reports no conto learners."
  Assert-Condition ([int]$runReport.completed_attempts -ge $blockRows.Count) "teacher_reports no conto attempts completados."
  Assert-Condition ([int]$runReport.completion_percent -ge 1) "teacher_reports no calculo completion_percent."
  Assert-Condition ([int]$runReport.xapi_statements_24h -ge $blockRows.Count) "teacher_reports no conto xAPI 24h."
  Assert-Condition ([int]$runReport.badges_issued -ge 1) "teacher_reports no conto badge emitido."

  $teacherLearningHeaders = New-SchemaHeaders -Headers $teacherHeaders -Schema "learning"
  $teacherEnrollmentHeaders = New-SchemaHeaders -Headers $teacherHeaders -Schema "enrollment"
  $teacherAttemptRows = Invoke-JsonRequest `
    -Method GET `
    -Uri "$ProjectUrl/rest/v1/attempt?person_id=eq.$createdStudentId&select=id,status" `
    -Headers $teacherLearningHeaders
  $teacherXapiRows = Invoke-JsonRequest `
    -Method GET `
    -Uri "$ProjectUrl/rest/v1/xapi_statement?person_id=eq.$createdStudentId&select=id,verb" `
    -Headers $teacherLearningHeaders
  $teacherScheduleRows = Invoke-JsonRequest `
    -Method GET `
    -Uri "$ProjectUrl/rest/v1/spaced_schedule?person_id=eq.$createdStudentId&select=id,next_review_at" `
    -Headers $teacherLearningHeaders
  $teacherEnrollmentRows = Invoke-JsonRequest `
    -Method GET `
    -Uri "$ProjectUrl/rest/v1/enrollment?person_id=eq.$createdStudentId&select=id,status" `
    -Headers $teacherEnrollmentHeaders

  Assert-Condition ((Get-ValueCount $teacherAttemptRows) -ge $blockRows.Count) "Las politicas staff no dejan leer attempts al docente."
  Assert-Condition ((Get-ValueCount $teacherXapiRows) -ge $blockRows.Count) "Las politicas staff no dejan leer xAPI al docente."
  Assert-Condition ((Get-ValueCount $teacherScheduleRows) -ge 1) "Las politicas staff no dejan leer spaced_schedule al docente."
  Assert-Condition ((Get-ValueCount $teacherEnrollmentRows) -ge 1) "Las politicas staff no dejan leer enrollment al docente."

  $serviceEnrollmentHeaders = New-SchemaHeaders -Headers $serviceHeaders -Schema "enrollment"
  $teacherCheckoutRows = Invoke-JsonRequest `
    -Method GET `
    -Uri "$ProjectUrl/rest/v1/checkout_intent?person_id=eq.$createdTeacherId&select=id,status,plan_code" `
    -Headers $serviceEnrollmentHeaders
  $studentCheckoutRows = Invoke-JsonRequest `
    -Method GET `
    -Uri "$ProjectUrl/rest/v1/checkout_intent?person_id=eq.$createdStudentId&select=id,status,plan_code" `
    -Headers $serviceEnrollmentHeaders
  Assert-Condition ((Get-ValueCount $teacherCheckoutRows) -eq 0) "El smoke docente no debe crear checkout_intent para teacher."
  Assert-Condition ((Get-ValueCount $studentCheckoutRows) -eq 0) "El smoke docente no debe crear checkout_intent para student."

  [pscustomobject]@{
    project_ref = $ProjectRef
    project_url = $ProjectUrl
    smoke_id = $smokeId
    teacher_id = $createdTeacherId
    student_id = $createdStudentId
    course_slug = $CourseSlug
    course_run_slug = $CourseRunSlug
    realtime = @{
      publication_tables = 7
      staff_rls_attempt_rows = Get-ValueCount $teacherAttemptRows
      staff_rls_xapi_rows = Get-ValueCount $teacherXapiRows
      staff_rls_schedule_rows = Get-ValueCount $teacherScheduleRows
      staff_rls_enrollment_rows = Get-ValueCount $teacherEnrollmentRows
    }
    teacher_report = @{
      total_learners = [int]$runReport.total_learners
      active_enrollments = [int]$runReport.active_enrollments
      completed_attempts = [int]$runReport.completed_attempts
      completion_percent = [int]$runReport.completion_percent
      xapi_statements_24h = [int]$runReport.xapi_statements_24h
      due_reviews_count = [int]$runReport.due_reviews_count
      at_risk_learners = [int]$runReport.at_risk_learners
      pending_project_submissions = [int]$runReport.pending_project_submissions
      badges_issued = [int]$runReport.badges_issued
      last_activity_at = $runReport.last_activity_at
    }
    no_stripe = @{
      teacher_checkout_intents = Get-ValueCount $teacherCheckoutRows
      student_checkout_intents = Get-ValueCount $studentCheckoutRows
    }
    auth_user_cleanup = if ($KeepAuthUsers.IsPresent) { "skipped" } else { "will_delete_after_verification" }
  } | ConvertTo-Json -Depth 20
}
finally {
  if (-not $KeepAuthUsers.IsPresent) {
    foreach ($authUserId in @($createdTeacherId, $createdStudentId)) {
      if (-not [string]::IsNullOrWhiteSpace($authUserId)) {
        try {
          [void](Invoke-JsonRequest `
            -Method DELETE `
            -Uri "$ProjectUrl/auth/v1/admin/users/$authUserId" `
            -Headers $serviceHeaders)
          $cleanupStatus = "deleted"
        }
        catch {
          $cleanupStatus = "failed: $($_.Exception.Message)"
        }
      }
    }

    Write-Output "auth_user_cleanup=$cleanupStatus"

    $cleanupSql = New-ReportingCleanupSql -TeacherId $createdTeacherId -StudentId $createdStudentId
    if (-not [string]::IsNullOrWhiteSpace($cleanupSql)) {
      try {
        [void](Invoke-LinkedSql -ProjectRoot $projectRoot -Sql $cleanupSql)
        $domainCleanupStatus = "deleted"
      }
      catch {
        $domainCleanupStatus = "failed: $($_.Exception.Message)"
      }
    }

    Write-Output "domain_identity_cleanup=$domainCleanupStatus"
  }
}
