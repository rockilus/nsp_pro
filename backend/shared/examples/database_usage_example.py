"""
Example script demonstrating the new database interface usage.
This shows how to use both MongoDB and DocumentDB with the same codebase.
"""

from shared.database.factory import DatabaseFactory
from shared.database.database_collections import DatabaseCollections


def example_mongodb_usage():
    """Example using MongoDB."""
    print("=== MongoDB Example ===")

    # Option 1: Using the factory to create a connection
    db_conn = DatabaseFactory.create_connection(
        db_uri="mongodb://localhost:27017",
        db_name="test_db",
        use_documentdb=False,
    )

    # Create collections using the database interface
    collections = DatabaseCollections(db_conn)

    # Use repositories as normal
    # Example: users = collections.user_db.find_all()
    _ = collections  # Suppress unused variable warning

    print("MongoDB connection created successfully")
    db_conn.close()


def example_documentdb_usage():
    """Example using DocumentDB."""
    print("=== DocumentDB Example ===")

    # Option 1: Using the factory to create a connection
    credentials = {
        "username": "docdbadmin",
        "password": "your_password",
        "host": "your-cluster.cluster-xxx.region.docdb.amazonaws.com",
        "port": 27017,
    }

    db_conn = DatabaseFactory.create_connection(
        db_uri="",  # Not used for DocumentDB
        db_name="test_db",
        use_documentdb=True,
        documentdb_credentials=credentials,
        documentdb_ca_bundle_path="global-bundle.pem",
    )

    # Create collections using the database interface
    collections = DatabaseCollections(db_conn)

    # Use repositories as normal - same API!
    # Example: users = collections.user_db.find_all()
    _ = collections  # Suppress unused variable warning

    print("DocumentDB connection created successfully")
    db_conn.close()


def example_legacy_usage():
    """Example showing backward compatibility with existing code."""
    print("=== Legacy Usage Example ===")

    # Existing code still works unchanged
    collections = DatabaseCollections("mongodb://localhost:27017", "test_db")

    # All existing repository usage works the same
    # Example: users = collections.user_db.find_all()
    _ = collections  # Suppress unused variable warning

    print("Legacy usage works unchanged")


if __name__ == "__main__":
    try:
        example_mongodb_usage()
        example_documentdb_usage()
        example_legacy_usage()
        print("\nAll examples completed successfully!")
        print("\nKey benefits:")
        print("- Same API for both MongoDB and DocumentDB")
        print("- Backward compatibility maintained")
        print("- Clean separation of concerns")
        print("- Easy to switch between database types")
    except Exception as e:
        print(f"Example failed with error: {e}")
        print("Note: This is expected if databases are not available")
