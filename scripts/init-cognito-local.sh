#!/bin/bash
# Initialize Cognito resources in cognito-local for E2E auth tests
set -e

ENDPOINT=${COGNITO_ENDPOINT:-http://localhost:9229}
REGION=eu-west-3
MAX_RETRIES=15
RETRY_DELAY=2

echo "Waiting for cognito-local at $ENDPOINT..."

# Phase 1: Wait for cognito-local to accept TCP connections
for i in $(seq 1 $MAX_RETRIES); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" ${ENDPOINT} 2>/dev/null || echo "000")
  if [ "$STATUS" != "000" ]; then
    echo "✅ cognito-local reachable (HTTP $STATUS, attempt $i)"
    break
  fi
  if [ $i -eq $MAX_RETRIES ]; then
    echo "❌ cognito-local not reachable after $MAX_RETRIES attempts"
    exit 1
  fi
  sleep $RETRY_DELAY
done

# Phase 2: Verify Cognito API actually accepts requests
# cognito-local can report HTTP-reachable before the Cognito handler is initialized
echo "Verifying Cognito API readiness..."
for i in $(seq 1 8); do
  if aws --endpoint-url=${ENDPOINT} cognito-idp list-user-pools \
    --region ${REGION} --max-results 1 > /dev/null 2>&1; then
    echo "✅ Cognito API accepting requests (attempt $i)"
    break
  fi
  if [ $i -eq 8 ]; then
    echo "❌ Cognito API not accepting requests after 8 attempts"
    exit 1
  fi
  sleep 2
done

# Check if user pool already exists (idempotent across container restarts with named volume)
POOL_NAME="nsp-pro-test-pool"
echo "Checking for existing user pool '$POOL_NAME'..."
EXISTING_POOL_ID=$(aws --endpoint-url=${ENDPOINT} cognito-idp list-user-pools \
  --region ${REGION} --max-results 60 \
  --query "UserPools[?Name=='${POOL_NAME}'].Id | [0]" --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_POOL_ID" ] && [ "$EXISTING_POOL_ID" != "None" ]; then
  POOL_ID="$EXISTING_POOL_ID"
  echo "✅ User pool already exists: $POOL_ID"
else
  # Create User Pool with email-as-username + password policy matching prod
  echo "Creating user pool..."
  POOL_ID=$(aws --endpoint-url=${ENDPOINT} cognito-idp create-user-pool \
    --pool-name ${POOL_NAME} \
    --region ${REGION} \
    --username-attributes email \
    --auto-verified-attributes email \
    --policies '{"PasswordPolicy":{"MinimumLength":8,"RequireUppercase":true,"RequireLowercase":true,"RequireNumbers":true,"RequireSymbols":true}}' \
    --query 'UserPool.Id' --output text)
  echo "✅ User pool created: $POOL_ID"
fi

# Check if app client already exists (idempotent)
CLIENT_NAME="nsp-pro-test-client"
echo "Checking for existing app client '$CLIENT_NAME'..."
EXISTING_CLIENT_ID=$(aws --endpoint-url=${ENDPOINT} cognito-idp list-user-pool-clients \
  --user-pool-id ${POOL_ID} \
  --region ${REGION} --max-results 60 \
  --query "UserPoolClients[?ClientName=='${CLIENT_NAME}'].ClientId | [0]" --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_CLIENT_ID" ] && [ "$EXISTING_CLIENT_ID" != "None" ]; then
  CLIENT_ID="$EXISTING_CLIENT_ID"
  echo "✅ App client already exists: $CLIENT_ID"
else
  # Create App Client (SPA, no secret)
  echo "Creating app client..."
  CLIENT_ID=$(aws --endpoint-url=${ENDPOINT} cognito-idp create-user-pool-client \
    --user-pool-id ${POOL_ID} \
    --client-name ${CLIENT_NAME} \
    --region ${REGION} \
    --explicit-auth-flows "ALLOW_USER_PASSWORD_AUTH" "ALLOW_REFRESH_TOKEN_AUTH" "ALLOW_ADMIN_USER_PASSWORD_AUTH" \
    --query 'UserPoolClient.ClientId' --output text)
  echo "✅ App client created: $CLIENT_ID"
fi

echo ""
echo "Add these to your backend .env:"
echo "  COGNITO_USER_POOL_ID=$POOL_ID"
echo "  COGNITO_CLIENT_ID=$CLIENT_ID"
echo "  COGNITO_ENDPOINT_URL=$ENDPOINT"
echo ""
echo "✅ cognito-local initialization complete"
