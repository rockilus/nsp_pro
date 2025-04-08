from dataclasses import asdict, dataclass
from datetime import date, datetime, time, timezone
from enum import Enum
from typing import Dict


class DSDSourceType(Enum):
    SHIFT_DEMAND = 0
    DIRECT_REQUIREMENT = 1


@dataclass
class DailyShiftDemand:
    id: str
    team_id: str
    schedule_id: str
    shift_demand_id: str | None
    coverage_selector_id: str | None
    source_type: DSDSourceType
    date: date
    shift_id: str
    count: int

    def to_dict(self) -> Dict:
        out = asdict(self)
        out["source_type"] = self.source_type.value
        # pylint: disable=R0801
        out["date"] = datetime.combine(
            self.date, time.min, tzinfo=timezone.utc
        ).timestamp()
        return out

    @classmethod
    def from_dict(cls, data: Dict) -> "DailyShiftDemand":
        return cls(
            id=data["id"],
            team_id=data["team_id"],
            schedule_id=data["schedule_id"],
            shift_demand_id=data["shift_demand_id"],
            coverage_selector_id=data["coverage_selector_id"],
            source_type=DSDSourceType(data["source_type"]),
            date=datetime.fromtimestamp(data["date"], tz=timezone.utc).date(),
            shift_id=data["shift_id"],
            count=data["count"],
        )
