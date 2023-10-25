from dataclasses import dataclass, field
from datetime import date
from typing import List, Literal, Union

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
class VarSumWorker:
    selector: Literal["all", "equal"]
    target: str


@dataclass
class VarSumDay:
    selector: Literal["all", "week", "period"]
    start_date: date = field(default_factory=date.today)
    end_date: date = field(default_factory=date.today)


@dataclass
class VarSumShift:
    selector: Literal["equal"]
    target: str


@dataclass
class VarSeqWorker:
    selector: Literal["all"]


@dataclass
class VarSeqShift:
    selector: Literal["equal"]
    target: str


@dataclass
class VarOrdWorker:
    selector: Literal["all"]


@dataclass
class VarOrdDay:
    selector: Literal["all", "week_day_index"]
    interval: int
    target: int


@dataclass
class VarOrdShift:
    reference: str
    relative: str


@dataclass
class VarFilWorker:
    operator: Literal["in_target", "out_target"]
    selector: Literal["all", "list"]
    target: List[str]


@dataclass
class VarFilDay:
    selector: Literal["all"]


@dataclass
class VarFilShift:
    operator: Literal["in_target", "out_target"]
    selector: Literal["all", "list"]
    target: List[str]


@dataclass
class VarFaiWorker:
    selector: Literal["all", "list"]
    target: List[str]


@dataclass
class VarFaiDay:
    selector: Literal["all", "week_day_index"]
    target: int


@dataclass
class VarFaiShift:
    selector: Literal["all", "list"]
    target: List[str]


@dataclass
class VarEveWorker:
    selector: Literal["all", "equal"]
    target: str
    num_eligible_workers: int


@dataclass
class VarEveDay:
    selector: Literal["all"]


@dataclass
class VarEveShift:
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
    penalty: int = field(default=0)


@dataclass
class ConstraintSeq:
    id: str
    operator: Literal[
        "less_than_or_equal",
        "equal",
        "greater_than_or_equal",
    ]
    worker_var: VarSeqWorker
    shift_var: VarSeqShift
    target_value: int
    hard: bool
    penalty: int = field(default=0)


@dataclass
class ConstraintOrd:
    id: str
    operator: Literal["yes", "no"]
    worker_var: VarOrdWorker
    day_var: VarOrdDay
    shift_var: VarOrdShift
    hard: bool
    penalty: int = field(default=0)


@dataclass
class ConstraintFil:
    id: str
    worker_var: VarFilWorker
    day_var: VarFilDay
    shift_var: VarFilShift
    hard: bool
    penalty: int = field(default=0)


@dataclass
class ConstraintFai:
    id: str
    worker_var: VarFaiWorker
    day_var: VarFaiDay
    shift_var: VarFaiShift
    penalty: int = field(default=0)


@dataclass
class ConstraintEve:
    id: str
    worker_var: VarEveWorker
    day_var: VarEveDay
    shift_var: VarEveShift
    penalty: int = field(default=0)


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
    selector: Literal["all", "equal"]
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
    variables: List[List[Union[str, date]]]
    value_diff: int
    penalty: int


@dataclass
class Outputs:
    solution_exist: bool
    assignments: List[Assignment]
    objective_value: int
    constraint_breaches: List[ConstraintBreach]
