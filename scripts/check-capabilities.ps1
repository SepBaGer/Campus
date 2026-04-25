param(
  [ValidateSet("codex", "claude-desktop")]
  [string]$Environment = "codex"
)

$ErrorActionPreference = "Stop"
$script:Failures = 0

function Resolve-HomeRoot {
  if ($env:USERPROFILE) { return $env:USERPROFILE }
  if ($HOME) { return $HOME }
  throw "Unable to resolve home directory."
}

function Resolve-PythonCommand {
  foreach ($candidate in @("python3", "python")) {
    $command = Get-Command $candidate -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }
  }
  throw "Missing Python 3 interpreter (`python3` or `python`)."
}

function Assert-File {
  param([string]$Path, [string]$Label = $Path)
  if (Test-Path -LiteralPath $Path -PathType Leaf) {
    Write-Output "OK  file: $Label"
    return
  }
  Write-Output "MISS file: $Label ($Path)"
  $script:Failures += 1
}

function Assert-Command {
  param([string]$Name)
  if (Get-Command $Name -ErrorAction SilentlyContinue) {
    Write-Output "OK  cmd: $Name"
    return
  }
  Write-Output "MISS cmd: $Name"
  $script:Failures += 1
}

function Assert-Contains {
  param([string]$Path, [string]$Pattern)
  if (
    (Test-Path -LiteralPath $Path -PathType Leaf) -and
    (Select-String -Path $Path -SimpleMatch -Pattern $Pattern -Quiet)
  ) {
    Write-Output "OK  match: $Pattern in $Path"
    return
  }
  Write-Output "MISS match: $Pattern in $Path"
  $script:Failures += 1
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$homeRoot = Resolve-HomeRoot
$pythonCommand = Resolve-PythonCommand
$codexConfig = Join-Path $homeRoot ".codex\config.toml"
$claudeSettings = Join-Path $homeRoot ".claude\settings.json"
$desktopConfig = if ($env:APPDATA) {
  Join-Path $env:APPDATA "Claude\claude_desktop_config.json"
} else {
  Join-Path $homeRoot "Library/Application Support/Claude/claude_desktop_config.json"
}

$requiredRepoFiles = @(
  "AGENTS.md",
  "CLAUDE.md",
  "CONSTITUTION.md",
  "README.md",
  ".jm-adk.json",
  "session-state.template.json",
  "profiles\capabilities\capability-manifest.json",
  "profiles\codex\config.template.toml",
  "profiles\claude\settings.template.json",
  "profiles\claude\settings.local.template.json",
  "profiles\desktop\claude_desktop_config.template.json",
  "contracts\shared-sync-allowlist.json",
  "scripts\doctor.ps1",
  "scripts\doctor.sh",
  "scripts\check-capabilities.ps1",
  "scripts\check-capabilities.sh",
  "scripts\check-enterprise-sso.ps1",
  "scripts\check-oneroster-readiness.ps1",
  "scripts\check-notifications-readiness.ps1",
  "scripts\check-community-readiness.ps1",
  "scripts\check-cutover-readiness.ps1",
  "scripts\smoke-m1-live-no-stripe.ps1",
  "scripts\smoke-pedagogy-risk-live.ps1",
  "scripts\smoke-teacher-reporting-live.ps1",
  "scripts\smoke-dsar-dedicated.ps1",
  "tests\test_repo_contracts.py",
  "specs\README.md",
  "campus-platform\package.json",
  "campus-platform\README.md",
  "campus-platform\RELEASE-NO-STRIPE.md",
  "campus-platform\lighthouserc.cjs",
  "campus-platform\scripts\run-a11y.mjs",
  "campus-platform\scripts\run-lhci.mjs",
  "campus-platform\scripts\lhci-puppeteer.cjs",
  "campus-platform\src\lib\web-vitals-rum.ts",
  "campus-platform\supabase\README.md",
  "campus-platform\supabase\config.toml",
  "campus-platform\supabase\.env.functions.example",
  "campus-platform\supabase\migrations\20260425035000_platform_v3_web_vitals_rum.sql",
  "campus-platform\supabase\migrations\20260425131710_platform_v3_student_risk_security_invoker.sql",
  "campus-platform\supabase\migrations\20260425134314_platform_v3_teacher_reporting_realtime.sql",
  "campus-platform\supabase\functions\rum-web-vitals\index.ts",
  "campus-v2\package.json",
  "campus-v2\README-DEPLOY.md"
)

foreach ($relativePath in $requiredRepoFiles) {
  Assert-File -Path (Join-Path $projectRoot $relativePath) -Label $relativePath
}

Assert-Command -Name "node"
Assert-Command -Name "npm"
Write-Output "OK  cmd: $pythonCommand"

$codexTemplate = Join-Path $projectRoot "profiles\codex\config.template.toml"
$desktopTemplate = Join-Path $projectRoot "profiles\desktop\claude_desktop_config.template.json"
$claudeTemplate = Join-Path $projectRoot "profiles\claude\settings.template.json"

Assert-Contains -Path $codexTemplate -Pattern '[mcp_servers.playwright]'
Assert-Contains -Path $codexTemplate -Pattern '[plugins."github@openai-curated"]'
Assert-Contains -Path $desktopTemplate -Pattern '"playwright"'
Assert-Contains -Path $claudeTemplate -Pattern '"github@claude-plugins-official": true'

switch ($Environment) {
  "codex" {
    if (Test-Path -LiteralPath $codexConfig -PathType Leaf) {
      Write-Output "OK  file: $codexConfig"
    } else {
      Write-Output "WARN file: $codexConfig (operator-local config not found; repo template validated)"
    }
  }
  "claude-desktop" {
    if (Test-Path -LiteralPath $desktopConfig -PathType Leaf) {
      Write-Output "OK  file: $desktopConfig"
    } else {
      Write-Output "WARN file: $desktopConfig (desktop runtime not configured locally; repo template validated)"
    }
    if (Test-Path -LiteralPath $claudeSettings -PathType Leaf) {
      Write-Output "OK  file: $claudeSettings"
    } else {
      Write-Output "WARN file: $claudeSettings (operator-local settings not found; repo template validated)"
    }
  }
}

if ($script:Failures -gt 0) {
  throw "Capability checks failed for $Environment with $($script:Failures) issue(s)."
}

Write-Output "Capability checks completed for $Environment."
