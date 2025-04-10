from typing import List

from shared.database.repositories.base import BaseRepository
from shared.database.schemas.recurrence import RecurrenceRuleSchema
from shared.schemas.core.recurrence import RecurrenceRule


class RecurrenceRepository(BaseRepository[RecurrenceRuleSchema]):
    """Repository for recurrence rules using PyMongo."""

    def __init__(self):
        super().__init__("recurrence_rules", RecurrenceRuleSchema)

    def create_recurrence(self, recurrence: RecurrenceRule) -> RecurrenceRule:
        """Create a new recurrence rule."""
        recurrence_schema = RecurrenceRuleSchema.from_core(recurrence)
        result = self.create(recurrence_schema)
        return result.to_core()

    def get_recurrence_by_id(self, recurrence_id: str) -> RecurrenceRule:
        """Get a recurrence rule by its ID."""
        recurrence = self.find_by_id(recurrence_id)
        if not recurrence:
            raise Exception(f"Recurrence with id {recurrence_id} not found")
        return recurrence.to_core()

    def get_recurrences_by_team_id(self, team_id: str) -> List[RecurrenceRule]:
        """Get all recurrence rules for a team."""
        recurrences = self.find_all({"team_id": team_id})
        return [recurrence.to_core() for recurrence in recurrences]

    def update_recurrence(self, recurrence: RecurrenceRule) -> RecurrenceRule:
        """Update a recurrence rule."""
        recurrence_schema = RecurrenceRuleSchema.from_core(recurrence)
        updated_recurrence = self.update(recurrence_schema)
        if not updated_recurrence:
            raise Exception(f"Failed to update recurrence with id {recurrence.id}")
        return updated_recurrence.to_core()

    def delete_recurrence(self, recurrence_id: str) -> None:
        """Delete a recurrence rule by its ID."""
        result = self.delete(recurrence_id)
        if not result:
            raise Exception(
                f"Recurrence with id {recurrence_id} not found or already deleted"
            )
