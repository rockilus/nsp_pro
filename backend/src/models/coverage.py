from mongoengine import Document, EmbeddedDocument
from mongoengine.fields import EmbeddedDocumentField, IntField, ListField, StringField


class ShiftDemand(EmbeddedDocument):
    dayIndex = IntField(min_value=0, max_value=6, required=True)
    shiftId = StringField(required=True)
    quantity = IntField(required=True)


class Coverage(Document):
    meta = {"collection": "coverages"}

    id = StringField(primary_key=True, required=True)
    name = StringField(required=True)
    shiftDemands = ListField(EmbeddedDocumentField(ShiftDemand))
