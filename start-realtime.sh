#!/usr/bin/env bash
#
# Starts the CRR backend + a public Cloudflare tunnel and prints the exact
# values to paste into the Meta WhatsApp webhook configuration.
#
# Usage:  ./start-realtime.sh
# Stop:   Ctrl+C  (stops both the tunnel and the backend)
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
PORT="${PORT:-5055}"
TUNNEL_LOG="/tmp/crr_tunnel.log"

# Read the verify token straight from backend/.env so it always matches.
VERIFY_TOKEN="$(grep -E '^META_VERIFY_TOKEN=' "$BACKEND_DIR/.env" | cut -d= -f2-)"

cleanup() {
  echo ""
  echo "Shutting down..."
  [[ -n "${TUNNEL_PID:-}" ]] && kill "$TUNNEL_PID" 2>/dev/null || true
  [[ -n "${BACKEND_PID:-}" ]] && kill "$BACKEND_PID" 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

# Free the port if something is already on it.
lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t 2>/dev/null | xargs -r kill 2>/dev/null || true

echo "Starting backend on http://localhost:$PORT ..."
( cd "$BACKEND_DIR" && PORT="$PORT" npm start ) &
BACKEND_PID=$!

# Wait for the backend to answer.
for _ in $(seq 1 20); do
  if curl -s "http://localhost:$PORT/api/health" >/dev/null 2>&1; then break; fi
  sleep 1
done

echo "Starting Cloudflare tunnel ..."
: > "$TUNNEL_LOG"
cloudflared tunnel --url "http://localhost:$PORT" > "$TUNNEL_LOG" 2>&1 &
TUNNEL_PID=$!

# Wait for the public URL to appear in the tunnel log.
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

  Paste these into Meta → WhatsApp → Configuration → Webhook:

  Callback URL:   $PUBLIC_URL/webhooks/meta
  Verify token:   $VERIFY_TOKEN

  Then click "Verify and save" and subscribe to the
  "messages" webhook field.

  Local dashboard:  http://localhost:3000
  Public health:    $PUBLIC_URL/api/health

  NOTE: this trycloudflare.com URL changes every run.
  Re-run this script => new URL => update it in Meta.

  Press Ctrl+C to stop.
============================================================

EOF

# Keep running until interrupted.
wait
