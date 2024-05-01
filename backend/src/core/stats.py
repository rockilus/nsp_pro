from dataclasses import dataclass
from datetime import date
from typing import List

from core.constraint import DictBlockValue
from utils.constants import Constants


@dataclass
class StatsHeader:
    id: str
    team_id: str
    stats_unit: Constants.STATS_UNIT_OPTIONS
    header_unit: Constants.HEADER_UNIT_OPTIONS
    value: (str)  # weekday index, week number, month number, year number, shift_id
    selected_shifts: List[DictBlockValue]
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
    time_frame: Constants.STATS_TIME_FRAME_OPTIONS
    start_date: date
    end_date: date
    stats_unit: Constants.STATS_UNIT_OPTIONS
    header_unit: Constants.HEADER_UNIT_OPTIONS
    selected_shifts: List[DictBlockValue]
