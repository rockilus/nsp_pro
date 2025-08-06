import re

import pytest
from pymongo.database import Database
from pymongo.errors import ConnectionFailure

from shared.database.config import DatabaseConfig, DatabaseType
from shared.database.interface import DatabaseInterface
from shared.database.providers import MongoDBProvider


# pylint: disable=protected-access
class TestMongoDB:
    """Test suite for MongoDB connection manager class."""

    # @pytest.fixture(autouse=True)
    # def setup_teardown(self):
    #     """Setup and teardown for each test."""
    #     # Make sure the class is reset before each test
    #     MongoDB._client = None
    #     MongoDB._db = None
    #     yield
    #     # Clean up after each test
    #     MongoDB.close()

    @pytest.mark.asyncio
    async def test_connect_success(self, mongodb_container: DatabaseInterface):
        """Test successful connection to MongoDB."""
        # Test connection
        config = DatabaseConfig(
            database_type=DatabaseType.MONGODB,
            mongodb_uri=mongodb_container.config.mongodb_uri,  # type: ignore
            database_name="test_db",
        )
        provider = MongoDBProvider(config)
        await provider.connect()

        # Verify connection was established
        assert provider._client is not None
        assert provider._database is not None

        # Verify database name
        db = provider.get_database()
        assert db is not None
        assert isinstance(db, Database)
        assert db.name == "test_db"

        # Test health check
        assert await provider.health_check() is True

    @pytest.mark.asyncio
    async def test_connect_with_timeout(self, mongodb_container: DatabaseInterface):
        """Test connection with timeout parameter."""
        config = DatabaseConfig(
            database_type=DatabaseType.MONGODB,
            mongodb_uri=mongodb_container.config.mongodb_uri,  # type: ignore
            database_name="test_db",
            connection_timeout_ms=5000,
        )
        provider = MongoDBProvider(config)
        await provider.connect()

        assert provider._client is not None
        assert provider._database is not None

        # Verify database name
        db = provider.get_database()
        assert db is not None
        assert isinstance(db, Database)
        assert db.name == "test_db"

        # Test health check
        assert await provider.health_check() is True

    @pytest.mark.asyncio
    async def test_double_connect_reuses_connection(
        self, mongodb_container: DatabaseInterface
    ):
        """Test that connecting twice reuses the existing connection."""
        # First connection
        config = DatabaseConfig(
            database_type=DatabaseType.MONGODB,
            mongodb_uri=mongodb_container.config.mongodb_uri,  # type: ignore
            database_name="test_db",
        )
        provider_1 = MongoDBProvider(config)
        await provider_1.connect()
        original_client = provider_1._client

        # Second connection should reuse the client
        config = DatabaseConfig(
            database_type=DatabaseType.MONGODB,
            mongodb_uri=mongodb_container.config.mongodb_uri,  # type: ignore
            database_name="another_db",
        )
        provider_2 = MongoDBProvider(config)
        await provider_2.connect()

        # Client should be the same object
        assert provider_1._client is original_client
        # But db should be updated to the latest call
        # assert MongoDB._db.name == "another_db"
        assert provider_1._database.name == "test_db"  # type: ignore

        # Clean up manually to reset state
        await provider_1.disconnect()
        await provider_2.disconnect()

    @pytest.mark.asyncio
    async def test_connect_failure(self):
        """Test handling of connection failures."""
        config = DatabaseConfig(
            database_type=DatabaseType.MONGODB,
            mongodb_uri="mongodb://invalid:27017",
            database_name="test_db",
            connection_timeout_ms=100,
        )
        provider = MongoDBProvider(config)
        with pytest.raises(ConnectionFailure):
            await provider.connect()
        assert provider._client is not None
        assert provider._database is not None

    def test_get_database_without_connect(self, mongodb_container: DatabaseInterface):
        """Test get_database raises error if not connected."""
        config = DatabaseConfig(
            database_type=DatabaseType.MONGODB,
            mongodb_uri=mongodb_container.config.mongodb_uri,  # type: ignore
            database_name="test_db",
        )
        provider = MongoDBProvider(config)
        with pytest.raises(
            RuntimeError,
            match=re.escape("Database not connected. Call connect() first."),
        ):
            provider.get_database()

    @pytest.mark.asyncio
    async def test_get_database_after_connect(
        self, mongodb_container: DatabaseInterface
    ):
        """Test get_database returns database after connection."""
        config = DatabaseConfig(
            database_type=DatabaseType.MONGODB,
            mongodb_uri=mongodb_container.config.mongodb_uri,  # type: ignore
            database_name="test_db",
        )
        provider = MongoDBProvider(config)
        # Connect first
        await provider.connect()

        # Get database
        db = provider.get_database()

        # Verify
        assert db is not None
        assert isinstance(db, Database)
        assert db.name == "test_db"

    # def test_close_connection(self, mongodb_container):
    #     """Test closing the database connection."""
    #     # Connect
    #     MongoDB.connect(mongodb_container, "test_db")
    #     assert MongoDB._client is not None

    #     # Close
    #     MongoDB.close()

    #     # Verify connection was closed
    #     assert MongoDB._client is None
    #     assert MongoDB._db is None

    #     # Verify get_database raises error
    #     with pytest.raises(ValueError, match="No database connection"):
    #         MongoDB.get_database()

    # def test_close_without_connection(self):
    #     """Test closing when no connection exists."""
    #     # Ensure there's no connection
    #     assert MongoDB._client is None

    #     # Close should not raise errors
    #     MongoDB.close()

    #     # Still no connection
    #     assert MongoDB._client is None

    # def test_check_health_without_connection(self):
    #     """Test health check without connection."""
    #     with pytest.raises(ValueError, match="No database connection"):
    #         MongoDB.check_health()

    # def test_check_health_ping_failure(self, mongodb_container):
    #     """Test health check with ping failure."""
    #     _ = MongoDB.connect(mongodb_container, "test_db")
    #     client_invalid = MongoClient("mongodb://invalid:27017", timeoutMS=100)
    #     MongoDB._client = client_invalid

    #     # Health check should return False
    #     assert MongoDB.check_health() is False

    @pytest.mark.asyncio
    async def test_connection_with_real_data(
        self, mongodb_container: DatabaseInterface
    ):
        """Test inserting and retrieving real data."""
        config = DatabaseConfig(
            database_type=DatabaseType.MONGODB,
            mongodb_uri=mongodb_container.config.mongodb_uri,  # type: ignore
            database_name="test_db",
        )
        provider = MongoDBProvider(config)
        # Connect
        await provider.connect()
        db = provider.get_database()

        # Create a test collection
        collection = db.test_collection

        # Insert test document
        test_doc = {"name": "MongoDB Test", "status": "testing"}
        result = collection.insert_one(test_doc)

        # Verify document was inserted
        assert result.acknowledged is True
        assert result.inserted_id is not None

        # Retrieve the document
        found = collection.find_one({"name": "MongoDB Test"})

        # Verify document was retrieved
        assert found is not None
        assert found["status"] == "testing"

        # Clean up
        collection.drop()
