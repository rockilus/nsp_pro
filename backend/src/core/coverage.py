from dataclasses import dataclass
from typing import List
from datetime import date


@dataclass
class ShiftDemand:
    day_index: int
    shift_id: str
    quantity: int

    def __post_init__(self):
        if not 0 <= self.day_index <= 6:
            raise ValueError("dayIndex must be between 0 and 6")


@dataclass
class Coverage:
    id: str
    name: str
    date_start: date
    date_end: date
    shift_demands: List[ShiftDemand]
