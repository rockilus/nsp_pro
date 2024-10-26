from dataclasses import dataclass, field
from datetime import date
from enum import Enum
from typing import Dict, List, Tuple

from ortools.sat.python import cp_model  # type: ignore

##############################
# Inputs
##############################


@dataclass
class ShiftDemand:
    assignments: List[Tuple[str, str, str]]
    assignments_specialty: List[Tuple[str, str, str, str]]
    target: int


@dataclass
class Request:
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
    shift_demands: List[ShiftDemand]
    requests: List[Request]
    constraints: Constraints
    duty_recup_pairs: List[Tuple[Tuple[str, str, str], Tuple[str, str, str]]]
    worker_shift_filters: List[Tuple[str, str, str]]
    fixed_values: Dict[Tuple[str, str, str], int]  # List[Assignment]
    sol_hint: Dict[Tuple[str, str, str], int]  # List[Assignment]


##############################
# Outputs
##############################
class ObjectiveCategory(Enum):
    CONSTRAINT = 0
    REQUEST = 1
    DAILY_SHIFT_DEMAND = 2
    WORK_TIME_WEEK_CONTRACT = 3
    WORK_TIME_WEEK_DESIRED = 4
    DUTIES_PER_MONTH = 5


# pylint: disable=R0801
# @dataclass
# class Breach:
#     objective_id: str | None
#     objective_category: ObjectiveCategory
#     variables: List[Tuple[str, date, str]]
#     value_diff: int
#     hard_to_soft: bool | None
#     penalty: int
@dataclass
class Breach:
    var_name: str
    value_diff: int


@dataclass
class Outputs:
    is_solution: bool
    assignments: List[Assignment]
    objective_value: int
    breaches: List[Breach]


##############################
# Model
##############################


@dataclass
class Objective:
    int_vars: List[cp_model.IntVar] = field(default_factory=list)
    int_coeffs: List[int] = field(default_factory=list)
    bool_vars: List[cp_model.IntVar] = field(default_factory=list)
    bool_coeffs: List[int] = field(default_factory=list)


@dataclass
class VarName:
    objective_id: str | None
    objective_category: int
    cstr_vars: List[str]
    hard_to_soft: bool | None


@dataclass
class BenchmarkTimes:
    total_start: float = 0.0
    total_end: float = 0.0
    full_setup_start: float = 0.0
    full_setup_end: float = 0.0
    variables_start: float = 0.0
    variables_end: float = 0.0
    constraints_start: float = 0.0
    constraints_end: float = 0.0
    objective_start: float = 0.0
    objective_end: float = 0.0


# status 0: UNKNOWN
# status 1: MODEL_INVALID
# status 2: FEASIBLE
# status 3: INFEASIBLE
# status 4: OPTIMAL
