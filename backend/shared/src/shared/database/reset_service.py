"""
Database reset utility for E2E testing.

This module provides utilities to reset the database to a clean state
before running tests, ensuring test isolation and reliability.

WARNING: This should only be used in test environments.
"""

import asyncio
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from loguru import logger

from .config import DatabaseConfig
from .factory import DatabaseFactory
from .interface import DatabaseInterface


class DatabaseResetError(Exception):
    """Exception raised when database reset operations fail."""


class DatabaseResetService:
    """Service for resetting database state in test environments."""

    def __init__(self, database_provider: Optional[DatabaseInterface] = None):
        """
        Initialize the database reset service.

        Args:
            database_provider: Optional database provider. If None, will
                              create from config.
        """
        self._db_provider = database_provider
        self._config = DatabaseConfig.from_env()

    @property
    def db_provider(self) -> DatabaseInterface:
        """Get or create database provider."""
        if self._db_provider is None:
            factory = DatabaseFactory()
            self._db_provider = factory.create_provider(self._config)
        return self._db_provider

    async def reset_all_collections(self) -> Dict[str, Any]:
        """
        Reset all collections by dropping and recreating them.

        WARNING: This will permanently delete all data in the database.
        Should only be used in test environments.

        Returns:
            Dict with operation results and statistics

        Raises:
            DatabaseResetError: If reset operation fails
        """
        try:
            # Ensure we're not running against production database
            self._validate_test_environment()

            operation_id = self._generate_operation_id()
            logger.info(f"Starting database reset operation {operation_id}")

            # Get all collection names from the database
            collection_names = await self._get_all_collection_names()

            if not collection_names:
                logger.info("No collections found to reset")
                return {
                    "success": True,
                    "message": "No collections found to reset",
                    "collections_reset": [],
                    "timestamp": datetime.now(tz=timezone.utc).isoformat(),
                    "operation_id": operation_id,
                }

            # Drop all collections
            dropped_collections = await self._drop_collections(collection_names)

            # Recreate collections with proper indexes
            await self._recreate_collections()

            result = {
                "success": True,
                "message": f"Successfully reset {len(dropped_collections)} collections",
                "collections_reset": dropped_collections,
                "timestamp": datetime.now(tz=timezone.utc).isoformat(),
                "operation_id": operation_id,
            }

            logger.info(f"Database reset completed successfully: {operation_id}")
            return result

        except Exception as e:
            logger.error(f"Database reset failed: {str(e)}")
            raise DatabaseResetError(f"Failed to reset database: {str(e)}") from e

    async def reset_specific_collections(
        self, collection_names: List[str]
    ) -> Dict[str, Any]:
        """
        Reset only specific collections.

        Args:
            collection_names: List of collection names to reset

        Returns:
            Dict with operation results and statistics

        Raises:
            DatabaseResetError: If reset operation fails
        """
        try:
            self._validate_test_environment()

            operation_id = self._generate_operation_id()
            logger.info(
                f"Resetting specific collections: {collection_names} [{operation_id}]"
            )

            # Drop specified collections
            dropped_collections = await self._drop_collections(collection_names)

            # Recreate only the specified collections
            await self._recreate_specific_collections(collection_names)

            result = {
                "success": True,
                "message": f"Successfully reset {len(dropped_collections)} "
                + "specific collections",
                "collections_reset": dropped_collections,
                "timestamp": datetime.now(tz=timezone.utc).isoformat(),
                "operation_id": operation_id,
            }

            logger.info(
                f"Successfully reset collections: {dropped_collections} "
                + f"[{operation_id}]"
            )
            return result

        except Exception as e:
            logger.error(f"Failed to reset specific collections: {str(e)}")
            raise DatabaseResetError(f"Failed to reset collections: {str(e)}") from e

    def _validate_test_environment(self) -> None:
        """
        Validate that we're running in a test environment.

        Raises:
            DatabaseResetError: If not in test environment
        """
        # Check environment variable
        environment = os.getenv("ENVIRONMENT", "").lower()

        # Check database name contains 'test'
        db_name = self._config.database_name.lower()

        # Multiple safety checks
        is_test_env = (
            environment in ["test", "testing", "local", "development"]
            or "test" in db_name
            or "local" in db_name
        )

        is_production = (
            "prod" in db_name or "production" in environment or environment == "prod"
        )

        if is_production:
            raise DatabaseResetError(
                f"Database reset explicitly forbidden in production environment. "
                f"Environment: '{environment}', "
                + f"Database: '{self._config.database_name}'"
            )

        if not is_test_env:
            raise DatabaseResetError(
                f"Database reset not allowed in environment '{environment}' "
                f"with database '{self._config.database_name}'. "
                f"Only test environments are allowed. Set ENVIRONMENT=test or "
                + "use a database name containing 'test'."
            )

        logger.info(
            f"Environment validation passed: {environment}, "
            + f"DB: {self._config.database_name}"
        )

    async def _get_all_collection_names(self) -> List[str]:
        """Get all collection names from database, excluding system."""
        try:
            # Ensure connection
            await self.db_provider.connect()
            database = self.db_provider.get_database()

            # Get collection names (type ignore for PyMongo compatibility)
            collection_names = list(database.list_collection_names())  # type: ignore

            # Filter out system collections
            filtered_names = [
                name
                for name in collection_names
                if not name.startswith(("system.", "__"))
            ]

            logger.debug(f"Found collections to reset: {filtered_names}")
            return filtered_names

        except Exception as e:
            logger.error(f"Failed to get collection names: {str(e)}")
            raise

    async def _drop_collections(self, collection_names: List[str]) -> List[str]:
        """
        Drop the specified collections.

        Args:
            collection_names: List of collection names to drop

        Returns:
            List of successfully dropped collection names
        """
        database = self.db_provider.get_database()
        dropped_collections = []

        for collection_name in collection_names:
            try:
                database.drop_collection(collection_name)  # type: ignore
                dropped_collections.append(collection_name)
                logger.debug(f"Successfully dropped collection: {collection_name}")
            except Exception as e:
                logger.warning(f"Failed to drop collection {collection_name}: {str(e)}")
                # Continue with other collections even if one fails

        return dropped_collections

    async def _recreate_collections(self) -> None:
        """Recreate all collections with proper indexes."""
        try:
            # For now, collections will be automatically created when
            # data is inserted. In the future, this can be enhanced
            # to create collections with specific schemas and indexes.
            logger.debug("Collections will be created automatically when needed")
        except Exception as e:
            logger.error(f"Failed to recreate collections: {str(e)}")
            # For now, we'll just log the error and continue
            # In production, you might want to implement specific
            # collection recreation logic

    async def _recreate_specific_collections(self, collection_names: List[str]) -> None:
        """
        Recreate only specific collections with their indexes.

        Args:
            collection_names: List of collection names to recreate
        """
        try:
            # For now, we'll just ensure the collections exist without
            # specific indexes. This can be enhanced later with specific
            # collection schema definitions

            for _ in collection_names:
                # Collections will be created automatically when data is
                # inserted into them
                pass

            logger.debug(f"Recreated specific collections: {collection_names}")
        except Exception as e:
            logger.error(f"Failed to recreate specific collections: {str(e)}")
            # Continue execution - collections will be created automatically
            # when data is inserted

    def _generate_operation_id(self) -> str:
        """Generate a unique operation ID for tracking."""
        return f"reset_{datetime.now(tz=timezone.utc).strftime('%Y%m%d_%H%M%S_%f')}"

    async def get_collections_to_reset(
        self, collections: Optional[List[str]] = None
    ) -> List[str]:
        """
        Get the list of collections that would be reset.
        Useful for dry-run operations.

        Args:
            collections: Optional specific collections. If None, returns
                        all collections.

        Returns:
            List of collection names that would be reset
        """
        if collections is None:
            return await self._get_all_collection_names()
        # Validate that the specified collections exist
        all_collections = await self._get_all_collection_names()
        existing_collections = [c for c in collections if c in all_collections]

        if len(existing_collections) != len(collections):
            missing = [c for c in collections if c not in all_collections]
            logger.warning(f"Some requested collections don't exist: {missing}")

        return existing_collections


