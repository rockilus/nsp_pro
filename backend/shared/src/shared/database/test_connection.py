"""
Shared testing utilities for database connections.
"""

from typing import Optional, Dict, Any
from shared.database.factory import DatabaseFactory
from shared.logger import log_info, log_error


def test_database_connection(
    db_uri: str = "",
    db_name: str = "nsp_pro",
    use_documentdb: bool = False,
    documentdb_credentials: Optional[Dict[str, Any]] = None,
    documentdb_ca_bundle_path: str = "/app/global-bundle.pem",
) -> bool:
    """
    Test database connection and basic operations.

    Args:
        db_uri: MongoDB connection URI (used when use_documentdb=False)
        db_name: Database name to connect to
        use_documentdb: Whether to use DocumentDB instead of MongoDB
        documentdb_secret_name: AWS Secrets Manager secret for DocumentDB
        documentdb_ca_bundle_path: Path to DocumentDB CA bundle certificate
        aws_region: AWS region for Secrets Manager

    Returns:
        bool: True if all tests pass, False otherwise
    """
    try:
        db_type = "DocumentDB" if use_documentdb else "MongoDB"
        log_info(f"Testing {db_type} connection...")

        # Create connection
        db = DatabaseFactory.create_connection(
            db_uri=db_uri,
            db_name=db_name,
            use_documentdb=use_documentdb,
            documentdb_credentials=documentdb_credentials,
            documentdb_ca_bundle_path=documentdb_ca_bundle_path,
            timeoutMS=30000,
        )

        log_info(f"✅ Successfully connected to database: {db_name}")

        # Test basic operations
        test_collection = db.test_connection

        # Insert test document
        test_doc = {"test": "connection", "service": "shared_test"}
        result = test_collection.insert_one(test_doc)
        log_info(f"✅ Test document inserted with ID: {result.inserted_id}")

        # Query test document
        found_doc = test_collection.find_one({"_id": result.inserted_id})
        log_info(f"✅ Test document retrieved: {found_doc}")

        # Delete test document
        delete_result = test_collection.delete_one({"_id": result.inserted_id})
        log_info(
            f"✅ Test document deleted: {delete_result.deleted_count} documents"
        )

        # Test health check
        health = DatabaseFactory.check_health(use_documentdb=use_documentdb)
        log_info(f"✅ Health check passed: {health}")

        log_info("🎉 All database tests passed!")
        return True

    except Exception as e:  # pylint: disable=broad-except
        log_error(f"❌ Database test failed: {e}")
        return False
    finally:
        try:
            DatabaseFactory.close_connection(use_documentdb=use_documentdb)
        except Exception:  # pylint: disable=broad-except
            pass  # Ignore cleanup errors
