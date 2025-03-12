from typing import List

from shared.database_pymongo.schemas.base import DocumentBaseSchema
from shared.schemas.schemas.dimension import (
    Dimension,
    DimensionEntryType,
    DimensionType,
    DimEntry,
)


class DimEntrySchema(DocumentBaseSchema):
    """DimEntry schema for validation."""

    dimension: str
    name: str
    deleted: bool

    def to_core(self) -> DimEntry:
        return DimEntry(
            id=self.id or "",
            dimension_id=self.dimension,
            name=self.name,
            deleted=self.deleted,
        )

    @classmethod
    def from_core(cls, dim_entry: DimEntry) -> "DimEntrySchema":
        return cls(
            id=dim_entry.id,
            dimension=dim_entry.dimension_id,
            name=dim_entry.name,
            deleted=dim_entry.deleted,
        )


class DimensionSchema(DocumentBaseSchema):
    """Dimension schema for validation."""

    team: str
    dim_types: List[int]
    name: str
    entry_type: int
    deleted: bool

    def to_core(self) -> Dimension:
        return Dimension(
            id=self.id or "",
            team_id=self.team,
            dim_types=[DimensionType(dt) for dt in self.dim_types],
            name=self.name,
            entry_type=DimensionEntryType(self.entry_type),
            deleted=self.deleted,
        )

    @classmethod
    def from_core(cls, dimension: Dimension) -> "DimensionSchema":
        return cls(
            id=dimension.id,
            team=dimension.team_id,
            dim_types=[dt.value for dt in dimension.dim_types],
            name=dimension.name,
            entry_type=dimension.entry_type.value,
            deleted=dimension.deleted,
        )
