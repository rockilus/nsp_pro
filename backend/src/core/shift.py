from dataclasses import dataclass
from typing import List, Union


@dataclass
class Shift:
    id: str
    name: str


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
