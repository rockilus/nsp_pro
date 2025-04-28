from datetime import datetime, time, timezone

from shared.database.schemas.base import DocumentBaseSchema
from shared.schemas.core.shift_demand_exclusion import ShiftDemandExclusion


class ShiftDemandExclusionSchema(DocumentBaseSchema):
    """ShiftDemand schema for validation."""

    schedule_id: str
    coverage_selector_id: str
    shift_demand_id: str
    date: float

    def to_core(self) -> ShiftDemandExclusion:
        return ShiftDemandExclusion(
            id=self.id or "",
            schedule_id=self.schedule_id,
            coverage_selector_id=self.coverage_selector_id,
            shift_demand_id=self.shift_demand_id,
            date=datetime.fromtimestamp(self.date, tz=timezone.utc).date(),
        )

    @classmethod
    def from_core(
        cls, shift_demand_exclusion: ShiftDemandExclusion
    ) -> "ShiftDemandExclusionSchema":
        return cls(
            id=shift_demand_exclusion.id,
            schedule_id=shift_demand_exclusion.schedule_id,
            coverage_selector_id=shift_demand_exclusion.coverage_selector_id,
            shift_demand_id=shift_demand_exclusion.shift_demand_id,
            date=datetime.combine(
                shift_demand_exclusion.date, time.min, tzinfo=timezone.utc
            ).timestamp(),
        )
