"""
Database configuration with validation.
"""

import os
from dataclasses import dataclass
from enum import Enum
from typing import Optional


class DatabaseType(str, Enum):
    """Supported database types."""

    MONGODB = "mongodb"
    DOCUMENTDB = "documentdb"


@dataclass
class DatabaseConfig:
    """Database configuration with validation."""

    # Common settings
    database_type: DatabaseType = DatabaseType.MONGODB
    database_name: str = "nsp_pro"
    connection_timeout_ms: int = 30000

    # MongoDB settings
    mongodb_uri: Optional[str] = None

    # DocumentDB settings
    documentdb_host: Optional[str] = None
    documentdb_port: int = 27017
    documentdb_username: Optional[str] = None
    documentdb_password: Optional[str] = None
    documentdb_ca_bundle_path: str = "global-bundle.pem"

    # Connection pool settings
    min_pool_size: int = 10
    max_pool_size: int = 100

    # Test settings
    test_mongodb_uri: str = "mongodb://localhost:27017"
    test_database_name: str = "test_database"

    @classmethod
    def from_env(cls) -> "DatabaseConfig":
        """Create configuration from environment variables."""
        db_type_str = os.getenv("DB_DATABASE_TYPE", "mongodb").lower()
        db_type = DatabaseType.MONGODB
        if db_type_str == "documentdb":
            db_type = DatabaseType.DOCUMENTDB

        config = cls(
            database_type=db_type,
            database_name=os.getenv("DB_DATABASE_NAME", "nsp_pro"),
            connection_timeout_ms=int(
                os.getenv("DB_CONNECTION_TIMEOUT_MS", "30000")
            ),
            mongodb_uri=os.getenv("DB_MONGODB_URI"),
            documentdb_host=os.getenv("DB_DOCUMENTDB_HOST"),
            documentdb_port=int(os.getenv("DB_DOCUMENTDB_PORT", "27017")),
            documentdb_username=os.getenv("DB_DOCUMENTDB_USERNAME"),
            documentdb_password=os.getenv("DB_DOCUMENTDB_PASSWORD"),
            documentdb_ca_bundle_path=os.getenv(
                "DB_DOCUMENTDB_CA_BUNDLE_PATH", "global-bundle.pem"
            ),
            min_pool_size=int(os.getenv("DB_MIN_POOL_SIZE", "10")),
            max_pool_size=int(os.getenv("DB_MAX_POOL_SIZE", "100")),
            test_mongodb_uri=os.getenv(
                "DB_TEST_MONGODB_URI", "mongodb://localhost:27017"
            ),
            test_database_name=os.getenv(
                "DB_TEST_DATABASE_NAME", "test_database"
            ),
        )

        config.validate()
        return config

    def validate(self) -> None:
        """Validate configuration."""
        if self.database_type == DatabaseType.MONGODB and not self.mongodb_uri:
            raise ValueError("mongodb_uri is required for MongoDB")

        if self.database_type == DatabaseType.DOCUMENTDB:
            if not self.documentdb_host:
                raise ValueError("documentdb_host is required for DocumentDB")
            if not self.documentdb_username:
                raise ValueError(
                    "documentdb_username is required for DocumentDB"
                )
            if not self.documentdb_password:
                raise ValueError(
                    "documentdb_password is required for DocumentDB"
                )


# Legacy Config for backward compatibility
class Config:
    """Legacy application configuration."""

    @classmethod
    def from_database_config(cls, db_config: DatabaseConfig):
        """Create legacy config from modern DatabaseConfig."""
        instance = cls()
        instance.TEST_MONGODB_URI = db_config.test_mongodb_uri
        instance.TEST_DATABASE_NAME = db_config.test_database_name
        return instance

    TEST_MONGODB_URI = "mongodb://localhost:27017"
    TEST_DATABASE_NAME = "test_database"
