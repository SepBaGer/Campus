#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
ENV_TARGET=${JM_ENV_TARGET:-codex}
INCLUDE_VESTIGIAL_BACKUP=${JM_INCLUDE_VESTIGIAL_BACKUP:-0}

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

echo "Doctor mode: repo"
echo "Environment target: $ENV_TARGET"

JM_ENV_TARGET="$ENV_TARGET" sh "$SCRIPT_DIR/check-capabilities.sh"

(
  cd "$PROJECT_ROOT"
  "$PYTHON_CMD" -m unittest discover -s tests
)

(
  cd "$PROJECT_ROOT/campus-platform"
  npm run test
  npm run build
)

if [ "$INCLUDE_VESTIGIAL_BACKUP" = "1" ]; then
  (
    cd "$PROJECT_ROOT/campus-v2"
    npm run build
  )
else
  echo "SKIP cmd: campus-v2 build (vestigial backup validation not requested)"
fi

echo "Doctor completed successfully."
