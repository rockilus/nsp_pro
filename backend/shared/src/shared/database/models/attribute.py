from mongoengine import Document
from mongoengine.fields import (
    DynamicField,
    IntField,
    ListField,
    ReferenceField,
    StringField,
)

from shared.schemas.schemas.attribute import AttributeOwnerType


class Attribute(Document):
    meta = {"collection": "attributes"}

    id = StringField(primary_key=True, required=True)
    value = DynamicField()
    owner_type = IntField(required=True, choices=[e.value for e in AttributeOwnerType])
    owner = ReferenceField(
        "Shift" if owner_type == AttributeOwnerType.SHIFT else "Worker"
    )
    dimension = ReferenceField("Dimension")
    dim_entries = ListField(ReferenceField("DimEntry"))
