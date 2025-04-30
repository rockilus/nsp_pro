from dataclasses import asdict, dataclass
from enum import Enum
from typing import Dict, List

import humps
from pydantic import TypeAdapter

from shared.schemas.dto.attribute import AttributeDTO


class AttributeOwnerType(Enum):
    SHIFT = 0
    WORKER = 1


@dataclass
class Attribute:
    id: str
    value: str | int | float | bool
    owner_type: AttributeOwnerType
    owner_id: str
    dimension_id: str
    dim_entry_ids: List[str]

    def to_dict(self) -> Dict:
        out = asdict(self)
        out["owner_type"] = self.owner_type.value
        return out

    @classmethod
    def from_dict(cls, data: Dict) -> "Attribute":
        return cls(
            id=data["id"],
            value=data["value"],
            owner_type=AttributeOwnerType(data["owner_type"]),
            owner_id=data["owner_id"],
            dimension_id=data["dimension_id"],
            dim_entry_ids=data["dim_entry_ids"],
        )

    def to_dto(self) -> AttributeDTO:
        data = asdict(self)
        data["owner_type"] = self.owner_type.value
        as_dict = humps.camelize(data)
        validator = TypeAdapter(AttributeDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: AttributeDTO) -> "Attribute":
        data_dict = humps.decamelize(data.model_dump())
        data_dict["owner_type"] = AttributeOwnerType(data_dict["owner_type"])
        return cls(**data_dict)
