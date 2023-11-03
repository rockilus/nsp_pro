from dataclasses import dataclass
from datetime import date
from typing import List, Literal, Tuple

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
    date: date
    shift_id: str
    quantity: int


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
    reference: str
    relative: str


@dataclass
class Constraint:
    id: str
    constraint_type: Literal["sum", "seq", "ord", "fil", "fai", "eve"]
    operator: Literal[
        "",
        "less_than_or_equal",
        "equal",
        "greater_than_or_equal",
        "yes",
        "no",
    ]
    target_value: int
    worker_var: VarWorker
    day_var: VarDay
    shift_var: VarShift
    hard: bool
    penalty: int


@dataclass
class Inputs:
    variable_space: VariableSpace
    coverage: Coverage
    requests: List[Request]
    fixed_assignments: List[Assignment]
    constraints: List[Constraint]


##############################
# Outputs


# pylint: disable=R0801
@dataclass
class ConstraintBreach:
    constraint_id: str
    variables: List[Tuple[str, date, str]]
    value_diff: int
    penalty: int


@dataclass
class Outputs:
    is_solution: bool
    assignments: List[Assignment]
    objective_value: int
    constraint_breaches: List[ConstraintBreach]
