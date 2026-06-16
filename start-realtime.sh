#!/usr/bin/env bash
#
# Starts the CRR app (single Next.js project) + a public Cloudflare tunnel and
# prints the values to paste into the Meta WhatsApp webhook configuration.
#
# Usage:  ./start-realtime.sh
# Stop:   Ctrl+C  (stops both the app and the tunnel)
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$ROOT_DIR/frontend"
PORT="${PORT:-3000}"
TUNNEL_LOG="/tmp/crr_tunnel.log"

VERIFY_TOKEN="$(grep -E '^META_VERIFY_TOKEN=' "$APP_DIR/.env.local" | cut -d= -f2-)"

cleanup() {
  echo ""
  echo "Shutting down..."
  [[ -n "${TUNNEL_PID:-}" ]] && kill "$TUNNEL_PID" 2>/dev/null || true
  [[ -n "${APP_PID:-}" ]] && kill "$APP_PID" 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t 2>/dev/null | xargs -r kill 2>/dev/null || true

echo "Starting the app on http://localhost:$PORT ..."
( cd "$APP_DIR" && npm run dev ) &
APP_PID=$!

for _ in $(seq 1 30); do
  if curl -s "http://localhost:$PORT/api/health" >/dev/null 2>&1; then break; fi
  sleep 1
done

echo "Starting Cloudflare tunnel ..."
: > "$TUNNEL_LOG"
cloudflared tunnel --url "http://localhost:$PORT" > "$TUNNEL_LOG" 2>&1 &
TUNNEL_PID=$!

PUBLIC_URL=""
for _ in $(seq 1 30); do
  PUBLIC_URL="$(grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' "$TUNNEL_LOG" | head -1 || true)"
  [[ -n "$PUBLIC_URL" ]] && break
  sleep 1
done

if [[ -z "$PUBLIC_URL" ]]; then
  echo "Could not obtain a tunnel URL. Check $TUNNEL_LOG"
  cleanup
fi

cat <<EOF

============================================================
  CRR is LIVE and reachable from the internet
============================================================

  Paste into Meta -> WhatsApp -> Configuration -> Webhook:

  Callback URL:   $PUBLIC_URL/api/webhooks/meta
  Verify token:   $VERIFY_TOKEN

  Then click "Verify and save" and subscribe to "messages".

  Dashboard:      http://localhost:$PORT
  Public health:  $PUBLIC_URL/api/health

  NOTE: this trycloudflare.com URL changes every run.
  For a permanent URL, deploy to Railway (see DEPLOY.md).

  Press Ctrl+C to stop.
============================================================

EOF

wait
