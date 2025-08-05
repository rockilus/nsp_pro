"""
Modern database interface for NSP Pro services.
Provides abstraction for different database implementations with async support.
"""

from abc import ABC, abstractmethod
from contextlib import asynccontextmanager
from typing import Any, Dict, Generic, List, Optional, TypeVar

from pymongo.database import Database

T = TypeVar("T")


class DatabaseInterface(ABC):
    """Abstract database interface for document databases."""

    @abstractmethod
    async def connect(self) -> None:
        """Establish database connection."""
        raise NotImplementedError

    @abstractmethod
    async def disconnect(self) -> None:
        """Close database connection."""
        raise NotImplementedError

    @abstractmethod
    def get_database(self) -> Database:
        """Get database instance."""
        raise NotImplementedError

    @abstractmethod
    async def health_check(self) -> bool:
        """Check database health."""
        raise NotImplementedError

    @asynccontextmanager
    async def transaction(self):
        """Context manager for database transactions."""
        # For now, yield None - implementations can override for sessions
        yield None


class Repository(Generic[T], ABC):
    """Abstract repository interface."""

    @abstractmethod
    async def create(self, entity: T) -> T:
        """Create a new entity."""
        raise NotImplementedError

    @abstractmethod
    async def find_by_id(self, entity_id: str) -> Optional[T]:
        """Find entity by ID."""
        raise NotImplementedError

    @abstractmethod
    async def find_many(
        self,
        filters: Optional[Dict[str, Any]] = None,
        limit: Optional[int] = None,
        offset: int = 0,
    ) -> List[T]:
        """Find multiple entities."""
        raise NotImplementedError

    @abstractmethod
    async def update(self, entity: T) -> Optional[T]:
        """Update an entity."""
        raise NotImplementedError

    @abstractmethod
    async def delete(self, entity_id: str) -> bool:
        """Delete an entity."""
        raise NotImplementedError
