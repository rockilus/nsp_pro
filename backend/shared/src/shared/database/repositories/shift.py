from typing import List, Optional

from shared.database.interface import DatabaseInterface
from shared.database.repositories.base import BaseRepository
from shared.database.schemas.shift import ShiftSchema
from shared.schemas.core.shift import Shift, ShiftRestType, ShiftType


class ShiftRepository(BaseRepository[ShiftSchema]):
    """Repository for shift documents using modern database interface."""

    def __init__(self, database_interface: DatabaseInterface):
        """
        Initialize ShiftRepository.

        Args:
            database_interface: Database interface instance
        """
        super().__init__(database_interface, "shifts", ShiftSchema)

    def create_shift(self, shift: Shift) -> Shift:
        """Create a new shift."""
        shift_schema = ShiftSchema.from_core(shift)
        result = self.create(shift_schema)
        return result.to_core()

    def create_shifts(self, shifts: List[Shift]) -> List[Shift]:
        """Create multiple shifts at once."""
        if not shifts:
            return []

        shift_schemas = [ShiftSchema.from_core(shift) for shift in shifts]
        result = self.create_many(shift_schemas)
        return [shift.to_core() for shift in result]

    def get_shifts(self, team_id: str) -> List[Shift]:
        """Get all shifts for a team."""
        shifts = self.find_all({"team": team_id})
        return [shift.to_core() for shift in shifts]

    def get_shifts_not_deleted(self, team_id: str) -> List[Shift]:
        """Get all non-deleted shifts for a team."""
        shifts = self.find_all({"team": team_id, "deleted": False})
        return [shift.to_core() for shift in shifts]

    def get_work_shifts(self, team_id: str) -> List[Shift]:
        """Get all work shifts for a team."""
        shifts = self.find_all(
            {
                "team": team_id,
                "shift_type": {
                    "$in": [
                        ShiftType.NORMAL.value,
                        ShiftType.DUTY.value,
                        ShiftType.ON_CALL.value,
                    ]
                },
            }
        )
        return [shift.to_core() for shift in shifts]

    def get_work_shifts_not_deleted(self, team_id: str) -> List[Shift]:
        """Get all non-deleted work shifts for a team."""
        shifts = self.find_all(
            {
                "team": team_id,
                "shift_type": {
                    "$in": [
                        ShiftType.NORMAL.value,
                        ShiftType.DUTY.value,
                        ShiftType.ON_CALL.value,
                    ]
                },
                "deleted": False,
            }
        )
        return [shift.to_core() for shift in shifts]

    def get_rest_shifts(self, team_id: str) -> List[Shift]:
        """Get all rest shifts for a team."""
        shifts = self.find_all(
            {
                "team": team_id,
                "shift_type": {"$in": [ShiftType.REST.value, ShiftType.LEAVE.value]},
            }
        )
        return [shift.to_core() for shift in shifts]

    def get_shift_by_id(self, shift_id: str) -> Shift:
        """Get a shift by its ID."""
        shift = self.find_by_id(shift_id)
        if not shift:
            raise Exception(f"Shift with id {shift_id} not found")
        return shift.to_core()

    def get_shifts_by_ids(
        self, shift_ids: List[str], raise_on_missing: bool = False
    ) -> List[Shift]:
        """Get multiple shifts by their IDs.

        Forgiving behavior by default: missing IDs are ignored. If
        `raise_on_missing` is True, raises `ValueError` when any id is not
        found.
        """
        if not shift_ids:
            return []

        shifts = self.find_all({"_id": {"$in": shift_ids}})
        results = [shift.to_core() for shift in shifts]

        if raise_on_missing:
            found_ids = {r.id for r in results}
            missing = [sid for sid in shift_ids if sid not in found_ids]
            if missing:
                raise ValueError(f"Shifts not found for ids: {missing}")

        return results

    def get_recuperation_shift(self, shift_id: str) -> Optional[Shift]:
        """Get the recuperation shift associated with a given shift ID."""
        shift = self.collection.find_one(
            {
                "recuperation_duty": shift_id,
                "shift_type": ShiftType.REST.value,
                "rest_type": ShiftRestType.RECUPERATION.value,
            }
        )
        return ShiftSchema.from_mongo(shift).to_core() if shift else None

    def get_recuperation_shifts(self, shift_ids: List[str]) -> List[Shift]:
        """Get the recuperation shifts associated with a list of shift IDs."""
        shifts = self.collection.find(
            {
                "recuperation_duty": {"$in": shift_ids},
                "shift_type": ShiftType.REST.value,
                "rest_type": ShiftRestType.RECUPERATION.value,
            }
        )
        return [ShiftSchema.from_mongo(shift).to_core() for shift in shifts]

    def update_shift(self, shift: Shift) -> Shift:
        """Update a shift."""
        shift_schema = ShiftSchema.from_core(shift)
        shift_updated = self.update(shift_schema)
        assert shift_updated is not None
        return shift_updated.to_core()

    def update_shifts(self, shifts: List[Shift]) -> List[Shift]:
        """Update multiple shifts."""
        if not shifts:
            return []

        updated_shifts = []
        for shift in shifts:
            updated = self.update_shift(shift)
            updated_shifts.append(updated)

        return updated_shifts

    def delete_shift(self, shift_id: str) -> None:
        """Delete a shift by its ID."""
        result = self.delete(shift_id)
        if result is False:
            raise Exception(f"Shift with id {shift_id} not found or already deleted")

    def logical_delete_shift(self, shift_id: str) -> Shift:
        """Mark a shift as deleted."""
        result = self.collection.update_one(
            {"_id": shift_id}, {"$set": {"deleted": True}}
        )

        if result.matched_count == 0:
            raise Exception(f"Shift with id {shift_id} not found")

        shift = self.find_by_id(shift_id)
        if not shift:
            raise Exception(f"Failed to retrieve updated shift with id {shift_id}")

        return shift.to_core()

    def logical_delete_shift_recup(self, shift_id: str) -> None:
        """
        Mark all recuperation shifts associated with a duty shift as deleted.
        """
        self.collection.update_many(
            {"recuperation_duty": shift_id}, {"$set": {"deleted": True}}
        )
