#!/bin/bash
# Resolve Cognito user pool and app client IDs from the live cognito-local container.
# Source this file:  source scripts/resolve-cognito-local.sh
# After sourcing, COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID, COGNITO_ENDPOINT_URL
# are exported if found; otherwise existing env values are untouched.

set -euo pipefail

CONTAINER_NAME="cognito-local-init"
COGNITO_LOG=""
POOL_ID=""
CLIENT_ID=""

if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -qx "${CONTAINER_NAME}"; then
  COGNITO_LOG=$(docker logs "${CONTAINER_NAME}" 2>/dev/null | tail -30 || true)
  POOL_ID=$(echo "$COGNITO_LOG" | grep "COGNITO_USER_POOL_ID=" | tail -1 | cut -d'=' -f2)
  CLIENT_ID=$(echo "$COGNITO_LOG" | grep "COGNITO_CLIENT_ID=" | tail -1 | cut -d'=' -f2)
fi

if [ -n "${POOL_ID:-}" ] && [ -n "${CLIENT_ID:-}" ]; then
  export COGNITO_USER_POOL_ID="$POOL_ID"
  export COGNITO_CLIENT_ID="$CLIENT_ID"
  export COGNITO_ENDPOINT_URL="http://localhost:9229"
  echo "✅ Cognito IDs resolved from container: pool=${POOL_ID} client=${CLIENT_ID}"
else
  echo "⚠️  cognito-local-init container not found or IDs not available — using env file values"
fi
