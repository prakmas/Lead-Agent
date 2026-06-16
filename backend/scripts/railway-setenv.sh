#!/usr/bin/env bash
#
# Pushes all variables from backend/.env into the linked Railway service.
# Run this AFTER `railway login` and `railway init` (or `railway link`).
#
# Usage:  cd backend && ./scripts/railway-setenv.sh
#
# Notes:
#   - PORT is skipped (Railway provides it automatically).
#   - NODE_ENV is forced to "production".
#   - CLIENT_URL is left as-is; update it to your Vercel URL after deploying the
#     frontend (railway variables --set "CLIENT_URL=https://your-app.vercel.app").
#
set -euo pipefail

ENV_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Cannot find $ENV_FILE"
  exit 1
fi

if ! command -v railway >/dev/null 2>&1; then
  echo "railway CLI not found. Install with: brew install railway"
  exit 1
fi

echo "Pushing variables from $ENV_FILE to Railway..."

# Always run in production mode on the server.
railway variables --set "NODE_ENV=production" >/dev/null
echo "  set NODE_ENV=production"

while IFS= read -r line || [[ -n "$line" ]]; do
  # Skip blanks and comments.
  [[ -z "$line" || "$line" == \#* ]] && continue
  # Must look like KEY=VALUE.
  [[ "$line" != *=* ]] && continue

  key="${line%%=*}"
  value="${line#*=}"

  # Skip the ones Railway manages or we override.
  case "$key" in
    PORT|NODE_ENV) continue ;;
  esac

  # Skip empty values to avoid clobbering with blanks.
  [[ -z "$value" ]] && continue

  railway variables --set "$key=$value" >/dev/null
  echo "  set $key"
done < "$ENV_FILE"

echo "Done. Verify with: railway variables"
