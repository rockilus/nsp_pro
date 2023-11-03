from dataclasses import dataclass
from datetime import date
from typing import List, Tuple


@dataclass
class Assignment:
    id: str
    worker_id: str
    date: date
    shift_id: str
    schedule_id: str


# pylint: disable=R0801
@dataclass
class ConstraintBreach:
    id: str
    constraint_id: str
    variables: List[Tuple[str, date, str]]
    description: str


@dataclass
class Comments:
    constraint_breaches: List[ConstraintBreach]
    missing_coverage_dates: List[date]


@dataclass
class Schedule:
    id: str
    start_date: date
    end_date: date
    comments: Comments


@dataclass
class ScheduleOptions:
    start_date: date
    end_date: date
