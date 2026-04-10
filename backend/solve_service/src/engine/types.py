from dataclasses import asdict, dataclass, field
from datetime import date
from enum import Enum
from typing import Any

from ortools.sat.python import cp_model  # type: ignore
from shared.schemas.core import Constraints, ModelConfig

##############################
# Inputs
##############################


@dataclass
class ShiftDemand:
    id: str
    assignments: list[tuple[str, str, str]]
    assignments_specialties: list[list[tuple[str, str, str, str]]]
    target: int
    target_specialties: list[int]
    penalty: int


@dataclass
class Request:
    id: str
    assignments: list[tuple[str, str, str]]
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
    assignments: list[tuple[str, str, str]]  # worker_id, date, shift_id
    shift_intervals: list[
        tuple[
            int,  # shift start time
            int,  # shift duration
            int,  # shift end time
            tuple[str, str, str],  # associated assignment
        ]
    ]

    def to_dict(self):
        return asdict(self)


@dataclass
class SolHint:
    var_sol: dict[tuple[str, str, str], int]
    var_spe_sol: dict[tuple[str, str, str, str], int]

    def to_dict(self):
        return asdict(self)


@dataclass
class WorkTime:
    # for each worker, a list of assignments for the target periods
    # (size workers x periods x shifts * period length])
    assignments: list[list[list[tuple[str, str, str]]]]
    # for each period, the target contractual work time
    # (size workers x periods)
    targets: list[list[int]]
    # for each assignment, the duration of the shift
    # (size workers x periods x shifts * period length)
    durations: list[list[list[int]]]
    penalty: int
    tolerance: float = 0.0


@dataclass
class NbDuties:
    # for each worker, a list of assignments for the target periods
    # (size workers x periods x shifts * period length])
    assignments: list[list[list[tuple[str, str, str]]]]
    # for each period, the target contractual work time
    # (size workers x periods)
    targets: list[list[int]]
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
    assignments: list[list[tuple[str, str, str]]]
    targets: list[int]
    penalty: int
    tolerance: float = 0.0


@dataclass
class GroupsAssignmentsDurationsTargetConstraint:
    assignments: list[list[tuple[str, str, str]]]
    durations: list[list[int]]
    targets: list[int]
    penalty: int
    tolerance: float = 0.0


@dataclass
class ConfigurationConstraintInputs:
    work_loads: WorkLoads | None
    shift_demands: list[ShiftDemand]
    requests: list[Request]
    duty_recup_pairs: list[
        tuple[
            tuple[str, str, str], tuple[str, str, str], int
        ]  # (a_duty, a_recup, penalty)
    ]
    link_shifts_pairs: list[
        tuple[
            tuple[str, str, str], tuple[str, str, str], str, int
        ]  # a_shift1, a_shift2, shift_link_id, penalty
    ]
    worker_shift_filters: tuple[
        list[tuple[str, str, str]], int
    ]  # (List[assignments], penalty)


# Target work time and nb duties constraints calculated based on the campaign
# number of workers and required work
@dataclass
class SystemConstraintInputs:
    weekly_target_work_time: list[GroupsAssignmentsDurationsTargetConstraint]
    monthly_target_nb_duties: list[GroupsAssignmentsTargetConstraint]
    max_weekly_nb_duties: tuple[
        list[list[list[tuple[str, str, str]]]],  # week * worker * duties
        int,
    ]
    max_week_day_nb_duties: tuple[
        list[list[list[tuple[str, str, str]]]],  # weekday * worker * duties
        int,
    ]
    special_days_target_nb_duties: list[GroupsAssignmentsTargetConstraint]
    duty_consecutive_gap: tuple[
        list[
            tuple[list[tuple[str, str, str]], list[tuple[str, str, str]]]
        ],  # (day_d_vars, day_d+k_vars) pairs
        int,
    ] = field(default_factory=lambda: ([], 0))


@dataclass
class ModelSetup:
    variables: Variables
    no_overlap_shift_intervals: list[
        list[tuple[str, str, str]]
    ]  # list of assignments for each worker
    fixed_values: dict[tuple[str, str, str], int]  # List[Assignment]
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
    MAX_WEEKLY_NB_DUTIES = 12
    MAX_WEEK_DAY_NB_DUTIES = 13
    DUTY_CONSECUTIVE_GAP = 14


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
    params: dict[str, str]
    log_output: str


@dataclass
class Outputs:
    model: cp_model.CpModel
    is_solution: bool
    assignments: list[Assignment]
    objective_value: int
    breaches: list[Breach]
    var_sol: dict[tuple[str, str, str], int]
    var_spe_sol: dict[tuple[str, str, str, str], int]
    status: int
    wall_time: float
    solver_run: SolverRun


##############################
# Model
##############################


@dataclass
class Objective:
    int_vars: list[cp_model.IntVar] = field(default_factory=list)
    int_coeffs: list[int] = field(default_factory=list)
    bool_vars: list[cp_model.IntVar] = field(default_factory=list)
    bool_coeffs: list[int] = field(default_factory=list)


@dataclass
class VarName:
    objective_id: str | None
    objective_category: int
    cstr_vars: list[str]
    hard_to_soft: bool | None
    meta: dict[str, Any] | None = None


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
class ScopeContext:
    variables: set[tuple[str, str, str]]  # (worker_id, date_iso, shift_id)
    dates: set[str]
    shift_ids: set[str]
    worker_ids: set[str]
    shift_demand_ids: set[str]


@dataclass
class ProcessingCache:
    constraints: Constraints
    periods_weekly: list[list[date]]
    periods_monthly: list[list[date]]
    w_to_work_times: dict[str, dict[str, list[int]]]
    w_to_nb_duties: dict[str, dict[str, list[int]]]
    shift_id_to_duration: dict[str, int]
    dim_to_attr_value_to_shift: dict[str, dict[str | int | float | bool, list[str]]]
    scope_ctx: "ScopeContext | None" = None
