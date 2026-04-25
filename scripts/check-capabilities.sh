#!/bin/sh
set -eu

ENV_TARGET=${JM_ENV_TARGET:-codex}
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
HOME_ROOT=${HOME:-}
CODEX_CONFIG="$HOME_ROOT/.codex/config.toml"
CLAUDE_SETTINGS="$HOME_ROOT/.claude/settings.json"
DESKTOP_CONFIG="$HOME_ROOT/Library/Application Support/Claude/claude_desktop_config.json"
FAILURES=0

check_file() {
  if [ -f "$1" ]; then
    echo "OK  file: $2"
  else
    echo "MISS file: $2 ($1)"
    FAILURES=$((FAILURES + 1))
  fi
}

check_cmd() {
  if command -v "$1" >/dev/null 2>&1; then
    echo "OK  cmd: $1"
  else
    echo "MISS cmd: $1"
    FAILURES=$((FAILURES + 1))
  fi
}

check_contains() {
  if [ -f "$1" ] && grep -Fq "$2" "$1"; then
    echo "OK  match: $2 in $1"
  else
    echo "MISS match: $2 in $1"
    FAILURES=$((FAILURES + 1))
  fi
}

resolve_python_cmd() {
  for candidate in python3 python; do
    if command -v "$candidate" >/dev/null 2>&1; then
      echo "$candidate"
      return 0
    fi
  done
  echo "python3"
  return 1
}

PYTHON_CMD=$(resolve_python_cmd)

for rel in \
  AGENTS.md \
  CLAUDE.md \
  CONSTITUTION.md \
  README.md \
  .jm-adk.json \
  session-state.template.json \
  profiles/capabilities/capability-manifest.json \
  profiles/codex/config.template.toml \
  profiles/claude/settings.template.json \
  profiles/claude/settings.local.template.json \
  profiles/desktop/claude_desktop_config.template.json \
  contracts/shared-sync-allowlist.json \
  scripts/doctor.ps1 \
  scripts/doctor.sh \
  scripts/check-capabilities.ps1 \
  scripts/check-capabilities.sh \
  scripts/check-enterprise-sso.ps1 \
  scripts/check-oneroster-readiness.ps1 \
  scripts/check-notifications-readiness.ps1 \
  scripts/check-community-readiness.ps1 \
  scripts/check-cutover-readiness.ps1 \
  scripts/smoke-m1-live-no-stripe.ps1 \
  scripts/smoke-pedagogy-risk-live.ps1 \
  scripts/smoke-teacher-reporting-live.ps1 \
  scripts/smoke-dsar-dedicated.ps1 \
  tests/test_repo_contracts.py \
  specs/README.md \
  campus-platform/package.json \
  campus-platform/README.md \
  campus-platform/RELEASE-NO-STRIPE.md \
  campus-platform/lighthouserc.cjs \
  campus-platform/scripts/run-a11y.mjs \
  campus-platform/scripts/run-lhci.mjs \
  campus-platform/scripts/lhci-puppeteer.cjs \
  campus-platform/src/lib/web-vitals-rum.ts \
  campus-platform/supabase/README.md \
  campus-platform/supabase/config.toml \
  campus-platform/supabase/.env.functions.example \
  campus-platform/supabase/migrations/20260425035000_platform_v3_web_vitals_rum.sql \
  campus-platform/supabase/migrations/20260425131710_platform_v3_student_risk_security_invoker.sql \
  campus-platform/supabase/migrations/20260425134314_platform_v3_teacher_reporting_realtime.sql \
  campus-platform/supabase/functions/rum-web-vitals/index.ts \
  campus-v2/package.json \
  campus-v2/README-DEPLOY.md
do
  check_file "$PROJECT_ROOT/$rel" "$rel"
done

check_cmd node
check_cmd npm
check_cmd "$PYTHON_CMD"

check_contains "$PROJECT_ROOT/profiles/codex/config.template.toml" '[mcp_servers.playwright]'
check_contains "$PROJECT_ROOT/profiles/codex/config.template.toml" '[plugins."github@openai-curated"]'
check_contains "$PROJECT_ROOT/profiles/desktop/claude_desktop_config.template.json" '"playwright"'
check_contains "$PROJECT_ROOT/profiles/claude/settings.template.json" '"github@claude-plugins-official": true'

case "$ENV_TARGET" in
  codex)
    if [ -f "$CODEX_CONFIG" ]; then
      echo "OK  file: $CODEX_CONFIG"
    else
      echo "WARN file: $CODEX_CONFIG (operator-local config not found; repo template validated)"
    fi
    ;;
  claude-desktop)
    if [ -f "$DESKTOP_CONFIG" ]; then
      echo "OK  file: $DESKTOP_CONFIG"
    else
      echo "WARN file: $DESKTOP_CONFIG (desktop runtime not configured locally; repo template validated)"
    fi
    if [ -f "$CLAUDE_SETTINGS" ]; then
      echo "OK  file: $CLAUDE_SETTINGS"
    else
      echo "WARN file: $CLAUDE_SETTINGS (operator-local settings not found; repo template validated)"
    fi
    ;;
  *)
    echo "Unknown JM_ENV_TARGET: $ENV_TARGET"
    exit 1
    ;;
esac

if [ "$FAILURES" -ne 0 ]; then
  echo "Capability checks failed for $ENV_TARGET with $FAILURES issue(s)."
  exit 1
fi

echo "Capability checks completed for $ENV_TARGET."
