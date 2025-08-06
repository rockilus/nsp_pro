"""Database setup for API Gateway using modern shared database architecture."""

from shared.database.container import (
    DatabaseContainer,
    setup_database_config,
    shutdown_databases,
)
from shared.database.database_collections import DatabaseCollections
from shared.logger import log_error, log_info

from src.config import config


async def setup_database() -> DatabaseCollections:
    """Setup database connection and return DatabaseCollections instance."""
    try:
        # Get database configuration based on environment
        db_config = config.get_database_config()

        # Setup database configuration in container
        setup_database_config(db_config, "default")

        # Get database interface from container
        container = DatabaseContainer.get_instance()
        database_interface = await container.get_database("default")

        # Create DatabaseCollections with the interface
        db_collections = DatabaseCollections(database_interface)

        log_info(f"Database setup completed using {db_config.database_type.value}")
        return db_collections

    except Exception as e:
        log_error(f"Failed to setup database: {str(e)}")
        raise


async def shutdown_database() -> None:
    """Shutdown database connections."""
    try:
        await shutdown_databases()
        log_info("Database connections closed successfully")
    except Exception as e:
        log_error(f"Error closing database connections: {str(e)}")
