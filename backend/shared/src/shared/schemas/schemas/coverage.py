from dataclasses import asdict, dataclass
from datetime import date, datetime, time, timezone
from enum import Enum
from typing import Dict


@dataclass
class ShiftDemand:
    id: str
    day_index: int
    shift_id: str
    coverage_id: str

    def __post_init__(self):
        if not 0 <= self.day_index <= 6:
            raise ValueError("dayIndex must be between 0 and 6")


class DSDSourceType(Enum):
    SHIFT_DEMAND = 0
    SHIFT_DEMAND_MODIFY = 1
    SCHEDULE = 2


@dataclass
class DailyShiftDemand:
    id: str
    team_id: str
    schedule_id: str
    shift_demand_id: str | None
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
            source_type=DSDSourceType(data["source_type"]),
            date=datetime.fromtimestamp(data["date"], tz=timezone.utc).date(),
            shift_id=data["shift_id"],
            count=data["count"],
        )


@dataclass
class Coverage:
    id: str
    team_id: str
    name: str


@dataclass
class CoverageSelector:
    id: str
    schedule_id: str
    coverage_id: str
    full_period: bool
    start_date: date
    end_date: date
