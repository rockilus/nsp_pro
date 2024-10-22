from dataclasses import dataclass
from datetime import date
from enum import Enum


@dataclass
class ShiftDemand:
    id: str
    day_index: int
    shift_id: str
    coverage_id: str

    def __post_init__(self):
        if not 0 <= self.day_index <= 6:
            raise ValueError("dayIndex must be between 0 and 6")


@dataclass
class DSDSourceType(Enum):
    SHIFT_DEMAND = 0
    SCHEDULE = 1


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
