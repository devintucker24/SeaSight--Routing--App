#!/usr/bin/env bash
set -euo pipefail

BASE=${BASE:-http://localhost:8081}

echo "[1/3] Quickstart (dev) to get token..."
RESP=$(curl -s -X POST "$BASE/demo/quickstart" -H 'Content-Type: application/json' -d '{}')
echo "$RESP" | jq . || echo "$RESP"
TOKEN=$(echo "$RESP" | jq -r .token 2>/dev/null || true)

if [[ -z "${TOKEN:-}" || "${TOKEN}" == "null" ]]; then
  echo "Quickstart did not return a token. Falling back to manual login..."
  TENANT_ID=$(curl -s "$BASE/tenants" | jq -r '.[0].id')
  curl -s -X POST "$BASE/auth/set-pin" -H 'Content-Type: application/json' -d "{\"tenantId\":\"$TENANT_ID\",\"username\":\"admin\",\"pin\":\"1234\"}" >/dev/null
  RESP=$(curl -s -X POST "$BASE/auth/login" -H 'Content-Type: application/json' -d "{\"tenantId\":\"$TENANT_ID\",\"username\":\"admin\",\"pin\":\"1234\"}")
  echo "$RESP" | jq . || echo "$RESP"
  TOKEN=$(echo "$RESP" | jq -r .token)
fi

echo "[2/3] /me"
curl -s "$BASE/me" -H "Authorization: Bearer $TOKEN" | jq . || true

echo "[3/3] Done. Use token: $TOKEN"

