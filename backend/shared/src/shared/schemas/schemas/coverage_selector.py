from dataclasses import dataclass
from datetime import date, datetime


@dataclass
class CoverageSelector:
    id: str
    schedule_id: str
    coverage_id: str | None
    full_period: bool
    start_date: date
    end_date: date
    last_modified: datetime
