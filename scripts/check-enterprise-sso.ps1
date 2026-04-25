param(
  [string]$ProjectRef = "",
  [string]$ExpectedDomain = "",
  [string]$ExpectedProviderId = "",
  [switch]$RequireProvider,
  [switch]$PrintFrontendEnv
)

$ErrorActionPreference = "Stop"

function Resolve-ProjectRef {
  param([string]$ExplicitProjectRef)

  if (-not [string]::IsNullOrWhiteSpace($ExplicitProjectRef)) {
    return $ExplicitProjectRef
  }

  if (-not [string]::IsNullOrWhiteSpace($env:CAMPUS_SUPABASE_PROJECT_REF)) {
    return $env:CAMPUS_SUPABASE_PROJECT_REF
  }

  return "exyewjzckgsesrsuqueh"
}

function ConvertTo-Slug {
  param([string]$Value)
  return (($Value.ToLowerInvariant() -replace "[^a-z0-9]+", "-") -replace "^-+|-+$", "")
}

function Invoke-SupabaseJson {
  param(
    [string]$SupabaseCli,
    [string]$SupabaseRoot,
    [string[]]$CliArguments
  )

  Push-Location $SupabaseRoot
  try {
    $output = & $SupabaseCli @CliArguments
    if ($LASTEXITCODE -ne 0) {
      throw "Supabase CLI failed: $($CliArguments -join ' ')"
    }
  }
  finally {
    Pop-Location
  }

  $text = (($output | Out-String).Trim())
  $start = $text.IndexOf("{")
  $end = $text.LastIndexOf("}")
  if ($start -lt 0 -or $end -lt $start) {
    throw "Supabase CLI did not return JSON for: $($CliArguments -join ' ')"
  }

  return $text.Substring($start, $end - $start + 1) | ConvertFrom-Json
}

function Test-JsonContains {
  param(
    [object]$Value,
    [string]$Needle
  )

  if ([string]::IsNullOrWhiteSpace($Needle)) {
    return $true
  }

  $json = $Value | ConvertTo-Json -Depth 30
  return $json -like "*$Needle*"
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$platformRoot = Join-Path $projectRoot "campus-platform"
$supabaseRoot = Join-Path $platformRoot "supabase"
$supabaseCli = Join-Path $platformRoot "node_modules\supabase\bin\supabase.exe"
$projectRef = Resolve-ProjectRef -ExplicitProjectRef $ProjectRef

if (-not (Test-Path -LiteralPath $supabaseCli -PathType Leaf)) {
  throw "Missing local Supabase CLI. Run npm install inside campus-platform first."
}

$info = Invoke-SupabaseJson -SupabaseCli $supabaseCli -SupabaseRoot $supabaseRoot -CliArguments @(
  "sso", "info", "--project-ref", $projectRef, "-o", "json"
)
$list = Invoke-SupabaseJson -SupabaseCli $supabaseCli -SupabaseRoot $supabaseRoot -CliArguments @(
  "sso", "list", "--project-ref", $projectRef, "-o", "json"
)

$providers = @($list.providers)
$domainMatches = Test-JsonContains -Value $providers -Needle $ExpectedDomain
$providerMatches = Test-JsonContains -Value $providers -Needle $ExpectedProviderId

Write-Output "Campus Enterprise SSO / SAML readiness"
Write-Output "Project ref: $projectRef"
Write-Output "ACS URL: $($info.acs_url)"
Write-Output "Entity ID: $($info.entity_id)"
Write-Output "Relay state: $($info.relay_state)"
Write-Output "Providers registered: $($providers.Count)"

if (-not [string]::IsNullOrWhiteSpace($ExpectedDomain)) {
  if ($domainMatches) {
    Write-Output "OK  expected domain present: $ExpectedDomain"
  } else {
    Write-Output "MISS expected domain present: $ExpectedDomain"
  }
}

if (-not [string]::IsNullOrWhiteSpace($ExpectedProviderId)) {
  if ($providerMatches) {
    Write-Output "OK  expected provider id present: $ExpectedProviderId"
  } else {
    Write-Output "MISS expected provider id present: $ExpectedProviderId"
  }
}

if ($PrintFrontendEnv) {
  $connection = $null
  if (-not [string]::IsNullOrWhiteSpace($ExpectedProviderId)) {
    $connection = @{
      slug = "enterprise-saml-$((ConvertTo-Slug -Value $ExpectedProviderId))"
      label = "Enterprise | SAML SSO"
      vendor = "custom"
      providerId = $ExpectedProviderId
      hint = "Acceso corporativo via SAML 2.0"
    }
  } elseif (-not [string]::IsNullOrWhiteSpace($ExpectedDomain)) {
    $connection = @{
      slug = "enterprise-saml-$((ConvertTo-Slug -Value $ExpectedDomain))"
      label = "Enterprise | SAML SSO"
      vendor = "custom"
      domain = $ExpectedDomain
      hint = "Acceso corporativo via SAML 2.0"
    }
  }

  if ($connection) {
    $json = @($connection) | ConvertTo-Json -Compress
    Write-Output "PUBLIC_CAMPUS_PLATFORM_SSO_CONNECTIONS=$json"
  }
}

Write-Output ""
Write-Output "Strict SAML add command template:"
Write-Output "  .\scripts\supabase-platform.ps1 sso add --type saml --project-ref $projectRef --metadata-url 'https://CLIENT-IDP/metadata' --domains CLIENT-DOMAIN --attribute-mapping-file 'campus-platform\supabase\sso\attribute-mapping.enterprise.example.json'"

if ($RequireProvider -and $providers.Count -eq 0) {
  throw "No SAML SSO providers are registered in project $projectRef."
}

if ($RequireProvider -and -not [string]::IsNullOrWhiteSpace($ExpectedDomain) -and -not $domainMatches) {
  throw "Expected SAML domain not found: $ExpectedDomain"
}

if ($RequireProvider -and -not [string]::IsNullOrWhiteSpace($ExpectedProviderId) -and -not $providerMatches) {
  throw "Expected SAML provider id not found: $ExpectedProviderId"
}

Write-Output "Enterprise SSO readiness check completed."
