#!/usr/bin/env python3
"""
Simple test script to verify health check endpoints work locally.

This script helps test the health check implementation without needing
to run the full service.
"""

import asyncio
import sys
from unittest.mock import Mock

from fastapi.testclient import TestClient

from health_server import HealthServer


async def test_health_check():
    """Test the health check endpoints."""
    print("Testing health check endpoints...")

    # Create a mock collections object
    mock_collections = Mock()
    mock_collections.team_db = Mock()
    mock_collections.team_db.get_teams = Mock(return_value=[])

    # Create health server
    health_server = HealthServer(mock_collections)

    # Test the FastAPI app

    client = TestClient(health_server.app)

    # Test health endpoint
    print("Testing /health endpoint...")
    response = client.get("/health")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"

    response_data = response.json()
    assert response_data["status"] == "healthy"
    assert response_data["service"] == "solve-service"
    assert response_data["environment"] == "development"

    # Test readiness endpoint
    print("\nTesting /ready endpoint...")
    response = client.get("/ready")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")

    # The readiness check might fail due to database connectivity,
    # but we should get a valid response structure
    if response.status_code == 200:
        response_data = response.json()
        assert response_data["status"] == "ready"
        assert "checks" in response_data
        print("✅ Service is ready")
    elif response.status_code == 503:
        # This is expected without a real database
        print("⚠️  Service not ready (expected without database)")
    else:
        raise AssertionError(f"Unexpected status code: {response.status_code}")

    print("\n✅ All health check tests passed!")


if __name__ == "__main__":
    try:
        asyncio.run(test_health_check())
    except Exception as e:
        print(f"❌ Test failed: {e}")
        sys.exit(1)
