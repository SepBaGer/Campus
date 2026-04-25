#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
PLATFORM_ROOT="$PROJECT_ROOT/campus-platform"

cd "$PLATFORM_ROOT"
npm run supabase -- "$@"
