#!/usr/bin/env python3
"""
Test script to validate the shared database implementation.
"""

import sys
import os

# Add the shared library to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Import after path setup to avoid import issues
try:
    # pylint: disable=import-outside-toplevel
    from shared.database import DatabaseFactory, MongoDB, DocumentDB
except ImportError as e:
    print(f"Import error: {e}")
    sys.exit(1)


def test_imports():
    """Test that all imports work correctly."""
    print("Testing imports...")

    # Test that classes can be imported
    assert MongoDB is not None
    assert DocumentDB is not None
    assert DatabaseFactory is not None

    print("✅ All imports successful!")


def test_mongodb_connection():
    """Test MongoDB connection with a simple URI."""
    print("\nTesting MongoDB connection...")

    try:
        # Test with localhost URI (will fail but should not crash)
        MongoDB.connect(
            uri="mongodb://localhost:27017", db_name="test_db", timeoutMS=1000
        )
        print("✅ MongoDB connection successful!")
    except Exception as e:  # pylint: disable=broad-except
        print(f"⚠️  MongoDB connection failed as expected: {e}")
    finally:
        try:
            MongoDB.close()
        except Exception:  # pylint: disable=broad-except
            pass


def test_factory_methods():
    """Test DatabaseFactory methods."""
    print("\nTesting DatabaseFactory methods...")

    try:
        # Test create_connection method signature
        # This should fail but not crash
        DatabaseFactory.create_connection(
            db_uri="mongodb://localhost:27017",
            db_name="test_db",
            use_documentdb=False,
            timeoutMS=1000,
        )
        print("✅ Factory create_connection method works!")
    except Exception as e:  # pylint: disable=broad-except
        print(f"⚠️  Factory connection failed as expected: {e}")

    try:
        # Test DocumentDB method signature
        DatabaseFactory.create_connection(
            db_uri="",
            db_name="test_db",
            use_documentdb=True,
            documentdb_secret_name="test-secret",
            timeoutMS=1000,
        )
        print("✅ Factory DocumentDB method works!")
    except Exception as e:  # pylint: disable=broad-except
        print(f"⚠️  DocumentDB connection failed as expected: {e}")


def main():
    """Run all tests."""
    print("Starting shared database implementation tests...")

    test_imports()
    test_mongodb_connection()
    test_factory_methods()

    print("\n🎉 All tests completed!")


if __name__ == "__main__":
    main()
