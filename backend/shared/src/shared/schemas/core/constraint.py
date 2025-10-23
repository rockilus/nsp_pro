from dataclasses import asdict, dataclass
from enum import Enum
from typing import Dict, List, Tuple

import humps
from pydantic import TypeAdapter

from shared.schemas.core.attribute import AttributeOwnerType
from shared.schemas.dto.constraint import (
    BlockDTO,
    ConstraintBuildDTO,
    MissingAttributeDTO,
    ShiftWorkerOptionDTO,
    TemplateBlockDTO,
    TemplateDTO,
)


class VarWorkerSelectorOptions(Enum):
    ALL = 0
    EQUAL = 1


class VarDaySelectorOptions(Enum):
    ALL = 0
    WEEK = 1
    MONTH = 2
    PERIOD = 3
    WEEK_DAY_INDEX = 4
    YEAR = 5


class VarShiftSelectorOptions(Enum):
    ALL = 0
    EQUAL = 1


class SWOIdTypes(Enum):
    NONE = 0
    WORKER = 1
    SHIFT = 2
    DIMENSION = 3
    SPECIALTY = 4
    DUTY = 5


@dataclass
class ShiftWorkerOption:
    name: str | bool  # value shown in the dropdown in the ui
    id: str  # id of the shift, worker, dimension, specialty
    id_type: SWOIdTypes
    is_bool_dim: bool
    category_name: str  # workers, shifts, all, or the name of the dimension

    def to_dict(self):
        out = asdict(self)
        out["id_type"] = self.id_type.value
        return out

    @classmethod
    def from_dict(cls, data: Dict) -> "ShiftWorkerOption":
        return cls(
            name=data["name"],
            id=data["id"],
            id_type=SWOIdTypes(data["id_type"]),
            is_bool_dim=data["is_bool_dim"],
            category_name=data["category_name"],
        )

    def to_dto(self) -> ShiftWorkerOptionDTO:
        out = asdict(self)
        out["id_type"] = self.id_type.value
        as_dict = humps.camelize(out)
        validator = TypeAdapter(ShiftWorkerOptionDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: ShiftWorkerOptionDTO) -> "ShiftWorkerOption":
        data_snake = humps.decamelize(data.model_dump())
        data_snake["id_type"] = SWOIdTypes(data.idType)
        return cls(**data_snake)


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

    def to_dict(self):
        out = asdict(self)
        out["name"] = self.name.value
        out["type"] = self.type.value
        if isinstance(self.value, list):
            if all(isinstance(v, ShiftWorkerOption) for v in self.value):
                out["value"] = [v.to_dict() for v in self.value]
        return out

    @classmethod
    def from_dict(cls, data: Dict) -> "Block":
        value = data["value"]
        if data["type"] == BlockTypeOptions.SHIFT_WORKER_OPTION.value:
            value = [ShiftWorkerOption.from_dict(v) for v in data["value"]]
        return cls(
            name=BlockNameOptions(data["name"]),
            type=BlockTypeOptions(data["type"]),
            value=value,
        )

    def to_dto(self) -> BlockDTO:
        out = asdict(self)
        out["name"] = self.name.value
        out["type"] = self.type.value
        if isinstance(self.value, list):
            if all(isinstance(v, ShiftWorkerOption) for v in self.value):
                out["value"] = [v.to_dto() for v in self.value]  # type: ignore
        as_dict = humps.camelize(out)
        validator = TypeAdapter(BlockDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: BlockDTO) -> "Block":
        data_snake = humps.decamelize(data.model_dump())
        value = data_snake["value"]
        if (
            data_snake["type"] == BlockTypeOptions.SHIFT_WORKER_OPTION.value
            and isinstance(data.value, list)
            and all(isinstance(v, ShiftWorkerOptionDTO) for v in data.value)
        ):
            value = [ShiftWorkerOption.from_dto(v) for v in data.value]  # type: ignore
        return cls(
            name=BlockNameOptions(data_snake["name"]),
            type=BlockTypeOptions(data_snake["type"]),
            value=value,
        )


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

    def to_dict(self):
        out = asdict(self)
        out["category"] = self.category.value
        return out

    @classmethod
    def from_dict(cls, data: Dict) -> "MissingAttribute":
        return cls(
            dimension_id=data["dimension_id"],
            is_bool=data["is_bool"],
            dim_name=data["dim_name"],
            category=AttributeOwnerType(data["category"]),
            attribute_values=data["attribute_values"],
        )

    def to_dto(self) -> MissingAttributeDTO:
        out = asdict(self)
        out["category"] = self.category.value
        as_dict = humps.camelize(out)
        validator = TypeAdapter(MissingAttributeDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: MissingAttributeDTO) -> "MissingAttribute":
        data_snake = humps.decamelize(data.model_dump())
        data_snake["category"] = AttributeOwnerType(data_snake["category"])
        return cls(**data_snake)


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

    def to_dict(self) -> Dict:
        out = asdict(self)
        out["constraint_type"] = self.constraint_type.value
        out["blocks"] = [block.to_dict() for block in self.blocks]
        return out

    @classmethod
    def from_dict(cls, data: Dict) -> "ConstraintBuild":
        return cls(
            id=data["id"],
            team_id=data["team_id"],
            constraint_type=ConstraintType(data["constraint_type"]),
            template_id=data["template_id"],
            language=data["language"],
            blocks=[Block.from_dict(block) for block in data["blocks"]],
            hard=data["hard"],
            priority=data["priority"],
        )

    @classmethod
    def from_dto(cls, data: ConstraintBuildDTO) -> "ConstraintBuild":
        data_snake = humps.decamelize(data.model_dump())
        data_snake["constraint_type"] = ConstraintType(
            data_snake["constraint_type"]
        )
        data_snake["blocks"] = [Block.from_dto(block) for block in data.blocks]
        data_snake.pop("text")
        data_snake.pop("active")
        data_snake.pop("missing_attributes")
        return cls(**data_snake)


