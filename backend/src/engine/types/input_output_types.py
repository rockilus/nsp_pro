from dataclasses import dataclass
from datetime import date
from enum import Enum
from typing import Dict, List, Literal, Tuple

##############################
# Inputs


@dataclass
class PeriodTarget:
    period: List[str]
    target: int


@dataclass
class Worker:
    id: str
    work_hours: List[PeriodTarget]  # in hours for each week on the campaign, contract
    work_hours_desired: List[
        PeriodTarget
    ]  # in hours for each week on the campaign, desired
    duties_per_month: List[PeriodTarget]  # number of duties per month
    specialty_ids: List[str]
    deleted: bool


# pylint: disable=R0801
@dataclass
class Staffing:
    specialty_id: str | None
    staffing: int


@dataclass
class Shift:
    id: str
    staffing: List[Staffing]
    work_shift: bool
    deleted: bool


@dataclass
class VariableSpace:
    workers: List[Worker]
    all_days: List[str]
    days_solving: List[str]
    shifts: List[Shift]
    duty_recup_pairs: List[Tuple[str, str]]


# pylint: disable=R0801
@dataclass
class ShiftDemand:
    date: date
    shift_id: str
    nb_times_shift: int


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
    hard: bool
    hard_to_soft: bool
    penalty: int


@dataclass
class Assignment:
    worker_id: str
    date: date
    shift_id: str


@dataclass
class VarWorker:
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
    selector: Literal["all", "equal"]
    target: List[str]
    reference: List[str]
    relative: List[str]


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
class FixedConfig:
    max_weekly_hours_worked: List[PeriodTarget]
    max_duties_per_month: List[PeriodTarget]


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
    variable_space: VariableSpace
    coverage: Coverage
    requests: List[Request]
    constraints: Constraints
    worker_shift_filters: List[Tuple[str, str, str]]
    fixed_values: Dict[Tuple[str, str, str], int]  # List[Assignment]
    sol_hint: Dict[Tuple[str, str, str], int]  # List[Assignment]
    shift_durations: Dict[str, int]  # in minutes, key: shift_id
    fixed_config: FixedConfig


##############################
# Outputs


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
