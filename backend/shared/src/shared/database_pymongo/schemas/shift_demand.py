from bson import ObjectId

from shared.database_pymongo.schemas.base import DocumentBaseSchema
from shared.schemas.schemas.coverage import ShiftDemand


class ShiftDemandSchema(DocumentBaseSchema):
    """ShiftDemand schema for validation."""

    day_index: int
    shift: ObjectId
    coverage: ObjectId

    def to_core(self) -> ShiftDemand:
        return ShiftDemand(
            id=str(self.id) or "",
            day_index=self.day_index,
            shift_id=str(self.shift),
            coverage_id=str(self.coverage),
        )

    @classmethod
    def from_core(cls, shift_demand: ShiftDemand) -> "ShiftDemandSchema":
        return cls(
            id=(
                ObjectId(shift_demand.id)
                if shift_demand.id and ObjectId.is_valid(shift_demand.id)
                else None
            ),
            day_index=shift_demand.day_index,
            shift=ObjectId(shift_demand.shift_id),
            coverage=ObjectId(shift_demand.coverage_id),
        )
