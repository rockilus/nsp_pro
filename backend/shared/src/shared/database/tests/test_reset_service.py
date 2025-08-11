"""
Test for database reset service.
"""

import pytest
from unittest.mock import Mock, AsyncMock
from shared.database.reset_service import (
    DatabaseResetService,
    DatabaseResetError,
)


class TestDatabaseResetService:
    """Test suite for DatabaseResetService."""

    def test_init(self):
        """Test service initialization."""
        service = DatabaseResetService()
        assert service is not None
        assert service._db_provider is None

    def test_init_with_provider(self):
        """Test service initialization with provider."""
        mock_provider = Mock()
        service = DatabaseResetService(mock_provider)
        assert service._db_provider is mock_provider

    @pytest.mark.asyncio
    async def test_validation_rejects_production(self):
        """Test that production environments are rejected."""
        service = DatabaseResetService()

        # Mock config to look like production
        service._config.database_name = "nsp_pro_production"
        service._config.environment = "production"

        with pytest.raises(DatabaseResetError, match="explicitly forbidden"):
            service._validate_test_environment()

    @pytest.mark.asyncio
    async def test_validation_accepts_test_environment(self):
        """Test that test environments are accepted."""
        service = DatabaseResetService()

        # Mock config to look like test
        service._config.database_name = "nsp_pro_test"
        service._config.environment = "test"

        # Should not raise exception
        service._validate_test_environment()

    @pytest.mark.asyncio
    async def test_get_collections_to_reset_dry_run(self):
        """Test dry run functionality."""
        # Mock provider
        mock_provider = Mock()
        mock_provider.connect = AsyncMock()
        mock_database = Mock()
        mock_database.list_collection_names.return_value = [
            "teams",
            "users",
            "system.indexes",
        ]
        mock_provider.get_database.return_value = mock_database

        service = DatabaseResetService(mock_provider)
        service._config.database_name = "test_db"
        service._config.environment = "test"

        collections = await service.get_collections_to_reset()

        assert "teams" in collections
        assert "users" in collections
        assert "system.indexes" not in collections

    def test_generate_operation_id(self):
        """Test operation ID generation."""
        service = DatabaseResetService()
        op_id = service._generate_operation_id()

        assert op_id.startswith("reset_")
        assert len(op_id) > 10  # Should contain timestamp


if __name__ == "__main__":
    pytest.main([__file__])
