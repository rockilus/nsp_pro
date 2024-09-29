from dataclasses import dataclass
from typing import List

from utils.constants import Constants


@dataclass
class Worker:
    id: str
    team_id: str
    name: str
    weekly_hours: int  # in hours, contract
    weekly_hours_desired: int  # in hours, desired
    duties_per_month: int  # number of duties per month
    annual_leave: int  # in days
    deleted: bool


@dataclass
class WorkerDimension:
    id: str
    team_id: str
    name: str
    entry_type: Constants.DIMENSION_ENTRY_TYPES
    entry_options: List[str]
    deleted: bool


@dataclass
class WorkerProperty:
    id: str
    value: str | int | float | bool | List[str]
    worker_id: str
    worker_dimension_id: str
