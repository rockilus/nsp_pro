from dataclasses import asdict, dataclass, field
from datetime import date
from enum import Enum
from typing import Dict, List, Tuple

from ortools.sat.python import cp_model  # type: ignore
from shared.schemas import Constraints

##############################
# Inputs
##############################


@dataclass
class ShiftDemand:
    assignments: List[Tuple[str, str, str]]
    assignments_specialties: List[List[Tuple[str, str, str, str]]]
    target: int
    target_specialties: List[int]
    is_duty: bool


@dataclass
class Request:
    id: str
    assignments: List[Tuple[str, str, str]]
    negative: bool
    hard: bool


@dataclass
class Assignment:
    worker_id: str
    date: date
    shift_id: str


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

    def to_dict(self):
        return asdict(self)


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
    link_shifts_pairs: List[Tuple[Tuple[str, str, str], Tuple[str, str, str], str]]
    worker_shift_filters: List[Tuple[str, str, str]]
    fixed_values: Dict[Tuple[str, str, str], int]  # List[Assignment]
    sol_hint: Dict[Tuple[str, str, str], int]  # List[Assignment]

    def to_dict(self):
        out = asdict(self)
        out["fixed_values"] = {str(k): v for k, v in self.fixed_values.items()}
        out["sol_hint"] = {str(k): v for k, v in self.sol_hint.items()}
        return out


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
    LINK_SHIFT = 6


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
    model: cp_model.CpModel
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


##############################
# Model Config
##############################


@dataclass
class Penalty:
    hard: int
    soft: int


@dataclass
class SystemConstraintPenalty:
    eve: Penalty
    fai: Penalty


@dataclass
class UserConstraintPenalty:
    eve: Penalty
    fai: Penalty
    fil: Penalty
    ord: Penalty
    seq: Penalty
    sum: Penalty


@dataclass
class CoveragePenalty:
    duty: int
    normal: int


@dataclass
class RequestPenalty:
    hard: int
    soft: int


@dataclass
class Penalties:
    system_constraint: SystemConstraintPenalty
    user_constraint: UserConstraintPenalty
    coverage: CoveragePenalty
    request: RequestPenalty


class SolveStrategy(Enum):
    HARD_TO_SOFT = 0
    SEQUENTIAL = 1


@dataclass
class SolverParams:
    max_time_in_seconds: int
    solve_strategy: SolveStrategy


@dataclass
class ModelConfig:
    penalties: Penalties
    solver_params: SolverParams
