"""
DocumentDB client for NSP Pro services.
Handles secure connection to AWS DocumentDB with TLS and authentication.
"""

import ssl
from typing import Dict, Any, Optional
import pymongo
from pymongo.database import Database
from pymongo.errors import ConnectionFailure

from shared.logger import log_info, log_error


class DocumentDB:
    """DocumentDB database connection manager."""

    _client: Optional[pymongo.MongoClient] = None
    _db: Optional[Database] = None

    @classmethod
    def connect(
        cls,
        credentials: Dict[str, Any],
        db_name: str,
        ca_bundle_path: str = "/app/global-bundle.pem",
        timeoutMS: Optional[int] = 30000,
    ) -> Database:
        """Connect to DocumentDB and return database instance."""
        if cls._client is None:
            try:
                # Build DocumentDB connection URI with TLS
                username = credentials["username"]
                password = credentials["password"]
                host = credentials["host"]
                port = credentials["port"]

                connection_uri = (
                    f"mongodb://{username}:{password}@{host}:{port}"
                    f"/?tls=true&tlsCAFile={ca_bundle_path}"
                    f"&replicaSet=rs0&readPreference=secondaryPreferred"
                    f"&retryWrites=false"
                )

                # Create MongoDB client with DocumentDB-specific TLS config
                new_client = pymongo.MongoClient(
                    connection_uri,
                    ssl=True,
                    ssl_ca_certs=ca_bundle_path,
                    ssl_cert_reqs=ssl.CERT_REQUIRED,
                    ssl_match_hostname=False,
                    connectTimeoutMS=timeoutMS,
                    serverSelectionTimeoutMS=timeoutMS,
                )

                # Connect to the specified database
                new_db = new_client[db_name]
                cls._client = new_client
                cls._db = new_db

                # Test connection with ping
                cls._client.admin.command("ping")
                log_info(
                    f"Successfully connected to DocumentDB database: {db_name}"
                )

            # pylint: disable=broad-except
            except (ConnectionFailure, Exception) as e:
                cls._client = None
                cls._db = None
                log_error(f"Failed to connect to DocumentDB: {str(e)}")
                raise ConnectionFailure(
                    f"Failed to connect to DocumentDB: {str(e)}"
                ) from e

        if cls._db is None:
            raise ValueError("Database connection failed.")
        return cls._db

    @classmethod
    def get_database(cls) -> Database:
        """Get database instance, connecting if necessary."""
        if cls._db is None:
            raise ValueError("No database connection. Call connect() first.")
        return cls._db

    @classmethod
    def close(cls) -> None:
        """Close the DocumentDB connection."""
        if cls._client is not None:
            cls._client.close()  # type: ignore
            cls._client = None
            cls._db = None
            log_info("DocumentDB connection closed")

    @classmethod
    def check_health(cls) -> bool:
        """Check the health of the DocumentDB connection."""
        if cls._client is None:
            return False
        try:
            cls._client.admin.command("ping")
            return True
        except ConnectionFailure as e:
            log_error(f"DocumentDB health check failed: {str(e)}")
            return False
