from typing import Optional

from pymongo import MongoClient
from pymongo.database import Database
from pymongo.errors import ConnectionFailure


class MongoDB:
    """MongoDB database connection manager."""

    _client: Optional[MongoClient] = None
    _db: Optional[Database] = None

    @classmethod
    def connect(
        cls, uri: str, db_name: str, timeoutMS: Optional[int] = None
    ) -> Database:
        """Connect to MongoDB and return database instance."""
        if cls._client is None:
            try:
                new_client = MongoClient(uri, timeoutMS=timeoutMS)
                new_db = new_client[db_name]
                cls._client = new_client
                cls._db = new_db
                # cls._client.list_database_names()
                cls._client.admin.command("ping")
            except ConnectionFailure as e:
                cls._client = None
                cls._db = None
                raise e
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
        """Close the database connection."""
        if cls._client is not None:
            cls._client.close()  # type: ignore
            cls._client = None
            cls._db = None

    @classmethod
    def check_health(cls) -> bool:
        """Check the health of the database connection."""
        if cls._client is None:
            raise ValueError("No database connection. Call connect() first.")
        try:
            cls._client.admin.command("ping")
            return True
        except Exception:
            return False


# class MongoDB:
#     def __init__(self, uri: str, database_name: str):
#         self.client = MongoClient(uri)
#         self.db = self.client[database_name]

#     def get_collection(self, name: str):
#         return self.db[name]

#     def close(self):
#         self.client.close()


# class MongoDBManager:
#     """Encapsulates the MongoDB singleton logic without using globals."""

#     _instance: Optional[MongoDB] = None

#     @classmethod
#     def init_mongo(cls, uri: str, database_name: str) -> None:
#         if cls._instance is None:
#             cls._instance = MongoDB(uri, database_name)

#     @classmethod
#     def get_mongo(cls) -> MongoDB:
#         if cls._instance is None:
#             raise RuntimeError(
#                 "MongoDB not initialized. Call MongoDBManager.init_mongo first."
#             )
#         return cls._instance

#     @classmethod
#     def close(cls) -> None:
#         if cls._instance:
#             cls._instance.close()
#             cls._instance = None
