from dataclasses import dataclass
from datetime import date
from typing import List, Literal

from shared.schemas.schemas.constraint import ShiftWorkerOption

STATS_TIME_FRAME_OPTIONS = Literal[
    "last_12_months", "last_24_months", "last_36_months", "custom"
]
STATS_UNIT_OPTIONS = Literal[
    "nb_days_worked",
    "time_worked",
    "nb_shifts_worked",
    "nb_rest_days",
    "nb_rest_shifts",
    "nb_times_shift",
    "nb_times_rest",
]
HEADER_UNIT_OPTIONS = Literal["weekday", "week", "month", "year", "all", "shift"]


@dataclass
class StatsHeader:
    id: str
    team_id: str
    stats_unit: STATS_UNIT_OPTIONS
    header_unit: HEADER_UNIT_OPTIONS
    value: str  # weekday index, week number, month number, year number, shift_id
    selected_shifts: List[ShiftWorkerOption]
    in_custom: bool


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
    time_frame: STATS_TIME_FRAME_OPTIONS
    start_date: date
    end_date: date
    stats_unit: STATS_UNIT_OPTIONS
    header_unit: HEADER_UNIT_OPTIONS
    selected_shifts: List[ShiftWorkerOption]
