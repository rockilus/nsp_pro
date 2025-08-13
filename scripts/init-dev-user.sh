#!/bin/bash
set -e

echo "Waiting for FastAPI service to be ready..."
until curl -f http://fastapi:4000/health > /dev/null 2>&1; do
  echo "FastAPI not ready yet, waiting..."
  sleep 2
done

echo "Waiting for Permit.io PDP to be ready..."
until curl -f http://permit:7000/health > /dev/null 2>&1; do
  echo "Permit.io not ready yet, waiting..."
  sleep 2
done

echo "Creating development user via onboard endpoint..."
response=$(curl -s -w "\n%{http_code}" -X POST "http://fastapi:4000/users/onboard" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${DEV_API_KEY:-ffb1f25b3585109374ac5fefa1728247ce600a27569c8344d779a57e0186cc93}" \
  -d '{
    "user_id": "64e9b7f1e13e4a1a9c8b4567",
    "email": "testuser@example.com",
    "username": "testuser",
    "first_name": "Test",
    "last_name": "User"
  }')

http_code=$(echo "$response" | tail -n1)
response_body=$(echo "$response" | head -n -1)

if [ "$http_code" -eq 200 ]; then
    echo "✅ Development user created successfully!"
    echo "Response: $response_body"
else
    echo "❌ Failed to create development user (HTTP $http_code)"
    echo "Response: $response_body"
    exit 1
fi
