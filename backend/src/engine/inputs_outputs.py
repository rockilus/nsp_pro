from typing import List, Literal
from dataclasses import dataclass


##############################
# Inputs


@dataclass
class VariableInfo:
    workers: List[str]
    start_date: str
    end_date: str
    shifts: List[str]


@dataclass
class ShiftDemand:
    date: str
    shift_id: str
    quantity: int


@dataclass
class Coverage:
    coverage: List[ShiftDemand]


@dataclass
class Request:
    worker_id: str
    date: str
    shift_id: str
    priority: Literal["low", "medium", "high"]


@dataclass
class Requests:
    requests: List[Request]


@dataclass
class Assignment:
    worker_id: str
    date: str
    shift_id: str


@dataclass
class FixAssignments:
    fix_assignments: List[Assignment]


@dataclass
class WCoordinate:
    selector: Literal["all", "equal"]
    worker_id: str
    intra: bool


@dataclass
class DCoordinate:
    selector: Literal["all", "modulo", "interval"]
    value: str
    other_value: str
    intra: bool


@dataclass
class SCoordinate:
    selector: Literal["all", "equal", "pair"]
    shift_id: str
    other_shift_id: str
    intra: bool


@dataclass
class Constraint:
    type: Literal["sum", "sequence", "order"]
    operator: Literal["equal", "at_least", "at_most", "no"]
    target_value: int
    hard: bool
    penalty: Literal["low", "medium", "high"]
    constraint_id: str


@dataclass
class CustomConstraint:
    w_coordinate: WCoordinate
    d_coordinate: DCoordinate
    s_coordinate: SCoordinate
    Constraint: Constraint


@dataclass
class Custom:
    custom_constraints: List[CustomConstraint]


@dataclass
class Inputs:
    variable_info: VariableInfo
    coverage: Coverage
    requests: Requests
    fix_assignments: FixAssignments
    custom: Custom


##############################
# Outputs


@dataclass
class Solution:
    solution_exist: bool
    solution: List[Assignment]


@dataclass
class ConstraintBreach:
    constraint_id: str
    workers: List[str]
    dates: List[str]
    shifts: List[str]
    value: int
    penalty: int


@dataclass
class ConstraintBreaches:
    constraint_breaches: List[ConstraintBreach]


@dataclass
class InterSolution:
    index: int
    time: float
    objective_value: float


@dataclass
class MetaData:
    status: Literal["UNKNOWN", "MODEL_INVALID", "FEASIBLE", "INFEASIBLE", "OPTIMAL"]
    status_code: int
    conflicts: int
    branches: int
    wall_time: float
    objective_value: float
    solution_path: List[InterSolution]


@dataclass
class Outputs:
    solution: Solution
    constraint_breaches: ConstraintBreaches
    meta_data: MetaData
