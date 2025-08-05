"""
DocumentDB client for NSP Pro services.
Handles secure connection to AWS DocumentDB with TLS and authentication.
"""

from typing import Any, Dict, Optional
from urllib.parse import quote

import pymongo
from pymongo.database import Database
from pymongo.errors import ConnectionFailure

from shared.database.interface import DatabaseInterface
from shared.logger import log_error, log_info


class DocumentDBInstance(DatabaseInterface):
    """DocumentDB database connection manager instance."""

    def __init__(
        self,
        credentials: Dict[str, Any],
        db_name: str,
        ca_bundle_path: str = "global-bundle.pem",
        timeoutMS: Optional[int] = 30000,
    ):
        """Initialize DocumentDB connection."""
        self._client: Optional[pymongo.MongoClient] = None
        self._db: Optional[Database] = None
        self._connect(credentials, db_name, ca_bundle_path, timeoutMS)

    def _connect(
        self,
        credentials: Dict[str, Any],
        db_name: str,
        ca_bundle_path: str,
        timeoutMS: Optional[int],
    ) -> None:
        """Connect to DocumentDB."""
        try:
            # Build DocumentDB connection URI with TLS
            username = credentials["username"]
            password = credentials["password"]
            host = credentials["host"]
            port = credentials["port"]
            print(
                f"Connecting to DocumentDB at {host}:{port} with user "
                f"{username} and password {password[:4]}****"
            )  # Mask password for security
            print(f"Using CA bundle at {ca_bundle_path}")

            connection_uri = (
                f"mongodb://{username}:{quote(password)}@{host}:{port}/"
                f"?tls=true"
                f"&tlsCAFile={ca_bundle_path}"
                f"&replicaSet=rs0"
                f"&readPreference=secondaryPreferred"
                f"&retryWrites=false"
            )

            print(f"Built connection URI: {connection_uri}")

            # Create MongoDB client with DocumentDB-specific TLS config
            new_client = pymongo.MongoClient(
                connection_uri,
                ssl=True,
                tls=True,
                tlsCAFile=ca_bundle_path,
                tlsAllowInvalidCertificates=False,
                tlsAllowInvalidHostnames=False,
                connectTimeoutMS=timeoutMS,
                serverSelectionTimeoutMS=timeoutMS,
            )

            # Debugging output for client and database
            print(f"Client object: {new_client}")
            print(f"Client object get database: {new_client.get_database()}")

            # Connect to the specified database
            new_db = new_client[db_name]
            self._client = new_client
            self._db = new_db

            # Test connection with ping
            self._client.admin.command("ping")
            log_info(f"Successfully connected to DocumentDB database: {db_name}")

        # pylint: disable=broad-except
        except (ConnectionFailure, Exception) as e:
            self._client = None
            self._db = None
            log_error(f"Failed to connect to DocumentDB: {str(e)}")
            raise ConnectionFailure(f"Failed to connect to DocumentDB: {str(e)}") from e

    def get_database(self) -> Database:
        """Get database instance."""
        if self._db is None:
            raise ValueError("Database connection failed.")
        return self._db

    def close(self) -> None:
        """Close the DocumentDB connection."""
        if self._client is not None:
            self._client.close()  # type: ignore
            self._client = None
            self._db = None
            log_info("DocumentDB connection closed")

    def check_health(self) -> bool:
        """Check the health of the DocumentDB connection."""
        if self._client is None:
            return False
        try:
            self._client.admin.command("ping")
            return True
        except ConnectionFailure as e:
            log_error(f"DocumentDB health check failed: {str(e)}")
            return False


class DocumentDB:
    """Legacy DocumentDB singleton manager for backward compatibility."""

    _singleton_instance: Optional[DocumentDBInstance] = None

    @classmethod
    def connect(
        cls,
        credentials: Dict[str, Any],
        db_name: str,
        ca_bundle_path: str = "global-bundle.pem",
        timeoutMS: Optional[int] = 30000,
    ) -> Database:
        """Legacy singleton connect method."""
        cls._singleton_instance = DocumentDBInstance(
            credentials, db_name, ca_bundle_path, timeoutMS
        )
        return cls._singleton_instance.get_database()

    @classmethod
    def get_database(cls) -> Database:
        """Legacy singleton get_database method."""
        if cls._singleton_instance is None:
            raise ValueError("No database connection. Call connect() first.")
        return cls._singleton_instance.get_database()

    @classmethod
    def close(cls) -> None:
        """Legacy singleton close method."""
        if cls._singleton_instance is not None:
            cls._singleton_instance.close()
            cls._singleton_instance = None

    @classmethod
    def check_health(cls) -> bool:
        """Legacy singleton health check method."""
        if cls._singleton_instance is None:
            return False
        return cls._singleton_instance.check_health()
