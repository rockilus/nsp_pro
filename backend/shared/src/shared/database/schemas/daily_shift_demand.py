from datetime import datetime, timezone
from typing import Any, Dict, Optional

from shared.database.schemas.base import DocumentBaseSchema
from shared.schemas.schemas.daily_shift_demand import (
    DailyShiftDemand,
    DSDSourceType,
)


class DailyShiftDemandSchema(DocumentBaseSchema):
    """Daily Shift Demand schema for validation."""

    team: str
    schedule: str
    shift_demand: Optional[str] = None
    coverage_selector: Optional[str] = None
    source_type: int
    date: float
    shift: str
    count: int

    def to_mongo(self) -> Dict[str, Any]:
        out = super().to_mongo()
        return out

    @classmethod
    def from_mongo(cls, data: Dict[str, Any]) -> "DailyShiftDemandSchema":
        data["id"] = str(data.pop("_id"))
        return cls(**data)

    def to_core(self) -> DailyShiftDemand:
        return DailyShiftDemand(
            id=self.id or "",
            team_id=self.team,
            schedule_id=self.schedule,
            shift_demand_id=self.shift_demand,
            coverage_selector_id=self.coverage_selector,
            source_type=DSDSourceType(self.source_type),
            date=datetime.fromtimestamp(self.date, tz=timezone.utc).date(),
            shift_id=self.shift,
            count=self.count,
        )

    @classmethod
    def from_core(
        cls, daily_shift_demand: DailyShiftDemand
    ) -> "DailyShiftDemandSchema":
        return cls(
            id=daily_shift_demand.id,
            team=daily_shift_demand.team_id,
            schedule=daily_shift_demand.schedule_id,
            shift_demand=daily_shift_demand.shift_demand_id,
            coverage_selector=daily_shift_demand.coverage_selector_id,
            source_type=daily_shift_demand.source_type.value,
            date=datetime.combine(
                daily_shift_demand.date,
                datetime.min.time(),
                tzinfo=timezone.utc,
            ).timestamp(),
            shift=daily_shift_demand.shift_id,
            count=daily_shift_demand.count,
        )
