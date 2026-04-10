from shared.database.schemas.base import DocumentBaseSchema
from shared.schemas.core.dim_entry import (
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
