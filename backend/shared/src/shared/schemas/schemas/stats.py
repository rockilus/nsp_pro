from dataclasses import dataclass
from datetime import date
from enum import Enum
from typing import List

from shared.schemas.schemas.constraint import ShiftWorkerOption


class StatsTimeFrameOptions(Enum):
    CAMPAING = 0
    LTM = 1
    CUSTOM = 2


class StatsUnitOptions(Enum):
    FAVORITES = 0
    NB_DAYS_WORKED = 1
    TIME_WORKED = 2
    NB_SHIFTS_WORKED = 3
    NB_REST_DAYS = 4
    NB_REST_SHIFTS = 5
    NB_TIMES_SHIFT = 6
    NB_TIMES_REST = 7


class HeaderUnitOptions(Enum):
    WEEKDAY = 0
    WEEK = 1
    MONTH = 2
    YEAR = 3
    ALL = 4
    SHIFT = 5


@dataclass
class StatsHeader:
    id: str
    team_id: str
    stats_unit: StatsUnitOptions
    header_unit: HeaderUnitOptions
    value: (
        str  # weekday index, week number, month number, year number, shift_id
    )
    selected_shifts: List[ShiftWorkerOption]
    is_favorite: bool


@dataclass
class StatsValue:
    worker_id: str
    header_id: str
    value: int | float


@dataclass
class Stats:
    stats_headers: List[StatsHeader]
    stats_values: List[StatsValue]


@dataclass
class StatsOptions:
    time_frame: StatsTimeFrameOptions
    start_date: date
    end_date: date
    stats_unit: StatsUnitOptions
    header_unit: HeaderUnitOptions
    selected_shifts: List[ShiftWorkerOption]
