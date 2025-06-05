from dataclasses import asdict, dataclass
from enum import Enum
from typing import Dict, List

import humps
from pydantic import TypeAdapter

from shared.schemas.core.attribute import Attribute
from shared.schemas.core.dim_entry import DimEntry
from shared.schemas.dto.dimension import (
    DimensionDTO,
    DimensionsAndDimEntriesDTO,
    NewDimensionDTO,
)


class DimensionType(Enum):
    WORKER = 0
    SHIFT = 1
    REST_SHIFT = 2


class DimensionEntryType(Enum):
    STR = 0
    INT = 1
    BOOL = 2
    DIM_ENTRIES = 3


@dataclass
# pylint: disable=R0801
class Dimension:
    id: str
    team_id: str
    dim_types: List[DimensionType]
    name: str
    entry_type: DimensionEntryType
    deleted: bool

    def to_dict(self) -> Dict:
        out = asdict(self)
        out["dim_types"] = [dim_type.value for dim_type in self.dim_types]
        out["entry_type"] = self.entry_type.value
        return out

    @classmethod
    def from_dict(cls, data: Dict) -> "Dimension":
        return cls(
            id=data["id"],
            team_id=data["team_id"],
            dim_types=[DimensionType(dim_type) for dim_type in data["dim_types"]],
            name=data["name"],
            entry_type=DimensionEntryType(data["entry_type"]),
            deleted=data["deleted"],
        )

    def to_dto(self) -> DimensionDTO:
        data = asdict(self)
        data["dimTypes"] = [dim_type.value for dim_type in self.dim_types]
        data["entryType"] = self.entry_type.value
        as_dict = humps.camelize(data)
        validator = TypeAdapter(DimensionDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, dto: DimensionDTO) -> "Dimension":
        data_snake = humps.decamelize(dto.model_dump())
        data_snake["dim_types"] = [
            DimensionType(dim_type) for dim_type in data_snake["dim_types"]
        ]
        data_snake["entry_type"] = DimensionEntryType(data_snake["entry_type"])
        return cls(**data_snake)


@dataclass
class DimensionAndDimEntries:
    dimensions: List[Dimension]
    dim_entries: List[DimEntry]

    def to_dto(self) -> "DimensionsAndDimEntriesDTO":
        return DimensionsAndDimEntriesDTO(
            dimensions=[d.to_dto() for d in self.dimensions],
            dimEntries=[de.to_dto() for de in self.dim_entries],
        )

    @classmethod
    def from_dto(cls, dto: "DimensionsAndDimEntriesDTO") -> "DimensionAndDimEntries":
        return cls(
            dimensions=[Dimension.from_dto(d) for d in dto.dimensions],
            dim_entries=[DimEntry.from_dto(de) for de in dto.dimEntries],
        )


@dataclass
class NewDimension:
    new_dimension: Dimension
    new_dim_entries: List[DimEntry]
    new_attributes: List[Attribute]

    def to_dto(self) -> "NewDimensionDTO":
        return NewDimensionDTO(
            newDimension=self.new_dimension.to_dto(),
            newDimEntries=[de.to_dto() for de in self.new_dim_entries],
            newAttributes=[attr.to_dto() for attr in self.new_attributes],
        )

    @classmethod
    def from_dto(cls, dto: "NewDimensionDTO") -> "NewDimension":
        return cls(
            new_dimension=Dimension.from_dto(dto.newDimension),
            new_dim_entries=[DimEntry.from_dto(de) for de in dto.newDimEntries],
            new_attributes=[Attribute.from_dto(attr) for attr in dto.newAttributes],
        )
