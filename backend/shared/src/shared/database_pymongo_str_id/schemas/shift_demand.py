from shared.database_pymongo_str_id.schemas.base import DocumentBaseSchema
from shared.schemas.schemas.coverage import ShiftDemand


class ShiftDemandSchema(DocumentBaseSchema):
    """ShiftDemand schema for validation."""

    day_index: int
    shift: str
    coverage: str

    def to_core(self) -> ShiftDemand:
        return ShiftDemand(
            id=self.id or "",
            day_index=self.day_index,
            shift_id=self.shift,
            coverage_id=self.coverage,
        )

    @classmethod
    def from_core(cls, shift_demand: ShiftDemand) -> "ShiftDemandSchema":
        return cls(
            id=shift_demand.id,
            day_index=shift_demand.day_index,
            shift=shift_demand.shift_id,
            coverage=shift_demand.coverage_id,
        )
