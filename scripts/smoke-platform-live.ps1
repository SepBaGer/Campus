param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectUrl,

  [Parameter(Mandatory = $true)]
  [string]$PublishableKey,

  [Parameter(Mandatory = $true)]
  [string]$Email,

  [Parameter(Mandatory = $true)]
  [string]$Password,

  [string]$CourseSlug = "programa-empoderamiento-power-skills",
  [string]$CourseRunSlug = "power-skills-pilot-open",
  [string]$BadgeClassSlug = "badge-power-skills-pilot",
  [switch]$CompleteAllBlocks
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

function Invoke-JsonRequest {
  param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("GET", "POST")]
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
        $payload = $Body | ConvertTo-Json -Depth 20
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

  try {
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
  catch {
    $response = $_.Exception.Response
    if ($response) {
      $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
      $bodyText = $reader.ReadToEnd()
      throw "Request failed [GET $Uri]: $bodyText"
    }

    throw
  }
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

$publicHeaders = @{
  apikey = $PublishableKey
  "Content-Type" = "application/json"
}

$runOpenUri = "$ProjectUrl/functions/v1/run-open?course_slug=$CourseSlug"
$runOpen = Invoke-JsonRequest -Method GET -Uri $runOpenUri -Headers $publicHeaders
$runs = @($runOpen.runs)
Assert-Condition ($runs.Count -gt 0) "run-open no devolvio cohortes abiertas."

$icalResponse = Invoke-TextRequest -Uri "$ProjectUrl/functions/v1/ical-feed?course_slug=$CourseSlug" -Headers $publicHeaders
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

$portalSnapshot = Invoke-JsonRequest `
  -Method GET `
  -Uri "$ProjectUrl/rest/v1/platform_portal_snapshot_v?select=*" `
  -Headers $authHeaders

$blocks = Invoke-JsonRequest `
  -Method GET `
  -Uri "$ProjectUrl/rest/v1/platform_course_blocks_v?course_slug=eq.$CourseSlug&select=block_id,block_slug,block_title,block_order&order=block_order.asc" `
  -Headers $authHeaders
$blocks = @($blocks)
Assert-Condition ($blocks.Count -gt 0) "platform_course_blocks_v no devolvio bloques para el curso piloto."

$checkoutResponse = Invoke-JsonRequest `
  -Method POST `
  -Uri "$ProjectUrl/functions/v1/checkout-create" `
  -Headers $authHeaders `
  -Body @{
    idempotency_key = "codex-smoke-$((Get-Date).ToUniversalTime().ToString('yyyyMMddHHmmss'))"
    plan_code = "premium"
    plan_label = "Premium smoke"
    course_run_slug = $CourseRunSlug
  }

$adminSnapshot = Invoke-JsonRequest `
  -Method POST `
  -Uri "$ProjectUrl/functions/v1/admin-catalog" `
  -Headers $authHeaders `
  -Body @{
    action = "snapshot"
    course_slug = $CourseSlug
  }

$attemptTargets = @()
if ($CompleteAllBlocks.IsPresent) {
  $attemptTargets = $blocks
}
else {
  $attemptTargets = @($blocks | Select-Object -First 1)
}

$attemptResults = @()
foreach ($block in $attemptTargets) {
  $attemptResults += Invoke-JsonRequest `
    -Method POST `
    -Uri "$ProjectUrl/functions/v1/attempt-complete" `
    -Headers $authHeaders `
    -Body @{
      content_block_id = [int64]$block.block_id
      correct = $true
    }
}

$lastAttempt = $attemptResults | Select-Object -Last 1
$credentialResponse = $null
$verificationResponse = $null

if ($CompleteAllBlocks.IsPresent) {
  if ($lastAttempt.credential) {
    $credentialResponse = $lastAttempt.credential
  }
  else {
    $credentialResponse = Invoke-JsonRequest `
      -Method POST `
      -Uri "$ProjectUrl/functions/v1/credential-issue" `
      -Headers $authHeaders `
      -Body @{
        badge_class_slug = $BadgeClassSlug
      }
  }

  $token = $credentialResponse.token
  Assert-Condition (-not [string]::IsNullOrWhiteSpace($token)) "No se obtuvo token de credencial despues de completar la ruta."

  $verificationResponse = Invoke-JsonRequest `
    -Method GET `
    -Uri "$ProjectUrl/functions/v1/verify-credential?token=$token" `
    -Headers $publicHeaders
}

[pscustomobject]@{
  project_url = $ProjectUrl
  email = $Email
  public_runs = $runs.Count
  first_run = $runs[0].run_label
  ical_ok = $true
  portal_snapshot_rows = @($portalSnapshot).Count
  course_blocks = $blocks.Count
  checkout_status = $checkoutResponse.status
  checkout_live_mode = $checkoutResponse.live_mode
  admin_course_slug = $adminSnapshot.course.slug
  attempted_blocks = $attemptResults.Count
  last_progress_percent = $lastAttempt.progress_percent
  xapi_statement_id = $lastAttempt.xapi_statement_id
  next_review_at = $lastAttempt.next_review_at
  credential_token = if ($credentialResponse) { $credentialResponse.token } else { $null }
  verify_status = if ($verificationResponse) { $verificationResponse.credential.status } else { $null }
} | ConvertTo-Json -Depth 10
