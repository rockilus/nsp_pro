from dataclasses import dataclass
from typing import List
from datetime import date


@dataclass
class ShiftDemand:
    dayIndex: int
    shiftId: str
    quantity: int

    def __post_init__(self):
        if not 0 <= self.dayIndex <= 6:
            raise ValueError("dayIndex must be between 0 and 6")


@dataclass
class Coverage:
    id: str
    name: str
    dateStart: date
    dateEnd: date
    shiftDemands: List[ShiftDemand]
