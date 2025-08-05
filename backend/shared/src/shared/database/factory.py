"""
Database factory to create appropriate database connections.
"""

from typing import Any, Dict, Optional

from pymongo.database import Database

from shared.database.database import MongoDB, MongoDBInstance
from shared.database.documentdb import DocumentDB, DocumentDBInstance
from shared.database.interface import DatabaseInterface
from shared.logger import log_info


class DatabaseFactory:
    """Factory class to create database connections based on configuration."""

    # pylint: disable=too-many-arguments
    @staticmethod
    def create_connection(
        db_uri: str,
        db_name: str,
        use_documentdb: bool = False,
        documentdb_credentials: Optional[Dict[str, Any]] = None,
        documentdb_ca_bundle_path: str = "global-bundle.pem",
        timeoutMS: Optional[int] = 30000,
    ) -> DatabaseInterface:
        """
        Create appropriate database connection based on configuration.

        Args:
            db_uri: MongoDB connection URI (used when use_documentdb=False)
            db_name: Database name
            use_documentdb: Whether to use DocumentDB instead of MongoDB
            documentdb_credentials: DocumentDB credentials dict
            documentdb_ca_bundle_path: Path to DocumentDB CA bundle certificate
            timeoutMS: Connection timeout in milliseconds

        Returns:
            DatabaseInterface instance
        """
        if use_documentdb:
            if not documentdb_credentials:
                raise ValueError(
                    "DocumentDB credentials are required when "
                    "use_documentdb=True"
                )

            log_info("Creating DocumentDB connection")
            return DocumentDBInstance(
                credentials=documentdb_credentials,
                db_name=db_name,
                ca_bundle_path=documentdb_ca_bundle_path,
                timeoutMS=timeoutMS,
            )

        log_info("Creating MongoDB connection")
        return MongoDBInstance(
            uri=db_uri,
            db_name=db_name,
            timeoutMS=timeoutMS,
        )

    @staticmethod
    def get_database(use_documentdb: bool = False) -> Database:
        """Get existing database connection (legacy singleton method)."""
        if use_documentdb:
            return DocumentDB.get_database()
        return MongoDB.get_database()

    @staticmethod
    def close_connection(use_documentdb: bool = False) -> None:
        """Close database connection (legacy singleton method)."""
        if use_documentdb:
            DocumentDB.close()
        MongoDB.close()

    @staticmethod
    def check_health(use_documentdb: bool = False) -> bool:
        """Check database connection health (legacy singleton method)."""
        if use_documentdb:
            return DocumentDB.check_health()
        return MongoDB.check_health()
