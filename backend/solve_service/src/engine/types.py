from dataclasses import asdict, dataclass, field
from datetime import date
from enum import Enum
from typing import Dict, List, Tuple

from ortools.sat.python import cp_model  # type: ignore
from shared.schemas.core import Constraints, ModelConfig

##############################
# Inputs
##############################


@dataclass
class ShiftDemand:
    id: str
    assignments: List[Tuple[str, str, str]]
    assignments_specialties: List[List[Tuple[str, str, str, str]]]
    target: int
    target_specialties: List[int]
    penalty: int


@dataclass
class Request:
    id: str
    assignments: List[Tuple[str, str, str]]
    negative: bool
    hard: bool
    penalty: int


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
class SolHint:
    var_sol: Dict[Tuple[str, str, str], int]
    var_spe_sol: Dict[Tuple[str, str, str, str], int]

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
    tolerance: float = 0.0


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
    tolerance: float = 0.0


# Target work time and nb duties constraints calculated based on the user inputs
# in the workers page
@dataclass
class WorkLoads:
    weekly_work_time_contractual: WorkTime
    weekly_work_time_desired: WorkTime
    weekly_work_time_max: WorkTime
    monthly_nb_duties_desired: NbDuties
    monthly_nb_duties_max: NbDuties


@dataclass
class GroupsAssignmentsTargetConstraint:
    assignments: List[List[Tuple[str, str, str]]]
    targets: List[int]
    penalty: int
    tolerance: float = 0.0


@dataclass
class GroupsAssignmentsDurationsTargetConstraint:
    assignments: List[List[Tuple[str, str, str]]]
    durations: List[List[int]]
    targets: List[int]
    penalty: int
    tolerance: float = 0.0


@dataclass
class ConfigurationConstraintInputs:
    work_loads: WorkLoads | None
    shift_demands: List[ShiftDemand]
    requests: List[Request]
    duty_recup_pairs: List[
        Tuple[
            Tuple[str, str, str], Tuple[str, str, str], int
        ]  # (a_duty, a_recup, penalty)
    ]
    link_shifts_pairs: List[
        Tuple[
            Tuple[str, str, str], Tuple[str, str, str], str, int
        ]  # a_shift1, a_shift2, shift_link_id, penalty
    ]
    worker_shift_filters: Tuple[
        List[Tuple[str, str, str]], int
    ]  # (List[assignments], penalty)


# Target work time and nb duties constraints calculated based on the campaign
# number of workers and required work
@dataclass
class SystemConstraintInputs:
    weekly_target_work_time: List[GroupsAssignmentsDurationsTargetConstraint]
    monthly_target_nb_duties: List[GroupsAssignmentsTargetConstraint]
    max_weekly_nb_duties: Tuple[
        List[List[List[Tuple[str, str, str]]]],  # week * worker * duties
        int,
    ]
    special_days_target_nb_duties: List[GroupsAssignmentsTargetConstraint]


@dataclass
class ModelSetup:
    variables: Variables
    no_overlap_shift_intervals: List[
        List[Tuple[str, str, str]]
    ]  # list of assignments for each worker
    fixed_values: Dict[Tuple[str, str, str], int]  # List[Assignment]
    sol_hint: SolHint

    def to_dict(self):
        out = asdict(self)
        out["fixed_values"] = {str(k): v for k, v in self.fixed_values.items()}
        out["sol_hint"] = self.sol_hint.to_dict()
        return out


# pylint: disable=too-many-instance-attributes
@dataclass
class Inputs:
    model_setup: ModelSetup
    user_constraints: Constraints
    configuration_constraints: ConfigurationConstraintInputs
    system_constraints: SystemConstraintInputs
    model_config: ModelConfig

    def to_dict(self):
        out = asdict(self)
        out["model_setup"] = self.model_setup.to_dict()
        return out


##############################
# Outputs
##############################
class ObjectiveCategory(Enum):
    CONSTRAINT = 0
    REQUEST = 1
    DAILY_SHIFT_DEMAND = 2
    DAILY_SHIFT_DEMAND_SPE = 3
    WORK_TIME_WEEK_CONTRACT = 4
    WORK_TIME_WEEK_DESIRED = 5
    DUTIES_PER_MONTH = 6
    LINK_SHIFT = 7
    DUTY_RECUP = 8
    WORK_TIME_WEEK_TARGET = 9
    DUTIES_PER_MONTH_TARGET = 10
    SPECIAL_DAYS_TARGET = 11


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
class SolverRun:
    run_timestamp: float
    status: str
    objective: int
    best_bound: int
    integers: int
    booleans: int
    conflicts: int
    branches: int
    propagations: int
    integer_propagations: int
    restarts: int
    lp_iterations: int
    walltime: float
    usertime: float
    deterministic_time: float
    gap_integral: float
    solution_fingerprint: str
    params: Dict[str, str]
    log_output: str


@dataclass
class Outputs:
    model: cp_model.CpModel
    is_solution: bool
    assignments: List[Assignment]
    objective_value: int
    breaches: List[Breach]
    var_sol: Dict[Tuple[str, str, str], int]
    var_spe_sol: Dict[Tuple[str, str, str, str], int]
    status: int
    wall_time: float
    solver_run: SolverRun


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
# Annex
##############################


@dataclass
class ProcessingCache:
    constraints: Constraints
    periods_weekly: List[List[date]]
    periods_monthly: List[List[date]]
    w_to_work_times: Dict[str, Dict[str, List[int]]]
    w_to_nb_duties: Dict[str, Dict[str, List[int]]]
    shift_id_to_duration: Dict[str, int]
    dim_to_attr_value_to_shift: Dict[
        str, Dict[str | int | float | bool, List[str]]
    ]
