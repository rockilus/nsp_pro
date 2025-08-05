"""
Modern database provider implementations for NSP Pro.
Provides MongoDB Atlas and AWS DocumentDB implementations with async support.
"""

import asyncio
import ssl
from typing import Optional

from loguru import logger
from pymongo import MongoClient
from pymongo.database import Database

from .config import DatabaseConfig
from .interface import DatabaseInterface


class MongoDBProvider(DatabaseInterface):
    """Modern MongoDB Atlas provider with async support."""

    def __init__(self, config: DatabaseConfig):
        """Initialize MongoDB provider with configuration."""
        self.config = config
        self._client: Optional[MongoClient] = None
        self._database: Optional[Database] = None

    async def connect(self) -> None:
        """Establish connection to MongoDB Atlas."""
        try:
            if self._client is None:
                if not self.config.mongodb_uri:
                    raise ValueError("MongoDB URI not configured")

                connection_params = {
                    "serverSelectionTimeoutMS": (
                        self.config.connection_timeout_ms
                    ),
                    "maxPoolSize": self.config.max_pool_size,
                    "minPoolSize": self.config.min_pool_size,
                    "maxIdleTimeMS": 30000,
                }

                self._client = MongoClient(
                    self.config.mongodb_uri, **connection_params
                )
                self._database = self._client[self.config.database_name]

                # Test connection
                await asyncio.to_thread(self._client.admin.command, "ping")
                logger.info(
                    f"Connected to MongoDB: {self.config.database_name}"
                )

        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise

    async def disconnect(self) -> None:
        """Close MongoDB connection."""
        try:
            if self._client:
                self._client.close()  # type: ignore
                self._client = None
                self._database = None
                logger.info("Disconnected from MongoDB")
        except Exception as e:
            logger.error(f"Error disconnecting from MongoDB: {e}")

    def get_database(self) -> Database:
        """Get MongoDB database instance."""
        if self._database is None:
            raise RuntimeError("Database not connected. Call connect() first.")
        return self._database

    async def health_check(self) -> bool:
        """Check MongoDB connection health."""
        try:
            if self._client is None:
                return False
            await asyncio.to_thread(self._client.admin.command, "ping")
            return True
        except Exception as e:
            logger.warning(f"MongoDB health check failed: {e}")
            return False


class DocumentDBProvider(DatabaseInterface):
    """Modern AWS DocumentDB provider with async support."""

    def __init__(self, config: DatabaseConfig):
        """Initialize DocumentDB provider with configuration."""
        self.config = config
        self._client: Optional[MongoClient] = None
        self._database: Optional[Database] = None

    async def connect(self) -> None:
        """Establish connection to AWS DocumentDB."""
        try:
            if self._client is None:
                if not self.config.documentdb_host:
                    raise ValueError("DocumentDB host not configured")

                # Build DocumentDB connection string
                username = self.config.documentdb_username
                password = self.config.documentdb_password
                host = self.config.documentdb_host
                port = self.config.documentdb_port

                if username and password:
                    connection_string = (
                        f"mongodb://{username}:{password}@{host}:{port}/"
                        f"?ssl=true&ssl_ca_certs="
                        f"{self.config.documentdb_ca_bundle_path}"
                        "&replicaSet=rs0&readPreference=secondaryPreferred"
                        "&retryWrites=false"
                    )
                else:
                    connection_string = (
                        f"mongodb://{host}:{port}/"
                        f"?ssl=true&ssl_ca_certs="
                        f"{self.config.documentdb_ca_bundle_path}"
                        "&replicaSet=rs0&readPreference=secondaryPreferred"
                        "&retryWrites=false"
                    )

                connection_params = {
                    "serverSelectionTimeoutMS": (
                        self.config.connection_timeout_ms
                    ),
                    "maxPoolSize": self.config.max_pool_size,
                    "minPoolSize": self.config.min_pool_size,
                    "maxIdleTimeMS": 30000,
                    "ssl": True,
                    "ssl_cert_reqs": ssl.CERT_REQUIRED,
                    "ssl_ca_certs": self.config.documentdb_ca_bundle_path,
                    # DocumentDB doesn't support retryWrites
                    "retryWrites": False,
                }

                self._client = MongoClient(
                    connection_string, **connection_params
                )
                self._database = self._client[self.config.database_name]

                # Test connection
                await asyncio.to_thread(self._client.admin.command, "ping")
                logger.info(
                    f"Connected to DocumentDB: {self.config.database_name}"
                )

        except Exception as e:
            logger.error(f"Failed to connect to DocumentDB: {e}")
            raise

    async def disconnect(self) -> None:
        """Close DocumentDB connection."""
        try:
            if self._client:
                self._client.close()  # type: ignore
                self._client = None
                self._database = None
                logger.info("Disconnected from DocumentDB")
        except Exception as e:
            logger.error(f"Error disconnecting from DocumentDB: {e}")

    def get_database(self) -> Database:
        """Get DocumentDB database instance."""
        if self._database is None:
            raise RuntimeError("Database not connected. Call connect() first.")
        return self._database

    async def health_check(self) -> bool:
        """Check DocumentDB connection health."""
        try:
            if self._client is None:
                return False
            await asyncio.to_thread(self._client.admin.command, "ping")
            return True
        except Exception as e:
            logger.warning(f"DocumentDB health check failed: {e}")
            return False
