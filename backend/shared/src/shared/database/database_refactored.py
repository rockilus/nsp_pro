from typing import Optional

from pymongo import MongoClient
from pymongo.database import Database
from pymongo.errors import ConnectionFailure

from shared.database.interface import DatabaseInterface


class MongoDBInstance(DatabaseInterface):
    """MongoDB database connection manager instance."""

    def __init__(
        self, uri: str, db_name: str, timeoutMS: Optional[int] = None
    ):
        """Initialize MongoDB connection."""
        self._client: Optional[MongoClient] = None
        self._db: Optional[Database] = None
        self._connect(uri, db_name, timeoutMS)

    def _connect(
        self, uri: str, db_name: str, timeoutMS: Optional[int] = None
    ) -> None:
        """Connect to MongoDB."""
        try:
            self._client = MongoClient(uri, timeoutMS=timeoutMS)
            self._db = self._client[db_name]
            self._client.admin.command("ping")
        except ConnectionFailure as e:
            self._client = None
            self._db = None
            raise e

    def get_database(self) -> Database:
        """Get database instance."""
        if self._db is None:
            raise ValueError("Database connection failed.")
        return self._db

    def close(self) -> None:
        """Close the database connection."""
        if self._client is not None:
            self._client.close()  # type: ignore
            self._client = None
            self._db = None

    def check_health(self) -> bool:
        """Check the health of the database connection."""
        if self._client is None:
            return False
        try:
            self._client.admin.command("ping")
            return True
        except ConnectionFailure:
            return False


class MongoDB:
    """Legacy MongoDB singleton manager for backward compatibility."""

    _singleton_instance: Optional[MongoDBInstance] = None

    @classmethod
    def connect(
        cls, uri: str, db_name: str, timeoutMS: Optional[int] = None
    ) -> Database:
        """Legacy singleton connect method."""
        cls._singleton_instance = MongoDBInstance(uri, db_name, timeoutMS)
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
