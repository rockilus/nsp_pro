from typing import List

from shared.database_pymongo_str_id.repositories.base import BaseRepository
from shared.database_pymongo_str_id.schemas.breach import BreachSchema
from shared.schemas.schemas.schedule import Breach


class BreachRepository(BaseRepository[BreachSchema]):
    """Repository for breach documents using PyMongo."""

    def __init__(self):
        super().__init__("breaches", BreachSchema)

    def create_breach(self, breach: Breach) -> Breach:
        """Create a new breach."""
        breach_schema = BreachSchema.from_core(breach)
        result = self.create(breach_schema)
        return result.to_core()

    def create_breaches(self, breaches: List[Breach]) -> List[Breach]:
        """Create multiple breaches at once."""
        if not breaches:
            return []

        breach_schemas = [BreachSchema.from_core(breach) for breach in breaches]
        result = self.create_many(breach_schemas)
        return [breach.to_core() for breach in result]

    def get_breaches(self, schedule_ids: List[str]) -> List[Breach]:
        """Get all breaches for given schedules."""
        breaches = self.find_all({"schedule": {"$in": schedule_ids}})
        return [breach.to_core() for breach in breaches]

    def get_breach_by_id(self, breach_id: str) -> Breach:
        """Get a breach by its ID."""
        breach = self.find_by_id(breach_id)
        if not breach:
            raise Exception(f"Breach with id {breach_id} not found")
        return breach.to_core()

    def get_breaches_by_schedule_id(self, schedule_id: str) -> List[Breach]:
        """Get all breaches for a specific schedule."""
        breaches = self.find_all({"schedule": schedule_id})
        return [breach.to_core() for breach in breaches]

    def get_breaches_by_worker_id(self, worker_id: str) -> List[Breach]:
        """Get all breaches for a specific worker."""
        breaches = self.find_all({"variables.worker": worker_id})
        return [breach.to_core() for breach in breaches]

    def get_breaches_by_shift_id(self, shift_id: str) -> List[Breach]:
        """Get all breaches for a specific shift."""
        breaches = self.find_all({"variables.shift": shift_id})
        return [breach.to_core() for breach in breaches]

    def update_breach(self, breach: Breach) -> Breach:
        """Update a breach."""
        breach_schema = BreachSchema.from_core(breach)
        breach_updated = self.update(breach_schema)
        assert breach_updated is not None
        return breach_updated.to_core()

    def delete_breach(self, breach_id: str) -> None:
        """Delete a breach by its ID."""
        result = self.delete(breach_id)
        if result is False:
            raise Exception(f"Breach with id {breach_id} not found or already deleted")

    def delete_breaches_by_schedule_id(self, schedule_id: str) -> None:
        """Delete all breaches for a specific schedule."""
        self.collection.delete_many({"schedule": schedule_id})
