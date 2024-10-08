from dataclasses import dataclass
from typing import List


@dataclass
class Worker:
    id: str
    team_id: str
    name: str
    weekly_hours: int  # in hours, contract
    weekly_hours_desired: int  # in hours, desired
    duties_per_month: int  # number of duties per month
    annual_leave: int  # in days
    specialty_ids: List[str]
    deleted: bool
