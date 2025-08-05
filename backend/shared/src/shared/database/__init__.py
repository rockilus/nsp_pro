"""Database module for NSP Pro shared library."""

# Modern architecture exports (recommended)
from .collections import DatabaseCollections
from .config import DatabaseConfig, DatabaseType
from .container import (
    DatabaseContainer,
    get_container,
    get_database,
    setup_database_config,
    shutdown_databases,
)

# Legacy exports (for backward compatibility)
from .database import MongoDB
from .documentdb import DocumentDB
from .factory import DatabaseFactory
from .interface import DatabaseInterface, Repository
from .providers import DocumentDBProvider, MongoDBProvider
from .repository import BaseRepository
from .test_connection import test_database_connection

__all__ = [
    # Modern architecture (recommended)
    "DatabaseConfig",
    "DatabaseType",
    "DatabaseContainer",
    "DatabaseFactory",
    "DatabaseInterface",
    "Repository",
    "BaseRepository",
    "DatabaseCollections",
    "DocumentDBProvider",
    "MongoDBProvider",
    "get_container",
    "get_database",
    "setup_database_config",
    "shutdown_databases",
    # Legacy (for backward compatibility)
    "MongoDB",
    "DocumentDB",
    "test_database_connection",
]
