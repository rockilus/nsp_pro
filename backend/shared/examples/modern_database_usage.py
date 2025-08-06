"""
Example usage of the modern NSP Pro database architecture.
Demonstrates how to use the new dependency injection pattern.
"""

import asyncio
from typing import Dict, Any

from shared.database import (
    DatabaseConfig,
    DatabaseType,
    setup_database_config,
    get_database,
    BaseRepository,
    DatabaseCollections,
    shutdown_databases,
)


# Example entity model
class User:
    def __init__(self, name: str, email: str, _id=None):
        self.name = name
        self.email = email
        self._id = _id


# Example repository using modern architecture
class UserRepository(BaseRepository[User]):
    def __init__(self, database=None, database_name="default"):
        super().__init__("users", database, database_name)

    def _document_to_entity(self, doc: Dict[str, Any]) -> User:
        """Convert MongoDB document to User entity."""
        return User(name=doc["name"], email=doc["email"], _id=doc["_id"])

    async def find_by_email(self, email: str):
        """Find user by email address."""
        filters = {"email": email}
        users = await self.find_many(filters, limit=1)
        return users[0] if users else None


async def example_mongodb_usage():
    """Example using MongoDB Atlas."""
    print("=== MongoDB Atlas Example ===")

    # Setup configuration
    config = DatabaseConfig(
        database_type=DatabaseType.MONGODB,
        mongodb_uri="mongodb://localhost:27017",
        database_name="nsp_pro_dev",
    )
    setup_database_config(config)

    # Use repository pattern
    user_repo = UserRepository()

    # Create a user
    new_user = User("John Doe", "john@example.com")
    created_user = await user_repo.create(new_user)
    print(f"Created user: {created_user._id}")

    # Find user by ID
    found_user = await user_repo.find_by_id(str(created_user._id))
    if found_user:
        print(f"Found user: {found_user.name}")
    else:
        print("User not found")

    # Use collections directly
    collections = DatabaseCollections()
    users_collection = await collections.get_users()
    count = await asyncio.to_thread(users_collection.count_documents, {})
    print(f"Total users: {count}")


async def example_documentdb_usage():
    """Example using AWS DocumentDB."""
    print("=== AWS DocumentDB Example ===")

    # Setup configuration
    config = DatabaseConfig(
        database_type=DatabaseType.DOCUMENTDB,
        documentdb_host=(
            "docdb-cluster.cluster-xxx.us-east-1.docdb.amazonaws.com"
        ),
        documentdb_port=27017,
        documentdb_username="admin",
        documentdb_password="password123",
        documentdb_ca_bundle_path="global-bundle.pem",
        database_name="nsp_pro_prod",
    )
    setup_database_config(config, name="production")

    # Use with specific database name
    user_repo = UserRepository(database_name="production")

    # Perform operations
    users = await user_repo.find_many(limit=10)
    print(f"Found {len(users)} users in production")


async def example_multi_database_usage():
    """Example using multiple databases."""
    print("=== Multi-Database Example ===")

    # Setup development database
    dev_config = DatabaseConfig(
        database_type=DatabaseType.MONGODB,
        mongodb_uri="mongodb://localhost:27017",
        database_name="nsp_pro_dev",
    )
    setup_database_config(dev_config, name="development")

    # Setup production database
    prod_config = DatabaseConfig(
        database_type=DatabaseType.DOCUMENTDB,
        documentdb_host=(
            "docdb-cluster.cluster-xxx.us-east-1.docdb.amazonaws.com"
        ),
        documentdb_port=27017,
        documentdb_username="admin",
        documentdb_password="password123",
        documentdb_ca_bundle_path="global-bundle.pem",
        database_name="nsp_pro_prod",
    )
    setup_database_config(prod_config, name="production")

    # Use different repositories for different environments
    dev_repo = UserRepository(database_name="development")
    prod_repo = UserRepository(database_name="production")

    # Perform operations on different databases
    dev_users = await dev_repo.find_many(limit=5)
    prod_users = await prod_repo.find_many(limit=5)

    print(f"Dev users: {len(dev_users)}")
    print(f"Prod users: {len(prod_users)}")


async def example_direct_database_usage():
    """Example using database interface directly."""
    print("=== Direct Database Usage ===")

    # Setup configuration
    config = DatabaseConfig.from_env()  # Load from environment variables
    setup_database_config(config)

    # Get database instance directly
    database = await get_database()

    # Check health
    is_healthy = await database.health_check()
    print(f"Database healthy: {is_healthy}")

    # Get MongoDB database object for raw operations
    db = database.get_database()
    collection = db["users"]

    # Perform raw MongoDB operations
    doc_count = await asyncio.to_thread(collection.count_documents, {})
    print(f"Raw count: {doc_count}")


async def main():
    """Run all examples."""
    try:
        await example_mongodb_usage()
        print()

        await example_documentdb_usage()
        print()

        await example_multi_database_usage()
        print()

        await example_direct_database_usage()

    except Exception as e:
        print(f"Example failed: {e}")
    finally:
        # Clean shutdown
        await shutdown_databases()
        print("Databases shut down cleanly")


if __name__ == "__main__":
    asyncio.run(main())
