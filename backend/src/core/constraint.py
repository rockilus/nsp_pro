from dataclasses import dataclass
from datetime import date
from typing import Dict, List, Literal, Union


@dataclass
class VarWorker:
    operator: Literal["", "in_target", "out_target"]
    selector: Literal["all", "equal"]
    target_ids: List[str]
    num_eligible_workers: int


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
    target_ids: List[str]
    reference_id: str
    relative_id: str


@dataclass
class ConstraintBuild:
    id: str
    text: str
    hard: bool
    priority: str
    active: bool


@dataclass
# pylint: disable=too-many-instance-attributes
class Constraint:
    id: str
    constraint_type: Literal["sum", "seq", "ord", "fil", "fai", "eve"]
    operator: Literal[
        "",
        "less_than",
        "less_than_or_equal",
        "equal",
        "greater_than_or_equal",
        "greater_than",
        "yes",
        "no",
    ]
    target_value: int
    target_unit: str  # worker, shift, day, hour
    worker_var: VarWorker
    day_var: VarDay
    shift_var: VarShift
    active: bool
    hard: bool
    priority: str
    text: str
    blocks: Dict


@dataclass
class ConstraintMap:
    constraint_type: Literal["sum", "seq", "ord", "fil", "fai", "eve"]
    operator: Literal[
        "",
        "less_than",
        "less_than_or_equal",
        "equal",
        "greater_than_or_equal",
        "greater_than",
        "yes",
        "no",
    ]
    target_value: int
    target_unit: str  # worker, shift, day, hour
    worker_var: VarWorker
    day_var: VarDay
    shift_var: VarShift


@dataclass
class ConstraintTemplateBlock:
    name: Literal[
        "operator",
        "#",
        "timing",
        "shift",
        "worker",
    ]
    type: Literal["string", "number", "list"]
    options: List[str]
    placeholder: str | int
    multiple: bool


@dataclass
class ConstraintTemplate:
    id: str
    constraint_type: Literal["sum", "seq", "ord", "fil", "fai", "eve"]
    text: str
    blocks: List[ConstraintTemplateBlock]
