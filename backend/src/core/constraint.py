from dataclasses import dataclass
from datetime import date
from typing import Dict, List, Literal

from utils.constants import Constants


@dataclass
class VarWorker:
    selector: Constants.VAR_WORKER_SELECTOR_OPTIONS
    target_ids: List[str]
    num_eligible_workers: int


@dataclass
class VarDay:
    selector: Constants.VAR_DAY_SELECTOR_OPTIONS
    target: int
    start_date: date
    end_date: date
    interval: int


@dataclass
class VarShift:
    selector: Constants.VAR_SHIFT_SELECTOR_OPTIONS
    target_ids: List[str]
    reference_ids: List[str]
    relative_ids: List[str]


@dataclass
class DictBlockValue:
    name: str
    id: str
    id_type: str


@dataclass
class Block:
    name: Literal[Constants.BLOCK_NAME_OPTIONS]
    type: Literal["string", "number", "list", "dict"]
    value: str | int | List[str] | List[Dict]


@dataclass
class MissingProperty:
    dimension_id: str
    property_values: List[str | int | float | bool]


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
    missing_properties: List[MissingProperty]


@dataclass
# pylint: disable=too-many-instance-attributes
class Constraint:
    id: str
    constraint_type: Constants.CONSTRAINT_TYPE_OPTIONS
    operator: Constants.CONSTRAINT_OPERATOR_OPTIONS
    target_value: int
    target_unit: str  # worker, shift, day, hour
    worker_var: VarWorker
    day_var: VarDay
    shift_var: VarShift
    active: bool
    hard: bool
    priority: str
    schedule_id: str
    constraint_build_id: str


@dataclass
class TemplateBlock:
    name: Constants.BLOCK_NAME_OPTIONS
    type: Literal["string", "number", "list", "dict"]
    options: List[str] | Dict
    placeholder: str | int


@dataclass
class Template:
    id: str
    constraint_type: Literal["sum", "seq", "ord", "fil", "fai", "eve"]
    text: str
    blocks: List[TemplateBlock]
