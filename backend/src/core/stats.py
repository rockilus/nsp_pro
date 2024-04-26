from dataclasses import dataclass
from datetime import date
from typing import List


@dataclass
class Stat:
    worker_id: str
    name: str
    cluster: str
    value: int | float


@dataclass
class StatsOptions:
    id: str
    team_id: str
    start_date: date
    end_date: date


@dataclass
class ShiftPropertyHeader:
    shift_dimension_id: str
    property_value: str | int | float | bool


@dataclass
class StatsHeader:
    id: str
    stats_options_id: str
    type: str  # weekday, week, month, year, shift
    value: (str)  # weekday index, week number, month number, year number, shift_id
    shifts_selected: str  # all_shifts, custom
    shift_ids: List[str]
    shift_property_headers: List[ShiftPropertyHeader]


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
class TemplateStats:
    name: str
    label: str
    stats_headers: List[StatsHeader]
