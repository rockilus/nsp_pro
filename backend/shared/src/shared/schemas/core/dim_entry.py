from dataclasses import asdict, dataclass
from typing import Dict

import humps
from pydantic import TypeAdapter

from shared.schemas.dto.dim_entry import DimEntryDTO


@dataclass
# pylint: disable=R0801
class DimEntry:
    id: str
    dimension_id: str
    name: str
    deleted: bool

    def to_dict(self) -> Dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict) -> "DimEntry":
        return cls(
            id=data["id"],
            dimension_id=data["dimension_id"],
            name=data["name"],
            deleted=data["deleted"],
        )

    def to_dto(self) -> DimEntryDTO:
        data = asdict(self)
        as_dict = humps.camelize(data)
        validator = TypeAdapter(DimEntryDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, dto: DimEntryDTO) -> "DimEntry":
        data_snake = humps.decamelize(dto.model_dump())
        return cls(**data_snake)
