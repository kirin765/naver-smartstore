#!/usr/bin/env bash

set -euo pipefail

SCRIPT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_ROOT/.." && pwd)"
APP_DIR="${1:-$REPO_ROOT/apps/web}"
DRY_RUN="${2:-0}"

if [ "$DRY_RUN" != "0" ] && [ "$DRY_RUN" != "1" ]; then
  echo "Usage: $0 [APP_DIR] [DRY_RUN=0|1]"
  echo "  APP_DIR   - Vercel app directory (default: ./apps/web)"
  echo "  DRY_RUN   - 0: apply, 1: print-only (default: 0)"
  exit 1
fi

if [ ! -d "$APP_DIR" ]; then
  echo "Error: APP_DIR '$APP_DIR' does not exist."
  exit 1
fi

if [ "${VERCEL_TOKEN:-}" = "" ] || [ "${VERCEL_SCOPE:-}" = "" ]; then
  echo "Error: VERCEL_TOKEN and VERCEL_SCOPE are required."
  echo "Example: export VERCEL_TOKEN=...; export VERCEL_SCOPE=team-slug-or-id"
  exit 1
fi

if [ "${VERCEL_PROJECT_ID:-}" = "" ] && [ "${VERCEL_STAGING_PROJECT_ID:-}" = "" ] && [ "${VERCEL_PREVIEW_PROJECT_ID:-}" = "" ]; then
  echo "Error: at least one of VERCEL_PROJECT_ID, VERCEL_STAGING_PROJECT_ID, VERCEL_PREVIEW_PROJECT_ID must be set."
  exit 1
fi

if ! command -v npx >/dev/null 2>&1; then
  echo "Error: npx is required."
  exit 1
fi

run_vercel() {
  local cmd=("$@")
  if [ "$DRY_RUN" = "1" ]; then
    printf '[dry-run] %s\n' "${cmd[*]}"
    return 0
  fi
  "${cmd[@]}"
}

tmp_global_dir="$(mktemp -d)"
cleanup() {
  rm -rf "$tmp_global_dir"
}
trap cleanup EXIT

run_for_env() {
  local project_id="$1"
  local project_name="$2"
  local -n var_map=$3

  local link_cmd=(npx vercel link --yes --project "$project_id" --scope "$VERCEL_SCOPE" --token "$VERCEL_TOKEN" --cwd "$APP_DIR" --global-config "$tmp_global_dir")
  run_vercel "${link_cmd[@]}"

  for key in "${!var_map[@]}"; do
    local settings="${var_map[$key]}"
    IFS='|' read -r _value_is_required _value_is_sensitive _targets _unused <<< "$settings"
    local value="${!key:-}"
    local is_required="$_value_is_required"
    local is_sensitive="$_value_is_sensitive"
    local targets="$_targets"

    if [ -z "$value" ] && [ "$is_required" = "required" ]; then
      echo "Error: required variable '$key' is missing."
      return 1
    fi

    if [ -z "$value" ]; then
      echo "[skip] $project_name - $key (not set)"
      continue
    fi

    local sensitive_flag=()
    if [ "$is_sensitive" = "true" ]; then
      sensitive_flag=(--sensitive)
    fi

    if [ -z "$targets" ]; then
      continue
    fi

    for target in ${targets//,/ }; do
      echo "[set] $project_name - $key -> $target"
      local add_cmd=(npx vercel env add "$key" "$target" --value "$value" --yes --force "${sensitive_flag[@]}" --scope "$VERCEL_SCOPE" --token "$VERCEL_TOKEN" --cwd "$APP_DIR" --global-config "$tmp_global_dir")
      run_vercel "${add_cmd[@]}"
    done
  done
}

declare -A PRODUCTION_VARS
PRODUCTION_VARS=(
  [NEXT_PUBLIC_SUPABASE_URL]="required|false|production,preview,development|"
  [NEXT_PUBLIC_SUPABASE_ANON_KEY]="required|false|production,preview,development|"
  [OPENAI_API_KEY]="required|true|production,preview,development|"
  [NEXT_PUBLIC_APP_URL]="required|false|production,preview,development|"
  [SUPABASE_SERVICE_ROLE_KEY]="required|true|production,preview,development|"
  [PADDLE_CHECKOUT_URL]="required|false|production,preview,development|"
  [PADDLE_WEBHOOK_SECRET]="required|true|production,preview,development|"
  [PADDLE_API_TOKEN]="optional|true|production,preview,development|"
  [PADDLE_VENDOR_ID]="optional|true|production,preview,development|"
)

declare -A STAGING_VARS
STAGING_VARS=(
  [NEXT_PUBLIC_SUPABASE_URL]="required|false|production,development|"
  [NEXT_PUBLIC_SUPABASE_ANON_KEY]="required|false|production,development|"
  [OPENAI_API_KEY]="required|true|production,development|"
  [NEXT_PUBLIC_APP_URL]="required|false|production,development|"
  [SUPABASE_SERVICE_ROLE_KEY]="required|true|production,development|"
  [PADDLE_CHECKOUT_URL]="required|false|production,development|"
  [PADDLE_WEBHOOK_SECRET]="required|true|production,development|"
  [PADDLE_API_TOKEN]="optional|true|production,development|"
  [PADDLE_VENDOR_ID]="optional|true|production,development|"
)

declare -A PREVIEW_VARS
PREVIEW_VARS=(
  [NEXT_PUBLIC_SUPABASE_URL]="required|false|preview,development|"
  [NEXT_PUBLIC_SUPABASE_ANON_KEY]="required|false|preview,development|"
  [OPENAI_API_KEY]="required|true|preview,development|"
  [NEXT_PUBLIC_APP_URL]="required|false|preview,development|"
  [SUPABASE_SERVICE_ROLE_KEY]="required|true|preview,development|"
  [PADDLE_CHECKOUT_URL]="required|false|preview,development|"
  [PADDLE_WEBHOOK_SECRET]="required|true|preview,development|"
  [PADDLE_API_TOKEN]="optional|true|preview,development|"
  [PADDLE_VENDOR_ID]="optional|true|preview,development|"
)

if [ -n "${VERCEL_PROJECT_ID:-}" ]; then
  run_for_env "$VERCEL_PROJECT_ID" "production" PRODUCTION_VARS
fi

if [ -n "${VERCEL_STAGING_PROJECT_ID:-}" ]; then
  run_for_env "$VERCEL_STAGING_PROJECT_ID" "staging" STAGING_VARS
fi

if [ -n "${VERCEL_PREVIEW_PROJECT_ID:-}" ]; then
  run_for_env "$VERCEL_PREVIEW_PROJECT_ID" "preview" PREVIEW_VARS
fi

echo "Vercel environment bootstrap completed."
