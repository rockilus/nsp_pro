from mongoengine import Document, EmbeddedDocument
from mongoengine.fields import (
    BooleanField,
    DateTimeField,
    EmbeddedDocumentListField,
    IntField,
    ReferenceField,
    StringField,
)

from shared.schemas.schemas.schedule import ObjectiveCategory


class Variable(EmbeddedDocument):
    worker = ReferenceField("Worker")
    date = DateTimeField(required=True)
    shift = ReferenceField("Shift", required=True)


class Breach(Document):
    meta = {"collection": "breaches"}

    id = StringField(primary_key=True, required=True)
    schedule = ReferenceField("Schedule", required=True)
    objective_id = StringField(required=True)
    objective_category = IntField(
        choices=[e.value for e in ObjectiveCategory], required=True
    )
    variables = EmbeddedDocumentListField(Variable, required=True)
    description = StringField(required=True)
    hard_to_soft = BooleanField(required=True)
