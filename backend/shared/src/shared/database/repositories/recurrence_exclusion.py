from datetime import date, datetime, time, timezone
from typing import List, Optional

from shared.database.repositories.base import BaseRepository
from shared.database.schemas.recurrence_exclusion import (
    RecurrenceExclusionSchema,
)
from shared.schemas.core.recurrence import RecurrenceExclusion
from shared.database.interface import DatabaseInterface


class RecurrenceExclusionRepository(BaseRepository[RecurrenceExclusionSchema]):
    """Repository for recurrence exclusions using PyMongo."""

    def __init__(self, database_interface: DatabaseInterface):
        super().__init__(
            database_interface,
            "recurrence_exclusions",
            RecurrenceExclusionSchema,
        )

    def create_recurrence_exclusion(
        self, exclusion: RecurrenceExclusion
    ) -> RecurrenceExclusion:
        """Create a new recurrence exclusion."""
        exclusion_schema = RecurrenceExclusionSchema.from_core(exclusion)
        result = self.create(exclusion_schema)
        return result.to_core()

    def create_recurrence_exclusions(
        self, exclusions: List[RecurrenceExclusion]
    ) -> List[RecurrenceExclusion]:
        """Create multiple recurrence exclusions."""
        exclusion_schemas = [
            RecurrenceExclusionSchema.from_core(exclusion)
            for exclusion in exclusions
        ]
        created_schemas = self.create_many(exclusion_schemas)
        return [schema.to_core() for schema in created_schemas]

    def get_recurrence_exclusion_by_id(
        self, exclusion_id: str
    ) -> Optional[RecurrenceExclusion]:
        """Get a recurrence exclusion by its ID."""
        exclusion = self.find_by_id(exclusion_id)
        return exclusion.to_core() if exclusion else None

    def get_recurrence_exclusions_by_rule_id(
        self, rule_id: str
    ) -> List[RecurrenceExclusion]:
        """Get all recurrence exclusions for a specific recurrence rule ID."""
        exclusions = self.find_all({"recurrence_rule_id": rule_id})
        return [exclusion.to_core() for exclusion in exclusions]

    def get_recurrence_exclusions_by_rule_id_from_date(
        self, rule_id: str, from_date: date
    ) -> List[RecurrenceExclusion]:
        """Get recurrence exclusions for a rule ID from a specific date onward."""
        start_of_day = datetime.combine(
            from_date, time.min, tzinfo=timezone.utc
        )

        exclusions = self.find_all(
            {
                "recurrence_rule_id": rule_id,
                "excluded_date": {"$gte": start_of_day.timestamp()},
            }
        )
        return [exclusion.to_core() for exclusion in exclusions]

    def get_recurrence_exclusions_by_rule_ids(
        self, rule_ids: List[str]
    ) -> List[RecurrenceExclusion]:
        """Get recurrence exclusions for multiple recurrence rule IDs."""
        exclusions = self.find_all({"recurrence_rule_id": {"$in": rule_ids}})
        return [exclusion.to_core() for exclusion in exclusions]

    def get_recurrence_exclusions_by_rule_ids_from_date(
        self, rule_ids: List[str], from_date: date
    ) -> List[RecurrenceExclusion]:
        start_of_day = datetime.combine(
            from_date, time.min, tzinfo=timezone.utc
        )

        exclusions = self.find_all(
            {
                "recurrence_rule_id": {"$in": rule_ids},
                "excluded_date": {"$gte": start_of_day.timestamp()},
            }
        )
        return [exclusion.to_core() for exclusion in exclusions]

    def update_recurrence_exclusion(
        self, exclusion: RecurrenceExclusion
    ) -> RecurrenceExclusion:
        """Update a recurrence exclusion."""
        exclusion_schema = RecurrenceExclusionSchema.from_core(exclusion)
        updated_exclusion = self.update(exclusion_schema)
        if not updated_exclusion:
            raise ValueError(
                f"Failed to update exclusion with id {exclusion.id}"
            )
        return updated_exclusion.to_core()

    def update_recurrence_exclusions(
        self, exclusions: List[RecurrenceExclusion]
    ) -> List[RecurrenceExclusion]:
        """Update multiple recurrence exclusions."""
        if not exclusions:
            return []

        updated_exclusions = []
        for exclusion in exclusions:
            updated = self.update_recurrence_exclusion(exclusion)
            updated_exclusions.append(updated)

        return updated_exclusions

    def delete_recurrence_exclusion_by_id(self, exclusion_id: str) -> None:
        """Delete a recurrence exclusion by its ID."""
        result = self.delete(exclusion_id)
        if not result:
            raise KeyError(
                f"Exclusion with id {exclusion_id} not found or already deleted"
            )

    def delete_recurrence_exclusions_by_rule_id(self, rule_id: str) -> None:
        """Delete all recurrence exclusions for a specific rule ID."""
        self.collection.delete_many({"recurrence_rule_id": rule_id})

    def delete_recurrence_exclusions_by_rule_id_from_date(
        self, rule_id: str, from_date: date
    ) -> None:
        """Delete recurrence exclusions for a rule ID from a specific date onward."""
        start_of_day = datetime.combine(
            from_date, time.min, tzinfo=timezone.utc
        )

        self.collection.delete_many(
            {
                "recurrence_rule_id": rule_id,
                "excluded_date": {"$gte": start_of_day.timestamp()},
            }
        )
