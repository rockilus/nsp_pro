"""
Tests for test utilities endpoints.
"""

from unittest.mock import AsyncMock, Mock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.routes.utils_routes import router


def create_test_app() -> FastAPI:
    """Create test FastAPI app with test utils router."""
    app = FastAPI()
    app.include_router(router)

    # Mock app state
    mock_db_collections = Mock()
    mock_db_interface = Mock()
    mock_db_collections.database_interface = mock_db_interface
    app.state.db_collections = mock_db_collections

    return app


class TestTestUtilsRoutes:
    """Test suite for test utilities routes."""

    @patch('src.routes.utils_routes.config')
    def test_health_endpoint(self, mock_config):
        """Test the health endpoint."""
        mock_config.environment = "test"

        app = create_test_app()
        client = TestClient(app)

        response = client.get("/test-utils/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["environment"] == "test"
        assert data["test_utilities_available"] is True

    @patch('src.routes.utils_routes.config')
    def test_environment_validation_rejects_production(self, mock_config):
        """Test that production environment is rejected."""
        mock_config.environment = "production"
        mock_config.mongodb_database_name = "nsp_pro"

        app = create_test_app()
        client = TestClient(app)

        response = client.post(
            "/test-utils/reset-database",
            json={"confirmation_token": "test-reset-confirm"},
        )

        assert response.status_code == 403
        detail = response.json()["detail"]
        assert "only available in test environments" in detail

    @patch('src.routes.utils_routes.config')
    def test_environment_validation_rejects_prod_database(self, mock_config):
        """Test that production database names are rejected."""
        mock_config.environment = "test"
        mock_config.mongodb_database_name = "nsp_prod"

        app = create_test_app()
        client = TestClient(app)

        response = client.post(
            "/test-utils/reset-database",
            json={"confirmation_token": "test-reset-confirm"},
        )

        assert response.status_code == 403
        assert "production database" in response.json()["detail"]

    # @patch('src.routes.utils_routes.config')
    # @patch('src.routes.utils_routes.DatabaseResetService')
    # def test_reset_database_success(self, mock_service_class, mock_config):
    #     """Test successful database reset."""
    #     mock_config.environment = "test"
    #     mock_config.mongodb_database_name = "test_db"

    #     # Mock the reset service
    #     mock_service = Mock()
    #     mock_service.reset_all_collections = AsyncMock(
    #         return_value={
    #             "success": True,
    #             "message": "Successfully reset 3 collections",
    #             "collections_reset": ["teams", "users", "workers"],
    #             "timestamp": "2025-08-11T10:00:00Z",
    #             "operation_id": "reset_20250811_100000_123456",
    #         }
    #     )
    #     mock_service_class.return_value = mock_service

    #     app = create_test_app()
    #     client = TestClient(app)

    #     response = client.post(
    #         "/test-utils/reset-database",
    #         json={"confirmation_token": "test-reset-confirm"},
    #     )

    #     assert response.status_code == 200
    #     data = response.json()
    #     assert data["success"] is True
    #     assert len(data["collections_reset"]) == 3
    #     assert "teams" in data["collections_reset"]

    # @patch('src.routes.utils_routes.config')
    # def test_invalid_confirmation_token(self, mock_config):
    #     """Test that invalid confirmation token is rejected."""
    #     mock_config.environment = "test"
    #     mock_config.mongodb_database_name = "test_db"

    #     app = create_test_app()
    #     client = TestClient(app)

    #     response = client.post(
    #         "/test-utils/reset-database",
    #         json={"confirmation_token": "wrong-token"},
    #     )

    #     assert response.status_code == 400
    #     assert "Invalid confirmation token" in response.json()["detail"]

    @patch('src.routes.utils_routes.config')
    @patch('src.routes.utils_routes.DatabaseResetService')
    def test_dry_run_endpoint(self, mock_service_class, mock_config):
        """Test the dry run endpoint."""
        mock_config.environment = "test"
        mock_config.mongodb_database_name = "test_db"

        # Mock the reset service
        mock_service = Mock()
        mock_service.get_collections_to_reset = AsyncMock(
            return_value=["teams", "users", "workers"]
        )
        mock_service_class.return_value = mock_service

        app = create_test_app()
        client = TestClient(app)

        response = client.get("/test-utils/reset-database/dry-run")

        assert response.status_code == 200
        data = response.json()
        assert data["collections_to_reset"] == ["teams", "users", "workers"]
        assert data["total_count"] == 3
        assert data["dry_run"] is True

    # @patch('src.routes.utils_routes.config')
    # @patch('src.routes.utils_routes.DatabaseResetService')
    # def test_reset_specific_collections(self, mock_service_class, mock_config):
    #     """Test resetting specific collections."""
    #     mock_config.environment = "test"
    #     mock_config.mongodb_database_name = "test_db"

    #     # Mock the reset service
    #     mock_service = Mock()
    #     mock_service.reset_specific_collections = AsyncMock(
    #         return_value={
    #             "success": True,
    #             "message": "Successfully reset 2 specific collections",
    #             "collections_reset": ["teams", "users"],
    #             "timestamp": "2025-08-11T10:00:00Z",
    #             "operation_id": "reset_20250811_100000_123456",
    #         }
    #     )
    #     mock_service_class.return_value = mock_service

    #     app = create_test_app()
    #     client = TestClient(app)

    #     response = client.post(
    #         "/test-utils/reset-database",
    #         json={
    #             "collections": ["teams", "users"],
    #             "confirmation_token": "test-reset-confirm",
    #         },
    #     )

    #     assert response.status_code == 200
    #     data = response.json()
    #     assert data["success"] is True
    #     assert data["collections_reset"] == ["teams", "users"]


if __name__ == "__main__":
    pytest.main([__file__])
