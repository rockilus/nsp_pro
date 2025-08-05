from typing import Optional

from pymongo import MongoClient
from pymongo.database import Database
from pymongo.errors import ConnectionFailure

from shared.database.interface import DatabaseInterface


class MongoDB(DatabaseInterface):
    """MongoDB database connection manager."""

    def __init__(self, uri: str, db_name: str, timeoutMS: Optional[int] = None):
        """Initialize MongoDB connection."""
        self._client: Optional[MongoClient] = None
        self._db: Optional[Database] = None
        self._connect(uri, db_name, timeoutMS)

    def _connect(self, uri: str, db_name: str, timeoutMS: Optional[int] = None) -> None:
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
            self._client.close()
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


class MongoDBSingleton:
    """Singleton manager for MongoDB for backward compatibility."""

    _instance: Optional[MongoDB] = None

    @classmethod
    def connect(
        cls, uri: str, db_name: str, timeoutMS: Optional[int] = None
    ) -> Database:
        """Legacy singleton connect method."""
        cls._instance = MongoDB(uri, db_name, timeoutMS)
        return cls._instance.get_database()

    @classmethod
    def get_database(cls) -> Database:
        """Legacy singleton get_database method."""
        if cls._instance is None:
            raise ValueError("No database connection. Call connect() first.")
        return cls._instance.get_database()

    @classmethod
    def close(cls) -> None:
        """Legacy singleton close method."""
        if cls._instance is not None:
            cls._instance.close()
            cls._instance = None

    @classmethod
    def check_health(cls) -> bool:
        """Legacy singleton health check method."""
        if cls._instance is None:
            return False
        return cls._instance.check_health()


# Monkey patch MongoDB class to maintain backward compatibility
MongoDB.connect = MongoDBSingleton.connect
MongoDB.get_database = MongoDBSingleton.get_database  # type: ignore
MongoDB.close = MongoDBSingleton.close  # type: ignore
MongoDB.check_health = MongoDBSingleton.check_health  # type: ignore
