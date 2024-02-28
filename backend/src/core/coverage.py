from dataclasses import dataclass
from datetime import date


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
class Coverage:
    id: str
    team_id: str
    name: str


@dataclass
class CoverageSelector:
    id: str
    coverage_id: str
    start_date: date
    end_date: date
