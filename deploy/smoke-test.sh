#!/usr/bin/env bash
#
# car-log deploy smoke test — builds the single image and verifies the v1
# acceptance criteria that are verifiable off-phone:
#
#   1. One image serves the API and the built PWA (index.html + /api).
#   2. SQLite lives on a mounted volume, password comes from env.
#   3. SPA fallback serves index.html for client-side routes.
#   4. The API is auth-gated and the password unlock works.
#
# Run from the repo root:  deploy/smoke-test.sh
#
# Requires docker + a reachable registry (it builds the image from scratch).

set -euo pipefail

IMAGE=${IMAGE:-car-log:smoke}
CONTAINER=car-log-smoke
DATA_DIR=$(mktemp -d)
PORT=${PORT:-8081}
PASSWORD="smoke-test-password"
if command -v php >/dev/null 2>&1; then
  APP_KEY=$(php -r 'echo "base64:".base64_encode(random_bytes(32));')
else
  APP_KEY="base64:$(openssl rand -base64 32)"
fi

cleanup() {
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  rm -rf "$DATA_DIR"
}
trap cleanup EXIT

step() { printf '\n%s▸ %s%s\n' "$(tput setaf 4 2>/dev/null || echo "")" "$1" "$(tput sgr0 2>/dev/null || echo "")"; }
ok()   { printf '  %s✓ %s%s\n' "$(tput setaf 2 2>/dev/null || echo "")" "$1" "$(tput sgr0 2>/dev/null || echo "")"; }
fail() { printf '  %s✗ %s%s\n' "$(tput setaf 1 2>/dev/null || echo "")" "$1" "$(tput sgr0 2>/dev/null || echo "")"; exit 1; }

step "Building image (this takes a few minutes on first run)"
docker build -t "$IMAGE" -f deploy/Dockerfile .

step "Starting container (SQLite file on a mounted host path, password from env)"
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
touch "$DATA_DIR/database.sqlite"
docker run -d --name "$CONTAINER" \
  -e APP_ENV=production \
  -e APP_DEBUG=false \
  -e APP_KEY="$APP_KEY" \
  -e APP_URL="http://127.0.0.1:$PORT" \
  -e CAR_LOG_UNLOCK_PASSWORD="$PASSWORD" \
  -e DB_CONNECTION=sqlite \
  -v "$DATA_DIR/database.sqlite:/var/www/html/database/database.sqlite" \
  -p "$PORT:80" \
  "$IMAGE" >/dev/null

echo "  waiting for the app to boot..."
for i in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:$PORT/up" >/dev/null 2>&1; then
    break
  fi
  sleep 2
  if [ "$i" = 60 ]; then fail "container never became healthy"; fi
done
ok "health check /up responds 200"

step "PWA is served at /"
BODY=$(curl -fsS "http://127.0.0.1:$PORT/")
if echo "$BODY" | grep -q '<app-root>'; then
  ok "index.html served (contains <app-root>)"
else
  fail "expected Angular index.html, got: $(echo "$BODY" | head -c 200)"
fi

step "SPA fallback serves index.html for a client-side route"
BODY=$(curl -fsS "http://127.0.0.1:$PORT/vehicles/1")
if echo "$BODY" | grep -q '<app-root>'; then
  ok "deep link /vehicles/1 returns the PWA shell"
else
  fail "expected SPA fallback, got: $(echo "$BODY" | head -c 200)"
fi

step "PWA install assets are served (manifest + service worker)"
for asset in manifest.webmanifest ngsw-worker.js ngsw.json; do
  if curl -fsS -o /dev/null "http://127.0.0.1:$PORT/$asset"; then
    ok "/$asset served"
  else
    fail "/$asset not served"
  fi
done

step "API is auth-gated (401 without a token)"
CODE=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/api/health")
if [ "$CODE" = 401 ]; then
  ok "/api/health returns 401 unauthenticated"
else
  fail "expected 401, got $CODE"
fi

step "Password unlock exchanges for a token"
TOKEN=$(curl -fsS -X POST "http://127.0.0.1:$PORT/api/auth/token" \
  -H 'Content-Type: application/json' \
  -d "{\"password\":\"$PASSWORD\"}" | php -r 'echo json_decode(stream_get_contents(STDIN))->token ?? "";')
if [ -n "$TOKEN" ]; then
  ok "token minted"
else
  fail "token exchange returned no token"
fi

step "Authenticated API call works through the same image"
CODE=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/api/health" \
  -H "Authorization: Bearer $TOKEN")
if [ "$CODE" = 200 ]; then
  ok "/api/health returns 200 with a token"
else
  fail "expected 200, got $CODE"
fi

step "Create endpoints are idempotent on client UUID (outbox replay safety)"
UUID="22222222-2222-2222-2222-222222222222"
PAYLOAD="{\"name\":\"Smoke Car\",\"type\":\"car\",\"make\":\"Acme\",\"model\":\"Smoke\",\"year\":2020,\"uuid\":\"$UUID\"}"
FIRST=$(curl -s -o /dev/null -w '%{http_code}' -X POST "http://127.0.0.1:$PORT/api/vehicles" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d "$PAYLOAD")
REPLAY=$(curl -s -o /dev/null -w '%{http_code}' -X POST "http://127.0.0.1:$PORT/api/vehicles" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d "$PAYLOAD")
if [ "$FIRST" = 201 ] && [ "$REPLAY" = 200 ]; then
  ok "first create 201, replay 200 (same record)"
else
  fail "expected 201 then 200, got $FIRST then $REPLAY"
fi

step "Wrong password is rejected"
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "http://127.0.0.1:$PORT/api/auth/token" \
  -H 'Content-Type: application/json' \
  -d '{"password":"wrong"}')
if [ "$CODE" = 401 ]; then
  ok "wrong password returns 401"
else
  fail "expected 401, got $CODE"
fi

step "SQLite file exists on the mounted host path"
if [ -s "$DATA_DIR/database.sqlite" ]; then
  ok "database.sqlite present and non-empty on the host path"
else
  fail "database.sqlite missing or empty on the host path"
fi

step "Backup story: the SQLite file is a single copiable file"
if docker exec "$CONTAINER" test -f /var/www/html/database/database.sqlite; then
  ok "single file at /var/www/html/database/database.sqlite (cp = backup)"
else
  fail "database.sqlite not found on the mounted path"
fi

printf '\n%sAll checks passed.%s\n' "$(tput setaf 2 2>/dev/null || echo "")" "$(tput sgr0 2>/dev/null || echo "")"