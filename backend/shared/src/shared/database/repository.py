"""
Modern base repository implementation for NSP Pro services.
Provides common database operations using dependency injection.
"""

import asyncio
from abc import ABC
from typing import Any, Dict, List, Optional, TypeVar

from bson import ObjectId
from pymongo.collection import Collection

from .container import get_database
from .interface import DatabaseInterface, Repository

T = TypeVar("T")


class BaseRepository(Repository[T], ABC):
    """Base repository with common database operations."""

    def __init__(
        self,
        collection_name: str,
        database: Optional[DatabaseInterface] = None,
        database_name: str = "default",
    ):
        """
        Initialize repository.

        Args:
            collection_name: Name of the MongoDB collection
            database: Optional database interface instance
            database_name: Name of database configuration
                          (used if database is None)
        """
        self.collection_name = collection_name
        self._database = database
        self.database_name = database_name

    async def _get_collection(self) -> Collection:
        """Get MongoDB collection instance."""
        if self._database is None:
            self._database = await get_database(self.database_name)

        db = self._database.get_database()
        return db[self.collection_name]

    async def create(self, entity: T) -> T:
        """Create a new entity."""
        collection = await self._get_collection()

        # Convert entity to dict if needed
        doc = entity if isinstance(entity, dict) else entity.__dict__

        # Insert document
        result = await asyncio.to_thread(collection.insert_one, doc)

        # Update entity with generated ID if it's a dict
        if isinstance(entity, dict):
            entity["_id"] = result.inserted_id
        else:
            entity._id = result.inserted_id  # type: ignore

        return entity

    async def find_by_id(self, entity_id: str) -> Optional[T]:
        """Find entity by ID."""
        collection = await self._get_collection()

        # Convert string ID to ObjectId
        object_id = (
            ObjectId(entity_id) if isinstance(entity_id, str) else entity_id
        )

        # Find document
        doc = await asyncio.to_thread(collection.find_one, {"_id": object_id})

        if doc is None:
            return None

        return self._document_to_entity(doc)

    async def find_many(
        self,
        filters: Optional[Dict[str, Any]] = None,
        limit: Optional[int] = None,
        offset: int = 0,
    ) -> List[T]:
        """Find multiple entities."""
        collection = await self._get_collection()

        filters = filters or {}

        # Build query with pagination
        cursor = collection.find(filters)

        if offset > 0:
            cursor = cursor.skip(offset)

        if limit is not None:
            cursor = cursor.limit(limit)

        # Execute query
        docs = await asyncio.to_thread(list, cursor)

        return [self._document_to_entity(doc) for doc in docs]

    async def update(self, entity: T) -> Optional[T]:
        """Update an entity."""
        collection = await self._get_collection()

        # Extract ID and document
        if isinstance(entity, dict):
            entity_id = entity.get("_id")
            doc = {k: v for k, v in entity.items() if k != "_id"}
        else:
            entity_id = getattr(entity, "_id", None)
            doc = {k: v for k, v in entity.__dict__.items() if k != "_id"}

        if entity_id is None:
            raise ValueError("Entity must have an _id to update")

        # Update document
        result = await asyncio.to_thread(
            collection.update_one, {"_id": entity_id}, {"$set": doc}
        )

        if result.matched_count == 0:
            return None

        return entity

    async def delete(self, entity_id: str) -> bool:
        """Delete an entity."""
        collection = await self._get_collection()

        # Convert string ID to ObjectId
        object_id = (
            ObjectId(entity_id) if isinstance(entity_id, str) else entity_id
        )

        # Delete document
        result = await asyncio.to_thread(
            collection.delete_one, {"_id": object_id}
        )

        return result.deleted_count > 0

    def _document_to_entity(self, doc: Dict[str, Any]) -> T:
        """
        Convert MongoDB document to entity.

        Subclasses should override this method to provide proper
        entity conversion. Default implementation returns the document as-is.
        """
        return doc  # type: ignore

    async def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """Count entities matching filters."""
        collection = await self._get_collection()
        filters = filters or {}
        return await asyncio.to_thread(collection.count_documents, filters)

    async def exists(self, entity_id: str) -> bool:
        """Check if entity exists."""
        entity = await self.find_by_id(entity_id)
        return entity is not None
