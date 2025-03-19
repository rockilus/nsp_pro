from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId

from shared.database_pymongo.schemas.base import DocumentBaseSchema
from shared.schemas.schemas.coverage import DailyShiftDemand as CoreDailyShiftDemand
from shared.schemas.schemas.coverage import (
    DSDSourceType,
)


class DailyShiftDemandSchema(DocumentBaseSchema):
    """Daily Shift Demand schema for validation."""

    team: ObjectId
    schedule: ObjectId
    shift_demand: Optional[ObjectId] = None
    source_type: int
    date: float
    shift: ObjectId
    count: int

    def to_core(self) -> CoreDailyShiftDemand:
        return CoreDailyShiftDemand(
            id=str(self.id) or "",
            team_id=str(self.team),
            schedule_id=str(self.schedule),
            shift_demand_id=(str(self.shift_demand) if self.shift_demand else None),
            source_type=DSDSourceType(self.source_type),
            date=datetime.fromtimestamp(self.date, tz=timezone.utc).date(),
            shift_id=str(self.shift),
            count=self.count,
        )

    @classmethod
    def from_core(
        cls, daily_shift_demand: CoreDailyShiftDemand
    ) -> "DailyShiftDemandSchema":
        return cls(
            id=(
                ObjectId(daily_shift_demand.id)
                if daily_shift_demand.id and ObjectId.is_valid(daily_shift_demand.id)
                else None
            ),
            team=ObjectId(daily_shift_demand.team_id),
            schedule=ObjectId(daily_shift_demand.schedule_id),
            shift_demand=(
                ObjectId(daily_shift_demand.shift_demand_id)
                if daily_shift_demand.shift_demand_id
                else None
            ),
            source_type=daily_shift_demand.source_type.value,
            date=datetime.combine(
                daily_shift_demand.date,
                datetime.min.time(),
                tzinfo=timezone.utc,
            ).timestamp(),
            shift=ObjectId(daily_shift_demand.shift_id),
            count=daily_shift_demand.count,
        )
