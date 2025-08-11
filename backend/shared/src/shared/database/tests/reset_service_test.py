"""
Test for database reset service.
"""

import os
from unittest.mock import AsyncMock, Mock

import pytest

from shared.database.interface import DatabaseInterface
from shared.database.reset_service import (
    DatabaseResetError,
    DatabaseResetService,
)


# pylint: disable=protected-access
class TestDatabaseResetService:
    """Test suite for DatabaseResetService."""

    # @pytest.fixture(autouse=True)
    # async def cleanup_collections(self, mongodb_container: DatabaseInterface):
    #     """Cleanup all collections after each test."""
    #     db = mongodb_container.get_database()
    #     for name in list(db.list_collection_names()):  # type: ignore
    #         db.drop_collection(name)  # type: ignore
    #     yield
    #     # Cleanup again in case test created new collections
    #     for name in list(db.list_collection_names()):  # type: ignore
    #         db.drop_collection(name)  # type: ignore

    def test_init(self):
        """Test service initialization."""
        os.environ["DB_MONGODB_URI"] = "mongodb://testuser:testpass@localhost:27017/"
        service = DatabaseResetService()
        assert service is not None
        assert service._db_provider is None

    def test_init_with_provider(self, mongodb_container: DatabaseInterface):
        """Test service initialization with provider."""
        service = DatabaseResetService(mongodb_container)
        assert service._db_provider is mongodb_container

    @pytest.mark.asyncio
    async def test_validation_rejects_production(
        self, mongodb_container: DatabaseInterface
    ):
        """Test that production environments are rejected."""
        service = DatabaseResetService(mongodb_container)

        # Mock config to look like production
        service._config.database_name = "nsp_pro_production"
        service._config.environment = "production"

        with pytest.raises(DatabaseResetError, match="explicitly forbidden"):
            service._validate_test_environment()

    @pytest.mark.asyncio
    async def test_validation_accepts_test_environment(
        self, mongodb_container: DatabaseInterface
    ):
        """Test that test environments are accepted."""
        service = DatabaseResetService(mongodb_container)

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

    def test_generate_operation_id(self, mongodb_container: DatabaseInterface):
        """Test operation ID generation."""
        service = DatabaseResetService(mongodb_container)
        op_id = service._generate_operation_id()

        assert op_id.startswith("reset_")
        assert len(op_id) > 10  # Should contain timestamp

    @pytest.mark.asyncio
    async def test_reset_all_collections(self, mongodb_container: DatabaseInterface):
        """Test resetting all collections."""
        db = mongodb_container.get_database()

        for name in list(db.list_collection_names()):  # type: ignore
            db.drop_collection(name)  # type: ignore

        collection_names = ["teams", "users", "shifts"]
        for name in collection_names:
            if name not in db.list_collection_names():  # type: ignore
                db.create_collection(name)  # type: ignore

        # Ensure collections exist before reset
        assert set(collection_names).issubset(
            set(db.list_collection_names())  # type: ignore
        )

        # Reset all collections
        service = DatabaseResetService(mongodb_container)
        result = await service.reset_all_collections()

        assert result["success"] is True
        assert result["message"] == "Successfully reset 3 collections"
        assert set(result["collections_reset"]) == set(collection_names)
        assert "timestamp" in result
        assert "operation_id" in result

        # Verify collections were dropped
        remaining_collections = db.list_collection_names()  # type: ignore
        assert not any(name in remaining_collections for name in collection_names)

    @pytest.mark.asyncio
    async def test_reset_specific_collections(
        self, mongodb_container: DatabaseInterface
    ):
        """Test resetting specific collections."""
        db = mongodb_container.get_database()

        collection_names = ["teams", "users", "shifts"]
        for name in collection_names:
            if name not in db.list_collection_names():  # type: ignore
                db.create_collection(name)  # type: ignore

        # Ensure collections exist before reset
        assert set(collection_names).issubset(
            set(db.list_collection_names())  # type: ignore
        )

        # Reset specific collections
        service = DatabaseResetService(mongodb_container)
        result = await service.reset_specific_collections(["teams", "users"])

        assert result["success"] is True
        assert result["message"] == "Successfully reset 2 specific collections"
        assert set(result["collections_reset"]) == {"teams", "users"}
        assert "timestamp" in result
        assert "operation_id" in result

        # Verify specific collections were dropped
        remaining_collections = db.list_collection_names()  # type: ignore
        assert "teams" not in remaining_collections
        assert "users" not in remaining_collections
        assert "shifts" in remaining_collections

    @pytest.mark.asyncio
    async def test_get_all_collection_names(self, mongodb_container: DatabaseInterface):
        """Test getting all collection names."""
        db = mongodb_container.get_database()

        for name in list(db.list_collection_names()):  # type: ignore
            db.drop_collection(name)  # type: ignore

        # Create some collections
        collection_names = ["teams", "users"]
        for name in collection_names:
            if name not in db.list_collection_names():  # type: ignore
                db.create_collection(name)  # type: ignore

        service = DatabaseResetService(mongodb_container)
        collections = await service._get_all_collection_names()

        assert "teams" in collections
        assert "users" in collections
        assert "shifts" not in collections  # Not created in this test
        assert len(collections) >= 2  # At least teams and users should exist

    @pytest.mark.asyncio
    async def test_drop_collections(self, mongodb_container: DatabaseInterface):
        """Test dropping specific collections."""
        db = mongodb_container.get_database()

        # Create some collections
        collection_names = ["teams", "users", "shifts"]
        for name in collection_names:
            if name not in db.list_collection_names():  # type: ignore
                db.create_collection(name)  # type: ignore

        service = DatabaseResetService(mongodb_container)
        await service._drop_collections(["teams", "users"])

        remaining_collections = db.list_collection_names()  # type: ignore
        assert "teams" not in remaining_collections
        assert "users" not in remaining_collections
        assert "shifts" in remaining_collections  # Should not be affected

        # Ensure dropping non-existent collections does not raise error
        await service._drop_collections(["non_existent_collection"])
        remaining_collections = db.list_collection_names()  # type: ignore
        assert "non_existent_collection" not in remaining_collections

    @pytest.mark.asyncio
    async def test_get_collections_to_reset(self, mongodb_container: DatabaseInterface):
        """Test getting collections to reset."""
        db = mongodb_container.get_database()

        # Create some collections
        collection_names = ["teams", "users", "shifts"]
        for name in collection_names:
            if name not in db.list_collection_names():  # type: ignore
                db.create_collection(name)  # type: ignore

        service = DatabaseResetService(mongodb_container)
        collections = await service.get_collections_to_reset()

        assert "teams" in collections
        assert "users" in collections
        assert "shifts" in collections

        # Test with specific collections
        specific_collections = await service.get_collections_to_reset(
            ["teams", "users"]
        )
        assert "teams" in specific_collections
        assert "users" in specific_collections
        assert "shifts" not in specific_collections
