from datetime import datetime, timezone

from shared.database.schemas.base import DocumentBaseSchema
from shared.schemas.schemas.shift_demand import ShiftDemand


class ShiftDemandSchema(DocumentBaseSchema):
    """ShiftDemand schema for validation."""

    day_index: int
    shift: str
    coverage: str
    last_modified: float

    def to_core(self) -> ShiftDemand:
        return ShiftDemand(
            id=self.id or "",
            day_index=self.day_index,
            shift_id=self.shift,
            coverage_id=self.coverage,
            last_modified=datetime.fromtimestamp(self.last_modified, tz=timezone.utc),
        )

    @classmethod
    def from_core(cls, shift_demand: ShiftDemand) -> "ShiftDemandSchema":
        return cls(
            id=shift_demand.id,
            day_index=shift_demand.day_index,
            shift=shift_demand.shift_id,
            coverage=shift_demand.coverage_id,
            last_modified=shift_demand.last_modified.timestamp(),
        )
