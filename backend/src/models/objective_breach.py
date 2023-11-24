from mongoengine import Document, EmbeddedDocument
from mongoengine.fields import (
    BooleanField,
    DateTimeField,
    EmbeddedDocumentListField,
    ReferenceField,
    StringField,
)


class Variable(EmbeddedDocument):
    worker = ReferenceField("Worker", required=True)
    date = DateTimeField(required=True)
    shift = ReferenceField("Shift", required=True)


class ObjectiveBreach(Document):
    meta = {"collection": "constraint_breaches"}

    id = StringField(primary_key=True, required=True)
    objective_id = StringField(required=True)
    objective_category = StringField(
        required=True
    )  # constraint, request, fixed assignment, coverage (hard for now)?
    variables = EmbeddedDocumentListField(Variable, required=True)
    hard_to_soft = BooleanField(required=True)
    description = StringField(required=True)
    schedule = ReferenceField("Schedule", required=True)
