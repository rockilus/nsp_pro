from typing import List

from pydantic import BaseModel

from shared.schemas.dto.attribute import AttributeDTO
from shared.schemas.dto.dim_entry import DimEntryDTO


class DimensionDTO(BaseModel):
    id: str
    teamId: str
    dimTypes: List[int]
    name: str
    entryType: int
    deleted: bool


class DimensionsAndDimEntriesDTO(BaseModel):
    dimensions: List[DimensionDTO]
    dimEntries: List[DimEntryDTO]


class NewDimensionDTO(BaseModel):
    newDimension: DimensionDTO
    newDimEntries: List[DimEntryDTO]
    newAttributes: List[AttributeDTO]
