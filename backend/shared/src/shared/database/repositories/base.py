from typing import Any, Dict, Generic, List, Optional, Type, TypeVar

from bson import ObjectId
from pymongo.collection import Collection
from pymongo.database import Database
from pymongo.results import DeleteResult, InsertOneResult, UpdateResult

from shared.database.schemas.base import DocumentBaseSchema

T = TypeVar("T", bound=DocumentBaseSchema)


class BaseRepository(Generic[T]):
    """Base repository for MongoDB collections."""

    def __init__(
        self,
        collection_name: str,
        schema_cls: Type[T],
        database: Optional[Database] = None,
    ):
        """
        Initialize repository with collection name and schema class.

        Args:
            collection_name: Name of the MongoDB collection
            schema_cls: Schema class for the documents
            database: Database instance (if None, uses legacy singleton)
        """
        if database is None:
            # Fallback to legacy MongoDB singleton for backward compatibility
            from shared.database.database import MongoDB

            self.db = MongoDB.get_database()
        else:
            self.db = database

        self.collection: Collection = self.db[collection_name]
        self.schema_cls = schema_cls

    def create(self, schema: T) -> T:
        """Create a new document in the collection."""
        doc = schema.to_mongo()
        doc["_id"] = str(ObjectId())
        result: InsertOneResult = self.collection.insert_one(doc)

        if not result.acknowledged:
            raise Exception("Failed to create document")

        schema.id = str(result.inserted_id)
        return schema

    def create_many(self, schemas: List[T]) -> List[T]:
        """Create multiple documents in the collection."""
        if not schemas:
            return []

        docs = [schema.to_mongo() for schema in schemas]
        for doc in docs:
            doc["_id"] = str(ObjectId())
        result = self.collection.insert_many(docs)

        if not result.acknowledged:
            raise Exception("Failed to create documents")

        for i, s_id in enumerate(result.inserted_ids):
            schemas[i].id = str(s_id)

        return schemas

    def find_by_id(self, doc_id: str) -> Optional[T]:
        """Find a document by its ID."""
        doc = self.collection.find_one({"_id": doc_id})
        return self.schema_cls.from_mongo(doc) if doc else None

    def find_one(
        self, doc_filter: Optional[Dict[str, Any]] = None
    ) -> Optional[T]:
        """Find a single document matching the filter."""
        doc_filter = doc_filter or {}
        doc = self.collection.find_one(doc_filter)
        return self.schema_cls.from_mongo(doc) if doc else None

    def find_all(
        self,
        doc_filter: Optional[Dict[str, Any]] = None,
        limit: int = 0,
        skip: int = 0,
    ) -> List[T]:
        """Find all documents matching the filter."""
        doc_filter = doc_filter or {}
        cursor = self.collection.find(doc_filter).skip(skip)

        if limit > 0:
            cursor = cursor.limit(limit)

        return [self.schema_cls.from_mongo(doc) for doc in cursor]

    def update(self, schema: T) -> Optional[T]:
        """Update a document by its ID."""
        if not schema.id:
            raise ValueError("Document ID is required for update")
        update_data = schema.to_mongo()
        update_data.pop("_id", None)

        if not update_data:
            # No fields to update
            return self.find_by_id(schema.id)

        result: UpdateResult = self.collection.update_one(
            {"_id": schema.id}, {"$set": update_data}
        )

        if not result.acknowledged:
            raise Exception("Failed to update document")

        return self.find_by_id(schema.id)

    def delete(self, doc_id: str) -> bool:
        """Delete a document by its ID."""
        result: DeleteResult = self.collection.delete_one({"_id": doc_id})
        return result.deleted_count > 0

    def count(self, doc_filter: Optional[Dict[str, Any]] = None) -> int:
        """Count documents matching the filter."""
        doc_filter = doc_filter or {}
        return self.collection.count_documents(doc_filter)
