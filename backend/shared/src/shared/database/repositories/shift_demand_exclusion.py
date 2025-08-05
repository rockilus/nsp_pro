from typing import List

from shared.database.interface import DatabaseInterface
from shared.database.repositories.base import BaseRepository
from shared.database.schemas.shift_demand_exclusion import (
    ShiftDemandExclusionSchema,
)
from shared.schemas.core.shift_demand_exclusion import ShiftDemandExclusion


class ShiftDemandExclusionRepository(BaseRepository[ShiftDemandExclusionSchema]):
    """Repository for shift demand exclusion documents using PyMongo."""

    def __init__(self, database_interface: DatabaseInterface):
        super().__init__(
            database_interface,
            "shift_demand_exclusions",
            ShiftDemandExclusionSchema,
        )

    def create_shift_demand_exclusion(
        self, exclusion: ShiftDemandExclusion
    ) -> ShiftDemandExclusion:
        """Create a new shift demand exclusion."""
        exclusion_schema = ShiftDemandExclusionSchema.from_core(exclusion)
        result = self.create(exclusion_schema)
        return result.to_core()

    def create_shift_demand_exclusions(
        self, exclusions: List[ShiftDemandExclusion]
    ) -> List[ShiftDemandExclusion]:
        """Create multiple shift demand exclusions at once."""
        if not exclusions:
            return []

        exclusion_schemas = [
            ShiftDemandExclusionSchema.from_core(exclusion) for exclusion in exclusions
        ]
        result = self.create_many(exclusion_schemas)
        return [exclusion.to_core() for exclusion in result]

    def get_shift_demand_exclusion_by_id(
        self, exclusion_id: str
    ) -> ShiftDemandExclusion:
        """Get a shift demand exclusion by its ID."""
        exclusion = self.find_by_id(exclusion_id)
        if not exclusion:
            raise Exception(f"ShiftDemandExclusion with id {exclusion_id} not found")
        return exclusion.to_core()

    def get_shift_demand_exclusions_by_coverage_selector_id(
        self, coverage_selector_id: str
    ) -> List[ShiftDemandExclusion]:
        exclusions = self.find_all({"coverage_selector_id": coverage_selector_id})
        return [exclusion.to_core() for exclusion in exclusions]

    def get_shift_demand_exclusions_by_shift_demand_id(
        self, shift_demand_id: str
    ) -> List[ShiftDemandExclusion]:
        """Get all shift demand exclusions by shift demand ID."""
        exclusions = self.find_all({"shift_demand_id": shift_demand_id})
        return [exclusion.to_core() for exclusion in exclusions]

    def get_shift_demand_exclusions_by_schedule_id(
        self, schedule_id: str
    ) -> List[ShiftDemandExclusion]:
        """Get all shift demand exclusions by schedule ID."""
        exclusions = self.find_all({"schedule_id": schedule_id})
        return [exclusion.to_core() for exclusion in exclusions]

    def update_shift_demand_exclusion(
        self, exclusion: ShiftDemandExclusion
    ) -> ShiftDemandExclusion:
        """Update a shift demand exclusion."""
        exclusion_schema = ShiftDemandExclusionSchema.from_core(exclusion)
        updated_exclusion = self.update(exclusion_schema)
        if not updated_exclusion:
            raise Exception(
                f"Failed to update ShiftDemandExclusion with id {exclusion.id}"
            )
        return updated_exclusion.to_core()

    def update_shift_demand_exclusions(
        self, exclusions: List[ShiftDemandExclusion]
    ) -> List[ShiftDemandExclusion]:
        """Update multiple shift demand exclusions."""
        if not exclusions:
            return []

        updated_exclusions = []
        for exclusion in exclusions:
            updated = self.update_shift_demand_exclusion(exclusion)
            updated_exclusions.append(updated)

        return updated_exclusions

    def delete_shift_demand_exclusion(self, exclusion_id: str) -> None:
        """Delete a shift demand exclusion by its ID."""
        result = self.delete(exclusion_id)
        if not result:
            raise Exception(
                f"ShiftDemandExclusion with id {exclusion_id} not found or "
                + "already deleted"
            )

    def delete_shift_demand_exclusions_by_coverage_selector_id(
        self, coverage_selector_id: str
    ) -> None:
        self.collection.delete_many({"coverage_selector_id": coverage_selector_id})

    def delete_shift_demand_exclusions_by_shift_demand_id(
        self, shift_demand_id: str
    ) -> None:
        """Delete all shift demand exclusions by shift demand ID."""
        self.collection.delete_many({"shift_demand_id": shift_demand_id})

    def delete_shift_demand_exclusions_by_shift_demand_ids(
        self, shift_demand_ids: List[str]
    ) -> None:
        """Delete all shift demand exclusions by a list of shift demand IDs."""
        if not shift_demand_ids:
            return

        self.collection.delete_many({"shift_demand_id": {"$in": shift_demand_ids}})

    def delete_shift_demand_exclusions_by_schedule_id(self, schedule_id: str) -> None:
        """Delete all shift demand exclusions by schedule ID."""
        self.collection.delete_many({"schedule_id": schedule_id})
