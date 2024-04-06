from dataclasses import dataclass
from datetime import datetime
from typing import List

from utils.constants import Constants


@dataclass
class Shift:
    id: str
    team_id: str
    name: str
    start_time: datetime
    end_time: datetime
    staffing: int
    is_time_off: bool
    color: str


@dataclass
# pylint: disable=R0801
class ShiftDimension:
    id: str
    is_rest: bool
    team_id: str
    name: str
    entry_type: Constants.DIMENSION_ENTRY_TYPES  # str, int, bool, list
    entry_options: List[str]


@dataclass
class ShiftProperty:
    id: str
    value: str | int | float | bool | List[str]
    shift_id: str
    shift_dimension_id: str
