from typing import List

from bson import ObjectId  # Add this import

from shared.database_pymongo.schemas.base import DocumentBaseSchema
from shared.schemas.schemas.shift import LinkShift


class LinkShiftSchema(DocumentBaseSchema):
    """LinkShift schema for validation."""

    team: ObjectId
    shifts: List[ObjectId]

    def to_core(self) -> LinkShift:
        return LinkShift(
            id=str(self.id) or "",
            team_id=str(self.team),
            shift_ids=[str(shift) for shift in self.shifts],
        )

    @classmethod
    def from_core(cls, link_shift: LinkShift) -> "LinkShiftSchema":
        return cls(
            id=(
                ObjectId(link_shift.id)
                if link_shift.id and ObjectId.is_valid(link_shift.id)
                else None
            ),
            team=ObjectId(link_shift.team_id),
            shifts=[ObjectId(shift_id) for shift_id in link_shift.shift_ids],
        )
