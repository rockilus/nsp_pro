from dataclasses import dataclass
from datetime import datetime
from typing import List


# pylint: disable=too-many-instance-attributes
@dataclass
class Worker:
    id: str
    team_id: str
    name: str
    employment_start_date: datetime
    employment_end_date: datetime | None
    weekly_hours: int  # in hours, contract
    weekly_hours_desired: int  # in hours, desired
    duties_per_month: int  # number of duties per month
    annual_leave: int  # in days
    specialty_ids: List[str]
    deleted: bool
