from typing import Any, Dict, List

from shared.database_pymongo_str_id.schemas.base import DocumentBaseSchema
from shared.schemas.schemas.attribute import Attribute, AttributeOwnerType


class AttributeSchema(DocumentBaseSchema):
    """Attribute schema for validation."""

    value: Any
    owner_type: int
    owner: str
    dimension: str
    dim_entries: List[str] = []

    def to_mongo(self) -> Dict[str, Any]:
        out = super().to_mongo()
        return out

    @classmethod
    def from_mongo(cls, data: Dict[str, Any]) -> "AttributeSchema":
        data["id"] = str(data.pop("_id"))
        return cls(**data)

    def to_core(self) -> Attribute:
        return Attribute(
            id=self.id or "",
            value=self.value,
            owner_type=AttributeOwnerType(self.owner_type),
            owner_id=self.owner,
            dimension_id=self.dimension,
            dim_entry_ids=self.dim_entries,
        )

    @classmethod
    def from_core(cls, attribute: Attribute) -> "AttributeSchema":
        return cls(
            id=attribute.id,
            value=attribute.value,
            owner_type=attribute.owner_type.value,
            owner=attribute.owner_id,
            dimension=attribute.dimension_id,
            dim_entries=attribute.dim_entry_ids,
        )
