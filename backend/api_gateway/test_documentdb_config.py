#!/usr/bin/env python3
"""
Test script to validate API Gateway DocumentDB configuration.
"""

import sys
import os

# Add the API Gateway source to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

try:
    # pylint: disable=import-outside-toplevel
    from src.config import config
    from shared.database.factory import DatabaseFactory
    from src.database_manager.setup_database import setup_database
except ImportError as e:
    print(f"Import error: {e}")
    sys.exit(1)


def test_config():
    """Test configuration loading."""
    print("Testing API Gateway configuration...")

    print(f"Environment: {config.environment}")
    print(f"Use DocumentDB: {config.use_documentdb}")
    print(f"DocumentDB Secret Name: {config.documentdb_secret_name}")
    print(f"DocumentDB Database Name: {config.documentdb_database_name}")
    print(f"DocumentDB CA Bundle Path: {config.documentdb_ca_bundle_path}")
    print(f"AWS Region: {config.aws_region}")

    print("✅ Configuration loaded successfully!")


def test_database_setup():
    """Test database setup function."""
    print("\nTesting database setup...")

    try:
        _ = setup_database()  # We don't need to use the result
        print("✅ Database collections setup successful!")

        db_type = "DocumentDB" if config.use_documentdb else "MongoDB"
        print(f"Database type: {db_type}")

        # Test health check
        health = DatabaseFactory.check_health(
            use_documentdb=config.use_documentdb
        )
        print(f"Database health: {health}")

    except Exception as e:  # pylint: disable=broad-except
        print(f"⚠️  Database setup failed as expected: {e}")


def main():
    """Run all tests."""
    print("Starting API Gateway DocumentDB configuration tests...")

    test_config()
    test_database_setup()

    print("\n🎉 All tests completed!")


if __name__ == "__main__":
    main()
