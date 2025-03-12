from typing import List

from shared.database_pymongo.repositories.base import BaseRepository
from shared.database_pymongo.schemas.link_shift import LinkShiftSchema
from shared.schemas.schemas.shift import LinkShift


class LinkShiftRepository(BaseRepository[LinkShiftSchema]):
    """Repository for link shift documents using PyMongo."""

    def __init__(self):
        super().__init__("link_shifts", LinkShiftSchema)

    def create_link_shift(self, link_shift: LinkShift) -> LinkShift:
        """Create a new link shift."""
        link_shift_schema = LinkShiftSchema.from_core(link_shift)
        result = self.create(link_shift_schema)
        return result.to_core()

    def get_link_shifts(self, team_id: str) -> List[LinkShift]:
        """Get all link shifts for a team."""
        link_shifts = self.find_all({"team": team_id})
        return [link_shift.to_core() for link_shift in link_shifts]

    def get_link_shift_by_id(self, link_shift_id: str) -> LinkShift:
        """Get a link shift by its ID."""
        link_shift = self.find_by_id(link_shift_id)
        if not link_shift:
            raise Exception(f"LinkShift with id {link_shift_id} not found")
        return link_shift.to_core()

    def get_link_shifts_by_shift_id(self, shift_id: str) -> List[LinkShift]:
        """Get all link shifts associated with a specific shift ID."""
        link_shifts = self.find_all({"shifts": {"$in": [shift_id]}})
        return [link_shift.to_core() for link_shift in link_shifts]

    def update_link_shift(self, link_shift: LinkShift) -> LinkShift:
        """Update a link shift."""
        link_shift_schema = LinkShiftSchema.from_core(link_shift)
        link_shift_updated = self.update(link_shift_schema)
        assert link_shift_updated is not None
        return link_shift_updated.to_core()

    def delete_link_shift(self, link_shift_id: str) -> None:
        """Delete a link shift by its ID."""
        result = self.delete(link_shift_id)
        if result is False:
            raise Exception(
                f"LinkShift with id {link_shift_id} not found or already deleted"
            )
