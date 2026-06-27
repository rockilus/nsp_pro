#!/usr/bin/env bash
# Seed the ZAP test user via the API Gateway onboard endpoint.
# Uses service authentication (X-API-Key header only — no user context needed).
# Idempotent: the onboard endpoint creates the user if it doesn't exist.
set -euo pipefail

API="http://localhost:4000"
API_KEY="ffb1f25b3585109374ac5fefa1728247ce600a27569c8344d779a57e0186cc93"

echo "Waiting for API Gateway to become healthy..."
until curl -sf "$API/health" > /dev/null 2>&1; do
  sleep 1
done
echo "API Gateway is healthy."

echo "Onboarding test user (idempotent)..."
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' \
  -X POST "$API/users/onboard" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "64e9b7f1e13e4a1a9c8b4567",
    "email": "testuser@example.com",
    "username": "testuser",
    "first_name": "Test",
    "last_name": "User",
    "language": "en"
  }')

echo "Onboard response: HTTP $HTTP_CODE"

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
  echo "Test user seeded successfully."
elif [ "$HTTP_CODE" -eq 400 ]; then
  echo "User may already exist (400 OK for idempotent onboard). Continuing."
else
  echo "WARNING: Unexpected onboard response code $HTTP_CODE. The scan may fail on DB lookups."
fi
