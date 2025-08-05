"""Database module for NSP Pro shared library."""

# Modern architecture exports (recommended)
from .collections import DatabaseCollections
from .config import DatabaseConfig, DatabaseType
from .container import (
    DatabaseContainer,
    get_database,
    setup_database_config,
    shutdown_databases,
)

# Legacy exports (for backward compatibility)
from .factory import DatabaseFactory
from .interface import DatabaseInterface, Repository
from .providers import DocumentDBProvider, MongoDBProvider

__all__ = [
    # Modern architecture (recommended)
    "DatabaseConfig",
    "DatabaseType",
    "DatabaseContainer",
    "DatabaseFactory",
    "DatabaseInterface",
    "Repository",
    "DatabaseCollections",
    "DocumentDBProvider",
    "MongoDBProvider",
    "get_database",
    "setup_database_config",
    "shutdown_databases",
]
