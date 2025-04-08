from dataclasses import dataclass
from datetime import datetime


@dataclass
class ShiftDemand:
    id: str
    day_index: int
    shift_id: str
    coverage_id: str
    last_modified: datetime

    def __post_init__(self):
        if not 0 <= self.day_index <= 6:
            raise ValueError("dayIndex must be between 0 and 6")
