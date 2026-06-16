#!/usr/bin/env bash
#
# Pushes all variables from frontend/.env.local into the linked Railway service.
# Run AFTER `railway login` and `railway init` (or `railway link`).
#
# Usage:  cd frontend && ./scripts/railway-setenv.sh
#
# Notes:
#   - PORT is skipped (Railway provides it automatically).
#   - NODE_ENV is forced to "production".
#   - Update CLIENT_URL afterwards to your deployed URL:
#       railway variables --set "CLIENT_URL=https://your-app.up.railway.app"
#
set -euo pipefail

ENV_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/.env.local"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Cannot find $ENV_FILE"
  exit 1
fi

if ! command -v railway >/dev/null 2>&1; then
  echo "railway CLI not found. Install with: brew install railway"
  exit 1
fi

echo "Pushing variables from $ENV_FILE to Railway..."
railway variables --set "NODE_ENV=production" >/dev/null
echo "  set NODE_ENV=production"

while IFS= read -r line || [[ -n "$line" ]]; do
  [[ -z "$line" || "$line" == \#* ]] && continue
  [[ "$line" != *=* ]] && continue

  key="${line%%=*}"
  value="${line#*=}"

  case "$key" in
    PORT|NODE_ENV) continue ;;
  esac

  [[ -z "$value" ]] && continue

  railway variables --set "$key=$value" >/dev/null
  echo "  set $key"
done < "$ENV_FILE"

echo "Done. Verify with: railway variables"
