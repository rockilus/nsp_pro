from dataclasses import dataclass
from enum import Enum
from typing import List


class DimensionType(Enum):
    WORKER = 0
    SHIFT = 1
    REST_SHIFT = 2


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
    dim_types: List[DimensionType]
    name: str
    entry_type: DimensionEntryType
    deleted: bool
