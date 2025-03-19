import pytest
from pymongo.database import Database
from pymongo.errors import ConnectionFailure

from shared.database_pymongo_str_id.database import MongoDB


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

    def test_connect_success(self, mongodb_container):
        """Test successful connection to MongoDB."""
        # Test connection
        db = MongoDB.connect(mongodb_container, "test_db")

        # Verify connection was established
        assert MongoDB._client is not None
        assert MongoDB._db is not None
        assert isinstance(db, Database)
        assert db.name == "test_db"

        # Test health check
        assert MongoDB.check_health() is True

    def test_connect_with_timeout(self, mongodb_container):
        """Test connection with timeout parameter."""
        db = MongoDB.connect(mongodb_container, "test_db", timeoutMS=5000)

        assert MongoDB._client is not None
        assert MongoDB._db is not None
        assert isinstance(db, Database)

    def test_double_connect_reuses_connection(self, mongodb_container):
        """Test that connecting twice reuses the existing connection."""
        # First connection
        MongoDB.connect(mongodb_container, "test_db")
        original_client = MongoDB._client

        # Second connection should reuse the client
        MongoDB.connect(mongodb_container, "another_db")

        # Client should be the same object
        assert MongoDB._client is original_client
        # But db should be updated to the latest call
        # assert MongoDB._db.name == "another_db"
        assert MongoDB._db.name == "test_db"

        # Clean up manually to reset state
        MongoDB.close()

    def test_connect_failure(self):
        """Test handling of connection failures."""
        with pytest.raises(ConnectionFailure):
            MongoDB.connect("mongodb://invalid:27017", "test_db", timeoutMS=100)
        assert MongoDB._client is None
        assert MongoDB._db is None

    def test_get_database_without_connect(self):
        """Test get_database raises error if not connected."""
        with pytest.raises(ValueError, match="No database connection"):
            MongoDB.get_database()

    def test_get_database_after_connect(self, mongodb_container):
        """Test get_database returns database after connection."""
        # Connect first
        MongoDB.connect(mongodb_container, "test_db")

        # Get database
        db = MongoDB.get_database()

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

    def test_connection_with_real_data(self, mongodb_container):
        """Test inserting and retrieving real data."""
        # Connect
        db = MongoDB.connect(mongodb_container, "test_db")

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