async def reset_database(
    collections: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Convenience function to reset the database.

    Args:
        collections: Optional list of specific collections to reset.
                    If None, resets all collections.

    Returns:
        Dict with operation results
    """
    reset_service = DatabaseResetService()

    if collections is None:
        return await reset_service.reset_all_collections()
    return await reset_service.reset_specific_collections(collections)


def reset_database_sync(
    collections: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Synchronous wrapper for database reset.

    Args:
        collections: Optional list of specific collections to reset.

    Returns:
        Dict with operation results
    """
    return asyncio.run(reset_database(collections))


# CLI interface for manual testing
if __name__ == "__main__":
    import argparse
    import sys

    parser = argparse.ArgumentParser(description="Reset test database")
    parser.add_argument(
        "--collections", nargs="+", help="Specific collections to reset"
    )
    parser.add_argument("--all", action="store_true", help="Reset all collections")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be reset without actually doing it",
    )

    args = parser.parse_args()

    async def main():
        reset_service = DatabaseResetService()

        try:
            if args.dry_run:
                # Show what would be reset
                collections = await reset_service.get_collections_to_reset(
                    args.collections
                )
                print(f"Would reset collections: {collections}")
                return

            if args.all:
                result = await reset_service.reset_all_collections()
            elif args.collections:
                result = await reset_service.reset_specific_collections(
                    args.collections
                )
            else:
                print("Please specify --all or --collections")
                sys.exit(1)

            print(f"Reset completed: {result}")

        except DatabaseResetError as e:
            print(f"Error: {e}")
            sys.exit(1)
        except Exception as e:
            print(f"Unexpected error: {e}")
            sys.exit(1)

    asyncio.run(main())
