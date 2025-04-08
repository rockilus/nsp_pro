from typing import List

from shared.database.schemas.base import DocumentBaseSchema
from shared.schemas.schemas.link_shift import LinkShift


class LinkShiftSchema(DocumentBaseSchema):
    """LinkShift schema for validation."""

    team: str
    shifts: List[str]

    def to_core(self) -> LinkShift:
        return LinkShift(
            id=self.id or "",
            team_id=self.team,
            shift_ids=self.shifts,
        )

    @classmethod
    def from_core(cls, link_shift: LinkShift) -> "LinkShiftSchema":
        return cls(
            id=link_shift.id,
            team=link_shift.team_id,
            shifts=link_shift.shift_ids,
        )
