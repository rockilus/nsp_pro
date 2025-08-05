"""
Database interface for NSP Pro services.
Provides abstraction for different database implementations.
"""

from abc import ABC, abstractmethod

from pymongo.database import Database


class DatabaseInterface(ABC):
    """Abstract interface for database connections."""

    @abstractmethod
    def get_database(self) -> Database:
        """Get database instance."""
        raise NotImplementedError

    @abstractmethod
    def close(self) -> None:
        """Close database connection."""
        raise NotImplementedError

    @abstractmethod
    def check_health(self) -> bool:
        """Check database connection health."""
        raise NotImplementedError
