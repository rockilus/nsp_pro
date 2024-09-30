from mongoengine import Document
from mongoengine.fields import BooleanField, IntField, ReferenceField, StringField

from core import DimensionEntryType, DimensionType


class DimEntry(Document):
    meta = {"collection": "dim_entries"}

    id = StringField(primary_key=True, required=True)
    dimension = ReferenceField("Dimension", required=True)
    name = StringField(required=True)


# pylint: disable=R0801
class Dimension(Document):
    meta = {"collection": "dimensions"}

    id = StringField(primary_key=True, required=True)
    team = ReferenceField("Team", required=True)
    type = IntField(required=True, choices=[e.value for e in DimensionType])
    name = StringField(required=True)
    entry_type = IntField(required=True, choices=[e.value for e in DimensionEntryType])
    rest_shift = BooleanField(required=True)
    deleted = BooleanField(required=True)
