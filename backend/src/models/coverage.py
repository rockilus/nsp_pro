from mongoengine import Document, EmbeddedDocument
from mongoengine.fields import (
    DateTimeField,
    EmbeddedDocumentField,
    IntField,
    ListField,
    StringField,
)


class ShiftDemand(EmbeddedDocument):
    day_index = IntField(min_value=0, max_value=6, required=True)
    shift_id = StringField(required=True)
    quantity = IntField(required=True)
    start_time = DateTimeField(required=True)
    duration = IntField(required=True)


class Coverage(Document):
    meta = {"collection": "coverages"}

    id = StringField(primary_key=True, required=True)
    name = StringField(required=True)
    shift_demands = ListField(EmbeddedDocumentField(ShiftDemand))
