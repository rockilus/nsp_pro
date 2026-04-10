"""
Modern database collections for NSP Pro services.
Provides access to database collections using dependency injection.
"""

from typing import Dict, Optional

from pymongo.collection import Collection

from .container import get_database
from .interface import DatabaseInterface


class DatabaseCollections:
    """Modern collections manager with dependency injection support."""

    def __init__(
        self,
        database: Optional[DatabaseInterface] = None,
        database_name: str = "default",
    ):
        """
        Initialize collections manager.

        Args:
            database: Optional database interface instance
            database_name: Name of database configuration
                          (used if database is None)
        """
        self._database = database
        self.database_name = database_name
        self._collections_cache: Dict[str, Collection] = {}

    async def get_collection(self, name: str) -> Collection:
        """Get collection by name with caching."""
        if name not in self._collections_cache:
            if self._database is None:
                self._database = await get_database(self.database_name)

            db = self._database.get_database()
            self._collections_cache[name] = db[name]

        return self._collections_cache[name]

    # Common collection getters
    async def get_users(self) -> Collection:
        """Get users collection."""
        return await self.get_collection("users")

    async def get_schedules(self) -> Collection:
        """Get schedules collection."""
        return await self.get_collection("schedules")

    async def get_assignments(self) -> Collection:
        """Get assignments collection."""
        return await self.get_collection("assignments")

    async def get_shifts(self) -> Collection:
        """Get shifts collection."""
        return await self.get_collection("shifts")

    async def get_employees(self) -> Collection:
        """Get employees collection."""
        return await self.get_collection("employees")

    async def get_organizations(self) -> Collection:
        """Get organizations collection."""
        return await self.get_collection("organizations")

    async def get_departments(self) -> Collection:
        """Get departments collection."""
        return await self.get_collection("departments")

    async def get_positions(self) -> Collection:
        """Get positions collection."""
        return await self.get_collection("positions")

    async def get_leave_requests(self) -> Collection:
        """Get leave_requests collection."""
        return await self.get_collection("leave_requests")

    async def get_time_off_types(self) -> Collection:
        """Get time_off_types collection."""
        return await self.get_collection("time_off_types")

    async def get_constraints(self) -> Collection:
        """Get constraints collection."""
        return await self.get_collection("constraints")

    async def clear_cache(self) -> None:
        """Clear collections cache."""
        self._collections_cache.clear()
