from dataclasses import dataclass
from datetime import date
from typing import List, Union, Dict


@dataclass
class VarWorker:
    operator: str
    selector: str
    target_ids: List[str]
    num_eligible_workers: int


@dataclass
class VarDay:
    selector: str
    target: int
    start_date: date
    end_date: date
    interval: int


@dataclass
class VarShift:
    operator: str
    selector: str
    target_ids: List[str]
    reference_id: str
    relative_id: str


@dataclass
class ConstraintSum:
    operator: str
    target_value: int


@dataclass
class ConstraintSeq:
    id: str
    operator: str
    target_value: int


@dataclass
class BuildBlock:
    name: str
    value: Union[str, int]


@dataclass
class ConstraintBuild:
    id: str
    build_blocks: List[BuildBlock]
    active: bool


@dataclass
class Constraint:
    id: str
    constraint_type: str
    operator: str
    target_value: int
    worker_var: VarWorker
    day_var: VarDay
    shift_var: VarShift
    active: bool
    hard: bool
    penalty: int
    build_blocks: List[BuildBlock]


@dataclass
class TreeNode:
    name: str
    parent_options: List[str]
    options: List[str]
    children: List["TreeNode"]
