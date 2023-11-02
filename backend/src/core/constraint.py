from dataclasses import dataclass
from datetime import date
from typing import List, Literal, Union


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
class BuildBlock:
    name: str
    value: Union[str, int, List[str]] 


@dataclass
class ConstraintBuild:
    id: str
    build_blocks: List[BuildBlock]
    hard: bool
    priority: str
    active: bool


@dataclass
# pylint: disable=too-many-instance-attributes
class Constraint:
    id: str
    constraint_type: Literal["sum", "seq", "ord", "fil", "fai", "eve"]
    operator: Literal[
        "", "less_than_or_equal", "equal", "greater_than_or_equal", "yes", "no"
    ]
    target_value: int
    worker_var: VarWorker
    day_var: VarDay
    shift_var: VarShift
    active: bool
    hard: bool
    priority: str
    build_blocks: List[BuildBlock]


@dataclass
class TreeNode:
    name: str
    parent_options: List[str]
    options: List[str]
    children: List["TreeNode"]
