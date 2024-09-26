from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import List

from utils.constants import Constants


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
    leave_type: ShiftLeaveType
    deleted: bool


# know this is a leave shift
# know if this is a full day, morning, or afternoon leave shift


@dataclass
# pylint: disable=R0801
class ShiftDimension:
    id: str
    is_rest: bool
    team_id: str
    name: str
    entry_type: Constants.DIMENSION_ENTRY_TYPES  # str, int, bool, list
    entry_options: List[str]
    deleted: bool


@dataclass
class ShiftProperty:
    id: str
    value: str | int | float | bool | List[str]
    shift_id: str
    shift_dimension_id: str
