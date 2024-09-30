from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import List


class ShiftType(Enum):
    NORMAL = 0
    DUTY = 1
    REST = 2  # non-working time (e.g. weekend) or recuperation time
    LEAVE = 3  # time off (e.g. vacation, sick leave, parental leave, training)


class ShiftRestType(Enum):
    NONE = 0
    OFF = 1
    RECUPERATION = 2


class ShiftLeaveType(Enum):
    NONE = 0
    VACATION = 1
    VACATION_MORNING = 2
    VACATION_AFTERNOON = 3
    SICK = 4
    SICK_MORNING = 5
    SICK_AFTERNOON = 6
    UNPAID = 7
    UNPAID_MORNING = 8
    UNPAID_AFTERNOON = 9
    PARENTAL_LEAVE = 10
    PARENTAL_LEAVE_MORNING = 11
    PARENTAL_LEAVE_AFTERNOON = 12
    TRAINING = 13
    TRAINING_MORNING = 14
    TRAINING_AFTERNOON = 15
    OTHER = 16
    OTHER_MORNING = 17
    OTHER_AFTERNOON = 18


# pylint: disable=too-many-instance-attributes
@dataclass
class Shift:
    id: str
    team_id: str
    name: str
    start_time: datetime
    end_time: datetime
    staffing: int
    color: str
    shift_type: ShiftType
    rest_type: ShiftRestType
    leave_type: ShiftLeaveType
    recuperation_time: int  # in hours
    recuperation_duty_id: str | None
    deleted: bool


# know this is a leave shift
# know if this is a full day, morning, or afternoon leave shift


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


@dataclass
class ShiftProperty:
    id: str
    value: str | int | float | bool
    shift_id: str
    dimension_id: str
    dim_entry_ids: List[str]
