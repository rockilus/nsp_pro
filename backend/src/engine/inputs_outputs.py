from dataclasses import dataclass
from datetime import date
from typing import List, Literal

##############################
# Inputs


@dataclass
class VariableSpace:
    workers: List[str]
    start_date: date
    end_date: date
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
    date: date
    shift_id: str
    priority: Literal["low", "medium", "high"]


@dataclass
class Assignment:
    worker_id: str
    date: date
    shift_id: str


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
    variable_space: VariableSpace
    coverage: Coverage
    requests: List[Request]
    fixed_assignments: List[Assignment]
    custom: Custom


##############################
# Outputs


# pylint: disable=R0801
@dataclass
class ConstraintBreach:
    constraint_id: str
    workers: List[str]
    dates: List[date]
    shifts: List[str]
    value: int
    penalty: int


@dataclass
class Comments:
    constraint_breaches: List[ConstraintBreach]
    missing_coverage_dates: List[date]


@dataclass
class Outputs:
    solution_exist: bool
    assignments: List[Assignment]
    comments: Comments
