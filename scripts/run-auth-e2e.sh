#!/bin/bash
# Run the auth E2E test suite against cognito-local
set -e

echo "============================================"
echo "  Rockilus Auth E2E Test Suite"
echo "============================================"
echo ""

# 1. Start infrastructure (MongoDB, LocalStack for SQS, cognito-local, Cerbos)
echo "[1/5] Starting infrastructure..."
docker compose -f docker-compose.tests.local.yml up -d mongodb localstack localstack-init cognito-local cognito-local-init cerbos
echo "Waiting for all services to be healthy..."
docker compose -f docker-compose.tests.local.yml ps

# 2. Extract Cognito pool/client IDs from init output
echo ""
echo "[2/5] Getting Cognito pool/client IDs..."
COGNITO_LOG=$(docker logs cognito-local-init 2>/dev/null | tail -30)
POOL_ID=$(echo "$COGNITO_LOG" | grep "COGNITO_USER_POOL_ID=" | tail -1 | cut -d'=' -f2)
CLIENT_ID=$(echo "$COGNITO_LOG" | grep "COGNITO_CLIENT_ID=" | tail -1 | cut -d'=' -f2)

if [ -z "$POOL_ID" ] || [ -z "$CLIENT_ID" ]; then
  echo "ERROR: Could not extract Cognito IDs from init logs."
  echo "Last 50 lines of cognito-local-init:"
  docker logs cognito-local-init 2>/dev/null | tail -50
  exit 1
fi
echo "  Pool: $POOL_ID"
echo "  Client: $CLIENT_ID"

# 3. Start backend against cognito-local
echo ""
echo "[3/5] Starting backend..."
cd backend/api_gateway
export COGNITO_USER_POOL_ID="$POOL_ID"
export COGNITO_CLIENT_ID="$CLIENT_ID"
export COGNITO_ENDPOINT_URL="http://localhost:9229"
export ENVIRONMENT="development"
uv run uvicorn src.main:app --host 127.0.0.1 --port 4000 --env-file .env.development.tests &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID"
cd ../..

# Wait for backend
echo "  Waiting for backend to be ready..."
for i in $(seq 1 15); do
  if curl -s http://localhost:4000/health > /dev/null 2>&1; then
    echo "  Backend ready"
    break
  fi
  sleep 1
done

# 4. Start frontend in production mode (to use CookieAuthProvider, not dev bypass)
echo ""
echo "[4/5] Starting frontend in production mode..."
cd frontend
NEXT_PUBLIC_NODE_ENV=production \
NEXT_PUBLIC_API_URL=http://localhost:4000 \
npm run dev &
FRONTEND_PID=$!
echo "  Frontend PID: $FRONTEND_PID"
cd ..

# Wait for frontend
echo "  Waiting for frontend to be ready..."
for i in $(seq 1 30); do
  if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "  Frontend ready"
    break
  fi
  sleep 1
done

# 5. Run auth E2E tests
echo ""
echo "[5/5] Running auth E2E tests..."
cd frontend
npx playwright test tests/e2e/auth --project=chromium
TEST_EXIT=$?
cd ..

# Cleanup
echo ""
echo "Cleaning up..."
kill $BACKEND_PID 2>/dev/null || true
kill $FRONTEND_PID 2>/dev/null || true

echo ""
if [ $TEST_EXIT -eq 0 ]; then
  echo "✅ Auth E2E tests passed!"
else
  echo "❌ Auth E2E tests failed (exit code: $TEST_EXIT)"
fi
exit $TEST_EXIT
