param(
  [string]$ProjectRef = "",
  [string]$RunSlug = "power-skills-pilot-open",
  [string[]]$RequiredLtiSecrets = @(
    "SITE_URL",
    "LTI_PLATFORM_SHARED_SECRET",
    "LTI_PLATFORM_PRIVATE_JWK"
  ),
  [switch]$RequireLiveCommunity,
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

function Invoke-JsonEndpoint {
  param([string]$Url)

  try {
    return Invoke-RestMethod -Method Get -Uri $Url -TimeoutSec 20 -ErrorAction Stop
  } catch {
    return $null
  }
}

function Get-Text {
  param([object]$Value)

  if ($null -eq $Value) {
    return ""
  }

  return ([string]$Value).Trim()
}

function Get-Bool {
  param(
    [object]$Value,
    [bool]$Fallback = $false
  )

  if ($null -eq $Value) {
    return $Fallback
  }

  if ($Value -is [bool]) {
    return [bool]$Value
  }

  $normalized = ([string]$Value).Trim().ToLowerInvariant()
  if ($normalized -in @("true", "1", "yes")) {
    return $true
  }

  if ($normalized -in @("false", "0", "no")) {
    return $false
  }

  return $Fallback
}

function Get-StringArray {
  param([object]$Value)

  if ($null -eq $Value) {
    return @()
  }

  if ($Value -is [array]) {
    return @($Value | ForEach-Object { Get-Text -Value $_ } | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
  }

  return @((Get-Text -Value $Value) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
}

function Test-HttpsUrl {
  param([string]$Value)

  $uri = $null
  if ([Uri]::TryCreate($Value, [UriKind]::Absolute, [ref]$uri)) {
    return $uri.Scheme -eq "https"
  }

  return $false
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
$projectUrl = "https://$projectRef.supabase.co"

if (-not (Test-Path -LiteralPath $supabaseCli -PathType Leaf)) {
  throw "Missing local Supabase CLI. Run npm install inside campus-platform first."
}

$schemaSql = @"
select
  to_regclass('delivery.course_run') is not null as course_run_present,
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'delivery'
      and table_name = 'course_run'
      and column_name = 'community_manifest'
  ) as community_manifest_column_present,
  to_regclass('public.platform_course_community_v') is not null as community_view_present,
  exists (
    select 1
    from pg_trigger
    where tgname = 'trg_validate_course_run_community_manifest'
      and not tgisinternal
  ) as validator_trigger_present;
"@

$schemaResult = Invoke-SupabaseJson -SupabaseCli $supabaseCli -SupabaseRoot $supabaseRoot -CliArguments @(
  "db", "query", "--linked", "-o", "json", $schemaSql
)
$schemaRow = @($schemaResult.rows)[0]

$courseRunPresent = [bool]$schemaRow.course_run_present
$communityManifestColumnPresent = [bool]$schemaRow.community_manifest_column_present
$communityViewPresent = [bool]$schemaRow.community_view_present
$validatorTriggerPresent = [bool]$schemaRow.validator_trigger_present

$runRow = $null
if ($courseRunPresent -and $communityManifestColumnPresent) {
  $runSlugLiteral = ConvertTo-SqlLiteral -Value $RunSlug
  $viewCountSelect = if ($communityViewPresent) {
    "(select count(*)::integer from public.platform_course_community_v as community_view where community_view.run_slug = cr.slug) as public_view_count"
  } else {
    "null::integer as public_view_count"
  }
  $runSql = @"
select
  cr.id,
  cr.slug,
  cr.title,
  cr.status,
  cr.community_manifest,
  $viewCountSelect
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

function Get-FunctionBySlug {
  param([string]$Slug)
  return @($functions | Where-Object {
    $_.slug -eq $Slug -or $_.name -eq $Slug
  } | Select-Object -First 1)[0]
}

$ltiLaunchFunction = Get-FunctionBySlug -Slug "lti-launch"
$ltiMockToolFunction = Get-FunctionBySlug -Slug "lti-mock-tool"
$adminCatalogFunction = Get-FunctionBySlug -Slug "admin-catalog"

$ltiLaunchActive = $null -ne $ltiLaunchFunction -and [string]$ltiLaunchFunction.status -eq "ACTIVE"
$ltiMockToolActive = $null -ne $ltiMockToolFunction -and [string]$ltiMockToolFunction.status -eq "ACTIVE"
$adminCatalogActive = $null -ne $adminCatalogFunction -and [string]$adminCatalogFunction.status -eq "ACTIVE"

$secretNames = @($secrets | ForEach-Object { [string]$_.name })
$missingRequiredSecrets = @($RequiredLtiSecrets | Where-Object { $secretNames -notcontains $_ })

$platformConfigUrl = "$projectUrl/functions/v1/lti-launch?action=platform-config"
$mockMetaUrl = "$projectUrl/functions/v1/lti-mock-tool?action=meta"
$platformConfig = Invoke-JsonEndpoint -Url $platformConfigUrl
$mockMeta = Invoke-JsonEndpoint -Url $mockMetaUrl
$platformConfigOk = $null -ne $platformConfig `
  -and -not [string]::IsNullOrWhiteSpace((Get-Text -Value $platformConfig.issuer)) `
  -and -not [string]::IsNullOrWhiteSpace((Get-Text -Value $platformConfig.authorize_url)) `
  -and -not [string]::IsNullOrWhiteSpace((Get-Text -Value $platformConfig.jwks_url))
$mockMetaOk = $null -ne $mockMeta `
  -and -not [string]::IsNullOrWhiteSpace((Get-Text -Value $mockMeta.login_url)) `
  -and -not [string]::IsNullOrWhiteSpace((Get-Text -Value $mockMeta.launch_url))

$manifest = if ($runRow) { $runRow.community_manifest } else { $null }
$lti = if ($manifest) { $manifest.lti } else { $null }
$surfaceModes = if ($manifest) { Get-StringArray -Value $manifest.surface_modes } else { @() }

$manifestEnabled = if ($manifest) { Get-Bool -Value $manifest.enabled } else { $false }
$provider = if ($manifest) { Get-Text -Value $manifest.provider } else { "" }
$title = if ($manifest) { Get-Text -Value $manifest.title } else { "" }
$peerReviewSurfacePresent = $surfaceModes -contains "peer_review"
$peerReviewEnabled = if ($manifest) { Get-Bool -Value $manifest.peer_review_enabled -Fallback $peerReviewSurfacePresent } else { $false }
$peerReviewReady = $peerReviewEnabled -and $peerReviewSurfacePresent

$toolMode = if ($lti) { (Get-Text -Value $lti.tool_mode).ToLowerInvariant() } else { "" }
$clientId = if ($lti) { Get-Text -Value $lti.client_id } else { "" }
$deploymentId = if ($lti) { Get-Text -Value $lti.deployment_id } else { "" }
$resourceLinkId = if ($lti) { Get-Text -Value $lti.resource_link_id } else { "" }
$loginInitiationUrl = if ($lti) { Get-Text -Value $lti.login_initiation_url } else { "" }
$targetLinkUri = if ($lti) { Get-Text -Value $lti.target_link_uri } else { "" }
$launchPresentation = if ($lti) { Get-Text -Value $lti.launch_presentation } else { "" }
$publicViewCount = if ($runRow -and $null -ne $runRow.public_view_count) { [int]$runRow.public_view_count } else { 0 }

$hasCoreLtiIds = -not [string]::IsNullOrWhiteSpace($clientId) `
  -and -not [string]::IsNullOrWhiteSpace($deploymentId) `
  -and -not [string]::IsNullOrWhiteSpace($resourceLinkId)
$isMockMode = $toolMode -eq "mock"
$isCustomMode = $toolMode -eq "custom"
$customUrlsAreHttps = (Test-HttpsUrl -Value $loginInitiationUrl) -and (Test-HttpsUrl -Value $targetLinkUri)
$customUrlsAreMock = $loginInitiationUrl -like "*lti-mock-tool*" -or $targetLinkUri -like "*lti-mock-tool*"
$liveManifestComplete = $manifestEnabled `
  -and $provider -eq "discourse" `
  -and $peerReviewReady `
  -and $isCustomMode `
  -and $hasCoreLtiIds `
  -and $customUrlsAreHttps `
  -and -not $customUrlsAreMock

Write-Output "Campus community G-09 readiness"
Write-Output "Project ref: $projectRef"
Write-Output "Linked DB run slug: $RunSlug"
Write-Output ""

Write-Check -Label "delivery.course_run table" -Passed $courseRunPresent -Detail "required for community_manifest"
Write-Check -Label "delivery.course_run.community_manifest column" -Passed $communityManifestColumnPresent -Detail "required for cohort community config"
Write-Check -Label "public.platform_course_community_v view" -Passed $communityViewPresent -Detail "required for public/live projections"
Write-Check -Label "community manifest validator trigger" -Passed $validatorTriggerPresent -Detail "required to reject incomplete enabled manifests"
Write-Check -Label "lti-launch function" -Passed $ltiLaunchActive -Detail ($(if ($ltiLaunchFunction) { "status=$($ltiLaunchFunction.status), version=$($ltiLaunchFunction.version)" } else { "not deployed" }))
Write-Check -Label "lti-mock-tool function" -Passed $ltiMockToolActive -Detail ($(if ($ltiMockToolFunction) { "status=$($ltiMockToolFunction.status), version=$($ltiMockToolFunction.version)" } else { "not deployed" }))
Write-Check -Label "admin-catalog function" -Passed $adminCatalogActive -Detail ($(if ($adminCatalogFunction) { "status=$($adminCatalogFunction.status), version=$($adminCatalogFunction.version)" } else { "not deployed" }))
Write-Check -Label "lti-launch platform-config endpoint" -Passed $platformConfigOk -Detail ($(if ($platformConfigOk) { "issuer=$($platformConfig.issuer)" } else { "not reachable or incomplete: $platformConfigUrl" }))
Write-Check -Label "lti-mock-tool meta endpoint" -Passed $mockMetaOk -Detail ($(if ($mockMetaOk) { "login_url=$($mockMeta.login_url)" } else { "not reachable or incomplete: $mockMetaUrl" }))
Write-Check -Label "course_run slug" -Passed ($null -ne $runRow) -Detail ($(if ($runRow) { $RunSlug } else { "not found" }))

if ($runRow) {
  Write-Check -Label "public community projection" -Passed ($publicViewCount -gt 0) -Detail "$publicViewCount row(s) in public.platform_course_community_v"
  Write-Check -Label "manifest enabled" -Passed $manifestEnabled -Detail ($(if ($manifestEnabled) { "enabled=true" } else { "enabled=false" }))
  Write-Check -Label "provider" -Passed ($provider -eq "discourse") -Detail ($(if ($provider) { $provider } else { "missing" }))
  Write-Check -Label "peer-review surface" -Passed $peerReviewReady -Detail "peer_review_enabled=$peerReviewEnabled; surface_modes=$($surfaceModes -join ',')"
  Write-Check -Label "lti.tool_mode" -Passed ($isMockMode -or $isCustomMode) -Detail ($(if ($toolMode) { $toolMode } else { "missing" }))
  Write-Check -Label "lti ids" -Passed $hasCoreLtiIds -Detail "client_id=$(if ($clientId) { $clientId } else { 'missing' }); deployment_id=$(if ($deploymentId) { $deploymentId } else { 'missing' }); resource_link_id=$(if ($resourceLinkId) { $resourceLinkId } else { 'missing' })"
  Write-Check -Label "live custom URLs" -Passed ($isCustomMode -and $customUrlsAreHttps -and -not $customUrlsAreMock) -Detail "login_initiation_url=$(if ($loginInitiationUrl) { $loginInitiationUrl } else { 'missing' }); target_link_uri=$(if ($targetLinkUri) { $targetLinkUri } else { 'missing' })"
  Write-Output "Community manifest: title=$(if ($title) { $title } else { 'missing' }), launch_presentation=$(if ($launchPresentation) { $launchPresentation } else { 'window/default' })"
}

foreach ($secretName in $RequiredLtiSecrets) {
  $present = $secretNames -contains $secretName
  Write-Check -Label "$secretName secret" -Passed $present -Detail "required for signed LTI launch runtime"
}

if ($PrintActivationHints) {
  Write-Output ""
  Write-Output "Community activation hints (do not commit real secrets):"
  Write-Output "  .\scripts\supabase-platform.ps1 secrets set LTI_PLATFORM_SHARED_SECRET=`"REDACTED_RANDOM_HS256_SECRET`" --project-ref $projectRef"
  Write-Output "  .\scripts\supabase-platform.ps1 secrets set LTI_PLATFORM_PRIVATE_JWK=`"{...REDACTED_RSA_PRIVATE_JWK...}`" --project-ref $projectRef"
  Write-Output ""
  Write-Output "  update delivery.course_run"
  Write-Output "  set community_manifest = private.normalize_course_run_community_manifest("
  Write-Output "    title,"
  Write-Output "    jsonb_build_object("
  Write-Output "      'enabled', true,"
  Write-Output "      'provider', 'discourse',"
  Write-Output "      'title', 'Comunidad de cohorte Power Skills',"
  Write-Output "      'summary', 'Foro privado de cohorte para preguntas, avances y peer-review con evidencia.',"
  Write-Output "      'entry_label', 'Abrir comunidad',"
  Write-Output "      'discussion_prompt', 'Comparte un avance real y pide una retroalimentacion concreta.',"
  Write-Output "      'peer_review_enabled', true,"
  Write-Output "      'surface_modes', jsonb_build_array('forum', 'peer_review'),"
  Write-Output "      'lti', jsonb_build_object("
  Write-Output "        'tool_mode', 'custom',"
  Write-Output "        'title', 'Discourse de cohorte',"
  Write-Output "        'login_initiation_url', 'https://DISCOURSE-LTI.example.com/lti/login',"
  Write-Output "        'target_link_uri', 'https://DISCOURSE-LTI.example.com/lti/launch',"
  Write-Output "        'client_id', 'CLIENT_ID_FROM_TOOL',"
  Write-Output "        'deployment_id', 'DEPLOYMENT_ID_FROM_TOOL',"
  Write-Output "        'resource_link_id', 'resource-community-$RunSlug',"
  Write-Output "        'launch_presentation', 'window',"
  Write-Output "        'custom_parameters', jsonb_build_object('provider', 'discourse', 'surface', 'community')"
  Write-Output "      )"
  Write-Output "    )"
  Write-Output "  )"
  Write-Output "  where slug = '$($RunSlug.Replace("'", "''"))';"
  Write-Output ""
  Write-Output "After the manifest points to the real tool, rerun:"
  Write-Output "  .\scripts\check-community-readiness.ps1 -ProjectRef $projectRef -RunSlug $RunSlug -RequireLiveCommunity"
}

$failures = @()
if (-not $courseRunPresent) { $failures += "missing delivery.course_run" }
if (-not $communityManifestColumnPresent) { $failures += "missing delivery.course_run.community_manifest" }
if (-not $communityViewPresent) { $failures += "missing public.platform_course_community_v" }
if (-not $validatorTriggerPresent) { $failures += "missing community manifest validator trigger" }
if (-not $ltiLaunchActive) { $failures += "lti-launch is not ACTIVE" }
if (-not $adminCatalogActive) { $failures += "admin-catalog is not ACTIVE" }
if (-not $platformConfigOk) { $failures += "lti-launch platform-config endpoint incomplete" }
if ($null -eq $runRow) { $failures += "course_run not found: $RunSlug" }
if ($runRow -and $publicViewCount -le 0) { $failures += "public community projection missing for $RunSlug" }
if ($runRow -and -not $manifestEnabled) { $failures += "community_manifest.enabled=false" }
if ($runRow -and $provider -ne "discourse") { $failures += "community_manifest.provider is not discourse" }
if ($runRow -and -not $peerReviewReady) { $failures += "peer_review surface is not enabled" }
if ($runRow -and -not $hasCoreLtiIds) { $failures += "missing community LTI ids" }
if ($runRow -and -not $isCustomMode) { $failures += "community lti.tool_mode=$toolMode (expected custom)" }
if ($runRow -and -not $customUrlsAreHttps) { $failures += "community custom LTI URLs must be https" }
if ($runRow -and $customUrlsAreMock) { $failures += "community custom LTI URLs still point to lti-mock-tool" }
foreach ($missingSecret in $missingRequiredSecrets) {
  $failures += "remote secret not found: $missingSecret"
}

if ($RequireLiveCommunity -and $failures.Count -gt 0) {
  throw "Community live config incomplete: $($failures -join '; ')"
}

Write-Output "Community readiness check completed."