@dataclass
# pylint: disable=too-many-instance-attributes
class ConstraintBuildAugmented(ConstraintBuild):
    active: bool
    missing_attributes: List[MissingAttribute]
    text: str

    def to_dict(self) -> Dict:
        out = super().to_dict()
        out.update(
            {
                "active": self.active,
                "missing_attributes": [
                    ma.to_dict() for ma in self.missing_attributes
                ],
                "text": self.text,
            }
        )
        return out

    @classmethod
    def from_dict(cls, data: Dict) -> "ConstraintBuildAugmented":
        return cls(
            id=data["id"],
            team_id=data["team_id"],
            constraint_type=ConstraintType(data["constraint_type"]),
            template_id=data["template_id"],
            language=data["language"],
            blocks=[Block.from_dict(block) for block in data["blocks"]],
            hard=data["hard"],
            priority=data["priority"],
            active=data["active"],
            missing_attributes=[
                MissingAttribute.from_dict(ma)
                for ma in data["missing_attributes"]
            ],
            text=data["text"],
        )

    def to_dto(self) -> ConstraintBuildDTO:
        out = asdict(self)
        out["constraint_type"] = self.constraint_type.value
        out["blocks"] = [block.to_dto() for block in self.blocks]
        out["missing_attributes"] = [
            ma.to_dto() for ma in self.missing_attributes
        ]
        as_dict = humps.camelize(out)
        validator = TypeAdapter(ConstraintBuildDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: ConstraintBuildDTO) -> "ConstraintBuildAugmented":
        data_snake = humps.decamelize(data.model_dump())
        data_snake["constraint_type"] = ConstraintType(
            data_snake["constraint_type"]
        )
        data_snake["blocks"] = [
            Block.from_dto(block) for block in data_snake["blocks"]
        ]
        data_snake["missing_attributes"] = [
            MissingAttribute.from_dto(ma)
            for ma in data_snake["missing_attributes"]
        ]
        return cls(**data_snake)


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
    penalty: int
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
    constraint_variables: List[
        Tuple[Tuple[str, str, str], Tuple[str, str, str]]
    ]


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

    def to_dto(self) -> TemplateBlockDTO:
        out = asdict(self)
        out["name"] = self.name.value
        out["type"] = self.type.value
        if isinstance(self.options, list):
            if all(isinstance(v, ShiftWorkerOption) for v in self.options):
                out["options"] = [v.to_dto() for v in self.options]  # type: ignore
        as_dict = humps.camelize(out)
        validator = TypeAdapter(TemplateBlockDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: TemplateBlockDTO) -> "TemplateBlock":
        data_snake = humps.decamelize(data.model_dump())
        options = data_snake["options"]
        if data_snake["type"] == BlockTypeOptions.SHIFT_WORKER_OPTION.value:
            options = [ShiftWorkerOption.from_dto(v) for v in options]
        return cls(
            name=BlockNameOptions(data_snake["name"]),
            type=BlockTypeOptions(data_snake["type"]),
            options=options,
            placeholder=data_snake["placeholder"],
        )


