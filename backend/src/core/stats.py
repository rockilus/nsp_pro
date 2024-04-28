from dataclasses import dataclass
from datetime import date
from typing import List

from core.constraint import DictBlockValue
from utils.constants import Constants


@dataclass
class Stat:
    worker_id: str
    name: str
    cluster: str
    value: int | float


@dataclass
class ShiftPropertyHeader:
    shift_dimension_id: str
    property_value: str | int | float | bool


@dataclass
class StatsHeader:
    id: str
    stats_options_id: str
    stats_unit: Constants.STATS_UNIT_OPTIONS
    header_unit: Constants.HEADER_UNIT_OPTIONS
    value: (str)  # weekday index, week number, month number, year number, shift_id
    selected_shifts: List[DictBlockValue]


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
    id: str
    team_id: str
    start_date: date
    end_date: date
    # custom_headers: List[StatsHeader]


@dataclass
class TemplateStats:
    name: str
    label: str
    stats_headers: List[StatsHeader]


@dataclass
class GetStatsOptions:
    time_frame: str
    stats_unit: Constants.STATS_UNIT_OPTIONS
    table_column: str
    selected_shifts: List[DictBlockValue]
