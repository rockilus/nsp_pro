from dataclasses import dataclass
from typing import List


@dataclass
class Assignment:
    id: str
    worker_id: str
    date: str
    shift_id: str
    schedule_id: str


@dataclass
class ConstraintBreach:
    constraint_id: str
    workers: List[str]
    dates: List[str]
    shifts: List[str]
    value: int
    penalty: int


@dataclass
class Comments:
    constraint_breaches: List[ConstraintBreach]
    missing_coverage_dates: List[str]


@dataclass
class Schedule:
    id: str
    start_date: str
    end_date: str
    comments: Comments
