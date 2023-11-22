from dataclasses import dataclass
from datetime import datetime
from typing import List, Union


@dataclass
class Shift:
    id: str
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
    name: str
    entry_type: str
    entry_options: List[str]


@dataclass
class ShiftProperty:
    id: str
    value: Union[str, int, float, bool]
    shift_id: str
    shift_dimension_id: str
