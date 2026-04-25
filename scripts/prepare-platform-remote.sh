#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
PLATFORM_ROOT="$PROJECT_ROOT/campus-platform"
PLATFORM_SUPABASE_ROOT="$PLATFORM_ROOT/supabase"
SUPABASE_WRAPPER="$SCRIPT_DIR/supabase-platform.sh"
LOCAL_SUPABASE="$PLATFORM_ROOT/node_modules/.bin/supabase"

PROJECT_REF=${1:-${PROJECT_REF:-}}
SITE_URL=${2:-${SITE_URL:-}}
FUNCTIONS_ENV_FILE=${FUNCTIONS_ENV_FILE:-"$PLATFORM_SUPABASE_ROOT/.env.functions"}
FRONTEND_ENV_FILE=${FRONTEND_ENV_FILE:-"$PLATFORM_ROOT/.env.production"}

if [ -z "$PROJECT_REF" ] || [ -z "$SITE_URL" ]; then
  echo "Usage: PROJECT_REF=<ref> SITE_URL=<url> sh scripts/prepare-platform-remote.sh"
  exit 1
fi

for path in \
  "$PLATFORM_ROOT/README-DEPLOY.md" \
  "$PLATFORM_ROOT/.env.production.example" \
  "$PLATFORM_SUPABASE_ROOT/.env.functions.example" \
  "$PLATFORM_SUPABASE_ROOT/config.toml"
do
  if [ ! -f "$path" ]; then
    echo "Missing required path: $path"
    exit 1
  fi
done

echo "Campus Platform v3 remote deploy plan"
echo "Project ref: $PROJECT_REF"
echo "Site URL: $SITE_URL"
echo "Frontend env file: $FRONTEND_ENV_FILE"
echo "Functions env file: $FUNCTIONS_ENV_FILE"
echo

if [ -x "$LOCAL_SUPABASE" ]; then
  echo "Detected local Supabase CLI: $LOCAL_SUPABASE"
  "$LOCAL_SUPABASE" --version
  echo
else
  echo "Warning: local Supabase CLI is not installed yet. Run npm install inside campus-platform."
  echo
fi

echo "1. Prepare frontend env:"
echo "   Copy $PLATFORM_ROOT/.env.production.example -> $FRONTEND_ENV_FILE"
echo "   Ensure PUBLIC_CAMPUS_PLATFORM_MODE=live"
echo "   Ensure PUBLIC_CAMPUS_PLATFORM_SITE_URL=$SITE_URL"
echo

echo "2. Prepare function secrets:"
echo "   Copy $PLATFORM_SUPABASE_ROOT/.env.functions.example -> $FUNCTIONS_ENV_FILE"
echo "   Fill PLATFORM_BOOTSTRAP_ADMIN_EMAILS and provider secrets"
echo

echo "3. Supabase remote commands:"
echo "   sh \"$SUPABASE_WRAPPER\" login"
echo "   sh \"$SUPABASE_WRAPPER\" link --project-ref $PROJECT_REF"
echo "   sh \"$SUPABASE_WRAPPER\" db push --dry-run"
echo "   sh \"$SUPABASE_WRAPPER\" db push --include-seed"
echo "   sh \"$SUPABASE_WRAPPER\" config push --project-ref $PROJECT_REF"
echo "   sh \"$SUPABASE_WRAPPER\" secrets set --env-file \"$FUNCTIONS_ENV_FILE\" --project-ref $PROJECT_REF"
echo "   sh \"$SUPABASE_WRAPPER\" secrets list --project-ref $PROJECT_REF"
echo "   sh \"$SUPABASE_WRAPPER\" functions deploy --project-ref $PROJECT_REF"
echo

echo "4. Frontend build and publish:"
echo "   cd \"$PLATFORM_ROOT\""
echo "   npm run build"
echo "   Publish dist/ to the static host"
echo

echo "5. Post-deploy smoke test:"
echo "   /acceso -> /portal -> completar bloque -> verificar FSRS -> emitir badge -> /verify/<token>"
echo "   Also test /verify/?token=<token>, run-open and ical-feed"
