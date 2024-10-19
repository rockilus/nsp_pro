from dataclasses import dataclass
from datetime import date
from enum import Enum
from typing import Dict, List, Literal, Tuple

##############################
# Inputs
##############################


@dataclass
class NewShiftDemand:
    assignments: List[Tuple[str, str, str]]
    assignments_specialty: List[Tuple[str, str, str, str]]
    target: int


@dataclass
class NewRequest:
    id: str
    assignments: List[Tuple[str, str, str]]
    hard: bool


@dataclass
class Assignment:
    worker_id: str
    date: date
    shift_id: str


# pylint: disable=R0801
class ConstraintType(Enum):
    SUM = 0
    SEQ = 1
    ORD = 2
    FIL = 3
    FAI = 4
    EVE = 5


class ConstraintOperator(Enum):
    LESS_THAN = 0
    LESS_THAN_OR_EQUAL = 1
    EQUAL = 2
    GREATER_THAN_OR_EQUAL = 3
    GREATER_THAN = 4
    YES = 5
    NO = 6


# pylint: disable=R0801
@dataclass
class Constraint:
    id: str
    constraint_type: ConstraintType
    operator: ConstraintOperator | None
    target_value: int
    target_unit: str  # worker, shift, day, hour
    active: bool
    hard: bool
    priority: str
    schedule_id: str
    constraint_build_id: str


# for each worker, list for each target shifts on the target period
@dataclass
class ConstraintSum(Constraint):
    constraint_variables: List[List[Tuple[str, str, str]]]


# for each worker and shift, list for days over which target periods are covered
@dataclass
class ConstraintSeq(Constraint):
    constraint_variables: List[List[Tuple[str, str, str]]]


# for each worker, tuple for d_ref/s_ref and d_rel/s_rel, for all combinations
@dataclass
class ConstraintOrd(Constraint):
    constraint_variables: List[Tuple[Tuple[str, str, str], Tuple[str, str, str]]]


# list of variables to set to 0
@dataclass
class ConstraintFil(Constraint):
    constraint_variables: List[Tuple[str, str, str]]


# for each worker, for all target days and shifts
@dataclass
class ConstraintFai(Constraint):
    constraint_variables: List[List[Tuple[str, str, str]]]


@dataclass
class Constraints:
    sum: List[ConstraintSum]
    seq: List[ConstraintSeq]
    ord: List[ConstraintOrd]
    fil: List[ConstraintFil]
    fai: List[ConstraintFai]


@dataclass
class Variables:
    assignments: List[Tuple[str, str, str]]  # worker_id, date, shift_id
    shift_intervals: List[
        Tuple[
            int,  # shift start time
            int,  # shift duration
            int,  # shift end time
            Tuple[str, str, str],  # associated assignment
        ]
    ]


@dataclass
class WorkTime:
    # for each worker, a list of assignments for the target periods
    # (size workers x periods x shifts * period length])
    assignments: List[List[List[Tuple[str, str, str]]]]
    # for each period, the target contractual work time
    # (size workers x periods)
    targets: List[List[int]]
    # for each assignment, the duration of the shift
    # (size workers x periods x shifts * period length)
    durations: List[List[List[int]]]
    penalty: int


@dataclass
class NbDuties:
    # for each worker, a list of assignments for the target periods
    # (size workers x periods x shifts * period length])
    assignments: List[List[List[Tuple[str, str, str]]]]
    # for each period, the target contractual work time
    # (size workers x periods)
    targets: List[List[int]]
    # for each assignment, the duration of the shift
    # (size workers x periods x shifts * period length)
    penalty: int


@dataclass
class WorkLoads:
    weekly_work_time_contractual: WorkTime
    weekly_work_time_desired: WorkTime
    weekly_work_time_max: WorkTime
    monthly_nb_duties_desired: NbDuties
    monthly_nb_duties_max: NbDuties


# pylint: disable=too-many-instance-attributes
@dataclass
class Inputs:
    variables: Variables
    no_overlap_shift_intervals: List[
        List[Tuple[str, str, str]]
    ]  # list of assignments for each worker
    work_loads: WorkLoads
    new_shift_demands: List[NewShiftDemand]
    new_requests: List[NewRequest]
    constraints: Constraints
    duty_recup_pairs: List[Tuple[Tuple[str, str, str], Tuple[str, str, str]]]
    worker_shift_filters: List[Tuple[str, str, str]]
    fixed_values: Dict[Tuple[str, str, str], int]  # List[Assignment]
    sol_hint: Dict[Tuple[str, str, str], int]  # List[Assignment]


##############################
# Outputs
##############################


# pylint: disable=R0801
@dataclass
class ConstraintBreach:
    constraint_id: str
    category: Literal[
        "request",
        "constraint",
        "coverage",
        "recuperation",
        "work_time",
        "duties_per_month",
        "worker_shift_filter",
    ]
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
