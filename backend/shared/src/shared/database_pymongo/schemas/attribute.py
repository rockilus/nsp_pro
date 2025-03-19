from typing import Any, List

from bson import ObjectId

from shared.database_pymongo.schemas.base import DocumentBaseSchema
from shared.schemas.schemas.attribute import Attribute, AttributeOwnerType


class AttributeSchema(DocumentBaseSchema):
    """Attribute schema for validation."""

    value: Any
    owner_type: int
    owner: ObjectId
    dimension: ObjectId
    dim_entries: List[ObjectId] = []

    def to_core(self) -> Attribute:
        return Attribute(
            id=str(self.id) or "",
            value=self.value,
            owner_type=AttributeOwnerType(self.owner_type),
            owner_id=str(self.owner),
            dimension_id=str(self.dimension),
            dim_entry_ids=[str(dim_entry) for dim_entry in self.dim_entries],
        )

    @classmethod
    def from_core(cls, attribute: Attribute) -> "AttributeSchema":
        return cls(
            id=(
                ObjectId(attribute.id)
                if attribute.id and ObjectId.is_valid(attribute.id)
                else None
            ),
            value=attribute.value,
            owner_type=attribute.owner_type.value,
            owner=ObjectId(attribute.owner_id),
            dimension=ObjectId(attribute.dimension_id),
            dim_entries=[ObjectId(dim_entry) for dim_entry in attribute.dim_entry_ids],
        )
