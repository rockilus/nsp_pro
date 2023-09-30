from mongoengine import Document, EmbeddedDocument
from mongoengine.fields import (
    DateTimeField,
    EmbeddedDocumentField,
    IntField,
    ListField,
    StringField,
)


class ShiftDemand(EmbeddedDocument):
    dayIndex = IntField(min_value=0, max_value=6, required=True)
    shiftId = StringField(required=True)
    quantity = IntField(required=True)


class Coverage(Document):
    meta = {"collection": "coverage"}

    id = StringField(primary_key=True, required=True)
    name = StringField(required=True)
    dateStart = DateTimeField(required=True)
    dateEnd = DateTimeField(required=True)
    shiftDemands = ListField(EmbeddedDocumentField(ShiftDemand))
