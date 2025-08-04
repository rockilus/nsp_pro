"""
DocumentDB client for NSP Pro services.
Handles secure connection to AWS DocumentDB with TLS and authentication.
"""

import ssl
from typing import Any, Dict, Optional
from urllib.parse import quote

import pymongo
from pymongo.database import Database
from pymongo.errors import ConnectionFailure

from shared.logger import log_error, log_info


class DocumentDB:
    """DocumentDB database connection manager."""

    _client: Optional[pymongo.MongoClient] = None
    _db: Optional[Database] = None

    @classmethod
    def connect(
        cls,
        credentials: Dict[str, Any],
        db_name: str,
        ca_bundle_path: str = "global-bundle.pem",
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
                print(
                    f"Connecting to DocumentDB at {host}:{port} with user {username} and password {password[:4]}****"
                )  # Mask password for security
                print(f"Using CA bundle at {ca_bundle_path}")

                # connection_uri = (
                #     f"mongodb://{username}:{password}@{host}:{port}"
                #     f"/?tls=true&tlsCAFile={ca_bundle_path}"
                #     f"&replicaSet=rs0&readPreference=secondaryPreferred"
                #     f"&retryWrites=false"
                # )
                connection_uri = (
                    f"mongodb://{username}:{quote(password)}@{host}:{port}/"
                    f"?tls=true"
                    f"&tlsCAFile={ca_bundle_path}"
                    f"&replicaSet=rs0"
                    f"&readPreference=secondaryPreferred"
                    f"&retryWrites=false"
                )

                print(f"Built connection URI: {connection_uri}")

                # "mongodb://docdbadmin:<insertYourPassword>@rockilus-prod-docdb-cluster.cluster-ctocc0ma2lz7.eu-west-3.docdb.amazonaws.com:27017/"
                # "?tls=true"
                # "&tlsCAFile=global-bundle.pem"
                # "&replicaSet=rs0"
                # "&readPreference=secondaryPreferred"
                # "&retryWrites=false"

                # "mongodb://docdbadmin:[1#[0li3IMn7Xru9?{yq-U$<ih&#_kJi@rockilus-prod-docdb-cluster.cluster-ctocc0ma2lz7.eu-west-3.docdb.amazonaws.com:27017/
                # "?tls=true"
                # "&tlsCAFile=global-bundle.pem"
                # "&replicaSet=rs0"
                # "&readPreference=secondaryPreferred"
                # "&retryWrites=false"

                # Create MongoDB client with DocumentDB-specific TLS config
                new_client = pymongo.MongoClient(
                    connection_uri,
                    ssl=True,
                    tls=True,
                    tlsCAFile=ca_bundle_path,
                    tlsAllowInvalidCertificates=False,
                    tlsAllowInvalidHostnames=False,
                    # ssl_ca_certs=ca_bundle_path,
                    # ssl_cert_reqs=ssl.CERT_REQUIRED,
                    # ssl_match_hostname=False,
                    connectTimeoutMS=timeoutMS,
                    serverSelectionTimeoutMS=timeoutMS,
                )

                # Debugging output for client and database
                print(f"Client object: {new_client}")
                print(
                    f"Client object get database: {new_client.get_database()}"
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