@dataclass
class Template:
    id: str
    constraint_type: ConstraintType
    text: str
    language: str
    blocks: List[TemplateBlock]

    def to_dto(self) -> TemplateDTO:
        out = asdict(self)
        out["constraint_type"] = self.constraint_type.value
        out["blocks"] = [block.to_dto() for block in self.blocks]
        as_dict = humps.camelize(out)
        validator = TypeAdapter(TemplateDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: TemplateDTO) -> "Template":
        data_snake = humps.decamelize(data.model_dump())
        data_snake["constraint_type"] = ConstraintType(
            data_snake["constraint_type"]
        )
        data_snake["blocks"] = [
            TemplateBlock.from_dto(block) for block in data_snake["blocks"]
        ]
        return cls(**data_snake)


@dataclass
class Penalty:
    hard: int
    soft: int

    def apply_coefficient(self, coefficient: int) -> None:
        self.hard *= coefficient
        self.soft *= coefficient


@dataclass
class CoveragePenalty:
    duty: int
    normal: int

    def apply_coefficient(self, coefficient: int) -> None:
        self.duty *= coefficient
        self.normal *= coefficient


@dataclass
class UserConstraintPenalty:
    eve: Penalty
    fai: Penalty
    fil: Penalty
    ord: Penalty
    seq: Penalty
    sum: Penalty
    request: Penalty

    def apply_coefficient(self, coefficient: int) -> None:
        self.eve.apply_coefficient(coefficient)
        self.fai.apply_coefficient(coefficient)
        self.fil.apply_coefficient(coefficient)
        self.ord.apply_coefficient(coefficient)
        self.seq.apply_coefficient(coefficient)
        self.sum.apply_coefficient(coefficient)
        self.request.apply_coefficient(coefficient)


@dataclass
class ConfigurationConstraintPenalty:
    coverage: CoveragePenalty
    duty_recup: int
    worker_shift_filter: int
    link_shift: int
    weekly_worktime_max: int
    weekly_worktime_desired: int
    weekly_worktime_contract: int
    monthly_duties_max: int
    monthly_duties_desired: int

    def apply_coefficient(self, coefficient: int) -> None:
        self.coverage.apply_coefficient(coefficient)
        self.duty_recup *= coefficient
        self.worker_shift_filter *= coefficient
        self.link_shift *= coefficient
        self.monthly_duties_max *= coefficient
        self.monthly_duties_desired *= coefficient


@dataclass
class SystemConstraintPenalty:
    weekly_target_work_time: int
    monthly_target_nb_duties: int
    special_days_target_nb_duties: int

    def apply_coefficient(self, coefficient: int) -> None:
        self.monthly_target_nb_duties *= coefficient


@dataclass
class Penalties:
    user_constraint: UserConstraintPenalty
    configuration_constraint: ConfigurationConstraintPenalty
    system_constraint: SystemConstraintPenalty
    _coefficient_applied: bool = False

    def apply_coefficient(self, coefficient: int) -> None:
        if self._coefficient_applied:
            return
        self.user_constraint.apply_coefficient(coefficient)
        self.configuration_constraint.apply_coefficient(coefficient)
        self.system_constraint.apply_coefficient(coefficient)
        self._coefficient_applied = True
