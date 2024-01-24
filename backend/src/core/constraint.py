from dataclasses import dataclass
from datetime import date
from typing import List, Literal


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
    reference_ids: List[str]
    relative_ids: List[str]


@dataclass
class Block:
    name: Literal[
        "operator",
        "#",
        "timing",
        "shift",
        "worker",
        "text",
        "shift_reference",
        "shift_relative",
        "weekday",
    ]
    type: Literal["string", "number", "list"]
    value: str | int | List[str]


@dataclass
class ConstraintBuild:
    id: str
    constraint_type: Literal["sum", "seq", "ord", "fil", "fai", "eve"]
    template_id: str
    blocks: List[Block]
    text: str
    hard: bool
    priority: str
    active: bool


@dataclass
# pylint: disable=too-many-instance-attributes
class Constraint:
    id: str
    constraint_type: Literal["sum", "seq", "ord", "fil", "fai", "eve"]
    template_id: str
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
    blocks: List[Block]


@dataclass
class TemplateBlock:
    name: Literal[
        "operator",
        "#",
        "timing",
        "shift",
        "worker",
        "text",
        "shift_reference",
        "shift_relative",
        "weekday",
    ]
    type: Literal["string", "number", "list"]
    options: List[str]
    placeholder: str | int


@dataclass
class Template:
    id: str
    constraint_type: Literal["sum", "seq", "ord", "fil", "fai", "eve"]
    text: str
    blocks: List[TemplateBlock]
