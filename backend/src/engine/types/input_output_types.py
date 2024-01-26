from dataclasses import dataclass
from datetime import date
from typing import Dict, List, Literal, Tuple

from utils.constants import Constants

##############################
# Inputs


@dataclass
class VariableSpace:
    workers: List[str]
    days: List[str]
    shifts: List[str]


@dataclass
class ShiftDemand:
    date: date
    shift_id: str
    staffing: int
    # duration: int  # in minutes


@dataclass
class Coverage:
    coverage: List[ShiftDemand]


# pylint: disable=R0801
@dataclass
class Request:
    id: str
    worker_id: str
    date: date
    shift_id: str
    hard_to_soft: bool
    penalty: int


@dataclass
class Assignment:
    worker_id: str
    date: date
    shift_id: str


@dataclass
class VarWorker:
    operator: Literal["", "in_target", "out_target"]
    selector: Literal["all", "equal"]
    target: List[str]
    num_eligible_workers: int


# Check if we can replace target with start and end dates
@dataclass
class VarDay:
    selector: Literal["all", "week", "period", "week_day_index"]
    target: int
    start_date: date
    end_date: date
    interval: int


@dataclass
class VarShift:
    operator: Literal["", "in_target", "out_target"]
    selector: Literal["", "all", "equal"]
    target: List[str]
    reference: List[str]
    relative: List[str]


@dataclass
# pylint: disable=too-many-instance-attributes
class Constraint:
    id: str
    constraint_type: Literal["sum", "seq", "ord", "fil", "fai", "eve"]
    operator: Constants.CONSTRAINT_OPERATOR_OPTIONS
    target_value: int
    target_unit: str  # worker, shift, day, hour
    worker_var: VarWorker
    day_var: VarDay
    shift_var: VarShift
    hard: bool
    hard_to_soft: bool
    penalty: int


@dataclass
class Inputs:
    variable_space: VariableSpace
    coverage: Coverage
    requests: List[Request]
    fixed_assignments: List[Assignment]
    constraints: List[Constraint]
    fixed_values: Dict[Tuple[str, str, str], int]  # List[Assignment]
    sol_hint: Dict[Tuple[str, str, str], int]  # List[Assignment]
    shift_durations: Dict[str, int]  # in minutes
    shift_start_times: Dict[Tuple, int]  # timestamp in minutes
    shift_end_times: Dict[Tuple, int]  # timestamp in minutes


##############################
# Outputs


# pylint: disable=R0801
@dataclass
class ConstraintBreach:
    constraint_id: str
    category: Literal["request", "fixed_assignment", "constraint"]
    variables: List[Tuple[str, date, str]]
    value_diff: int
    hard_to_soft: bool
    penalty: int


@dataclass
class Outputs:
    is_solution: bool
    assignments: List[Assignment]
    objective_value: int
    constraint_breaches: List[ConstraintBreach]
