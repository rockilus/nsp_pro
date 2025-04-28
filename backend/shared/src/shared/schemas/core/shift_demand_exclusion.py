from dataclasses import dataclass
from datetime import date


@dataclass
class ShiftDemandExclusion:
    id: str
    schedule_id: str
    coverage_selector_id: str
    shift_demand_id: str
    date: date

    def __post_init__(self):
        if not isinstance(self.date, date):
            raise ValueError("date must be a datetime.date instance")
