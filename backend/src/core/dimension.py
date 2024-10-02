from dataclasses import dataclass
from enum import Enum


class DimensionType(Enum):
    WORKER = 0
    SHIFT = 1
    BOTH = 2


class DimensionEntryType(Enum):
    STR = 0
    INT = 1
    BOOL = 2
    DIM_ENTRIES = 3


@dataclass
# pylint: disable=R0801
class DimEntry:
    id: str
    dimension_id: str
    name: str
    deleted: bool


@dataclass
# pylint: disable=R0801
class Dimension:
    id: str
    team_id: str
    type: DimensionType
    name: str
    entry_type: DimensionEntryType
    rest_shift: bool
    deleted: bool
