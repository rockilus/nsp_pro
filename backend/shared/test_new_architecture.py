#!/usr/bin/env python3
"""
Test script to demonstrate the new database architecture working.
This shows the dependency injection pattern and how to use the new system.
"""
import asyncio
import os

from src.shared.database.config import DatabaseConfig, DatabaseType
from src.shared.database.factory import DatabaseFactory
from src.shared.database.container import DatabaseContainer
from src.shared.database.database_collections import DatabaseCollections

# Set up environment for testing
os.environ.setdefault("DB_DATABASE_TYPE", "mongodb")
os.environ.setdefault("DB_MONGODB_URI", "mongodb://localhost:27017")
os.environ.setdefault("DB_DATABASE_NAME", "test_nsp_pro")


async def test_basic_architecture():
    """Test the basic new database architecture."""
    print("🚀 Testing new database architecture...")

    # 1. Load configuration
    print("📋 Loading database configuration...")
    config = DatabaseConfig.from_env()
    print(f"   Database type: {config.database_type}")
    print(f"   Database name: {config.database_name}")

    # 2. Create database provider using factory
    print("🏭 Creating database provider...")
    database_interface = DatabaseFactory.create_provider(config)
    print(f"   Provider type: {type(database_interface).__name__}")

    # 3. Create database collections using dependency injection
    print("🗄️  Creating database collections...")
    collections = DatabaseCollections(database_interface)
    print(
        f"   Assignment repository: "
        f"{type(collections.assignment_db).__name__}"
    )

    # 4. Test cleanup
    print("🧹 Testing cleanup...")
    await collections.close()
    print("   Cleanup completed")

    print("✅ Basic architecture test completed successfully!")


async def test_container_pattern():
    """Test the container pattern."""
    print("\n📦 Testing database container...")

    # Create configuration
    config = DatabaseConfig.from_env()

    # Create container and register config
    container = DatabaseContainer()
    container.register_config("default", config)

    # Get database from container
    database_interface = await container.get_database("default")
    print(f"   Container database type: {type(database_interface).__name__}")

    # Create collections with container database
    collections = DatabaseCollections(database_interface)
    print("   ✓ Container pattern works")

    # Cleanup
    await collections.close()
    await container.disconnect_all()
    print("   ✓ Container cleanup completed")


async def test_custom_configuration():
    """Test custom configuration."""
    print("\n🎯 Testing custom configuration...")

    # Create custom config
    custom_config = DatabaseConfig(
        database_type=DatabaseType.MONGODB,
        mongodb_uri="mongodb://custom:27017",
        database_name="custom_db",
    )

    # Create provider
    custom_db = DatabaseFactory.create_provider(custom_config)
    print(f"   Custom provider type: {type(custom_db).__name__}")

    # Create collections
    custom_collections = DatabaseCollections(custom_db)
    print("   ✓ Custom configuration works")

    # Cleanup
    await custom_collections.close()
    print("   ✓ Custom cleanup completed")


if __name__ == "__main__":
    print("🧪 NSP Pro - New Database Architecture Test")
    print("=" * 50)

    # Run the tests
    asyncio.run(test_basic_architecture())
    asyncio.run(test_container_pattern())
    asyncio.run(test_custom_configuration())

    print("\n🎉 All tests completed! The new architecture is ready to use.")
    print("\n📚 Next steps:")
    print("   1. Update remaining repository constructors")
    print("   2. Update application code to use DatabaseContainer")
    print("   3. Update tests to use new dependency injection")
    print("   4. Remove old singleton database pattern")
