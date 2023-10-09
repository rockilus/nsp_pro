from dataclasses import dataclass
from datetime import date
from typing import List, Literal, Optional, Union

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
class VarSumWorker:
    selector: Literal["all"]


@dataclass
class VarSumDay:
    selector: Literal["week"]


@dataclass
class VarSumShift:
    selector: Literal["equal"]
    target: str


@dataclass
class ConstraintSum:
    id: str
    operator: Literal[
        "less_than_or_equal",
        "equal",
        "greater_than_or_equal",
    ]
    worker_var: VarSumWorker
    day_var: VarSumDay
    shift_var: VarSumShift
    target_value: int
    hard: bool
    penalty: Optional[Literal["low", "medium", "high"]] = None


@dataclass
class Custom:
    constraints_sum: List[ConstraintSum]


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
    variables: List[List[Union[str, date]]]
    value_diff: int
    penalty: int


@dataclass
class Outputs:
    solution_exist: bool
    assignments: List[Assignment]
    objective_value: int
    constraint_breaches: List[ConstraintBreach]
