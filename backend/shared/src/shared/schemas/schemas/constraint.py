from dataclasses import dataclass
from enum import Enum
from typing import List, Tuple

from shared.schemas.schemas.attribute import AttributeOwnerType


class VarWorkerSelectorOptions(Enum):
    ALL = 0
    EQUAL = 1


class VarDaySelectorOptions(Enum):
    ALL = 0
    WEEK = 1
    MONTH = 2
    PERIOD = 3
    WEEK_DAY_INDEX = 4


class VarShiftSelectorOptions(Enum):
    ALL = 0
    EQUAL = 1


class SWOIdTypes(Enum):
    NONE = 0
    WORKER = 1
    SHIFT = 2
    DIMENSION = 3


@dataclass
class ShiftWorkerOption:
    name: str | bool  # value shown in the dropdown in the ui
    id: str  # id of the shift, worker or dimension
    id_type: SWOIdTypes
    is_bool_dim: bool
    category_name: str  # workers, shifts, all, or the name of the dimension


class BlockNameOptions(Enum):
    OPERATOR = 0
    NUMBER = 1
    TIMING = 2
    SHIFT = 3
    WORKER = 4
    TEXT = 5
    SHIFT_REFERENCE = 6
    SHIFT_RELATIVE = 7
    WEEKDAY = 8


class BlockTypeOptions(Enum):
    STRING = 0
    NUMBER = 1
    LIST = 2
    SHIFT_WORKER_OPTION = 3


@dataclass
class Block:
    name: BlockNameOptions
    type: BlockTypeOptions
    value: str | int | List[str] | List[ShiftWorkerOption]


# If the name of a Block is worker, shift, shift_reference or shift_relative,
# the value is a list of dict with this format:
# {
#     "name": "Vannes", # value of the property
#     "id": "66b633ffcad3bb739b082fae", # id of the id_type
#     "id_type": "dimension" # type of the id: worker, shift, dimension
# }


@dataclass
class MissingAttribute:
    dimension_id: str
    is_bool: bool
    dim_name: str
    category: AttributeOwnerType
    attribute_values: List[str | int | float | bool]


class ConstraintType(Enum):
    SUM = 0
    SEQ = 1
    ORD = 2
    FIL = 3
    FAI = 4
    EVE = 5


class ConstraintOperator(Enum):
    LESS_THAN = 0
    LESS_THAN_OR_EQUAL = 1
    EQUAL = 2
    GREATER_THAN_OR_EQUAL = 3
    GREATER_THAN = 4
    YES = 5
    NO = 6


@dataclass
# pylint: disable=too-many-instance-attributes
class ConstraintBuild:
    id: str
    team_id: str
    constraint_type: ConstraintType
    template_id: str
    language: str
    blocks: List[Block]
    hard: bool
    priority: str


@dataclass
# pylint: disable=too-many-instance-attributes
class ConstraintBuildAugmented(ConstraintBuild):
    active: bool
    missing_attributes: List[MissingAttribute]
    text: str


@dataclass
class Constraint:
    id: str
    constraint_type: ConstraintType
    operator: ConstraintOperator | None
    target_value: int
    target_unit: str  # worker, shift, day, hour
    active: bool
    hard: bool
    priority: str
    schedule_id: str
    constraint_build_id: str


# for each worker, list for each target shifts on the target period
@dataclass
class ConstraintSum(Constraint):
    constraint_variables: List[List[Tuple[str, str, str]]]


# for each worker and shift, list for days over which target periods are covered
@dataclass
class ConstraintSeq(Constraint):
    constraint_variables: List[List[Tuple[str, str, str]]]


# for each worker, tuple for d_ref/s_ref and d_rel/s_rel, for all combinations
@dataclass
class ConstraintOrd(Constraint):
    shift_reference_ids: List[str]
    shift_relative_ids: List[str]
    interval: int
    constraint_variables: List[Tuple[Tuple[str, str, str], Tuple[str, str, str]]]


# list of variables to set to 0
@dataclass
class ConstraintFil(Constraint):
    constraint_variables: List[Tuple[str, str, str]]


# for each worker, for all target days and shifts
@dataclass
class ConstraintFai(Constraint):
    constraint_variables: List[List[Tuple[str, str, str]]]


@dataclass
class Constraints:
    sum: List[ConstraintSum]
    seq: List[ConstraintSeq]
    ord: List[ConstraintOrd]
    fil: List[ConstraintFil]
    fai: List[ConstraintFai]


@dataclass
class TemplateBlock:
    name: BlockNameOptions
    type: BlockTypeOptions
    options: List[str] | List[ShiftWorkerOption]
    placeholder: str | int


@dataclass
class Template:
    id: str
    constraint_type: ConstraintType
    text: str
    language: str
    blocks: List[TemplateBlock]
